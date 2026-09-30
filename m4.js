/**
 * m4.js — Módulo de Defensa Integral y Resiliencia (MDIR)
 */

const MierpeM4 = (() => {
  const R = () => window.MierpeRules;
  const S = () => window.MierpeStorage;
  const A = () => window.MierpeAuth;

  let state = defaultState();
  let reports = [];
  let incidentes = [];
  let root = null;
  let readOnly = false;

  function defaultState() {
    return {
      v1: 0, v2: 0, v3: 0, v4: 0, v5: 0, v6: 0, v7: 0, v8: 0, v9: 0, v10: 0,
      tipoEmergencia: "ARMADO",
      alerts: []
    };
  }

  function agenteTag() {
    const u = A().currentUser();
    return u ? { name: u.name, email: u.email } : { name: "desconocido", email: "—" };
  }
  function agenteStr(a) { return a ? `${a.name} <${a.email}>` : "—"; }

  function calcularIDIR() {
    // Dimensión A: Media Geométrica de Seguridad Física (V1 a V4)
    const geomBase = (state.v1 * state.v2 * state.v3 * state.v4);
    const mediaGeomFisica = geomBase > 0 ? Math.pow(geomBase, 1 / 4) : 0;

    // Dimensión B: Capacidad de Respuesta Multi-Agencia (V5 a V9)
    const maxV7V8 = Math.max(state.v7, state.v8);
    const sumCuadrados = Math.pow(state.v5, 2) + Math.pow(state.v6, 2) + Math.pow(maxV7V8, 2) + Math.pow(state.v9, 2);
    const rmsResp = Math.sqrt(sumCuadrados / 4);
    const asimetria = 1 + (Math.abs(state.v7 - state.v8) / 20);
    const irc = +(rmsResp * asimetria).toFixed(2);

    // IDIR Base sin Factor Ambiental
    const idirBase = mediaGeomFisica * (1 + (irc / 20));

    // Dimensión C: Factor de Corrección Ambiental (V10)
    const fca = 1 + (state.v10 / 20);

    // Ecuación Fundamental: Retardo vs Respuesta
    const retardoEstd = mediaGeomFisica;
    const respuestaEstd = (state.v7 + state.v8) / 2;

    const retardoAjustado = +(retardoEstd / fca).toFixed(2);
    const respuestaAjustada = +(respuestaEstd * fca).toFixed(2);
    const brechaAjustada = +(retardoAjustado - respuestaAjustada).toFixed(2);

    return {
      idir: +idirBase.toFixed(2),
      mediaGeomFisica: +mediaGeomFisica.toFixed(2),
      irc,
      fca: +fca.toFixed(2),
      retardoAjustado,
      respuestaAjustada,
      brechaAjustada
    };
  }

  function nivelDefensa(idir) {
    if (idir >= 15) return { label: "CRÍTICO", color: "#ef4444", class: "cct-badge-N", desc: "Indefensión total: Las barreras físicas ceden antes de la llegada de los apoyos. Activación inmediata de protocolos." };
    if (idir >= 10) return { label: "ALTO", color: "#f97316", class: "cct-badge-R", desc: "Brechas significativas en barreras físicas o respuesta externa. Prioridad alta de reforzamiento." };
    if (idir >= 5)  return { label: "MODERADO", color: "#f59e0b", class: "cct-badge-A", desc: "Protección adecuada pero con áreas de mejora en filtrado o tiempos de llegada." };
    return { label: "BAJO", color: "#10b981", class: "cct-badge-V", desc: "Protección física excelente y capacidad de respuesta rápida." };
  }

  function drawChart(idirAjustado) {
    const canvas = document.getElementById("m4Chart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const valorGrafico = Math.min(20, Math.max(0, idirAjustado));
    const centerX = canvas.width / 2;
    const centerY = 150;
    const radius = 110;
    const startAngle = Math.PI;

    const zones = [
      { max: 5, color: "#10b981" },
      { max: 10, color: "#f59e0b" },
      { max: 15, color: "#f97316" },
      { max: 20, color: "#ef4444" }
    ];

    let prevVal = 0;
    zones.forEach(zone => {
      const aStart = startAngle + (prevVal / 20) * Math.PI;
      const aEnd = startAngle + (zone.max / 20) * Math.PI;

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, aStart, aEnd);
      ctx.strokeStyle = zone.color;
      ctx.lineWidth = 18;
      ctx.stroke();

      prevVal = zone.max;
    });

    const needleAngle = startAngle + (valorGrafico / 20) * Math.PI;
    const needleLength = radius - 15;
    const needleX = centerX + Math.cos(needleAngle) * needleLength;
    const needleY = centerY + Math.sin(needleAngle) * needleLength;

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(needleX, needleY);
    ctx.strokeStyle = "#f8fafc";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, 7, 0, Math.PI * 2);
    ctx.fillStyle = "#38bdf8";
    ctx.fill();

    ctx.fillStyle = "#38bdf8";
    ctx.font = "700 20px 'Rajdhani', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${idirAjustado} IDIR`, centerX, centerY - 25);
  }

  function pushAlert(text) {
    state.alerts.unshift({ text, at: new Date().toLocaleTimeString() });
    state.alerts = state.alerts.slice(0, 5);
  }

  function render() {
    if (!root) return;
    readOnly = !A().canEditModule("m4");
    const dis = readOnly ? "disabled" : "";

    const calc = calcularIDIR();
    const nivel = nivelDefensa(calc.idir);
    const brechaNegativa = calc.brechaAjustada < 0;

    const variablesDef = [
      {
        code: "v1", label: "Control Accesos y Resistencia (V1)", options: [
          { val: 0, text: "0 pts · Fortificación y Control Especializado" },
          { val: 5, text: "5 pts · Seguridad Privada / Militar Homologada" },
          { val: 10, text: "10 pts · Control Accesos Convencional" },
          { val: 15, text: "15 pts · Vulnerabilidad Estructural Relevante" },
          { val: 20, text: "20 pts · Ausencia Total de Barreras / Abierto" }
        ]
      },
      {
        code: "v2", label: "Vigilancia Tecnológica CCTV/IA (V2)", options: [
          { val: 0, text: "0 pts · CCTV Inteligente / Analítica IA 24/7" },
          { val: 8, text: "8 pts · Sistema Básico / Grabación Reactiva" },
          { val: 20, text: "20 pts · Sin cámaras ni alarmas operativas" }
        ]
      },
      {
        code: "v3", label: "Filtrado de Vectores / Visitas (V3)", options: [
          { val: 0, text: "0 pts · Control Total (Rayos X / Biometría)" },
          { val: 10, text: "10 pts · Control Parcial / Registro Manual" },
          { val: 20, text: "20 pts · Sin control / Acceso libre" }
        ]
      },
      {
        code: "v4", label: "Safe Room / Cuarto de Pánico (V4)", options: [
          { val: 0, text: "0 pts · Diseñado / Certificado Balístico" },
          { val: 10, text: "10 pts · Espacio Improvisado / Sin Blindaje" },
          { val: 20, text: "20 pts · Ausente / Sin lugar de repliegue" }
        ]
      },
      {
        code: "v5", label: "Capacidad de Fuego y Equipo Escolta (V5)", options: [
          { val: 0, text: "0 pts · Armamento Homologado + Nivel IV" },
          { val: 10, text: "10 pts · Armamento Corto Básico (Nivel IIIA)" },
          { val: 20, text: "20 pts · Personal Desarmado / Sin Blindaje" }
        ]
      },
      {
        code: "v6", label: "Capacitación Táctica / TCCC (V6)", options: [
          { val: 0, text: "0 pts · Certificación TCCC + Botiquín IFAK" },
          { val: 10, text: "10 pts · Primeros Auxilios Básicos" },
          { val: 20, text: "20 pts · Sin capacitación médica táctica" }
        ]
      },
      {
        code: "v7", label: "Tiempo Arribo Policial (V7)", options: [
          { val: 0, text: "0 pts · Cobertura Inmediata (< 5 min)" },
          { val: 10, text: "10 pts · Urbano Estándar (5 - 15 min)" },
          { val: 20, text: "20 pts · Zona Aislada / Rural (> 30 min)" }
        ]
      },
      {
        code: "v8", label: "Tiempo Arribo Bomberos / Rescate (V8)", options: [
          { val: 0, text: "0 pts · Estación Inmediata (< 5 min)" },
          { val: 10, text: "10 pts · Respuesta Urbana (5 - 20 min)" },
          { val: 20, text: "20 pts · Remoto / Sin equipo pesado (> 30 min)" }
        ]
      },
      {
        code: "v9", label: "Integración C4 / C5 / Despacho (V9)", options: [
          { val: 0, text: "0 pts · Integración Total C4/C5 + GPS" },
          { val: 10, text: "10 pts · Despacho Manual por Operador" },
          { val: 20, text: "20 pts · Línea Pública / Convencional" }
        ]
      },
      {
        code: "v10", label: "Riesgo Ambiental / Infraestructura (V10)", options: [
          { val: 0, text: "0 pts · Infraestructura Robusta / Estable" },
          { val: 10, text: "10 pts · Vulnerabilidad Ambiental Moderada" },
          { val: 16, text: "16 pts · Alta Exposición a Colapso Vial/Sismos" },
          { val: 20, text: "20 pts · Zona de Catástrofe / Vías Inoperativas" }
        ]
      }
    ];

    root.innerHTML = `
      ${readOnly ? `<div class="readonly-banner">MODO SOLO LECTURA — tu rol (${A().roleDef().label}) puede ver el panel pero no modificarlo.</div>` : ""}

      ${brechaNegativa ? `
        <div class="alarm-banner" style="background: #991b1b; border-color: #ef4444;">
          🚨 <strong>ALERTA DE BRECHA DE INDEFENSIÓN TÁCTICA</strong><br>
          El tiempo de retardo de las barreras (${calc.retardoAjustado} min) es menor que el tiempo de respuesta externo (${calc.respuestaAjustada} min). Brecha: ${calc.brechaAjustada} min.
        </div>
      ` : ""}

      <section class="panel panel-status" style="font-family: 'Rajdhani', sans-serif;">
        <div class="panel-title" style="color: #38bdf8; font-weight: 700; font-size: 1.1rem; letter-spacing: 1px;">M4 — DEFENSA INTEGRAL Y RESILIENCIA (MDIR)</div>

        <div style="display: flex; justify-content: center; align-items: center; margin: 10px 0;">
          <canvas id="m4Chart" width="340" height="180"></canvas>
        </div>

        <div class="cct-badge ${nivel.class}">
          <span class="cct-badge-label">NIVEL DE DEFECTO DEFENSIVO</span>
          <span class="cct-badge-value">${nivel.label}</span>
        </div>
        <p class="cct-meaning" style="color: #e2e8f0; font-family: 'Inter', sans-serif;">${nivel.desc}</p>

        <div class="status-row status-row-secondary" style="font-family: 'JetBrains Mono', monospace;">
          <div class="pill" style="color: #cbd5e1;">SEG. FÍSICA: <strong style="color: #38bdf8;">${calc.mediaGeomFisica}</strong></div>
          <div class="pill" style="color: #cbd5e1;">IRC MULTI-AGENCIA: <strong style="color: #38bdf8;">${calc.irc}</strong></div>
          <div class="pill" style="color: #cbd5e1;">FACTOR AMBIENTAL (FCA): <strong style="color: #38bdf8;">${calc.fca}×</strong></div>
        </div>
      </section>

      <!-- WIDGET MATRIZ DE CONTINGENCIA MULTI-AGENCIA -->
      <section class="panel" style="border: 1px solid ${calc.idir >= 15 ? '#ef4444' : '#334155'}; background: ${calc.idir >= 15 ? 'rgba(239,68,68,0.05)' : 'inherit'};">
        <div class="panel-title" style="color: #38bdf8; font-weight: 700;">🛡️ ESCUDO TÁCTICO & ANÁLISIS DE BRECHA DE RETARDO</div>
        
        <div class="field-row">
          <label style="color: #cbd5e1;">Tipo de Alerta Dinámica
            <select id="tipo-emergencia" ${dis} style="color: #f8fafc; background: #0f172a;">
              <option value="ARMADO" ${state.tipoEmergencia === "ARMADO" ? "selected" : ""}>💥 Intrusión / Ataque Armado</option>
              <option value="ACCIDENTE" ${state.tipoEmergencia === "ACCIDENTE" ? "selected" : ""}>🚗 Accidente Vial / Atrapamiento</option>
              <option value="INCENDIO" ${state.tipoEmergencia === "INCENDIO" ? "selected" : ""}>🔥 Incendio / Desastre Ambiental</option>
            </select>
          </label>
        </div>

        <div style="background: rgba(15, 23, 42, 0.6); padding: 10px; border-radius: 4px; border-left: 3px solid #38bdf8; margin-top: 8px;">
          <p style="color: #e2e8f0; font-size: 0.85rem; margin: 0 0 4px 0;"><strong>📋 Ecuación Fundamental del Castillo y el Guardián:</strong></p>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.8rem; color: #94a3b8;">
            <div>• <strong>Retardo Físico Ajustado:</strong> <span style="color: #f8fafc;">${calc.retardoAjustado} min</span></div>
            <div>• <strong>Respuesta Externa Ajustada:</strong> <span style="color: #f8fafc;">${calc.respuestaAjustada} min</span></div>
            <div>• <strong>Brecha Táctica Operativa:</strong> <span style="color: ${calc.brechaAjustada < 0 ? '#ef4444' : '#10b981'}; font-weight: 700;">${calc.brechaAjustada} min</span></div>
            <div>• <strong>Factor de Impacto V10:</strong> <span style="color: #f8fafc;">${calc.fca}×</span></div>
          </div>
        </div>
      </section>

      <!-- MATRIZ DE VARIABLES V1 A V10 (ESTILO MODELO M6) -->
      <section class="panel">
        <div class="panel-title" style="color: #38bdf8; font-weight: 700; margin-bottom: 12px;">EVALUACIÓN DE VARIABLES DE DEFENSA Y RESPUESTA (0 - 20)</div>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${variablesDef.map((v) => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0;">
              <label style="color: #cbd5e1; font-weight: 500; font-size: 0.88rem; flex: 1;">${v.label}</label>
              <select data-var="${v.code}" ${dis} style="width: 320px; color: #f8fafc; background: #0f172a; border: 1px solid #334155; border-radius: 4px; padding: 6px 8px; font-size: 0.82rem; text-overflow: ellipsis;">
                ${v.options.map(o => `<option value="${o.val}" ${state[v.code] == o.val ? "selected" : ""}>${o.text}</option>`).join("")}
              </select>
            </div>
          `).join("")}
        </div>
      </section>

      <!-- ALERTAS Y RESUMEN TÁCTICO -->
      <section class="panel">
        <div class="panel-title" style="color: #38bdf8; font-weight: 700;">ALERTAS TÁCTICAS MDIR</div>
        
        <div style="background: rgba(15, 23, 42, 0.5); padding: 8px 12px; border-radius: 4px; margin-bottom: 10px; font-size: 0.8rem; color: #cbd5e1;">
          <strong style="color: #38bdf8;">Resumen de Cobertura Crítica:</strong>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 4px; color: #94a3b8;">
            <div>• <strong>Seguridad Perimetral:</strong> V1 - V4</div>
            <div>• <strong>Capacidad Escolta:</strong> V5 - V6</div>
            <div>• <strong>Respuesta Multi-Agencia:</strong> V7 - V9</div>
            <div>• <strong>Resiliencia Ambiental:</strong> V10</div>
          </div>
        </div>

        <ul class="alert-list" style="font-family: 'JetBrains Mono', monospace;">
          ${state.alerts.length ? state.alerts.map((a) => `<li style="color: #cbd5e1;">[${a.at}] ${a.text}</li>`).join("") : "<li class='muted' style='color: #94a3b8;'>Sin alertas registradas.</li>"}
        </ul>
      </section>

      <section class="panel">
        <div class="panel-title" style="color: #38bdf8; font-weight: 700;">REGISTRO DE INCIDENTES Y REPORTES M4</div>
        <table class="log-table" style="font-family: 'JetBrains Mono', monospace;">
          <thead><tr style="color: #38bdf8;"><th>Hora</th><th>Tipo</th><th>Score</th><th>Agente</th></tr></thead>
          <tbody>
            ${reports.length ? reports.map((r) => `
              <tr style="color: #e2e8f0;"><td>${r.at}</td><td>${r.type || "MDIR"}</td><td>${r.score || "—"}</td><td>${agenteStr(r.agente)}</td></tr>
            `).join("") : `<tr><td colspan="4" class="muted" style="color: #94a3b8;">Sin registros recientes.</td></tr>`}
          </tbody>
        </table>

        <div class="btn-row" style="margin-top: 15px;">
          <button class="btn" id="btn-informe-m4">Generar Informe M4</button>
          <button class="btn" id="btn-pdf-m4">Descargar PDF</button>
          ${!readOnly ? `<button class="btn btn-outline" id="btn-reset-m4">Reiniciar Módulo M4</button>` : ""}
        </div>
      </section>

      <section class="panel" id="informe-panel-m4" style="display:none">
        <div class="panel-title" style="color: #38bdf8; font-weight: 700;">INFORME DE DEFENSA INTEGRAL Y RESILIENCIA (M4)</div>
        <pre id="informe-text-m4" style="font-family: 'JetBrains Mono', monospace; color: #e2e8f0; white-space: pre-wrap; word-break: break-word;"></pre>
      </section>
    `;

    bindEvents();
    drawChart(calc.idir);
  }

  function showInforme() {
    const panel = root.querySelector("#informe-panel-m4");
    if (!panel) return;
    panel.style.display = "block";
    root.querySelector("#informe-text-m4").textContent = buildInforme();
    panel.scrollIntoView({ behavior: "smooth" });
  }

  function buildInforme() {
    const calc = calcularIDIR();
    const nivel = nivelDefensa(calc.idir);

    const lines = [
      "════════════════════════════════════════════════",
      " INFORME DE DEFENSA INTEGRAL Y RESILIENCIA (MDIR - M4)",
      "════════════════════════════════════════════════",
      `Generado por: ${agenteStr(agenteTag())}   Fecha: ${new Date().toLocaleString()}`,
      "",
      "── EVALUACIÓN DE DEFENSA INTEGRAL ──",
      ` • Nivel de Defecto Defensivo: ${nivel.label}`,
      ` • Índice IDIR Calculado: ${calc.idir}`,
      ` • Media Geométrica Seguridad Física: ${calc.mediaGeomFisica}`,
      ` • Índice Resiliencia Crisis (IRC): ${calc.irc}`,
      ` • Factor Corrección Ambiental (V10): ${calc.fca}×`,
      ` • Retardo Físico Estimado: ${calc.retardoAjustado} min`,
      ` • Respuesta Externa Estimada: ${calc.respuestaAjustada} min`,
      ` • Brecha Operativa Táctica: ${calc.brechaAjustada} min`,
      "",
      "── DESGLOSE DE VARIABLES TÁCTICAS (0-20) ──",
      ` • V1 Control Accesos: ${state.v1}   | V2 Vigilancia CCTV/IA: ${state.v2}`,
      ` • V3 Filtrado Visitas: ${state.v3}  | V4 Safe Room / Pánico: ${state.v4}`,
      ` • V5 Capacidad Fuego: ${state.v5}  | V6 Capacitación TCCC: ${state.v6}`,
      ` • V7 Tiempo Policía: ${state.v7}   | V8 Tiempo Bomberos: ${state.v8}`,
      ` • V9 Integración C4/C5: ${state.v9} | V10 Factor Ambiental: ${state.v10}`,
      "",
      "── RECOMENDACIÓN OPERATIVA ──",
      ` ${nivel.desc}`,
      ...(calc.brechaAjustada < 0 ? [" 🚨 ADVERTENCIA: Brecha de indefensión detectada. El tiempo de retardo es inferior al de respuesta externa."] : []),
      "════════════════════════════════════════════════"
    ];
    return lines.join("\n");
  }

  async function downloadPDF() {
    if (!window.jspdf) { alert("Generador PDF no disponible."); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text(buildInforme(), 10, 10);
    doc.save(`informe-m4-mdir-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  function bindEvents() {
    root.querySelector("#btn-informe-m4")?.addEventListener("click", showInforme);
    root.querySelector("#btn-pdf-m4")?.addEventListener("click", downloadPDF);

    if (readOnly) return;

    // EVENTO DE CAMBIO DE VARIABLES V1 A V10
    root.querySelectorAll("select[data-var]").forEach((select) => {
      select.addEventListener("change", (e) => {
        const field = e.target.dataset.var;
        const val = +e.target.value;
        state[field] = val;

        const calc = calcularIDIR();
        if (calc.brechaAjustada < 0) {
          pushAlert("🚨 Alerta: Brecha Negativa de Indefensión Detectada.");
        }

        render();
        persistDebounced();
      });
    });

    root.querySelector("#tipo-emergencia")?.addEventListener("change", (e) => {
      state.tipoEmergencia = e.target.value;
      pushAlert(`Tipo de Alerta cambiado a: ${state.tipoEmergencia}`);
      render();
      persist();
    });

    // REINICIO DE M4
    root.querySelector("#btn-reset-m4")?.addEventListener("click", async () => {
      if (confirm("¿Reiniciar completamente el módulo M4? Esto restaurará las variables a cero y purgará los registros de defensa.")) {
        try {
          const db = window.MierpeFirebase?.db || window.db;
          if (window.firebaseFirestore) {
            const { doc, deleteDoc } = window.firebaseFirestore;
            const deletePromises = reports.map((r) => deleteDoc(doc(db, m4ReportsCollection(), r._id)).catch(() => {}));
            await Promise.all(deletePromises);
          }

          state = defaultState();
          reports = [];
          await S().set(m4Collection(), "current-state", state);

          pushAlert("Módulo M4 reajustado a parámetros iniciales.");
          render();
        } catch (e) {
          console.error("Error al reiniciar M4:", e);
          alert("Ocurrió un error al intentar purgar la base de datos: " + e.message);
        }
      }
    });
  }

  function m4Collection() { return `vips/${window.MierpeVips.getCurrentVipId()}/m4State`; }
  function m4ReportsCollection() { return `vips/${window.MierpeVips.getCurrentVipId()}/m4Reports`; }

  async function persist() {
    return S().set(m4Collection(), "current-state", state).catch((e) => console.error("Error persist M4:", e));
  }

  let persistTimer = null;
  function persistDebounced(delay = 400) {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(persist, delay);
  }

  let unsubscribers = [];
  function unsubscribeAll() {
    unsubscribers.forEach((fn) => { try { fn(); } catch (e) {} });
    unsubscribers = [];
  }

  async function mount(el) {
    root = el;
    unsubscribeAll();
    clearTimeout(persistTimer);

    if (!window.MierpeVips.getCurrentVipId()) {
      root.innerHTML = `<div class="panel"><div class="panel-title">M4 — MDIR</div><p class="muted">${window.MierpeI18n.t("select_vip_first")}</p></div>`;
      return;
    }

    state = defaultState();
    reports = [];

    unsubscribers.push(S().onDocSnapshot(m4Collection(), "current-state", (saved) => {
      if (saved) state = { ...defaultState(), ...saved };
      render();
    }));

    unsubscribers.push(S().onSnapshot(m4ReportsCollection(), 100, (rows) => {
      reports = rows.map((r) => ({ ...r.value, _id: r.id }));
      render();
    }));
  }

  return { mount };
})();

window.MierpeM4 = MierpeM4;