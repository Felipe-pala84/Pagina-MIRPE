/**
 * app.js — shell de la aplicación.
 * Controla: pantalla de acceso, selector de VIP (multi-tenencia),
 * selector de idioma, navegación filtrada por rol, y montaje del
 * módulo activo.
 */

const MODULES = [
  { id: "m1", label: "M1 · Perfil", disabled: true },
  { id: "m2", label: "M2 · Médico", disabled: true },
  { id: "m3", label: "M3 · Entorno Familiar", disabled: true },
  { id: "m4", label: "M4 · Defensa", disabled: false, impl: () => window.MierpeM4 },
  { id: "m5", label: "M5 · Amenaza / Exposición", disabled: false, impl: () => window.MierpeM5 },
  { id: "m6", label: "M6 · Riesgo Familiar", disabled: false, impl: () => window.MierpeM6 },
  { id: "m7", label: "M7 · Servicio de Avanzada", disabled: false, impl: () => window.MierpeM7 },
  { id: "m8", label: "M8 · Comando Táctico", disabled: false, impl: () => window.MierpeM8 },
  { id: "m9", label: "M9 · Panel de Control Integral", disabled: false, impl: () => window.MierpeM9 },
  { id: "chat", label: "🔒 Mensajería", disabled: false, impl: () => window.MierpeChat },
  { id: "agenda", label: "📅 Agenda", disabled: false, impl: () => window.MierpeAgenda }
];

let activeModuleId = "m8";

function renderSidebar(activeId) {
  const Auth = window.MierpeAuth;
  const nav = document.getElementById("sidebar-nav");
  const mods = MODULES.filter((m) => m.disabled || Auth.canAccessModule(m.id));

  let html = mods.map((m) => `
    <button type="button" class="nav-item ${m.id === activeId ? "active" : ""} ${m.disabled ? "disabled" : ""}"
            data-module="${m.id}" ${m.disabled ? "disabled" : ""}>
      <span>${m.label}</span>
      ${m.disabled ? `<span class="soon">${window.MierpeI18n.t("soon")}</span>` : (Auth.canEditModule(m.id) ? "" : `<span class="soon">${window.MierpeI18n.t("readonly")}</span>`)}
    </button>
  `).join("");

  if (Auth.isUserMgmt()) {
    html += `
      <div class="nav-sep"></div>
      <button type="button" class="nav-item ${activeId === "admin" ? "active" : ""}" data-module="admin">
        <span>${window.MierpeI18n.t("users_roles")}</span>
      </button>
    `;
  }

  nav.innerHTML = html;
  nav.querySelectorAll(".nav-item:not(.disabled)").forEach((btn) => {
    btn.addEventListener("click", () => loadModule(btn.dataset.module));
  });
}

function loadModule(id) {
  activeModuleId = id;
  const root = document.getElementById("module-root");
  renderSidebar(id);

  if (id === "admin") {
    if (!window.MierpeAuth.isUserMgmt()) { root.innerHTML = `<div class="panel">Sin permiso.</div>`; return; }
    window.MierpeAdminUsers.mount(root);
    return;
  }

  const mod = MODULES.find((m) => m.id === id);
  if (!mod || mod.disabled || !mod.impl || !window.MierpeAuth.canAccessModule(id)) {
    root.innerHTML = `<div class="panel"><div class="panel-title">${window.MierpeI18n.t("module_unavailable")}</div><p class="muted">${window.MierpeI18n.t("module_unavailable_desc")}</p></div>`;
    return;
  }
  mod.impl().mount(root);
}

function startClock() {
  const el = document.getElementById("clock");
  const tick = () => { el.textContent = new Date().toLocaleTimeString(); };
  tick();
  setInterval(tick, 1000);
}

function renderLangSelect() {
  const el = document.getElementById("lang-select");
  el.innerHTML = `
    <option value="es" ${window.MierpeI18n.getLang() === "es" ? "selected" : ""}>ES</option>
    <option value="en" ${window.MierpeI18n.getLang() === "en" ? "selected" : ""}>EN</option>
  `;
  el.onchange = () => window.MierpeI18n.setLang(el.value);
}

