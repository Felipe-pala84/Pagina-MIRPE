/**
 * agenda.js — Agenda de eventos por VIP (reuniones, traslados,
 * chequeos médicos, revisiones de MIERPE, etc.).
 */

const MierpeAgenda = (() => {
  let root;

  function vipId() { return window.MierpeVips.getCurrentVipId(); }
  function readOnly() { return !window.MierpeAuth.canEditModule("agenda"); }

  async function mount(el) {
    root = el;
    if (!vipId()) {
      root.innerHTML = `<div class="panel"><div class="panel-title">AGENDA</div><p class="muted">${window.MierpeI18n.t("select_vip_first")}</p></div>`;
      return;
    }
    await render();
  }

  async function render() {
    const rows = await window.MierpeStorage.list(`vips/${vipId()}/agenda`, 300);
    const events = rows.map((r) => ({ id: r.id, ...r.value })).sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
    const dis = readOnly() ? "disabled" : "";

    root.innerHTML = `
      <section class="panel">
        <div class="panel-title">📅 AGENDA — ${window.MierpeVips.getCurrentVip()?.nombre || ""}</div>
        ${!readOnly() ? `
        <div class="field-row">
          <label>Fecha <input id="ag-fecha" type="date" ${dis}></label>
          <label>Hora <input id="ag-hora" type="time" ${dis}></label>
          <label>Título <input id="ag-titulo" placeholder="Reunión, traslado, chequeo..." ${dis}></label>
        </div>
        <textarea id="ag-nota" placeholder="Notas (opcional)" rows="2" ${dis}></textarea>
        <div class="btn-row"><button class="btn" id="btn-ag-add" ${dis}>Agregar evento</button></div>
        ` : ""}
        <table class="log-table">
          <thead><tr><th>Fecha</th><th>Hora</th><th>Título</th><th>Notas</th><th>Registrado por</th>${!readOnly() ? "<th></th>" : ""}</tr></thead>
          <tbody>
            ${events.length ? events.map((e) => `
              <tr>
                <td>${e.fecha}</td><td>${e.hora || "—"}</td><td>${e.titulo}</td><td>${e.nota || "—"}</td>
                <td>${e.agente ? e.agente.name : "—"}</td>
                ${!readOnly() ? `<td><button class="btn btn-outline" data-del-event="${e.id}">✕</button></td>` : ""}
              </tr>
            `).join("") : `<tr><td colspan="6" class="muted">Sin eventos programados.</td></tr>`}
          </tbody>
        </table>
      </section>
    `;

    root.querySelector("#btn-ag-add")?.addEventListener("click", async () => {
      const fecha = root.querySelector("#ag-fecha").value;
      const hora = root.querySelector("#ag-hora").value;
      const titulo = root.querySelector("#ag-titulo").value.trim();
      const nota = root.querySelector("#ag-nota").value.trim();
      if (!fecha || !titulo) { alert("Completa al menos fecha y título."); return; }
      const u = window.MierpeAuth.currentUser();
      await window.MierpeStorage.addToLog(`vips/${vipId()}/agenda`, {
        fecha, hora, titulo, nota, agente: { name: u.name, email: u.email }
      });
      await render();
    });

    root.querySelectorAll("[data-del-event]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await window.MierpeStorage.delete(`vips/${vipId()}/agenda`, btn.dataset.delEvent);
        await render();
      });
    });
  }

  return { mount };
})();

window.MierpeAgenda = MierpeAgenda;
