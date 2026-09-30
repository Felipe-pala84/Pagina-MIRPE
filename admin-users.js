/**
 * admin-users.js — Gestión de usuarios y roles (Firebase Auth + Firestore).
 * Visible solo para el rol "administrador".
 *
 * Nota: el SDK de cliente de Firebase no puede borrar la cuenta de
 * OTRO usuario (eso requiere Cloud Functions con el Admin SDK, que no
 * corre en el navegador). Por eso aquí solo se administra el rol; si
 * necesitas dar de baja a alguien de verdad, hazlo desde Firebase
 * Console → Authentication, o te preparo una Cloud Function para eso.
 */

const MierpeAdminUsers = (() => {
  let root;

  async function render() {
    const users = await window.MierpeAuth.listUsers();
    root.innerHTML = `
      <section class="panel">
        <div class="panel-title">USUARIOS Y ROLES</div>
        <table class="log-table">
          <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th></tr></thead>
          <tbody>
            ${users.map((u) => `
              <tr>
                <td>${u.name}</td>
                <td>${u.email}</td>
                <td>
                  <select data-role-uid="${u.uid}">
                    ${Object.keys(window.MierpeRoles).map((r) => `<option value="${r}" ${r === u.role ? "selected" : ""}>${window.MierpeRoles[r].label}</option>`).join("")}
                  </select>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        <p class="muted">Para dar de baja una cuenta por completo, hazlo desde Firebase Console → Authentication (el SDK de navegador no puede borrar cuentas de otros usuarios).</p>
      </section>

      <section class="panel">
        <div class="panel-title">CREAR NUEVO USUARIO</div>
        <div class="field-row">
          <label>Nombre <input id="nu-name" placeholder="Nombre completo"></label>
          <label>Correo <input id="nu-email" type="email" placeholder="correo@dominio.com"></label>
        </div>
        <div class="field-row">
          <label>Clave <input id="nu-pass" type="password" placeholder="Clave (mínimo 6 caracteres)"></label>
          <label>Rol
            <select id="nu-role">
              ${Object.entries(window.MierpeRoles).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join("")}
            </select>
          </label>
        </div>
        <div class="btn-row"><button class="btn" id="btn-create-user">Crear usuario</button></div>
        <p class="muted" id="nu-msg"></p>
      </section>

      <section class="panel">
        <div class="panel-title">DESCRIPCIÓN DE ROLES</div>
        ${Object.values(window.MierpeRoles).map((r) => `<p><strong>${r.label}:</strong> <span class="muted">${r.desc}</span></p>`).join("")}
      </section>
    `;

    root.querySelectorAll("[data-role-uid]").forEach((sel) => {
      sel.addEventListener("change", async (e) => {
        await window.MierpeAuth.updateRole(e.target.dataset.roleUid, e.target.value);
        render();
      });
    });
    root.querySelector("#btn-create-user")?.addEventListener("click", async () => {
      const name = root.querySelector("#nu-name").value.trim();
      const email = root.querySelector("#nu-email").value.trim();
      const pass = root.querySelector("#nu-pass").value;
      const role = root.querySelector("#nu-role").value;
      const msg = root.querySelector("#nu-msg");
      if (!name || !email || !pass) { msg.textContent = "Completa nombre, correo y clave."; return; }
      try {
        await window.MierpeAuth.createUser({ name, email, password: pass, role });
        msg.textContent = "Usuario creado.";
        render();
      } catch (e) {
        msg.textContent = e.message;
      }
    });
  }

  async function mount(el) {
    root = el;
    await render();
  }

  return { mount };
})();

window.MierpeAdminUsers = MierpeAdminUsers;
