/**
 * MÓDULO M7 - SERVICIO DE AVANZADA Y EVALUACIÓN DE RIESGO OPERACIONAL (VIGIPROT / MIERPE)
 * 
 * Implementación basada fielmente en la Matriz Maestra de Variables M7:
 *  - Estructura ponderada de 10 Áreas (SA1 a SA10) sumando 100%.
 *  - Fórmulas de Cálculo: Ponderación SEA = Suma(SAi * Wi) normalizada entre 0 y 20 pts.
 *  - Matriz de Riesgo Completa: SA1 (15%), SA2 (15%), SA3 (10%), SA4 con SA4.1/SA4.2 (10%),
 *    SA5 con factores modificadores y SA5.1 (10%), SA6 (15%), SA7 con SA7.1 (10%),
 *    SA8 con SA8.1 (5%), SA9 (5%), SA10 con SA10.1 (5%).
 *  - Clasificación Operacional (0-4.0 Óptimo, 4.1-8.0 Bueno, 8.1-12.0 Moderado, 12.1-16.0 Alto, 16.1-20.0 Crítico).
 *  - Motor Inteligente de Reglas y Alertas Automáticas en tiempo real.
 *  - Gráfico Canvas dinámico por áreas.
 *  - Registros y Novedades en Terreno.
 *  - Reporte PDF detallado con desglose de matriz.
 *  - Botón "Reiniciar Evento de Avanzada" con flujo de confirmación de descarga previa (Sí/No).
 *  - Interfaz responsiva con selectores compactos y etiquetas explicativas claras.
 */

