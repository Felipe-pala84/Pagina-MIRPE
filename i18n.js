/**
 * i18n.js — Selector de idioma para la interfaz general (navegación,
 * acceso, acciones comunes). Cobertura actual: ES (por defecto) y EN.
 *
 * Nota de alcance: por ahora traduce el "andamiaje" de la app —
 * navegación, login, botones comunes, roles. Los textos internos muy
 * específicos de M8 (nombres de índices como FEP, CCT, ICCIO, y los
 * mensajes de reglas tácticas) se mantienen en español porque son
 * terminología técnica del propio modelo MIERPE, igual que "IGR" o
 * "RCP" no se traducirían aunque cambiaras de idioma un documento en
 * inglés. Si quieres que también se traduzcan esos textos, es
 * extender el mismo diccionario — dímelo y lo agregamos.
 */

const DICT = {
  es: {
    app_name: "SIGPE",
    install_app: "Instalar app",
    logout: "Salir",
    select_vip: "— Selecciona un VIP —",
    new_vip: "+ Nuevo VIP",
    module_unavailable: "MÓDULO NO DISPONIBLE",
    module_unavailable_desc: "Este módulo se agregará próximamente sobre esta misma base, o tu rol no tiene acceso a él.",
    soon: "próximamente",
    readonly: "solo lectura",
    users_roles: "⚙ Usuarios y Roles",
    login_title: "SIGPE — ACCESO",
    login_first_run: "Primer ingreso: crea la cuenta de Administrador de Sistemas.",
    name: "Nombre",
    email: "Correo",
    password: "Clave",
    create_admin: "Crear administrador",
    already_have_account: "¿Ya tienes una cuenta?",
    sign_in: "Iniciar sesión",
    enter: "Ingresar",
    nav_m8: "M8 · Comando Táctico",
    nav_chat: "Mensajería",
    nav_agenda: "Agenda",
    select_vip_first: "Selecciona un VIP en la barra superior para continuar."
  },
  en: {
    app_name: "SIGPE",
    install_app: "Install app",
    logout: "Sign out",
    select_vip: "— Select a VIP —",
    new_vip: "+ New VIP",
    module_unavailable: "MODULE UNAVAILABLE",
    module_unavailable_desc: "This module will be added later on this same base, or your role doesn't have access to it.",
    soon: "coming soon",
    readonly: "read only",
    users_roles: "⚙ Users & Roles",
    login_title: "SIGPE — ACCESS",
    login_first_run: "First run: create the System Administrator account.",
    name: "Name",
    email: "Email",
    password: "Password",
    create_admin: "Create administrator",
    already_have_account: "Already have an account?",
    sign_in: "Sign in",
    enter: "Enter",
    nav_m8: "M8 · Tactical Command",
    nav_chat: "Messaging",
    nav_agenda: "Agenda",
    select_vip_first: "Select a VIP in the top bar to continue."
  }
};

const I18n = (() => {
  let lang = localStorage.getItem("mierpe:lang") || "es";

  function t(key) { return (DICT[lang] && DICT[lang][key]) || DICT.es[key] || key; }
  function getLang() { return lang; }
  function setLang(l) {
    lang = DICT[l] ? l : "es";
    localStorage.setItem("mierpe:lang", lang);
    window.dispatchEvent(new CustomEvent("lang-changed"));
  }

  return { t, getLang, setLang };
})();

window.MierpeI18n = I18n;
