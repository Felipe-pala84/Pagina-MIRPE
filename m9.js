/**
 * m9.js — Módulo 9: Panel de Control Integral (MIERPE)
 * Actualizado con lectura dinámica de localStorage para M1-M8
 */
window.MierpeM9 = (function () {

  // Función para obtener el riesgo de un módulo desde localStorage o usar el default
  function getModuleRisk(moduleId, defaultRisk) {
    const savedRisk = localStorage.getItem(`mierpe_risk_${moduleId}`);
    if (savedRisk !== null && !isNaN(savedRisk)) {
      return Math.min(100, Math.max(0, parseFloat(savedRisk)));
    }
    return defaultRisk;
  }

  // Carga reactiva/dinámica de los datos de todos los módulos
  function getModuleData() {
    return [
      { id: "m1", name: "M1 · Perfil", risk: getModuleRisk("m1", 25), categories: { "Biométrico": 30, "Conductual": 20 } },
      { id: "m2", name: "M2 · Médico", risk: getModuleRisk("m2", 40), categories: { "Patologías": 50, "Alergias": 30 } },
      { id: "m3", name: "M3 · Entorno Familiar", risk: getModuleRisk("m3", 55), categories: { "Rutinas": 60, "Ubicación": 50 } },
      { id: "m4", name: "M4 · Defensa", risk: getModuleRisk("m4", 70), categories: { "Balística": 80, "Física": 60 } },
      { id: "m5", name: "M5 · Amenaza / Exposición", risk: getModuleRisk("m5", 85), categories: { "Digital": 90, "Medios": 80 } },
      { id: "m6", name: "M6 · Riesgo Familiar", risk: getModuleRisk("m6", 45), categories: { "Desplazamiento": 50, "Colegios": 40 } },
      { id: "m7", name: "M7 · Servicio de Avanzada", risk: getModuleRisk("m7", 65), categories: { "Rutas": 70, "Locaciones": 60 } },
      { id: "m8", name: "M8 · Comando Táctico", risk: getModuleRisk("m8", 30), categories: { "Comunicaciones": 35, "Respuesta": 25 } }
    ];
  }

  function getRiskColor(score) {
    if (score <= 30) return "#10b981"; // Verde
    if (score <= 60) return "#f59e0b"; // Amarillo
    return "#ef4444"; // Rojo
  }

  function renderDonutSVG(score, label) {
    const color = getRiskColor(score);
    const strokeDash = `${score}, 100`;
    return `
      <div style="text-align:center; position:relative; width:100px; height:100px; margin:auto;">
        <svg viewBox="0 0 36 36" style="width:100%; height:100%; transform: rotate(-90deg);">
          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#1f2937" stroke-width="3.8"/>
          <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="${color}" stroke-width="3.8" stroke-dasharray="${strokeDash}"/>
        </svg>
        <div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); font-weight:bold; font-size:14px; color:#f3f4f6;">
          ${Math.round(score)}%
        </div>
      </div>
      <div style="text-align:center; font-size:12px; margin-top:6px; font-weight:600; color:#9ca3af;">${label}</div>
    `;
  }

  function mount(container) {
    // Obtener datos dinámicos actualizados al montar el componente
    const moduleData = getModuleData();

    const avgM1M6 = moduleData.slice(0, 6).reduce((acc, m) => acc + m.risk, 0) / 6;
    const avgGlobal = moduleData.reduce((acc, m) => acc + m.risk, 0) / 8;
    const sortedModules = [...moduleData].sort((a, b) => b.risk - a.risk).slice(0, 3);

    let html = `
      <div class="panel" style="padding:16px;">
        <h2 style="margin-bottom:16px; color:#f3f4f6; font-size:20px;">M9 · Panel de Control Integral</h2>

        <!-- Resumen Agrupado y Global -->
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:16px; margin-bottom:24px;">
          <div style="background:#111827; padding:16px; border-radius:8px; border:1px solid #374151;">
            <h3 style="font-size:14px; color:#9ca3af; margin-bottom:12px;">DASHBOARD AGRUPADO (M1 - M6)</h3>
            ${renderDonutSVG(avgM1M6, "Promedio Riesgo Entorno")}
          </div>
          <div style="background:#111827; padding:16px; border-radius:8px; border:1px solid #374151;">
            <h3 style="font-size:14px; color:#9ca3af; margin-bottom:12px;">DASHBOARD GLOBAL (M1 - M8)</h3>
            ${renderDonutSVG(avgGlobal, "Índice de Riesgo Sistema")}
          </div>
        </div>

        <!-- Dashboards Individuales (8 Módulos) -->
        <h3 style="font-size:16px; color:#f3f4f6; margin-bottom:12px;">DASHBOARDS INDIVIDUALES</h3>
        <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap:12px; margin-bottom:24px;">
          ${moduleData.map(m => `
            <div style="background:#111827; padding:12px; border-radius:8px; border:1px solid #1f2937;">
              ${renderDonutSVG(m.risk, m.name)}
            </div>
          `).join('')}
        </div>

        <!-- Tabla Resumen -->
        <h3 style="font-size:16px; color:#f3f4f6; margin-bottom:12px;">TABLA DE VALORES NUMÉRICOS</h3>
        <table style="width:100%; border-collapse:collapse; margin-bottom:24px; text-align:left; font-size:13px; color:#d1d5db;">
          <thead>
            <tr style="background:#1f2937; color:#f9fafb;">
              <th style="padding:8px; border:1px solid #374151;">Módulo</th>
              <th style="padding:8px; border:1px solid #374151;">Riesgo Evaluado</th>
              <th style="padding:8px; border:1px solid #374151;">Estado</th>
            </tr>
          </thead>
          <tbody>
            ${moduleData.map(m => `
              <tr style="border-bottom:1px solid #374151;">
                <td style="padding:8px; border:1px solid #374151;">${m.name}</td>
                <td style="padding:8px; border:1px solid #374151;">${m.risk}%</td>
                <td style="padding:8px; border:1px solid #374151; color:${getRiskColor(m.risk)}; font-weight:bold;">
                  ${m.risk <= 30 ? '🟢 Bajo' : m.risk <= 60 ? '🟡 Moderado' : '🔴 Crítico'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Recomendaciones Finales -->
        <h3 style="font-size:16px; color:#f3f4f6; margin-bottom:12px;">RECOMENDACIONES FINAL PRIORIZADAS</h3>
        <div style="background:#111827; padding:16px; border-radius:8px; border:1px solid #374151;">
          <ol style="margin-left:20px; color:#d1d5db; font-size:13px; line-height:1.6;">
            ${sortedModules.map(m => `
              <li style="margin-bottom:8px;">
                <strong>${m.name} (${m.risk}%):</strong> Acción requerida urgente. Reforzar controles y mitigar vulnerabilidades específicas reportadas en la categoría.
              </li>
            `).join('')}
          </ol>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  return { mount };
})();