window.MierpeM7 = (function () {
  const DB_COLLECTION = "m7State";
  const DOC_ID = "current-state";

  // DEFINICIÓN DE ÁREAS, PESOS Y VARIABLES SEGÚN MATRIZ MAESTRA M7
  const MATRIX_AREAS = [
    {
      id: "sa1",
      code: "SA1",
      title: "1. Planificación Operacional",
      weight: 0.15,
      variables: [
        {
          id: "orden_op",
          name: "Orden de Operaciones",
          options: [
            { label: "Completa y aprobada", score: 0 },
            { label: "Completa sin aprobación", score: 5 },
            { label: "Parcial", score: 10 },
            { label: "Deficiente", score: 15 },
            { label: "No existe", score: 20 }
          ]
        },
        {
          id: "cronograma",
          name: "Cronograma de Trabajo",
          options: [
            { label: "Confirmado", score: 0 },
            { label: "Cambios menores", score: 5 },
            { label: "Cambios frecuentes", score: 10 },
            { label: "Información incompleta", score: 15 },
            { label: "No existe", score: 20 }
          ]
        },
        {
          id: "coordinacion",
          name: "Coordinación Interinstitucional",
          options: [
            { label: "Confirmada", score: 0 },
            { label: "Parcial", score: 10 },
            { label: "No realizada", score: 20 }
          ]
        },
        {
          id: "eval_riesgo",
          name: "Evaluación de Riesgo Actualizada",
          options: [
            { label: "Menos de 24 horas", score: 0 },
            { label: "Menos de 72 horas", score: 5 },
            { label: "Menos de 7 días", score: 10 },
            { label: "Más de 7 días", score: 15 },
            { label: "No existe", score: 20 }
          ]
        }
      ]
    },
    {
      id: "sa2",
      code: "SA2",
      title: "2. Equipo de Protección",
      weight: 0.15,
      variables: [
        {
          id: "ico",
          name: "Índice Cobertura Operacional (ICO = Dispo / Req)",
          options: [
            { label: "ICO ≥ 1.00 (Completo)", score: 0 },
            { label: "ICO 0.90 – 0.99", score: 5 },
            { label: "ICO 0.80 – 0.89", score: 10 },
            { label: "ICO 0.70 – 0.79", score: 15 },
            { label: "ICO < 0.70 (Insuficiente)", score: 20 }
          ]
        },
        {
          id: "capacitacion",
          name: "Nivel de Capacitación / Certificación",
          options: [
            { label: "100% Certificado", score: 0 },
            { label: "80% Certificado", score: 5 },
            { label: "60% Certificado", score: 10 },
            { label: "40% Certificado", score: 15 },
            { label: "< 40% Certificado", score: 20 }
          ]
        }
      ]
    },
    {
      id: "sa3",
      code: "SA3",
      title: "3. Vehículos y Parque Vehicular",
      weight: 0.10,
      variables: [
        {
          id: "disponibilidad_veh",
          name: "Disponibilidad Vehicular",
          options: [
            { label: "Todos disponibles", score: 0 },
            { label: "Falta vehículo secundario", score: 5 },
            { label: "Falta vehículo principal", score: 10 },
            { label: "Solo un vehículo disponible", score: 15 },
            { label: "Sin vehículos", score: 20 }
          ]
        },
        {
          id: "blindaje",
          name: "Nivel de Blindaje Requerido",
          options: [
            { label: "Blindaje requerido disponible", score: 0 },
            { label: "Blindaje inferior al requerido", score: 10 },
            { label: "Sin blindaje cuando corresponde", score: 20 }
          ]
        },
        {
          id: "combustible",
          name: "Nivel de Combustible",
          options: [
            { label: "Mayor a 90%", score: 0 },
            { label: "75% – 89%", score: 5 },
            { label: "50% – 74%", score: 10 },
            { label: "25% – 49%", score: 15 },
            { label: "Menor a 25%", score: 20 }
          ]
        },
        {
          id: "mantencion",
          name: "Estado de Mantenimiento",
          options: [
            { label: "Vigente", score: 0 },
            { label: "Próxima a vencer", score: 5 },
            { label: "Vencida < 30 días", score: 10 },
            { label: "Vencida > 30 días", score: 15 },
            { label: "Sin mantención", score: 20 }
          ]
        }
      ]
    },
    {
      id: "sa4",
      code: "SA4",
      title: "4. Inteligencia, Monitoreo y Contra-Vigilancia",
      weight: 0.10,
      variables: [
        {
          id: "barrido_tscm",
          name: "Barrido Electrónico (TSCM)",
          options: [
            { label: "Completo", score: 0 },
            { label: "Parcial", score: 10 },
            { label: "No realizado", score: 20 }
          ]
        },
        {
          id: "redes_sociales",
          name: "Monitoreo RRSS / Funas (SA4.1)",
          options: [
            { label: "Sin actividad relevante", score: 0 },
            { label: "Comentarios negativos aislados", score: 5 },
            { label: "Tendencia negativa", score: 10 },
            { label: "Funa activa en curso", score: 15 },
            { label: "Amenazas directas", score: 20 }
          ]
        },
        {
          id: "protestas",
          name: "Protestas / Conflictividad Social",
          options: [
            { label: "Ninguna", score: 0 },
            { label: "Convocatoria pequeña", score: 5 },
            { label: "Protesta cercana", score: 10 },
            { label: "Protesta en el lugar", score: 15 },
            { label: "Disturbios violentos", score: 20 }
          ]
        },
        {
          id: "intel_amenaza",
          name: "Inteligencia de Amenazas Directas",
          options: [
            { label: "Sin amenazas", score: 0 },
            { label: "Información sin confirmar", score: 5 },
            { label: "Amenaza probable", score: 10 },
            { label: "Amenaza confirmada", score: 15 },
            { label: "Amenaza inminente", score: 20 }
          ]
        },
        {
          id: "contra_vigilancia",
          name: "Contra-vigilancia Activa / Sombras (SA4.2)",
          options: [
            { label: "Implementada sin hallazgos", score: 0 },
            { label: "Hallazgos menores no confirmados", score: 10 },
            { label: "No realizada / Sombra confirmada", score: 20 }
          ]
        }
      ]
    },
    {
      id: "sa5",
      code: "SA5",
      title: "5. Nivel de Exposición del Lugar y Estabilidad de Accesos",
      weight: 0.10,
      variables: [
        {
          id: "tipo_lugar",
          name: "Tipo de Recinto / Infraestructura",
          options: [
            { label: "Recinto Militar", score: 0 },
            { label: "Recinto Policial", score: 2 },
            { label: "Empresa privada controlada", score: 4 },
            { label: "Hotel", score: 6 },
            { label: "Casa Particular", score: 8 },
            { label: "Centro de Convenciones", score: 10 },
            { label: "Hospital", score: 12 },
            { label: "Mall / Centro Comercial", score: 14 },
            { label: "Lugar Abierto", score: 16 },
            { label: "Manifestación Pública", score: 20 }
          ]
        },
        {
          id: "estabilidad_rutas",
          name: "Riesgo de Bloqueo / Inestabilidad (SA5.1)",
          options: [
            { label: "Accesos estables / Rutas múltiples", score: 0 },
            { label: "Riesgo moderado de bloqueo", score: 10 },
            { label: "Alto riesgo de bloqueo / Acceso único", score: 20 }
          ]
        }
      ],
      modifiers: [
        { id: "mod_subterraneo", label: "Subterráneo (+2)" },
        { id: "mod_azotea", label: "Azotea / Altura (+2)" },
        { id: "mod_accesos_sin_control", label: "Múltiples accesos sin control (+2)" },
        { id: "mod_gran_concentracion", label: "Gran concentración de personas (+2)" },
        { id: "mod_sin_control_ingreso", label: "Sin control de ingreso (+2)" }
      ]
    },
    {
      id: "sa6",
      code: "SA6",
      title: "6. Infraestructura de Seguridad del Lugar",
      weight: 0.15,
      isMultiItemAverage: true,
      items: [
        "Estacionamiento seguro", "Vías de escape", "Red seca", "Red húmeda",
        "Grupo electrógeno", "Botiquín", "DEA", "Cuarto seguro",
        "Cobertura telefónica", "Cobertura radial", "Internet",
        "Puntos de evacuación", "Control de accesos", "CCTV", "Iluminación de emergencia"
      ],
      itemOptions: [
        { label: "Disponible y operativo", score: 0 },
        { label: "Disponible con obs.", score: 10 },
        { label: "No disponible", score: 20 }
      ]
    },
    {
      id: "sa7",
      code: "SA7",
      title: "7. Evaluación Táctica de Rutas",
      weight: 0.10,
      isMultiItemAverage: true,
      items: [
        "Estado del camino", "Congestión vehicular", "Cobertura telefónica",
        "Cobertura radial", "Proximidad hospitales", "Proximidad cuarteles",
        "Riesgo de protestas", "Iluminación vial", "Vías alternativas"
      ],
      itemOptions: [
        { label: "Óptimo", score: 0 },
        { label: "Bueno", score: 5 },
        { label: "Regular", score: 10 },
        { label: "Malo", score: 15 },
        { label: "Crítico", score: 20 }
      ],
      extraVariables: [
        {
          id: "choke_points",
          name: "Estrangulamiento y Maniobrabilidad (SA7.1)",
          options: [
            { label: "Óptimo (Sin choke points)", score: 0 },
            { label: "Bueno (1-2 estrangulamientos)", score: 5 },
            { label: "Regular (3-4 estrangulamientos)", score: 10 },
            { label: "Malo (Dependencia crítica)", score: 15 },
            { label: "Crítico (Sin maniobrabilidad)", score: 20 }
          ]
        }
      ]
    },
    {
      id: "sa8",
      code: "SA8",
      title: "8. Servicios de Emergencia y Capacidad Médica",
      weight: 0.05,
      variables: [
        {
          id: "distancia_hospital",
          name: "Distancia a Hospital de Referencia",
          options: [
            { label: "< 5 km", score: 0 },
            { label: "5 – 10 km", score: 5 },
            { label: "10 – 20 km", score: 10 },
            { label: "> 20 km", score: 15 },
            { label: "No existe", score: 20 }
          ]
        },
        {
          id: "capacidad_hospitalaria",
          name: "Nivel Capacidad Hospitalaria (SA8.1)",
          options: [
            { label: "Centro Trauma Niv. 1 (24/7)", score: 0 },
            { label: "Hosp. General Quirúrgico", score: 5 },
            { label: "Clínica Horario Limitado", score: 10 },
            { label: "Atención Primaria / SAPU", score: 15 },
            { label: "Sin Capacidad Quirúrgica", score: 20 }
          ]
        },
        {
          id: "distancia_seguridad",
          name: "Proximidad Comisaría / Bomberos / SAMU",
          options: [
            { label: "< 5 km", score: 0 },
            { label: "5 – 10 km", score: 5 },
            { label: "10 – 20 km", score: 10 },
            { label: "> 20 km", score: 15 },
            { label: "No existe", score: 20 }
          ]
        }
      ]
    },
    {
      id: "sa9",
      code: "SA9",
      title: "9. Comunicaciones y Redundancia",
      weight: 0.05,
      variables: [
        {
          id: "redundancia_comms",
          name: "Redundancia de Comunicaciones",
          options: [
            { label: "Redundancia total (Celular + Radio + Satelital)", score: 0 },
            { label: "Dos sistemas operativos", score: 5 },
            { label: "Un solo sistema disponible", score: 10 },
            { label: "Cobertura deficiente", score: 15 },
            { label: "Sin comunicaciones", score: 20 }
          ]
        }
      ]
    },
    {
      id: "sa10",
      code: "SA10",
      title: "10. Planes de Contingencia y Resiliencia",
      weight: 0.05,
      isMultiItemAverage: true,
      items: [
        "Plan de evacuación", "Plan médico", "Plan de atentado",
        "Plan de incendio", "Plan de protesta", "Plan de extracción",
        "Plan falla comunicaciones", "Plan vehículo averiado"
      ],
      itemOptions: [
        { label: "Actualizado", score: 0 },
        { label: "Desactualizado", score: 10 },
        { label: "No existe", score: 20 }
      ],
      extraVariables: [
        {
          id: "contingencia_colapso",
          name: "Contingencia por Colapso / Bloqueos (SA10.1)",
          options: [
            { label: "Planes probados y dinámicos", score: 0 },
            { label: "Planes parcialmente revisados", score: 10 },
            { label: "No contempla colapso ni bloqueos", score: 20 }
          ]
        }
      ]
    }
  ];

  let currentState = {
    values: {},
    modifiers: {},
    notes: "",
    terreno: []
  };

  function init() {
    MATRIX_AREAS.forEach(area => {
      if (area.variables) {
        area.variables.forEach(v => {
          if (currentState.values[v.id] === undefined) currentState.values[v.id] = 0;
        });
      }
      if (area.modifiers) {
        area.modifiers.forEach(m => {
          if (currentState.modifiers[m.id] === undefined) currentState.modifiers[m.id] = false;
        });
      }
      if (area.isMultiItemAverage && area.items) {
        area.items.forEach((item, idx) => {
          const key = `${area.id}_item_${idx}`;
          if (currentState.values[key] === undefined) currentState.values[key] = 0;
        });
      }
      if (area.extraVariables) {
        area.extraVariables.forEach(v => {
          if (currentState.values[v.id] === undefined) currentState.values[v.id] = 0;
        });
      }
    });
  }

  function mount(container) {
    init();
    render(container);
    loadData();
  }

  function render(container) {
    const vipId = window.MierpeVips?.getCurrentVipId ? window.MierpeVips.getCurrentVipId() : null;

    if (!vipId) {
      container.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #cbd5e1; font-family: sans-serif;">
          <h2>M7 · Servicio de Avanzada</h2>
          <p>Por favor, selecciona un VIP en la barra superior para continuar.</p>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div id="m7-export-area" style="padding: 20px; color: #f8fafc; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0f172a; min-height: 100vh;">
        <!-- ENCABEZADO -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #334155; padding-bottom: 15px; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
          <div>
            <h1 style="margin: 0; font-size: 1.8rem; color: #38bdf8; letter-spacing: -0.5px;">M7 · EVALUACIÓN Y SERVICIO DE AVANZADA</h1>
            <p style="margin: 5px 0 0 0; color: #94a3b8; font-size: 0.9rem;">Matriz Maestra de Evaluación Operacional de Riesgo y Asignación de Recursos (10 Áreas / ISO 31000)</p>
          </div>
          <div style="display: flex; gap: 10px;">
            <button id="btn-m7-pdf" style="background: #0284c7; color: white; border: none; padding: 10px 16px; border-radius: 6px; cursor: pointer; font-weight: bold; display: flex; align-items: center; gap: 6px; transition: all 0.2s;">
              📄 Descargar PDF
            </button>
            <button id="btn-m7-reset" style="background: #dc2626; color: white; border: none; padding: 10px 16px; border-radius: 6px; cursor: pointer; font-weight: bold; display: flex; align-items: center; gap: 6px; transition: all 0.2s;">
              🔄 Reiniciar Evento
            </button>
          </div>
        </div>

        <!-- PANEL SUPERIOR: RESULTADOS, ALERTAS Y RECURSOS -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px;">
          <!-- GRÁFICO DE RADAR / BARRAS MATRIX -->
          <div style="background: #1e293b; padding: 15px; border-radius: 8px; border: 1px solid #334155; text-align: center;">
            <h3 style="margin-top: 0; color: #38bdf8; font-size: 1.1rem; display: flex; justify-content: space-between; align-items: center;">
              <span>Perfil Multidimensional por Área</span>
              <span id="m7-sea-score-badge" style="font-size: 0.9rem; background: #0f172a; padding: 4px 10px; border-radius: 20px; border: 1px solid #38bdf8;">SEA: 0.0 / 20</span>
            </h3>
            <div style="position: relative; width: 100%; height: 230px; display: flex; justify-content: center; align-items: center;">
              <canvas id="m7Chart" width="380" height="220"></canvas>
            </div>
          </div>

          <!-- MOTOR DE REGLAS / ALERTAS Y RECURSOS -->
          <div style="background: #1e293b; padding: 15px; border-radius: 8px; border: 1px solid #334155; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <h3 style="margin-top: 0; color: #38bdf8; font-size: 1.1rem;">Decisión Operacional & Alertas Inteligentes</h3>
              <div id="m7-decision-panel" style="margin-bottom: 12px;"></div>
            </div>
            <div>
              <h4 style="margin: 8px 0 5px 0; color: #38bdf8; font-size: 0.95rem;">Requerimiento Estimado de Recursos</h4>
              <div id="m7-resources-panel" style="font-size: 0.85rem; line-height: 1.4; color: #e2e8f0; background: #0f172a; padding: 10px; border-radius: 6px; border: 1px solid #334155;"></div>
            </div>
          </div>
        </div>

        <!-- ALERTAS CRÍTICAS DEL MOTOR -->
        <div id="m7-alerts-container" style="margin-bottom: 25px;"></div>

        <!-- 10 ÁREAS DE LA MATRIZ MAESTRA -->
        <div style="margin-bottom: 25px;">
          <h2 style="color: #f1f5f9; font-size: 1.3rem; border-left: 4px solid #38bdf8; padding-left: 10px; margin-bottom: 15px;">
            Matriz Maestra de Evaluación (SA1 – SA10)
          </h2>
          ${MATRIX_AREAS.map(area => renderAreaBlock(area)).join("")}
        </div>

        <!-- OBSERVACIONES Y ÓRDENES ESPECIALES -->
        <div style="background: #1e293b; padding: 15px; border-radius: 8px; border: 1px solid #334155; margin-bottom: 25px;">
          <h3 style="margin-top: 0; color: #38bdf8; font-size: 1.1rem;">Observaciones y Órdenes Especiales de la Avanzada</h3>
          <textarea id="m7-notes" rows="3" style="width: 100%; background: #0f172a; color: #f8fafc; border: 1px solid #475569; border-radius: 6px; padding: 10px; box-sizing: border-box; font-family: inherit;" placeholder="Escriba notas adicionales del despliegue, enlaces tácticos o requerimientos de coordinación...">${currentState.notes || ""}</textarea>
        </div>

        <!-- REGISTROS EN TERRENO (SECCIÓN FINAL) -->
        <div style="background: #1e293b; padding: 15px; border-radius: 8px; border: 1px solid #334155;">
          <h3 style="margin-top: 0; color: #38bdf8; font-size: 1.1rem;">Registros y Novedades en Terreno</h3>
          <div style="display: flex; gap: 10px; margin-bottom: 15px;">
            <input type="text" id="m7-terreno-input" placeholder="Agregar novedad, punto de control o hallazgo en terreno..." style="flex: 1; background: #0f172a; color: #fff; border: 1px solid #475569; border-radius: 6px; padding: 8px 12px; font-size: 0.9rem;">
            <button id="btn-add-terreno" style="background: #10b981; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold;">+ Agregar</button>
          </div>
          <ul id="m7-terreno-list" style="list-style: none; padding: 0; margin: 0; max-height: 200px; overflow-y: auto;">
            ${(currentState.terreno || []).map((t, idx) => `
              <li style="background: #0f172a; padding: 8px 12px; border-radius: 4px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #334155;">
                <span style="font-size: 0.88rem; color: #cbd5e1;"><strong>[${t.time}]</strong> ${t.text}</span>
                <button onclick="window.MierpeM7.removeTerreno(${idx})" style="background: transparent; color: #ef4444; border: none; cursor: pointer; font-weight: bold; font-size: 1.1rem;">✕</button>
              </li>
            `).join("")}
          </ul>
        </div>
      </div>
    `;

    bindEvents();
    updateCalculations();
  }

  function renderAreaBlock(area) {
    return `
      <div style="background: #1e293b; padding: 15px; border-radius: 8px; border: 1px solid #334155; margin-bottom: 15px;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 8px; margin-bottom: 12px;">
          <h4 style="margin: 0; color: #38bdf8; font-size: 1rem; font-weight: 600;">${area.title}</h4>
          <span style="font-size: 0.8rem; color: #94a3b8; background: #0f172a; padding: 2px 8px; border-radius: 4px;">Peso: ${area.weight * 100}%</span>
        </div>

        ${area.variables ? area.variables.map(v => renderVariableRow(v)).join("") : ""}

        ${area.modifiers ? `
          <div style="margin-top: 10px; padding: 10px; background: #0f172a; border-radius: 6px; border: 1px dashed #475569;">
            <span style="font-size: 0.85rem; color: #38bdf8; font-weight: bold; display: block; margin-bottom: 8px;">Factores Modificadores (+2 pts c/u, Máx +6):</span>
            <div style="display: flex; flex-wrap: wrap; gap: 12px;">
              ${area.modifiers.map(m => `
                <label style="font-size: 0.85rem; color: #cbd5e1; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                  <input type="checkbox" class="m7-modifier-checkbox" data-mod="${m.id}" ${currentState.modifiers[m.id] ? "checked" : ""}>
                  ${m.label}
                </label>
              `).join("")}
            </div>
          </div>
        ` : ""}

        ${area.isMultiItemAverage && area.items ? area.items.map((item, idx) => {
          const key = `${area.id}_item_${idx}`;
          const currentVal = currentState.values[key] !== undefined ? currentState.values[key] : 0;
          return renderItemRow(key, item, area.itemOptions, currentVal);
        }).join("") : ""}

        ${area.extraVariables ? area.extraVariables.map(v => renderVariableRow(v)).join("") : ""}
      </div>
    `;
  }

  function renderVariableRow(v) {
    const currentVal = currentState.values[v.id] !== undefined ? currentState.values[v.id] : 0;
    return `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #1e293b; gap: 15px;">
        <span style="font-size: 0.88rem; color: #cbd5e1; flex: 1; min-width: 0; word-break: break-word;">${v.name}</span>
        <select class="m7-value-select" data-var="${v.id}" style="background: #0f172a; color: #f8fafc; border: 1px solid #475569; border-radius: 4px; padding: 5px 8px; font-size: 0.85rem; width: 170px; flex-shrink: 0; cursor: pointer;">
          ${v.options.map(opt => `
            <option value="${opt.score}" ${currentVal === opt.score ? "selected" : ""}>${opt.score} pts · ${opt.label}</option>
          `).join("")}
        </select>
      </div>
    `;
  }

  function renderItemRow(key, label, options, currentVal) {
    return `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #1e293b; gap: 15px;">
        <span style="font-size: 0.88rem; color: #cbd5e1; flex: 1; min-width: 0; word-break: break-word;">${label}</span>
        <select class="m7-value-select" data-var="${key}" style="background: #0f172a; color: #f8fafc; border: 1px solid #475569; border-radius: 4px; padding: 5px 8px; font-size: 0.85rem; width: 170px; flex-shrink: 0; cursor: pointer;">
          ${options.map(opt => `
            <option value="${opt.score}" ${currentVal === opt.score ? "selected" : ""}>${opt.score} pts · ${opt.label}</option>
          `).join("")}
        </select>
      </div>
    `;
  }

  function bindEvents() {
    document.querySelectorAll(".m7-value-select").forEach(sel => {
      sel.addEventListener("change", (e) => {
        const varId = e.target.getAttribute("data-var");
        currentState.values[varId] = parseFloat(e.target.value);
        updateCalculations();
        saveData();
      });
    });

    document.querySelectorAll(".m7-modifier-checkbox").forEach(chk => {
      chk.addEventListener("change", (e) => {
        const modId = e.target.getAttribute("data-mod");
        currentState.modifiers[modId] = e.target.checked;
        updateCalculations();
        saveData();
      });
    });

    const notesTxt = document.getElementById("m7-notes");
    if (notesTxt) {
      notesTxt.addEventListener("input", (e) => {
        currentState.notes = e.target.value;
        saveData();
      });
    }

    const btnTerreno = document.getElementById("btn-add-terreno");
    if (btnTerreno) {
      btnTerreno.addEventListener("click", () => {
        const input = document.getElementById("m7-terreno-input");
        if (input && input.value.trim() !== "") {
          const now = new Date();
          const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          currentState.terreno.push({ time: timeStr, text: input.value.trim() });
          input.value = "";
          saveData();
          render(document.getElementById("module-root"));
        }
      });
    }

    const btnPdf = document.getElementById("btn-m7-pdf");
    if (btnPdf) {
      btnPdf.addEventListener("click", exportPDF);
    }

    const btnReset = document.getElementById("btn-m7-reset");
    if (btnReset) {
      btnReset.addEventListener("click", handleReset);
    }
  }

  function handleReset() {
    const confirmDownload = confirm("¿Desea descargar el informe del evento actual en PDF antes de reiniciar?");
    if (confirmDownload) {
      exportPDF();
      setTimeout(() => {
        executeReset();
      }, 1200);
    } else {
      executeReset();
    }
  }

  function executeReset() {
    currentState.values = {};
    currentState.modifiers = {};
    currentState.notes = "";
    currentState.terreno = [];
    init();
    saveData();
    render(document.getElementById("module-root"));
  }

  function calculateAreaScores() {
    const areaScores = {};

    MATRIX_AREAS.forEach(area => {
      let areaScore = 0;

      if (area.id === "sa5") {
        const baseTipo = currentState.values["tipo_lugar"] || 0;
        let modSum = 0;
        if (area.modifiers) {
          area.modifiers.forEach(m => {
            if (currentState.modifiers[m.id]) modSum += 2;
          });
        }
        modSum = Math.min(modSum, 6);
        const estab = currentState.values["estabilidad_rutas"] || 0;
        areaScore = Math.min(20, baseTipo + modSum + (estab / 2));
      } else if (area.isMultiItemAverage) {
        let itemSum = 0;
        let count = 0;
        if (area.items) {
          area.items.forEach((item, idx) => {
            const key = `${area.id}_item_${idx}`;
            itemSum += currentState.values[key] || 0;
            count++;
          });
        }
        let avg = count > 0 ? itemSum / count : 0;
        if (area.extraVariables) {
          area.extraVariables.forEach(v => {
            avg = Math.max(avg, currentState.values[v.id] || 0);
          });
        }
        areaScore = avg;
      } else if (area.variables) {
        let sum = 0;
        area.variables.forEach(v => {
          sum += currentState.values[v.id] || 0;
        });
        areaScore = sum / area.variables.length;
      }

      areaScores[area.code] = Math.min(20, Math.max(0, areaScore));
    });

    return areaScores;
  }

  function updateCalculations() {
    const areaScores = calculateAreaScores();
    let seaScore = 0;

    MATRIX_AREAS.forEach(area => {
      const score = areaScores[area.code] || 0;
      seaScore += score * area.weight;
    });

    seaScore = Math.round(seaScore * 10) / 10;

    const scoreBadge = document.getElementById("m7-sea-score-badge");
    if (scoreBadge) {
      scoreBadge.innerText = `SEA: ${seaScore.toFixed(1)} / 20.0`;
    }

    let decisionText = "";
    let levelClass = "";
    let color = "#10b981";

    if (seaScore <= 4.0) {
      levelClass = "ÓPTIMO";
      color = "#10b981";
      decisionText = "🟢 Misión autorizada.";
    } else if (seaScore <= 8.0) {
      levelClass = "BUENO";
      color = "#3b82f6";
      decisionText = "🟢 Misión autorizada con observaciones menores.";
    } else if (seaScore <= 12.0) {
      levelClass = "MODERADO";
      color = "#f59e0b";
      decisionText = "🟡 Corregir observaciones antes del inicio.";
    } else if (seaScore <= 16.0) {
      levelClass = "ALTO";
      color = "#f97316";
      decisionText = "🟠 Requiere mitigación obligatoria y aprobación del Jefe de Protección.";
    } else {
      levelClass = "CRÍTICO";
      color = "#ef4444";
      decisionText = "🔴 Misión no autorizada hasta eliminar las brechas críticas.";
    }

    const decisionPanel = document.getElementById("m7-decision-panel");
    if (decisionPanel) {
      decisionPanel.innerHTML = `
        <div style="background: #0f172a; padding: 10px 14px; border-radius: 6px; border-left: 5px solid ${color};">
          <div style="font-size: 0.85rem; color: #94a3b8;">ÍNDICE DE SERVICIO DE AVANZADA (SEA)</div>
          <div style="font-size: 1.1rem; font-weight: bold; color: ${color}; margin: 2px 0;">${seaScore.toFixed(1)} pts · Nivel ${levelClass}</div>
          <div style="font-size: 0.9rem; color: #f8fafc; font-weight: 500;">${decisionText}</div>
        </div>
      `;
    }

    const resourcesPanel = document.getElementById("m7-resources-panel");
    if (resourcesPanel) {
      let rrhh = "";
      let logistica = "";

      if (seaScore <= 4.0) {
        rrhh = "• 2 Escoltas Avanzados + 1 Conductor Táctico";
        logistica = "• 1 Vehículo SUV Convencional, Radios VHF Portátiles, Kit IFAK Básico.";
      } else if (seaScore <= 8.0) {
        rrhh = "• 3-4 Agentes de Protección (Avanzada + Anillo Cercano)";
        logistica = "• 1-2 Vehículos SUV, Red Radio VHF Privada + Enlace GPS, Botiquín APH.";
      } else if (seaScore <= 12.0) {
        rrhh = "• 4-6 Agentes Tácticos + 2 Conductores Tácticos";
        logistica = "• 2 Vehículos SUV (1 Blindado), Radios Cifradas, Kit Balístico IIIA, DEA.";
      } else if (seaScore <= 16.0) {
        rrhh = "• 6-8 Agentes Tácticos + Equipo de Reacción / Cobertura";
        logistica = "• Convoy Blindado, Inhibidor Frecuencias / GPS, Apoyo Policial Directo.";
      } else {
        rrhh = "• Despliegue Especial de Crisis / Escuadra Táctica Completa";
        logistica = "• Convoy Blindado Nivel Alto, Evacuación Aérea Pre-Coordinada, Red Satelital.";
      }

      resourcesPanel.innerHTML = `
        <div style="margin-bottom: 4px;"><strong>RRHH:</strong> ${rrhh}</div>
        <div><strong>Logística:</strong> ${logistica}</div>
      `;
    }

    generateAlerts(areaScores);
    drawChart(areaScores);
  }

  function generateAlerts(areaScores) {
    const alerts = [];

    if (currentState.values["blindaje"] === 20) {
      alerts.push("⚠️ <strong>Riesgo Crítico de Transporte:</strong> Vehículo blindado requerido no está disponible. El nivel de protección no cumple los requisitos.");
    }

    if (currentState.values["barrido_tscm"] === 20 && (currentState.values["tipo_lugar"] || 0) >= 6) {
      alerts.push("⚠️ <strong>Alerta TSCM:</strong> Barrido electrónico no realizado en recinto de alta exposición. Ejecutar inspección TSCM antes del ingreso del VIP.");
    }

    if (currentState.values["protestas"] >= 15 && currentState.values["estabilidad_rutas"] >= 10) {
      alerts.push("🚨 <strong>Conflicto Social en Ruta:</strong> Protestas activas en la zona con alto riesgo de bloqueo. Se sugiere descartar ruta primaria y activar Ruta 2.");
    }

    if (currentState.values["distancia_hospital"] >= 15 && currentState.values["capacidad_hospitalaria"] >= 15) {
      alerts.push("🏥 <strong>Brecha Médica Severa:</strong> Hospital a más de 20 km sin capacidad quirúrgica 24/7. Recomendar ambulancia UTI/Soporte Vital Avanzado o evac. aérea.");
    }

    if (currentState.values["redes_sociales"] === 15) {
      alerts.push("📢 <strong>SA4.1 Funa Activa / Escenificación:</strong> Se detecta campaña de descrédito activa. Verificar escenario en terreno y coordinar acceso por zona restringida.");
    }

    if (currentState.values["contra_vigilancia"] === 20) {
      alerts.push("🔴 <strong>SA4.2 ALERTA ROJA (Sombra Confirmada):</strong> Se confirma seguimiento activo durante la avanzada. Se recomienda reprogramar, cambiar ubicación y notificar al Jefe de Protección.");
    }

    if (currentState.values["choke_points"] >= 15) {
      alerts.push("🚧 <strong>SA7.1 Choke Point Crítico:</strong> Estrangulamiento en ruta sin maniobrabilidad de evasión. Priorizar ruta alternativa o solicitar apoyo de escolta policial.");
    }

    if (currentState.values["contingencia_colapso"] === 20 && (areaScores["SA5"] || 0) >= 12) {
      alerts.push("⚡ <strong>SA10.1 Contingencia Incompleta:</strong> Alta vulnerabilidad de accesos sin planes probados ante colapso de infraestructura. Actualizar planes antes de autorizar.");
    }

    const container = document.getElementById("m7-alerts-container");
    if (container) {
      if (alerts.length > 0) {
        container.innerHTML = `
          <div style="background: #1e1b4b; border: 1px solid #6366f1; border-radius: 8px; padding: 12px 16px;">
            <h4 style="margin: 0 0 8px 0; color: #a5b4fc; font-size: 0.95rem;">🤖 Motor de Reglas Inteligentes VIGIPROT (${alerts.length} Alertas Active)</h4>
            <ul style="margin: 0; padding-left: 20px; color: #e0e7ff; font-size: 0.85rem; line-height: 1.5;">
              ${alerts.map(a => `<li style="margin-bottom: 4px;">${a}</li>`).join("")}
            </ul>
          </div>
        `;
      } else {
        container.innerHTML = "";
      }
    }
  }

function drawChart(dimScores) {
    const canvas = document.getElementById("m7Chart") || document.getElementById("m6Chart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Obtener los valores de las dimensiones de M7
    const ia = dimScores["IA"] || dimScores["F1"] || 0;
    const r  = dimScores["R"]  || dimScores["F2"] || 0;
    const m  = dimScores["M"]  || dimScores["F3"] || 0;
    const p  = dimScores["P"]  || dimScores["F4"] || 0;
    const a  = dimScores["A"]  || dimScores["F5"] || 0;
    const d  = dimScores["D"]  || dimScores["F6"] || 0;
    const c  = dimScores["C"]  || dimScores["F7"] || 0;

    // FÓRMULA M7: Cálculo de Nivel de Riesgo de la Avanzada (NRA)
    let nra = (ia * 0.20) + (r * 0.15) + (m * 0.15) + (p * 0.15) + (a * 0.15) + (d * 0.10) + (c * 0.10);
    nra = Math.min(20, Math.max(0, nra));

    const centerX = canvas.width / 2;
    const centerY = canvas.height - 30; // Posición inferior para semicírculo
    const radius = 130;

    const startAngle = Math.PI; // 180° (Izquierda)
    const endAngle = 0;        // 0° (Derecha)

    // 1. Arco de fondo por zonas de color (Tacómetro)
    const zones = [
      { max: 5, color: "#10b981" },  // Verde
      { max: 10, color: "#3b82f6" }, // Azul
      { max: 14, color: "#f59e0b" }, // Amarillo
      { max: 17, color: "#f97316" }, // Naranja
      { max: 20, color: "#ef4444" }  // Rojo (Redline)
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

    // 2. Marcas de graduación (Ticks estilo tacómetro)
    for (let i = 0; i <= 20; i += 2) {
      const angle = startAngle + (i / 20) * Math.PI;
      const isMajor = i % 5 === 0;
      const tickLength = isMajor ? 12 : 6;

      const innerX = centerX + Math.cos(angle) * (radius - 12);
      const innerY = centerY + Math.sin(angle) * (radius - 12);
      const outerX = centerX + Math.cos(angle) * (radius - 12 - tickLength);
      const outerY = centerY + Math.sin(angle) * (radius - 12 - tickLength);

      ctx.beginPath();
      ctx.moveTo(innerX, innerY);
      ctx.lineTo(outerX, outerY);
      ctx.strokeStyle = isMajor ? "#f8fafc" : "#64748b";
      ctx.lineWidth = isMajor ? 2 : 1;
      ctx.stroke();

      // Etiquetas numéricas principales
      if (isMajor) {
        const textX = centerX + Math.cos(angle) * (radius - 32);
        const textY = centerY + Math.sin(angle) * (radius - 32);
        ctx.fillStyle = "#94a3b8";
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(i.toString(), textX, textY);
      }
    }

    // 3. Aguja del indicador
    const needleAngle = startAngle + (nra / 20) * Math.PI;
    const needleLength = radius - 20;

    const needleX = centerX + Math.cos(needleAngle) * needleLength;
    const needleY = centerY + Math.sin(needleAngle) * needleLength;

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(needleX, needleY);
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Pivote central
    ctx.beginPath();
    ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#f8fafc";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#0f172a";
    ctx.fill();

    // 4. Lectura digital central
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${nra.toFixed(1)} NRA`, centerX, centerY - 20);
  }

  function exportPDF() {
    const element = document.getElementById("m7-export-area");
    if (!element) return;

    if (typeof html2canvas !== "undefined" && window.jspdf) {
      html2canvas(element, { scale: 2, backgroundColor: "#0f172a" }).then(canvas => {
        const imgData = canvas.toDataURL("image/png");
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF("p", "mm", "a4");
        const imgWidth = 210;
        const pageHeight = 295;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        while (heightLeft >= 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        pdf.save(`Informe_M7_Matriz_Avanzada_${new Date().toISOString().slice(0, 10)}.pdf`);
      });
    } else {
      alert("Error: Las librerías de generación PDF (html2canvas / jsPDF) no están cargadas.");
    }
  }

  function removeTerreno(index) {
    if (currentState.terreno && currentState.terreno[index]) {
      currentState.terreno.splice(index, 1);
      saveData();
      render(document.getElementById("module-root"));
    }
  }

  function loadData() {
    if (window.MierpeStorage && window.MierpeVips) {
      const vipId = window.MierpeVips.getCurrentVipId();
      if (!vipId) return;

      window.MierpeStorage.getVipDoc(vipId, DB_COLLECTION, DOC_ID)
        .then(data => {
          if (data) {
            currentState = Object.assign(currentState, data);
            init();
            render(document.getElementById("module-root"));
          }
        })
        .catch(err => console.error("Error cargando M7:", err));
    }
  }

  function saveData() {
    if (window.MierpeStorage && window.MierpeVips) {
      const vipId = window.MierpeVips.getCurrentVipId();
      if (!vipId) return;

      window.MierpeStorage.setVipDoc(vipId, DB_COLLECTION, DOC_ID, currentState)
        .catch(err => console.error("Error guardando M7:", err));
    }
  }

  return {
    mount,
    removeTerreno
  };
})();