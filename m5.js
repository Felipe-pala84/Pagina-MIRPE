/**
 * m5.js — Módulo de Inteligencia de Amenaza Multidimensional (MIAM)
 */

const MierpeM5 = (() => {
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
      v1: 0, v2: 0, v3: 0, v4: 0, v5: 0, v6: 0, v7: 0, v8: 0,
      osintScore: 0,
      faseICA: 1,
      alerts: []
    };
  }

  function agenteTag() {
    const u = A().currentUser();
    return u ? { name: u.name, email: u.email } : { name: "desconocido", email: "—" };
  }
  function agenteStr(a) { return a ? `${a.name} <${a.email}>` : "—"; }

  function calcularIAM() {
    const vars = [state.v1, state.v2, state.v3, state.v4, state.v5, state.v6, state.v7, state.v8];
    const maxV = Math.max(...vars);
    const sumV = vars.reduce((a, b) => a + b, 0);
    const meanV = sumV / 8;
    const mu = 0.75;

    const iamBase = (mu * maxV) + ((1 - mu) * meanV);

    let aceleradorActuarial = 1;
    if (state.v3 >= 17 && (state.v5 >= 10 || state.v7 >= 17)) {
      aceleradorActuarial = 1 + ((state.v3 * state.v5) / 400);
    }
    const iamFinal = iamBase * aceleradorActuarial;

    const factorConducta = 1 + (state.v8 / 40);
    const iamAjustado = +(iamFinal * factorConducta).toFixed(2);

    return {
      base: +iamBase.toFixed(2),
      final: +iamFinal.toFixed(2),
      ajustado: iamAjustado,
      factorConducta: +factorConducta.toFixed(2),
      aceleradorActuarial: +aceleradorActuarial.toFixed(2),
      maxV
    };
  }

  function nivelAmenaza(iam) {
    if (iam >= 14) return { label: "CRÍTICO", color: "#ef4444", class: "cct-badge-N", desc: "Fase avanzada del Ciclo de Ataque. Cambio obligatorio de rutas y contravigilancia activa." };
    if (iam >= 10) return { label: "ALTO", color: "#f97316", class: "cct-badge-R", desc: "Riesgo elevado. Restricción de perfil público y disuasión táctica recomendada." };
    if (iam >= 6)  return { label: "MEDIO", color: "#f59e0b", class: "cct-badge-A", desc: "Monitoreo continuo de fuentes OSINT y verificación de entornos habituales." };
    return { label: "BAJO", color: "#10b981", class: "cct-badge-V", desc: "Operación en parámetros normales de prevención." };
  }

  function drawChart(iamAjustado) {
    const canvas = document.getElementById("m5Chart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const valorGrafico = Math.min(30, Math.max(0, iamAjustado));
    const centerX = canvas.width / 2;
    const centerY = 150;
    const radius = 110;
    const startAngle = Math.PI;

    const zones = [
      { max: 6, color: "#10b981" },
      { max: 10, color: "#f59e0b" },
      { max: 14, color: "#f97316" },
      { max: 30, color: "#ef4444" }
    ];

    let prevVal = 0;
    zones.forEach(zone => {
      const aStart = startAngle + (prevVal / 30) * Math.PI;
      const aEnd = startAngle + (zone.max / 30) * Math.PI;

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, aStart, aEnd);
      ctx.strokeStyle = zone.color;
      ctx.lineWidth = 18;
      ctx.stroke();

      prevVal = zone.max;
    });

    const needleAngle = startAngle + (valorGrafico / 30) * Math.PI;
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
    ctx.fillText(`${iamAjustado} IAM`, centerX, centerY - 25);
  }

  function pushAlert(text) {
    state.alerts.unshift({ text, at: new Date().toLocaleTimeString() });
    state.alerts = state.alerts.slice(0, 5);
  }

  function render() {
    if (!root) return;
    readOnly = !A().canEditModule("m5");
    const dis = readOnly ? "disabled" : "";

    const calc = calcularIAM();
    const nivel = nivelAmenaza(calc.ajustado);
    const colapsoConductual = state.v8 >= 14;

    // DEFINICIÓN DE VARIABLES FORMATO M6
    const variablesDef = [
      {
        code: "v1", label: "Presencia de Actores Hostiles (V1)", options: [
          { val: 0, text: "0 pts · Sin registros" },
          { val: 5, text: "5 pts · Activistas Pasivos" },
          { val: 10, text: "10 pts · Crimen común / Activistas No Pasivos" },
          { val: 15, text: "15 pts · Crimen organizado / Carteles" },
          { val: 20, text: "20 pts · Terrorismo / Grupos Armados" }
        ]
      },
      {
        code: "v2", label: "Capacidad Táctica y Letalidad (V2)", options: [
          { val: 0, text: "0 pts · Capacidad Nula / Sin armas" },
          { val: 4, text: "4 pts · Armas blancas / Herramientas" },
          { val: 10, text: "10 pts · Armas cortas de fuego" },
          { val: 20, text: "20 pts · Armamento militar / Explosivos / Interceptación" }
        ]
      },
      {
        code: "v3", label: "Historial Directo Nominal (V3)", options: [
          { val: 0, text: "0 pts · Sin antecedentes previos" },
          { val: 13, text: "13 pts · Amenazas directas / Doxeo activo" },
          { val: 20, text: "20 pts · Atentado o intento de secuestro previo" }
        ]
      },
      {
        code: "v4", label: "Siniestralidad de la Zona (V4)", options: [
          { val: 0, text: "0 pts · Zona segura / Control de acceso" },
          { val: 12, text: "12 pts · Delincuencia común alta" },
          { val: 20, text: "20 pts · Zona Roja / Emboscadas / Control delictivo" }
        ]
      },
      {
        code: "v5", label: "Vector de Escalada Temporal / Geopolítica (V5)", options: [
          { val: 0, text: "0 pts · Tendencia estable / En descenso" },
          { val: 10, text: "10 pts · Tasa constante / Tensiones geopolíticas latentes" },
          { val: 20, text: "20 pts · Aumento exponencial (3-6m) / Crisis geopolítica activa" }
        ]
      },
      {
        code: "v6", label: "Direccionalidad del Foco (V6)", options: [
          { val: 0, text: "0 pts · Sin amenaza detectada" },
          { val: 5, text: "5 pts · Amenaza genérica" },
          { val: 12, text: "12 pts · Amenaza al sector o gremio" },
          { val: 20, text: "20 pts · Amenaza nominal directa al VIP" }
        ]
      },
      {
        code: "v7", label: "Inteligencia de Vigilancia (V7)", options: [
          { val: 0, text: "0 pts · Sin indicios de seguimiento" },
          { val: 10, text: "10 pts · Doxeo / Búsquedas OSINT sospechosas" },
          { val: 20, text: "20 pts · Vigilancia física confirmada (Fotos/Autos)" }
        ]
      },
      {
        code: "v8", label: "Gestión de la Conducta del VIP (V8)", options: [
          { val: 0, text: "0 pts · Disciplinado (Sigue estrictamente protocolos)" },
          { val: 5, text: "5 pts · Ocasionalmente desatiende pero corrige" },
          { val: 10, text: "10 pts · Rechaza sistemáticamente consejos menores" },
          { val: 15, text: "15 pts · Conducta de alto riesgo / Exposición innecesaria" },
          { val: 20, text: "20 pts · Negligencia / Colapso del diseño de seguridad" }
        ]
      }
    ];

    root.innerHTML = `
      ${readOnly ? `<div class="readonly-banner">MODO SOLO LECTURA — tu rol (${A().roleDef().label}) puede ver el panel pero no modificarlo.</div>` : ""}

      ${colapsoConductual ? `
        <div class="alarm-banner" style="background: #991b1b; border-color: #ef4444;">
          🚨 <strong>ALERTA DE COLAPSO CONDUCTUAL (V8 ≥ 14)</strong><br>
          El VIP está anulando las capas de protección. Se requiere intervención del Jefe de Seguridad.
        </div>
      ` : ""}

      <section class="panel panel-status" style="font-family: 'Rajdhani', sans-serif;">
        <div class="panel-title" style="color: #38bdf8; font-weight: 700; font-size: 1.1rem; letter-spacing: 1px;">M5 — INTELIGENCIA DE AMENAZA MULTIDIMENSIONAL</div>

        <div style="display: flex; justify-content: center; align-items: center; margin: 10px 0;">
          <canvas id="m5Chart" width="340" height="180"></canvas>
        </div>

        <div class="cct-badge ${nivel.class}">
          <span class="cct-badge-label">NIVEL DE AMENAZA</span>
          <span class="cct-badge-value">${nivel.label}</span>
        </div>
        <p class="cct-meaning" style="color: #e2e8f0; font-family: 'Inter', sans-serif;">${nivel.desc}</p>

        <div class="status-row status-row-secondary" style="font-family: 'JetBrains Mono', monospace;">
          <div class="pill" style="color: #cbd5e1;">IAM BASE: <strong style="color: #38bdf8;">${calc.base}</strong></div>
          <div class="pill" style="color: #cbd5e1;">ACEL. ACTUARIAL: <strong style="color: #38bdf8;">${calc.aceleradorActuarial}×</strong></div>
          <div class="pill" style="color: #cbd5e1;">MULT. CONDUCTA: <strong style="color: #38bdf8;">${calc.factorConducta}×</strong></div>
        </div>
      </section>

      <!-- WIDGET ICA - GUARDIÁN DIGITAL -->
      <section class="panel" style="border: 1px solid ${calc.ajustado >= 14 ? '#ef4444' : '#334155'}; background: ${calc.ajustado >= 14 ? 'rgba(239,68,68,0.05)' : 'inherit'};">
        <div class="panel-title" style="color: #38bdf8; font-weight: 700;">👁️ GUARDIÁN DIGITAL & CICLO DE ATAQUE (ICA)</div>
        
        <div class="field-row">
          <label style="color: #cbd5e1;">Fase del Ciclo de Ataque (ICA)
            <select id="fase-ica" ${dis} style="color: #f8fafc; background: #0f172a;">
              <option value="1" ${state.faseICA == 1 ? "selected" : ""}>Fase 1: Selección del Objetivo</option>
              <option value="2" ${state.faseICA == 2 ? "selected" : ""}>Fase 2: Vigilancia y Reagrupamiento</option>
              <option value="3" ${state.faseICA == 3 ? "selected" : ""}>Fase 3: Planificación y Ensayos</option>
              <option value="4" ${state.faseICA == 4 ? "selected" : ""}>Fase 4: Ejecución / Ataque Inminente</option>
            </select>
          </label>
          <label style="color: #cbd5e1;">Fricción Digital OSINT/SOCMINT (0-100)
            <input type="number" min="0" max="100" id="osint-score" value="${state.osintScore}" ${dis} style="color: #f8fafc; font-family: 'JetBrains Mono', monospace;">
          </label>
        </div>

        <div style="background: rgba(15, 23, 42, 0.6); padding: 10px; border-radius: 4px; border-left: 3px solid #38bdf8; margin-top: 8px;">
          <p style="color: #e2e8f0; font-size: 0.85rem; margin: 0 0 4px 0;"><strong>📋 Criterio de Toma de Decisiones Tácticas:</strong></p>
          <ul style="color: #94a3b8; font-size: 0.8rem; margin: 0; padding-left: 18px;">
            <li><strong>Fase 1 (Selección):</strong> Mantener perfil bajo y monitoreo preventivo de fuentes abiertas.</li>
            <li><strong>Fase 2 (Vigilancia):</strong> Activar contravigilancia física y alternar rutas predecibles.</li>
            <li><strong>Fase 3 (Planificación):</strong> Reforzar cápsula con escolta táctica y preconocer rutas de escape/hospitales.</li>
            <li><strong>Fase 4 (Ejecución):</strong> Evacuación o resguardo inmediato en Safe House. Bloqueo de agenda pública.</li>
          </ul>
        </div>
      </section>

      <!-- MATRIZ DE VARIABLES V1 A V8 (ESTILO MODELO M6) -->
      <section class="panel">
        <div class="panel-title" style="color: #38bdf8; font-weight: 700; margin-bottom: 12px;">EVALUACIÓN DE VARIABLES TÁCTICAS (0 - 20)</div>
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

      <!-- ALERTAS Y EXPLICACIÓN DE FASES -->
      <section class="panel">
        <div class="panel-title" style="color: #38bdf8; font-weight: 700;">ALERTAS TÁCTICAS Y FASES DEL CICLO DE ATAQUE</div>
        
        <div style="background: rgba(15, 23, 42, 0.5); padding: 8px 12px; border-radius: 4px; margin-bottom: 10px; font-size: 0.8rem; color: #cbd5e1;">
          <strong style="color: #38bdf8;">Guía rápida de Fases ICA:</strong>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 4px; color: #94a3b8;">
            <div>• <strong>F1 (Selección):</strong> Búsqueda pasiva de blanco.</div>
            <div>• <strong>F2 (Vigilancia):</strong> Detección de patrones y rutas.</div>
            <div>• <strong>F3 (Planificación):</strong> Ensayos y calibración táctica.</div>
            <div>• <strong>F4 (Ejecución):</strong> Emboscada o ataque directo.</div>
          </div>
        </div>

        <ul class="alert-list" style="font-family: 'JetBrains Mono', monospace;">
          ${state.alerts.length ? state.alerts.map((a) => `<li style="color: #cbd5e1;">[${a.at}] ${a.text}</li>`).join("") : "<li class='muted' style='color: #94a3b8;'>Sin alertas registradas.</li>"}
        </ul>
      </section>

      <section class="panel">
        <div class="panel-title" style="color: #38bdf8; font-weight: 700;">REGISTRO DE INCIDENTES Y REPORTES M5</div>
        <table class="log-table" style="font-family: 'JetBrains Mono', monospace;">
          <thead><tr style="color: #38bdf8;"><th>Hora</th><th>Tipo</th><th>Score</th><th>Agente</th></tr></thead>
          <tbody>
            ${reports.length ? reports.map((r) => `
              <tr style="color: #e2e8f0;"><td>${r.at}</td><td>${r.type || "MIAM"}</td><td>${r.score || "—"}</td><td>${agenteStr(r.agente)}</td></tr>
            `).join("") : `<tr><td colspan="4" class="muted" style="color: #94a3b8;">Sin registros recientes.</td></tr>`}
          </tbody>
        </table>

        <div class="btn-row" style="margin-top: 15px;">
          <button class="btn" id="btn-informe-m5">Generar Informe M5</button>
          <button class="btn" id="btn-pdf-m5">Descargar PDF</button>
          ${!readOnly ? `<button class="btn btn-outline" id="btn-reset-m5">Reiniciar Módulo M5</button>` : ""}
        </div>
      </section>

      <section class="panel" id="informe-panel-m5" style="display:none">
        <div class="panel-title" style="color: #38bdf8; font-weight: 700;">INFORME DE INTELIGENCIA DE AMENAZA (M5)</div>
        <pre id="informe-text-m5" style="font-family: 'JetBrains Mono', monospace; color: #e2e8f0; white-space: pre-wrap; word-break: break-word;"></pre>
      </section>
    `;

    bindEvents();
    drawChart(calc.ajustado);
  }

  function showInforme() {
    const panel = root.querySelector("#informe-panel-m5");
    if (!panel) return;
    panel.style.display = "block";
    root.querySelector("#informe-text-m5").textContent = buildInforme();
    panel.scrollIntoView({ behavior: "smooth" });
  }

  function buildInforme() {
    const calc = calcularIAM();
    const nivel = nivelAmenaza(calc.ajustado);

    const lines = [
      "════════════════════════════════════════════════",
      " INFORME DE INTELIGENCIA DE AMENAZA (MIAM - M5)",
      "════════════════════════════════════════════════",
      `Generado por: ${agenteStr(agenteTag())}   Fecha: ${new Date().toLocaleString()}`,
      "",
      "── EVALUACIÓN DE AMENAZA MULTIDIMENSIONAL ──",
      ` • Nivel de Amenaza: ${nivel.label}`,
      ` • Índice IAM Ajustado: ${calc.ajustado}`,
      ` • IAM Base: ${calc.base}`,
      ` • Multiplicador Conductual VIP (V8): ${calc.factorConducta}×`,
      ` • Acelerador Actuarial de Poisson: ${calc.aceleradorActuarial}×`,
      ` • Fase del Ciclo de Ataque (ICA): Fase ${state.faseICA}`,
      ` • Fricción Digital OSINT: ${state.osintScore}/100`,
      "",
      "── DESGLOSE DE VARIABLES TÁCTICAS (0-20) ──",
      ` • V1 Presencia Hostil: ${state.v1}   | V2 Capacidad Táctica: ${state.v2}`,
      ` • V3 Historial Directo: ${state.v3}  | V4 Siniestralidad Zona: ${state.v4}`,
      ` • V5 Escalada/Geopolítica: ${state.v5} | V6 Direccionalidad: ${state.v6}`,
      ` • V7 Vigilancia Física: ${state.v7}  | V8 Conducta VIP: ${state.v8}`,
      "",
      "── RECOMENDACIÓN OPERATIVA ──",
      ` ${nivel.desc}`,
      ...(state.v8 >= 14 ? [" 🚨 ADVERTENCIA: Colapso conductual activo. Requiere ajuste directo de disciplina con el protegido."] : []),
      "════════════════════════════════════════════════"
    ];
    return lines.join("\n");
  }

  async function downloadPDF() {
    if (!window.jspdf) { alert("Generador PDF no disponible."); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text(buildInforme(), 10, 10);
    doc.save(`informe-m5-miam-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  function bindEvents() {
    root.querySelector("#btn-informe-m5")?.addEventListener("click", showInforme);
    root.querySelector("#btn-pdf-m5")?.addEventListener("click", downloadPDF);

    if (readOnly) return;

    // EVENTO DE CAMBIO DE VARIABLES V1 A V8
    root.querySelectorAll("select[data-var]").forEach((select) => {
      select.addEventListener("change", (e) => {
        const field = e.target.dataset.var;
        const val = +e.target.value;
        state[field] = val;

        if (field === "v8" && val >= 14) {
          pushAlert("🚨 Alerta de Colapso Conductual detectada por V8.");
        }

        render();
        persistDebounced();
      });
    });

    root.querySelector("#fase-ica")?.addEventListener("change", (e) => {
      state.faseICA = +e.target.value;
      pushAlert(`Cambio de fase ICA a: Fase ${state.faseICA}`);
      render();
      persist();
    });

    root.querySelector("#osint-score")?.addEventListener("change", (e) => {
      state.osintScore = +e.target.value;
      if (state.osintScore >= 70) pushAlert("⚠️ Alerta OSINT: Anomalía de búsquedas altas.");
      render();
      persist();
    });

    // REINICIO DE M5
    root.querySelector("#btn-reset-m5")?.addEventListener("click", async () => {
      if (confirm("¿Reiniciar completamente el módulo M5? Esto restaurará las variables a cero y purgará los registros de inteligencia.")) {
        try {
          const db = window.MierpeFirebase?.db || window.db;
          if (window.firebaseFirestore) {
            const { doc, deleteDoc } = window.firebaseFirestore;
            const deletePromises = reports.map((r) => deleteDoc(doc(db, m5ReportsCollection(), r._id)).catch(() => {}));
            await Promise.all(deletePromises);
          }

          state = defaultState();
          reports = [];
          await S().set(m5Collection(), "current-state", state);

          pushAlert("Módulo M5 reajustado a parámetros iniciales.");
          render();
        } catch (e) {
          console.error("Error al reiniciar M5:", e);
          alert("Ocurrió un error al intentar purgar la base de datos: " + e.message);
        }
      }
    });
  }

  function m5Collection() { return `vips/${window.MierpeVips.getCurrentVipId()}/m5State`; }
  function m5ReportsCollection() { return `vips/${window.MierpeVips.getCurrentVipId()}/m5Reports`; }

  async function persist() {
    return S().set(m5Collection(), "current-state", state).catch((e) => console.error("Error persist M5:", e));
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
      root.innerHTML = `<div class="panel"><div class="panel-title">M5 — MIAM</div><p class="muted">${window.MierpeI18n.t("select_vip_first")}</p></div>`;
      return;
    }

    state = defaultState();
    reports = [];

    unsubscribers.push(S().onDocSnapshot(m5Collection(), "current-state", (saved) => {
      if (saved) state = { ...defaultState(), ...saved };
      render();
    }));

    unsubscribers.push(S().onSnapshot(m5ReportsCollection(), 100, (rows) => {
      reports = rows.map((r) => ({ ...r.value, _id: r.id }));
      render();
    }));
  }

  return { mount };
})();

window.MierpeM5 = MierpeM5;