window.addEventListener("lang-changed", () => {
  document.getElementById("btn-install").textContent = window.MierpeI18n.t("install_app");
  document.getElementById("btn-logout").textContent = window.MierpeI18n.t("logout");
  renderSidebar(activeModuleId);
  loadModule(activeModuleId);
});

window.addEventListener("vip-changed", () => {
  loadModule(activeModuleId);
});

async function showAppShell() {
  document.getElementById("auth-screen").hidden = true;
  document.getElementById("app-shell").hidden = false;
  const u = window.MierpeAuth.currentUser();
  const role = window.MierpeAuth.roleDef();
  document.getElementById("user-badge").textContent = `${u.name} · ${role.label.split(" — ")[0]}`;
  document.getElementById("btn-install").textContent = window.MierpeI18n.t("install_app");
  document.getElementById("btn-logout").textContent = window.MierpeI18n.t("logout");
  renderLangSelect();

  try {
    await window.MierpeVips.mountSelector(document.getElementById("vip-select-box"));
  } catch (e) {
    console.error("Error cargando VIPs:", e);
    document.getElementById("vip-select-box").innerHTML =
      `<span class="muted">⚠ No se pudo cargar la lista de VIP (${e.code || e.message}). Revisa la conexión a internet y que las reglas de Firestore estén publicadas.</span>`;
  }

  renderSidebar("m8");
  loadModule("m8");
}

function showAuthScreen() {
  document.getElementById("app-shell").hidden = true;
  document.getElementById("auth-screen").hidden = false;
}

