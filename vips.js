/**
 * vips.js — Multi-tenencia por protegido (VIP).
 *
 * Cada VIP es un documento en `vips/{vipId}`. Todos los datos
 * operativos de ese VIP (M8, reportes, incidentes, terreno, agenda,
 * chat) viven en subcolecciones bajo ese mismo documento
 * (`vips/{vipId}/reports`, `vips/{vipId}/chat`, etc.), así que
 * modificar o incluso borrar los datos de un VIP nunca toca los de
 * otro — son ramas completamente separadas del árbol de Firestore.
 *
 * También gestiona la llave de chat cifrada por VIP: al crear un VIP
 * se genera una llave AES-256 nueva, y se envuelve (wrapChatKeyFor)
 * para cada miembro inicial. Cuando se agrega un miembro nuevo más
 * adelante, quien lo agrega (que ya tiene la llave desenvuelta en su
 * sesión) genera un envoltorio nuevo para esa persona.
 */

const MierpeVips = (() => {
  let currentVipId = null;
  let currentVip = null;
  let listeners = [];
  let unwrappedChatKeys = {}; // cache en memoria: vipId -> CryptoKey

  function onChange(fn) { listeners.push(fn); }
  function notify() { listeners.forEach((fn) => fn(currentVipId, currentVip)); }

  async function listMyVips() {
    const Auth = window.MierpeAuth;
    const db = window.fb.db;
    if (Auth.seesAllVips()) {
      const snap = await db.collection("vips").orderBy("nombre").get();
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }
    const snap = await db.collection("vips").where("miembros", "array-contains", Auth.currentUser().uid).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  async function createVip({ nombre, jefe, escoltaPpal, conductor }) {
    const Auth = window.MierpeAuth;
    const db = window.fb.db;
    const me = Auth.currentUser();

    const chatKey = await window.MierpeCrypto.generateChatKey();
    const myPriv = await window.MierpeCrypto.getPrivateKey(me.uid);
    const myPub = await window.MierpeCrypto.getPublicJwk(me.uid);
    const myWrap = await window.MierpeCrypto.wrapChatKeyFor(me.uid, myPriv, chatKey, myPub);

    const ref = await db.collection("vips").add({
      nombre, jefe, escoltaPpal, conductor,
      miembros: [me.uid],
      createdBy: me.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    await db.collection("vips").doc(ref.id).collection("keyWraps").doc(me.uid).set(myWrap);
    unwrappedChatKeys[ref.id] = chatKey;
    return ref.id;
  }

  async function addMember(vipId, targetUid) {
    const Auth = window.MierpeAuth;
    const db = window.fb.db;
    const me = Auth.currentUser();
    const chatKey = await getChatKey(vipId);
    if (!chatKey) throw new Error("No tienes la llave de este chat desenvuelta en esta sesión — abre el chat primero.");
    const myPriv = await window.MierpeCrypto.getPrivateKey(me.uid);
    const targetPub = await Auth.getUserPublicKey(targetUid);
    if (!targetPub) throw new Error("Ese usuario todavía no ha iniciado sesión ninguna vez (no tiene llave pública generada).");
    const wrap = await window.MierpeCrypto.wrapChatKeyFor(me.uid, myPriv, chatKey, targetPub);
    await db.collection("vips").doc(vipId).collection("keyWraps").doc(targetUid).set(wrap);
    await db.collection("vips").doc(vipId).update({
      miembros: firebase.firestore.FieldValue.arrayUnion(targetUid)
    });
  }

  async function getChatKey(vipId) {
    if (unwrappedChatKeys[vipId]) return unwrappedChatKeys[vipId];
    const Auth = window.MierpeAuth;
    const db = window.fb.db;
    const me = Auth.currentUser();
    const wrapDoc = await db.collection("vips").doc(vipId).collection("keyWraps").doc(me.uid).get();
    if (!wrapDoc.exists) return null;
    const wrap = wrapDoc.data();
    const myPriv = await window.MierpeCrypto.getPrivateKey(me.uid);
    const wrapperPub = await Auth.getUserPublicKey(wrap.wrappedByUid);
    const key = await window.MierpeCrypto.unwrapChatKey(myPriv, wrapperPub, wrap);
    unwrappedChatKeys[vipId] = key;
    return key;
  }

  async function selectVip(vipId) {
    const db = window.fb.db;
    const doc = await db.collection("vips").doc(vipId).get();
    currentVipId = vipId;
    currentVip = doc.exists ? { id: vipId, ...doc.data() } : null;
    localStorage.setItem("mierpe:lastVip", vipId);
    notify();
  }

  function getCurrentVipId() { return currentVipId; }
  function getCurrentVip() { return currentVip; }

  // ---------------------------------------------------------------- UI: selector
  async function mountSelector(container) {
    const vips = await listMyVips();
    const lastVip = localStorage.getItem("mierpe:lastVip");
    const canCreate = window.MierpeAuth.canEditModule("m8");

    container.innerHTML = `
      <select id="vip-select" class="vip-select">
        <option value="">— Selecciona un VIP —</option>
        ${vips.map((v) => `<option value="${v.id}" ${v.id === lastVip ? "selected" : ""}>${v.nombre}</option>`).join("")}
      </select>
      ${canCreate ? `<button class="btn btn-outline" id="btn-new-vip">+ Nuevo VIP</button>` : ""}
    `;

    const sel = container.querySelector("#vip-select");
    sel.addEventListener("change", async () => {
      if (sel.value) { await selectVip(sel.value); window.dispatchEvent(new CustomEvent("vip-changed")); }
    });

    container.querySelector("#btn-new-vip")?.addEventListener("click", async () => {
      const nombre = prompt("Nombre del VIP / protegido:");
      if (!nombre) return;
      const jefe = prompt("Jefe de Protección (opcional):") || "";
      const id = await createVip({ nombre, jefe, escoltaPpal: "", conductor: "" });
      await mountSelector(container);
      container.querySelector("#vip-select").value = id;
      await selectVip(id);
      window.dispatchEvent(new CustomEvent("vip-changed"));
    });

    if (vips.length && !currentVipId) {
      const initial = vips.find((v) => v.id === lastVip) ? lastVip : vips[0].id;
      await selectVip(initial);
    }
  }

  return { onChange, listMyVips, createVip, addMember, getChatKey, selectVip, getCurrentVipId, getCurrentVip, mountSelector };
})();

window.MierpeVips = MierpeVips;
