/**
 * auth.js — Autenticación real con Firebase Auth (email/clave) +
 * perfiles de usuario y roles en Firestore.
 *
 * La creación de cuentas NO es autoservicio salvo para el primer
 * Administrador: después de eso, solo un Administrador puede crear
 * usuarios nuevos desde "Usuarios y Roles" (ver admin-users.js).
 */

const ROLES = {
  administrador: {
    label: "Administrador de Sistemas",
    desc: "Acceso total a todo, incluida la gestión de usuarios.",
    modules: "all", edit: "all", userMgmt: true, allVips: true
  },
  estrategico: {
    label: "Estratégico — Director / Encargado de Seguridad",
    desc: "Acceso a informes diarios y a los módulos, sin poder modificarlos.",
    modules: "all", edit: [], userMgmt: false, allVips: true
  },
  tactico: {
    label: "Táctico — Jefe de Seguridad / Jefe de Operaciones",
    desc: "Acceso a los módulos, puede modificarlos.",
    modules: "all", edit: "all", userMgmt: false, allVips: true
  },
  operativo: {
    label: "Operativo — Agente a Cargo / Agente en Terreno",
    desc: "Acceso solo al Módulo 8, y solo a los VIP asignados.",
    modules: ["m8", "chat", "agenda"], edit: ["m8", "chat", "agenda"], userMgmt: false, allVips: false
  }
};

const Auth = (() => {
  let user = null; // { uid, name, email, role }
  let ready = null;

  function bootstrap() {
    if (ready) return ready;
    ready = new Promise((resolve) => {
      window.fb.auth.onAuthStateChanged(async (fbUser) => {
        if (!fbUser) { user = null; resolve(null); return; }
        const doc = await window.fb.db.collection("users").doc(fbUser.uid).get();
        if (!doc.exists) { user = null; resolve(null); return; }
        const data = doc.data();
        user = { uid: fbUser.uid, name: data.name, email: fbUser.email, role: data.role };
        await window.MierpeCrypto.ensureKeypair(user.uid);
        await syncPublicKey();
        resolve(user);
      });
    });
    return ready;
  }

  async function syncPublicKey() {
    const pub = await window.MierpeCrypto.getPublicJwk(user.uid);
    if (pub) await window.fb.db.collection("users").doc(user.uid).set({ publicKeyJwk: pub }, { merge: true });
  }

  async function hasAnyUser() {
    const doc = await window.fb.db.collection("meta").doc("bootstrap").get();
    return doc.exists;
  }

  async function createUser({ name, email, password, role }) {
    // Firebase Auth no permite crear un usuario nuevo sin cerrar la sesión
    // del que está creándolo, así que usamos una app secundaria temporal
    // para no botar la sesión del Administrador que está dando de alta.
    const secondary = firebase.initializeApp(window.fb._config, "secondary-" + Date.now());
    try {
      const cred = await secondary.auth().createUserWithEmailAndPassword(email, password);
      const isBootstrap = !user; // sin sesión en la app principal => es el primer administrador

      if (isBootstrap) {
        // Transacción atómica: crea el usuario Y cierra la puerta de arranque
        // en el mismo paso. Así, si alguien más intenta "auto-nombrarse"
        // administrador después del primero, la transacción falla porque
        // meta/bootstrap ya existe.
        await window.fb.db.runTransaction(async (tx) => {
          const metaRef = window.fb.db.collection("meta").doc("bootstrap");
          const metaDoc = await tx.get(metaRef);
          if (metaDoc.exists) throw new Error("Ya existe una cuenta de Administrador. Inicia sesión normalmente.");
          tx.set(window.fb.db.collection("users").doc(cred.user.uid), {
            name, role: "administrador", email: email.trim().toLowerCase(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          tx.set(metaRef, { done: true, at: firebase.firestore.FieldValue.serverTimestamp() });
        });
      } else {
        await window.fb.db.collection("users").doc(cred.user.uid).set({
          name, role, email: email.trim().toLowerCase(), createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
      await secondary.auth().signOut();
    } finally {
      await secondary.delete();
    }
    return true;
  }

  async function login(email, password) {
    await window.fb.auth.signInWithEmailAndPassword(email, password);
    const loggedInUser = await bootstrap();
    if (!loggedInUser) {
      // La cuenta existe en Firebase Authentication pero no tiene ficha en
      // Firestore (nombre/rol) — normalmente pasa si se creó directo desde
      // Firebase Console en vez de "⚙ Usuarios y Roles" dentro de la app.
      await window.fb.auth.signOut();
      ready = null; // para que un próximo intento vuelva a revisar, no quede en caché el resultado null
      throw new Error("Esta cuenta no tiene un perfil asignado en SIGPE (falta nombre/rol en Firestore). Pide al Administrador que te dé de alta desde '⚙ Usuarios y Roles' dentro de la app, o si la creaste directo en Firebase Console, bórrala ahí y créala de nuevo desde ese panel.");
    }
    return loggedInUser;
  }

  async function logout() {
    await window.fb.auth.signOut();
    user = null;
  }

  function currentUser() { return user; }
  function roleDef() { return user ? ROLES[user.role] : null; }

  function canAccessModule(id) {
    const r = roleDef();
    if (!r) return false;
    return r.modules === "all" || r.modules.includes(id);
  }
  function canEditModule(id) {
    const r = roleDef();
    if (!r) return false;
    return r.edit === "all" || r.edit.includes(id);
  }
  function isUserMgmt() { const r = roleDef(); return !!r && r.userMgmt; }
  function seesAllVips() { const r = roleDef(); return !!r && r.allVips; }

  async function listUsers() {
    const snap = await window.fb.db.collection("users").get();
    return snap.docs.map((d) => ({ uid: d.id, name: d.data().name, email: d.data().email, role: d.data().role }));
  }
  async function updateRole(uid, role) {
    await window.fb.db.collection("users").doc(uid).set({ role }, { merge: true });
  }
  async function getUserPublicKey(uid) {
    const doc = await window.fb.db.collection("users").doc(uid).get();
    return doc.exists ? doc.data().publicKeyJwk : null;
  }
  async function findUidByEmail(email) {
    const snap = await window.fb.db.collection("users").where("email", "==", email.trim().toLowerCase()).limit(1).get();
    return snap.empty ? null : snap.docs[0].id;
  }

  const TERMS_VERSION = "1.0";
  /** Deja registro fechado de la aceptación de términos — evidencia
   * operativa que la Ley 21.719 exige poder mostrar. Es idempotente: si
   * ya existe una fecha de aceptación, no la pisa (se conserva la
   * primera aceptación real de esa persona). */
  async function recordTermsAcceptance(uid) {
    const ref = window.fb.db.collection("users").doc(uid);
    const doc = await ref.get();
    if (doc.exists && doc.data().termsAcceptedAt) return; // ya estaba registrado, no tocar
    await ref.set({
      termsAcceptedAt: firebase.firestore.FieldValue.serverTimestamp(),
      termsVersion: TERMS_VERSION
    }, { merge: true });
  }

  return {
    bootstrap, hasAnyUser, createUser, login, logout, currentUser,
    roleDef, canAccessModule, canEditModule, isUserMgmt, seesAllVips,
    listUsers, updateRole, getUserPublicKey, findUidByEmail, recordTermsAcceptance
  };
})();

window.MierpeAuth = Auth;
window.MierpeRoles = ROLES;