async function renderAuthContent() {
  const Auth = window.MierpeAuth;
  const t = window.MierpeI18n.t;
  const content = document.getElementById("auth-content");

  content.innerHTML = `
    <div id="login-form-box">
      <label>${t("email")} <input id="li-email" type="email" placeholder="correo@dominio.com"></label>
      <label>${t("password")} <input id="li-pass" type="password" placeholder="${t("password")}"></label>
      ${window.MierpeTerms.checkboxHtml("li")}
      <div class="btn-row"><button type="button" class="btn" id="btn-login">${t("enter")}</button></div>
      <p class="muted auth-switch" style="margin-top: 14px; text-align: center;">¿Eres nuevo cliente? <a href="#" id="link-to-register" style="color: #38bdf8; text-decoration: underline;">Regístrate aquí</a></p>
    </div>

    <div id="register-form-box" style="display:none;">
      <label>${t("name")} <input id="su-name" placeholder="Tu nombre completo"></label>
      <label>Empresa / Organización <input id="su-company" placeholder="Nombre de tu empresa"></label>
      <label>${t("email")} <input id="su-email" type="email" placeholder="correo@dominio.com"></label>
      <label>${t("password")} <input id="su-pass" type="password" placeholder="${t("password")}"></label>
      <hr style="border:0; border-top:1px solid #374151; margin:12px 0;">
      <p class="muted"><strong>Datos del VIP Principal</strong></p>
      <label>Nombre del VIP <input id="su-vip-name" placeholder="Ej: John Doe"></label>
      <label>Alias / Código <input id="su-vip-alias" placeholder="Ej: VIP-Alpha"></label>
      ${window.MierpeTerms.checkboxHtml("su")}
      <div class="btn-row"><button type="button" class="btn" id="btn-setup">Registrar Cliente y VIP</button></div>
      <p class="muted auth-switch" style="margin-top: 14px; text-align: center;">¿Ya tienes cuenta? <a href="#" id="link-to-login" style="color: #38bdf8; text-decoration: underline;">Inicia sesión</a></p>
    </div>
    <p class="muted" id="auth-msg" style="margin-top: 10px; text-align: center; color: #ef4444;"></p>
  `;

  const loginBox = document.getElementById("login-form-box");
  const regBox = document.getElementById("register-form-box");
  const msg = document.getElementById("auth-msg");

  document.getElementById("link-to-register").addEventListener("click", (e) => {
    e.preventDefault();
    loginBox.style.display = "none";
    regBox.style.display = "block";
    msg.textContent = "";
  });

  document.getElementById("link-to-login").addEventListener("click", (e) => {
    e.preventDefault();
    regBox.style.display = "none";
    loginBox.style.display = "block";
    msg.textContent = "";
  });

  // Lógica de Registro
  const isRegTermsAccepted = window.MierpeTerms.bindCheckbox("su");
  const regBtn = document.getElementById("btn-setup");
  regBtn.addEventListener("click", async () => {
    const name = document.getElementById("su-name").value.trim();
    const company = document.getElementById("su-company").value.trim();
    const email = document.getElementById("su-email").value.trim();
    const pass = document.getElementById("su-pass").value;
    const vipName = document.getElementById("su-vip-name").value.trim();
    const vipAlias = document.getElementById("su-vip-alias").value.trim();

    if (!name || !company || !email || !pass || !vipName) {
      msg.textContent = "Completa los campos obligatorios.";
      return;
    }
    if (!isRegTermsAccepted()) {
      msg.textContent = "Debes aceptar los Términos de Uso.";
      return;
    }

    regBtn.disabled = true;
    try {
      const db = firebase.firestore();
      await Auth.createUser({ name, email, password: pass, role: "client_admin" });
      await Auth.login(email, pass);
      const uid = Auth.currentUser().uid;
      const orgId = "org_" + Date.now();

      await db.collection("users").doc(uid).set({
        uid, name, company, email,
        role: "client_admin",
        organizationId: orgId,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      await db.collection("vips").add({
        name: vipName,
        alias: vipAlias || vipName,
        organizationId: orgId,
        createdBy: uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      await Auth.recordTermsAcceptance(uid);
      await showAppShell();
    } catch (e) {
      msg.textContent = e.message;
      regBtn.disabled = false;
    }
  });

  // Lógica de Login
  const isLoginTermsAccepted = window.MierpeTerms.bindCheckbox("li");
  const loginBtn = document.getElementById("btn-login");
  const doLogin = async () => {
    const email = document.getElementById("li-email").value.trim();
    const pass = document.getElementById("li-pass").value;
    if (!email || !pass) { msg.textContent = "Completa correo y clave."; return; }
    if (!isLoginTermsAccepted()) { msg.textContent = "Debes aceptar los Términos de Uso."; return; }
    loginBtn.disabled = true;
    try {
      await Auth.login(email, pass);
      await Auth.recordTermsAcceptance(Auth.currentUser().uid);
      await showAppShell();
    } catch (e) {
      msg.textContent = e.message;
      loginBtn.disabled = false;
    }
  };
  loginBtn.addEventListener("click", doLogin);
  document.getElementById("li-pass").addEventListener("keydown", (e) => { if (e.key === "Enter") doLogin(); });
}

function hideSplash() {
  const el = document.getElementById("splash-screen");
  if (el) el.hidden = true;
}

window.addEventListener("DOMContentLoaded", async () => {
  startClock();
  renderLangSelect();

  ["click", "touchstart", "keydown"].forEach((evt) => {
    document.addEventListener(evt, () => window.MierpeM8?.primeAudio?.(), { passive: true });
  });

  try {
    const existing = await window.MierpeAuth.bootstrap();
    if (existing) {
      await showAppShell();
    } else {
      await renderAuthContent();
      showAuthScreen();
    }
  } catch (e) {
    console.error("Error durante el arranque de la app:", e);
  } finally {
    hideSplash();
  }

  document.getElementById("btn-logout").addEventListener("click", async () => {
    try {
      await window.MierpeAuth.logout();
      await renderAuthContent();
      showAuthScreen();
    } catch (e) {
      console.error("Error al cerrar sesión:", e);
      alert("No se pudo cerrar sesión. Revisa tu conexión e intenta de nuevo.");
    }
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch((e) => console.warn("SW registration failed", e));
  }

  let deferredPrompt;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const btn = document.getElementById("btn-install");
    btn.hidden = false;
    btn.addEventListener("click", async () => {
      btn.hidden = true;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
    });
  });

  function isIosDevice() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  }
  function isRunningStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }
  if (isIosDevice() && !isRunningStandalone()) {
    const btn = document.getElementById("btn-install");
    if (btn) {
      btn.hidden = false;
      btn.addEventListener("click", () => {
        alert("Para instalar la app en iPhone/iPad: toca el ícono Compartir en la barra de Safari y elige 'Agregar a pantalla de inicio'.");
      });
    }
  }
});