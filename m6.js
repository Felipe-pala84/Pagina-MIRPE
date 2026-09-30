/**
 * MÓDULO M6 - SISTEMA DE EVALUACIÓN DEL ENTORNO FAMILIAR (SEEF)
 * 
 * Implementación basada fielmente en la Matriz Maestra de Variables M6:
 *  - Estructura ponderada de 7 Dimensiones (F1 a F7) sumando 100%:
 *    RF = (VEF*0.22) + (VUF*0.18) + (NEF*0.13) + (NAF*0.20) + ((20-NPF)*0.15) + (F6*0.05) + (F7*0.07)
 *  - Cálculo del Índice de Impacto Familiar (IIF): IIF = Math.sqrt(VEF * RF) [Media Geométrica]
 *  - Clasificación de Riesgo Familiar y Nivel de Impacto.
 *  - Motor Inteligente de Reglas y Alertas Automáticas (M7, M3, M1, M2).
 *  - Visualización del "Escudo Familiar" (Gráfico Circular / Radar en Canvas).
 *  - Gestión Multi-Familiar (Permite agregar varios familiares y evaluar cada uno individualmente).
 *  - Registros y Novedades del Entorno Familiar.
 *  - Reporte PDF detallado con desglose de matriz.
 *  - Botón "Reiniciar Evento Familiar" con flujo de confirmación de descarga previa.
 *  - Interfaz responsiva idéntica a M7, con selectores compactos y etiquetas explicativas.
 */

window.MierpeM6 = (function () {
  const DB_COLLECTION = "m6State";
  const DOC_ID = "current-state";

  // DEFINICIÓN DE DIMENSIONES, PESOS Y VARIABLES SEGÚN MATRIZ MAESTRA M6
  const MATRIX_DIMENSIONS = [
    {
      id: "f1",
      code: "F1",
      title: "1. Valor Estratégico del Familiar (VEF)",
      weight: 0.22,
      variables: [
        {
          id: "tipo_vinculo",
          name: "Tipo de Vínculo Familiar",
          options: [
            { label: "Cónyuge / Hijo menor de edad", score: 20 },
            { label: "Hijo adulto dependiente", score: 18 },
            { label: "Padre o Madre", score: 15 },
            { label: "Hijo adulto independiente", score: 12 },
            { label: "Hermano / Nieto", score: 10 },
            { label: "Abuelo / Familiar conviviente", score: 8 },
            { label: "Otro familiar", score: 5 }
          ]
        },
        {
          id: "dependencia_emocional",
          name: "Dependencia Emocional",
          options: [
            { label: "Baja", score: 5 },
            { label: "Moderada", score: 10 },
            { label: "Alta", score: 15 },
            { label: "Crítica", score: 20 }
          ]
        },
        {
          id: "dependencia_economica",
          name: "Dependencia Económica",
          options: [
            { label: "Ninguna", score: 0 },
            { label: "Parcial", score: 10 },
            { label: "Total", score: 20 }
          ]
        },
        {
          id: "dependencia_funcional",
          name: "Dependencia Funcional (VIP Cuidador/Responsable)",
          options: [
            { label: "Ninguna", score: 0 },
            { label: "Parcial", score: 10 },
            { label: "Total", score: 20 }
          ]
        }
      ]
    },
    {
      id: "f2",
      code: "F2",
      title: "2. Vulnerabilidad del Familiar (VUF)",
      weight: 0.18,
      variables: [
        {
          id: "vuf_edad",
          name: "Edad del Familiar",
          options: [
            { label: "18 a 60 años", score: 5 },
            { label: "61 a 75 años", score: 12 },
            { label: "13 a 17 años", score: 15 },
            { label: "Mayor de 75 años", score: 18 },
            { label: "Menor de 12 años", score: 20 }
          ]
        },
        {
          id: "vuf_estado_medico",
          name: "Estado Médico (Integración M2)",
          options: [
            { label: "Excelente / Sin patologías", score: 0 },
            { label: "Patología menor tratada", score: 5 },
            { label: "Condición crónica controlada", score: 10 },
            { label: "Condición severa / Tratamiento continuo", score: 15 },
            { label: "Condición crítica / Movilidad reducida", score: 20 }
          ]
        },
        {
          id: "vuf_movilidad",
          name: "Nivel de Movilidad",
          options: [
            { label: "Independiente", score: 0 },
            { label: "Uso de Bastón", score: 5 },
            { label: "Uso de Muletas", score: 8 },
            { label: "Uso de Andador", score: 12 },
            { label: "Silla de Ruedas", score: 16 },
            { label: "Dependencia Total", score: 20 }
          ]
        },
        {
          id: "vuf_rutinas",
          name: "Previsibilidad de Rutinas",
          options: [
            { label: "Variables / Aleatorias", score: 0 },
            { label: "Moderadamente previsibles", score: 10 },
            { label: "Muy previsibles / Rigidas", score: 20 }
          ]
        },
        {
          id: "vuf_transporte",
          name: "Medio de Transporte Habitual",
          options: [
            { label: "Escolta permanente", score: 0 },
            { label: "Conductor privado", score: 5 },
            { label: "Vehículo propio", score: 10 },
            { label: "Transporte por aplicación", score: 12 },
            { label: "Transporte público", score: 20 }
          ]
        },
        {
          id: "vuf_capacitacion",
          name: "Competencias en Seguridad Personal",
          options: [
            { label: "Capacitación avanzada", score: 0 },
            { label: "Capacitación básica", score: 5 },
            { label: "Sin capacitación", score: 20 }
          ]
        },
        {
          id: "vuf_conducta_riesgo",
          name: "F2.1 Conducta de Riesgo / Disciplina Táctica",
          options: [
            { label: "Disciplinado (Sigue protocolos)", score: 0 },
            { label: "Ocasionalmente negligente", score: 5 },
            { label: "Rechazo sistemático a recomendaciones", score: 10 },
            { label: "Conducta de alto riesgo / Exposición innecesaria", score: 15 },
            { label: "Hostil al equipo de protección / Brechas activas", score: 20 }
          ]
        }
      ]
    },
    {
      id: "f3",
      code: "F3",
      title: "3. Nivel de Exposición Digital y Pública (NEF)",
      weight: 0.13,
      variables: [
        {
          id: "f3_redes_sociales",
          name: "F3.1 Perfil en Redes Sociales",
          options: [
            { label: "Sin perfiles públicos / Privados", score: 0 },
            { label: "Perfil privado, bajo seguimiento (<100)", score: 5 },
            { label: "Perfil público moderado (100-1000)", score: 10 },
            { label: "Perfil público alta exposición (>1000)", score: 15 },
            { label: "Perfil público masivo / Polarizante", score: 20 }
          ]
        },
        {
          id: "f3_privacidad",
          name: "F3.2 Configuración de Privacidad",
          options: [
            { label: "Privacidad máxima (Restringido)", score: 0 },
            { label: "Privacidad parcial (Info básica)", score: 5 },
            { label: "Privacidad limitada (Fotos visibles)", score: 10 },
            { label: "Privacidad mínima (Contacto visible)", score: 15 },
            { label: "Perfil completamente público", score: 20 }
          ]
        },
        {
          id: "f3_ubicaciones",
          name: "F3.3 Publicación de Ubicaciones",
          options: [
            { label: "Nunca publica ubicaciones", score: 0 },
            { label: "Publica con retraso (Post-evento)", score: 5 },
            { label: "Publicaciones esporádicas en vivo", score: 10 },
            { label: "Publicaciones frecuentes en vivo", score: 15 },
            { label: "Transmisiones en vivo con geolocalización", score: 20 }
          ]
        },
        {
          id: "f3_medios",
          name: "F3.4 Apariciones en Medios de Comunicación",
          options: [
            { label: "Nunca aparece en medios", score: 0 },
            { label: "Aparición ocasional en prensa especializada", score: 5 },
            { label: "Apariciones regulares en medios locales", score: 10 },
            { label: "Apariciones frecuentes en medios nacionales", score: 15 },
            { label: "Foco mediático masivo / Polarizante", score: 20 }
          ]
        },
        {
          id: "f3_eventos",
          name: "F3.5 Participación en Eventos Públicos",
          options: [
            { label: "No participa en eventos públicos", score: 0 },
            { label: "Eventos ocasionales controlados", score: 5 },
            { label: "Eventos corporativos regulares", score: 10 },
            { label: "Eventos masivos frecuentes", score: 15 },
            { label: "Eventos de alta conflictividad", score: 20 }
          ]
        },
        {
          id: "f3_cargo",
          name: "F3.6 Cargo o Profesión del Familiar",
          options: [
            { label: "Sin cargo público relevante", score: 0 },
            { label: "Sector privado de bajo perfil", score: 5 },
            { label: "Sector privado de alto perfil", score: 10 },
            { label: "Cargo público / Figura reconocida", score: 15 },
            { label: "Cargo político, diplomático o polarizante", score: 20 }
          ]
        },
        {
          id: "f3_transferencia_vip",
          name: "F3.7 Exposición Derivada del VIP (Transferencia M1)",
          options: [
            { label: "VIP con perfil bajo / Sin exposición", score: 0 },
            { label: "VIP con exposición corporativa", score: 5 },
            { label: "VIP con exposición pública alta", score: 10 },
            { label: "VIP con foco mediático constante", score: 15 },
            { label: "VIP figura altamente polarizante", score: 20 }
          ]
        }
      ]
    },
    {
      id: "f4",
      code: "F4",
      title: "4. Nivel de Amenaza Específica (NAF)",
      weight: 0.20,
      variables: [
        {
          id: "f4_taxonomia",
          name: "F4.1 Taxonomía y Origen de la Amenaza",
          options: [
            { label: "Sin amenazas registradas", score: 0 },
            { label: "Amenaza Oportunista (Delincuencia común)", score: 5 },
            { label: "Amenaza Digital (Ciberacoso / Doxeo / Funas)", score: 10 },
            { label: "Amenaza Mixta (Digital + Seguimientos físicos)", score: 15 },
            { label: "Amenaza Organizada (Crimen Org. / Terrorismo)", score: 20 }
          ]
        },
        {
          id: "f4_credibilidad",
          name: "Credibilidad y Capacidad de la Amenaza",
          options: [
            { label: "Sin indicios de amenaza", score: 0 },
            { label: "Amenaza genérica sin confirmar", score: 5 },
            { label: "Amenaza probable (Verificación parcial)", score: 10 },
            { label: "Amenaza confirmada (Capacidad comprobada)", score: 15 },
            { label: "Amenaza inminente (Planificación activa)", score: 20 }
          ]
        },
        {
          id: "f4_historial",
          name: "Historial de Incidentes / Precedentes Directos",
          options: [
            { label: "Sin precedentes", score: 0 },
            { label: "Contactos no deseados / Llamadas", score: 5 },
            { label: "Fotografías sospechosas / Seguimientos", score: 10 },
            { label: "Intentos de extorsión / Acoso directo", score: 15 },
            { label: "Agresiones previas / Intento de secuestro", score: 20 }
          ]
        }
      ]
    },
    {
      id: "f5",
      code: "F5",
      title: "5. Nivel de Protección Implementado (NPF)",
      weight: 0.15,
      isInverse: true, // (20 - NPF) en el cálculo final
      variables: [
        {
          id: "f5_vivienda",
          name: "Seguridad Física en Residencia / Vivienda",
          options: [
            { label: "Completa (CCTV, Alarma, Cerco, Botón pánico)", score: 20 },
            { label: "Aceptable (CCTV, Alarma perimetral)", score: 15 },
            { label: "Básica (Solo alarma o CCTV parcial)", score: 10 },
            { label: "Deficiente (Medidas mínimas)", score: 5 },
            { label: "Nula (Sin seguridad residencial)", score: 0 }
          ]
        },
        {
          id: "f5_transporte",
          name: "Seguridad en Transporte / Vehículos",
          options: [
            { label: "Escolta / Vehículo Blindado con GPS", score: 20 },
            { label: "Conductor capacitado + GPS rastreo", score: 15 },
            { label: "Vehículo propio con mantenimiento y GPS", score: 10 },
            { label: "Vehículo propio sin sistemas de rastreo", score: 5 },
            { label: "Transporte público / Sin protección", score: 0 }
          ]
        },
        {
          id: "f5_digital",
          name: "Seguridad Digital y Antiphishing (F5.1)",
          options: [
            { label: "Capacitación avanzada + MFA + Antivirus", score: 20 },
            { label: "Capacitación básica + MFA configurado", score: 15 },
            { label: "Sin capacitación, pero usa MFA y alertas", score: 10 },
            { label: "Sin capacitación, conciencia básica", score: 5 },
            { label: "Sin capacitación ni conciencia (Muy vulnerable)", score: 0 }
          ]
        }
      ]
    },
    {
      id: "f6",
      code: "F6",
      title: "6. Riesgo de Disfunción Familiar Interna (RDFI)",
      weight: 0.05,
      variables: [
        {
          id: "f6_conflictos",
          name: "F6.1 Conflictos Matrimoniales / Familiares",
          options: [
            { label: "Relación estable, sin conflictos", score: 0 },
            { label: "Conflictos menores internos", score: 5 },
            { label: "Conflictos recurrentes la dinámica", score: 10 },
            { label: "Separación / Divorcio en curso", score: 15 },
            { label: "Divorcio conflictivo con hostilidad manifiesta", score: 20 }
          ]
        },
        {
          id: "f6_adolescentes",
          name: "F6.2 Problemas de Conducta en Adolescentes/Dependientes",
          options: [
            { label: "Conducta normal, cumple protocolos", score: 0 },
            { label: "Desafía ocasionalmente medidas de seguridad", score: 5 },
            { label: "Desafío sistemático a protocolos", score: 10 },
            { label: "Conducta de alto riesgo en redes/rutas", score: 15 },
            { label: "Genera brechas activas (Revela ubicaciones)", score: 20 }
          ]
        },
        {
          id: "f6_personal_domestico",
          name: "F6.3 Dependencia de Cuidadores / Personal Doméstico",
          options: [
            { label: "Sin personal externo / Todo propio", score: 0 },
            { label: "Personal verificado y supervisado", score: 5 },
            { label: "Personal verificado sin supervisión", score: 10 },
            { label: "Personal sin verificación de antecedentes", score: 15 },
            { label: "Sin verificación y acceso a info sensible", score: 20 }
          ]
        }
      ]
    },
    {
      id: "f7",
      code: "F7",
      title: "7. Seguridad de Entornos Específicos (SEE)",
      weight: 0.07,
      variables: [
        {
          id: "f7_colegio",
          name: "F7.1 Seguridad del Colegio / Universidad",
          options: [
            { label: "Control accesos, CCTV, Protocolos y Personal", score: 0 },
            { label: "Control accesos y CCTV, sin protocolos", score: 5 },
            { label: "Control accesos básico, sin CCTV", score: 10 },
            { label: "Sin control accesos, con vigilancia externa", score: 15 },
            { label: "Sin control de accesos / Acceso público libre", score: 20 }
          ]
        },
        {
          id: "f7_trabajo",
          name: "F7.2 Seguridad del Lugar de Trabajo del Familiar",
          options: [
            { label: "Seguridad privada, control accesos, protocolos", score: 0 },
            { label: "Control de accesos, sin seguridad privada", score: 5 },
            { label: "Acceso restringido, sin protocolos", score: 10 },
            { label: "Acceso público sin control", score: 15 },
            { label: "Sin ninguna medida de seguridad", score: 20 }
          ]
        },
        {
          id: "f7_ocio",
          name: "F7.3 Seguridad en Entornos de Ocio (Gimnasios, Malls)",
          options: [
            { label: "Seguridad privada, accesos y perímetros", score: 0 },
            { label: "Seguridad privada, sin control accesos", score: 5 },
            { label: "Vigilancia esporádica", score: 10 },
            { label: "Entornos abiertos sin control", score: 15 },
            { label: "Entornos de alta conflictividad delictiva", score: 20 }
          ]
        }
      ]
    }
  ];

  let currentState = {
    selectedMemberIndex: 0,
    familyMembers: [
      {
        id: "fam_1",
        name: "Familiar Principal (Cónyuge / Hijo)",
        values: {},
        notes: "",
        novedades: []
      }
    ]
  };

  function init() {
    if (!currentState.familyMembers || currentState.familyMembers.length === 0) {
      currentState.familyMembers = [
        {
          id: "fam_1",
          name: "Familiar Principal (Cónyuge / Hijo)",
          values: {},
          notes: "",
          novedades: []
        }
      ];
    }

    if (currentState.selectedMemberIndex >= currentState.familyMembers.length) {
      currentState.selectedMemberIndex = 0;
    }

    const member = currentState.familyMembers[currentState.selectedMemberIndex];
    if (!member.values) member.values = {};
    if (!member.novedades) member.novedades = [];

    MATRIX_DIMENSIONS.forEach(dim => {
      dim.variables.forEach(v => {
        if (member.values[v.id] === undefined) {
          // Asignar valor por defecto según el caso
          member.values[v.id] = dim.isInverse ? 20 : 0;
        }
      });
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
          <h2>M6 · Evaluación del Entorno Familiar (SEEF)</h2>
          <p>Por favor, selecciona un VIP en la barra superior para continuar.</p>
        </div>`;
      return;
    }

    const activeMember = currentState.familyMembers[currentState.selectedMemberIndex] || currentState.familyMembers[0];

    container.innerHTML = `
      <div id="m6-export-area" style="padding: 20px; color: #f8fafc; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0f172a; min-height: 100vh;">
        <!-- ENCABEZADO -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #334155; padding-bottom: 15px; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
          <div>
            <h1 style="margin: 0; font-size: 1.8rem; color: #38bdf8; letter-spacing: -0.5px;">M6 · EVALUACIÓN DEL ENTORNO FAMILIAR (SEEF)</h1>
            <p style="margin: 5px 0 0 0; color: #94a3b8; font-size: 0.9rem;">Sistema de Evaluación del Entorno Familiar · Matriz de Vulnerabilidad y Transferencia de Riesgo (F1 – F7)</p>
          </div>
          <div style="display: flex; gap: 10px;">
            <button id="btn-m6-pdf" style="background: #0284c7; color: white; border: none; padding: 10px 16px; border-radius: 6px; cursor: pointer; font-weight: bold; display: flex; align-items: center; gap: 6px; transition: all 0.2s;">
              📄 Descargar PDF
            </button>
            <button id="btn-m6-reset" style="background: #dc2626; color: white; border: none; padding: 10px 16px; border-radius: 6px; cursor: pointer; font-weight: bold; display: flex; align-items: center; gap: 6px; transition: all 0.2s;">
              🔄 Reiniciar Evento Familiar
            </button>
          </div>
        </div>

        <!-- SELECTOR MULTI-FAMILIAR Y GESTIÓN -->
        <div style="background: #1e293b; padding: 12px 16px; border-radius: 8px; border: 1px solid #334155; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <label style="font-weight: bold; color: #38bdf8; font-size: 0.95rem;">Familiar Evaluado:</label>
            <select id="m6-member-select" style="background: #0f172a; color: #f8fafc; border: 1px solid #475569; border-radius: 6px; padding: 6px 12px; font-size: 0.9rem; cursor: pointer; min-width: 220px;">
              ${currentState.familyMembers.map((m, idx) => `
                <option value="${idx}" ${idx === currentState.selectedMemberIndex ? "selected" : ""}>${m.name}</option>
              `).join("")}
            </select>
            <button id="btn-add-member" style="background: #10b981; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: bold;">+ Agregar Familiar</button>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="text" id="m6-member-name-input" value="${activeMember.name}" placeholder="Nombre / Parentesco..." style="background: #0f172a; color: #fff; border: 1px solid #475569; border-radius: 6px; padding: 6px 10px; font-size: 0.88rem;">
            ${currentState.familyMembers.length > 1 ? `
              <button id="btn-delete-member" style="background: #ef4444; color: white; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 0.85rem;">Eliminar</button>
            ` : ""}
          </div>
        </div>

        <!-- PANEL SUPERIOR: ESCUDO FAMILIAR, RESULTADOS Y RECURSOS -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px;">
          <!-- GRÁFICO DE PERFIL DE RIESGO FAMILIAR -->
          <div style="background: #1e293b; padding: 15px; border-radius: 8px; border: 1px solid #334155; text-align: center;">
            <h3 style="margin-top: 0; color: #38bdf8; font-size: 1.1rem; display: flex; justify-content: space-between; align-items: center;">
              <span>Escudo Familiar (F1 - F7)</span>
              <span id="m6-rf-score-badge" style="font-size: 0.9rem; background: #0f172a; padding: 4px 10px; border-radius: 20px; border: 1px solid #38bdf8;">RF: 0.0 / 20</span>
            </h3>
            <div style="position: relative; width: 100%; height: 230px; display: flex; justify-content: center; align-items: center;">
              <canvas id="m6Chart" width="380" height="220"></canvas>
            </div>
          </div>

          <!-- MOTOR DE REGLAS / IMPLICACIÓN OPERACIONAL & IMPACTO FAMILIAR -->
          <div style="background: #1e293b; padding: 15px; border-radius: 8px; border: 1px solid #334155; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <h3 style="margin-top: 0; color: #38bdf8; font-size: 1.1rem;">Índice de Riesgo (RF) e Impacto Familiar (IIF)</h3>
              <div id="m6-decision-panel" style="margin-bottom: 12px;"></div>
            </div>
            <div>
              <h4 style="margin: 8px 0 5px 0; color: #38bdf8; font-size: 0.95rem;">Medidas Prescriptivas de Protección Recomendadas</h4>
              <div id="m6-resources-panel" style="font-size: 0.85rem; line-height: 1.4; color: #e2e8f0; background: #0f172a; padding: 10px; border-radius: 6px; border: 1px solid #334155;"></div>
            </div>
          </div>
        </div>

        <!-- ALERTAS CRÍTICAS DEL MOTOR -->
        <div id="m6-alerts-container" style="margin-bottom: 25px;"></div>

        <!-- 7 DIMENSIONES DE LA MATRIZ MAESTRA -->
        <div style="margin-bottom: 25px;">
          <h2 style="color: #f1f5f9; font-size: 1.3rem; border-left: 4px solid #38bdf8; padding-left: 10px; margin-bottom: 15px;">
            Dimensiones de Evaluación Familiar (SEEF)
          </h2>
          ${MATRIX_DIMENSIONS.map(dim => renderDimensionBlock(dim, activeMember)).join("")}
        </div>

        <!-- OBSERVACIONES Y PLAN DE MITIGACIÓN FAMILIAR -->
        <div style="background: #1e293b; padding: 15px; border-radius: 8px; border: 1px solid #334155; margin-bottom: 25px;">
          <h3 style="margin-top: 0; color: #38bdf8; font-size: 1.1rem;">Observaciones y Protocolos Específicos para ${activeMember.name}</h3>
          <textarea id="m6-notes" rows="3" style="width: 100%; background: #0f172a; color: #f8fafc; border: 1px solid #475569; border-radius: 6px; padding: 10px; box-sizing: border-box; font-family: inherit;" placeholder="Escriba requerimientos particulares, contactos de emergencia o medidas acordadas...">${activeMember.notes || ""}</textarea>
        </div>

        <!-- REGISTROS Y NOVEDADES DEL ENTORNO FAMILIAR -->
        <div style="background: #1e293b; padding: 15px; border-radius: 8px; border: 1px solid #334155;">
          <h3 style="margin-top: 0; color: #38bdf8; font-size: 1.1rem;">Novedades y Registro de Incidentes de ${activeMember.name}</h3>
          <div style="display: flex; gap: 10px; margin-bottom: 15px;">
            <input type="text" id="m6-novedades-input" placeholder="Agregar novedad, reporte de acoso, cambio de rutina o incidente..." style="flex: 1; background: #0f172a; color: #fff; border: 1px solid #475569; border-radius: 6px; padding: 8px 12px; font-size: 0.9rem;">
            <button id="btn-add-novedad" style="background: #10b981; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold;">+ Agregar</button>
          </div>
          <ul id="m6-novedades-list" style="list-style: none; padding: 0; margin: 0; max-height: 200px; overflow-y: auto;">
            ${(activeMember.novedades || []).map((t, idx) => `
              <li style="background: #0f172a; padding: 8px 12px; border-radius: 4px; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #334155;">
                <span style="font-size: 0.88rem; color: #cbd5e1;"><strong>[${t.time}]</strong> ${t.text}</span>
                <button onclick="window.MierpeM6.removeNovedad(${idx})" style="background: transparent; color: #ef4444; border: none; cursor: pointer; font-weight: bold; font-size: 1.1rem;">✕</button>
              </li>
            `).join("")}
          </ul>
        </div>
      </div>
    `;

    bindEvents();
    updateCalculations();
  }

  function renderDimensionBlock(dim, activeMember) {
    return `
      <div style="background: #1e293b; padding: 15px; border-radius: 8px; border: 1px solid #334155; margin-bottom: 15px;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 8px; margin-bottom: 12px;">
          <h4 style="margin: 0; color: #38bdf8; font-size: 1rem; font-weight: 600;">${dim.title}</h4>
          <span style="font-size: 0.8rem; color: #94a3b8; background: #0f172a; padding: 2px 8px; border-radius: 4px;">Peso: ${Math.round(dim.weight * 100)}% ${dim.isInverse ? "(A mayor protección, menor riesgo)" : ""}</span>
        </div>
        ${dim.variables.map(v => renderVariableRow(v, activeMember)).join("")}
      </div>
    `;
  }

  function renderVariableRow(v, activeMember) {
    const currentVal = activeMember.values[v.id] !== undefined ? activeMember.values[v.id] : 0;
    return `
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid #1e293b; gap: 15px;">
        <span style="font-size: 0.88rem; color: #cbd5e1; flex: 1; min-width: 0; word-break: break-word;">${v.name}</span>
        <select class="m6-value-select" data-var="${v.id}" style="background: #0f172a; color: #f8fafc; border: 1px solid #475569; border-radius: 4px; padding: 5px 8px; font-size: 0.85rem; width: 180px; flex-shrink: 0; cursor: pointer;">
          ${v.options.map(opt => `
            <option value="${opt.score}" ${currentVal === opt.score ? "selected" : ""}>${opt.score} pts · ${opt.label}</option>
          `).join("")}
        </select>
      </div>
    `;
  }

  function bindEvents() {
    const activeMember = currentState.familyMembers[currentState.selectedMemberIndex];

    document.querySelectorAll(".m6-value-select").forEach(sel => {
      sel.addEventListener("change", (e) => {
        const varId = e.target.getAttribute("data-var");
        activeMember.values[varId] = parseFloat(e.target.value);
        updateCalculations();
        saveData();
      });
    });

    const memberSelect = document.getElementById("m6-member-select");
    if (memberSelect) {
      memberSelect.addEventListener("change", (e) => {
        currentState.selectedMemberIndex = parseInt(e.target.value, 10);
        init();
        render(document.getElementById("module-root"));
      });
    }

    const btnAddMember = document.getElementById("btn-add-member");
    if (btnAddMember) {
      btnAddMember.addEventListener("click", () => {
        const count = currentState.familyMembers.length + 1;
        const newMember = {
          id: `fam_${Date.now()}`,
          name: `Familiar ${count}`,
          values: {},
          notes: "",
          novedades: []
        };
        currentState.familyMembers.push(newMember);
        currentState.selectedMemberIndex = currentState.familyMembers.length - 1;
        init();
        saveData();
        render(document.getElementById("module-root"));
      });
    }

    const memberNameInput = document.getElementById("m6-member-name-input");
    if (memberNameInput) {
      memberNameInput.addEventListener("change", (e) => {
        if (e.target.value.trim() !== "") {
          activeMember.name = e.target.value.trim();
          saveData();
          render(document.getElementById("module-root"));
        }
      });
    }

    const btnDeleteMember = document.getElementById("btn-delete-member");
    if (btnDeleteMember) {
      btnDeleteMember.addEventListener("click", () => {
        if (currentState.familyMembers.length > 1) {
          if (confirm(`¿Está seguro de eliminar el perfil de ${activeMember.name}?`)) {
            currentState.familyMembers.splice(currentState.selectedMemberIndex, 1);
            currentState.selectedMemberIndex = 0;
            init();
            saveData();
            render(document.getElementById("module-root"));
          }
        }
      });
    }

    const notesTxt = document.getElementById("m6-notes");
    if (notesTxt) {
      notesTxt.addEventListener("input", (e) => {
        activeMember.notes = e.target.value;
        saveData();
      });
    }

    const btnNovedad = document.getElementById("btn-add-novedad");
    if (btnNovedad) {
      btnNovedad.addEventListener("click", () => {
        const input = document.getElementById("m6-novedades-input");
        if (input && input.value.trim() !== "") {
          const now = new Date();
          const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          if (!activeMember.novedades) activeMember.novedades = [];
          activeMember.novedades.push({ time: timeStr, text: input.value.trim() });
          input.value = "";
          saveData();
          render(document.getElementById("module-root"));
        }
      });
    }

    const btnPdf = document.getElementById("btn-m6-pdf");
    if (btnPdf) {
      btnPdf.addEventListener("click", exportPDF);
    }

    const btnReset = document.getElementById("btn-m6-reset");
    if (btnReset) {
      btnReset.addEventListener("click", handleReset);
    }
  }

  function handleReset() {
    const confirmDownload = confirm("¿Desea descargar el informe del evento familiar actual en PDF antes de reiniciar?");
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
    const activeMember = currentState.familyMembers[currentState.selectedMemberIndex];
    if (activeMember) {
      activeMember.values = {};
      activeMember.notes = "";
      activeMember.novedades = [];
    }
    init();
    saveData();
    render(document.getElementById("module-root"));
  }

  function calculateDimensionScores(member) {
    const scores = {};

    MATRIX_DIMENSIONS.forEach(dim => {
      let sum = 0;
      let count = 0;
      dim.variables.forEach(v => {
        sum += member.values[v.id] !== undefined ? member.values[v.id] : (dim.isInverse ? 20 : 0);
        count++;
      });
      const avg = count > 0 ? sum / count : 0;
      scores[dim.code] = Math.min(20, Math.max(0, avg));
    });

    return scores;
  }

  function updateCalculations() {
    const activeMember = currentState.familyMembers[currentState.selectedMemberIndex] || currentState.familyMembers[0];
    const dimScores = calculateDimensionScores(activeMember);

    const vef = dimScores["F1"] || 0;
    const vuf = dimScores["F2"] || 0;
    const nef = dimScores["F3"] || 0;
    const naf = dimScores["F4"] || 0;
    const npf = dimScores["F5"] || 0; // Se invierte en la fórmula: (20 - NPF)
    const f6 = dimScores["F6"] || 0;
    const f7 = dimScores["F7"] || 0;

    // FÓRMULA MAESTRA M6:
    // RF = (VEF*0.22) + (VUF*0.18) + (NEF*0.13) + (NAF*0.20) + ((20-NPF)*0.15) + (F6*0.05) + (F7*0.07)
    let rf = (vef * 0.22) + (vuf * 0.18) + (nef * 0.13) + (naf * 0.20) + ((20 - npf) * 0.15) + (f6 * 0.05) + (f7 * 0.07);
    rf = Math.round(rf * 10) / 10;

    // CÁLCULO DE IMPACTO FAMILIAR (IIF): Media Geométrica entre VEF y RF
    let iif = Math.sqrt(vef * rf);
    iif = Math.round(iif * 10) / 10;

    const scoreBadge = document.getElementById("m6-rf-score-badge");
    if (scoreBadge) {
      scoreBadge.innerText = `RF: ${rf.toFixed(1)} / 20.0`;
    }

    let decisionText = "";
    let levelClass = "";
    let color = "#10b981";

    if (rf <= 5.0) {
      levelClass = "MUY BAJO";
      color = "#10b981";
      decisionText = "🟢 Entorno familiar protegido. Continuar monitoreo de rutina.";
    } else if (rf <= 10.0) {
      levelClass = "MODERADO";
      color = "#3b82f6";
      decisionText = "🔵 Riesgo aceptable. Reforzar medidas de privacidad y hábitos.";
    } else if (rf <= 14.0) {
      levelClass = "ALTO";
      color = "#f59e0b";
      decisionText = "🟡 Requiere mitigación activa y actualización de protocolos de seguridad.";
    } else if (rf <= 17.0) {
      levelClass = "CRÍTICO";
      color = "#f97316";
      decisionText = "🟠 Riesgo severo de transferencia al VIP. Desplegar protección suplementaria.";
    } else {
      levelClass = "MAXIMO";
      color = "#ef4444";
      decisionText = "🔴 'Puerta Trasera Abierta' - Intervención inmediata de la escolta y ciberseguridad.";
    }

    const decisionPanel = document.getElementById("m6-decision-panel");
    if (decisionPanel) {
      decisionPanel.innerHTML = `
        <div style="background: #0f172a; padding: 10px 14px; border-radius: 6px; border-left: 5px solid ${color};">
          <div style="display: flex; justify-content: space-between;">
            <span style="font-size: 0.85rem; color: #94a3b8;">RIESGO FAMILIAR (RF): <strong style="color: ${color};">${rf.toFixed(1)} pts</strong></span>
            <span style="font-size: 0.85rem; color: #94a3b8;">IMPACTO (IIF): <strong style="color: #38bdf8;">${iif.toFixed(1)} pts</strong></span>
          </div>
          <div style="font-size: 1.05rem; font-weight: bold; color: ${color}; margin: 3px 0;">Nivel ${levelClass} (IIF: ${iif <= 4 ? "Muy Bajo" : iif <= 8 ? "Bajo" : iif <= 12 ? "Moderado" : iif <= 16 ? "Alto" : "Crítico"})</div>
          <div style="font-size: 0.88rem; color: #f8fafc; font-weight: 500;">${decisionText}</div>
        </div>
      `;
    }

    const resourcesPanel = document.getElementById("m6-resources-panel");
    if (resourcesPanel) {
      let rrhh = "";
      let logistica = "";

      if (rf <= 5.0) {
        rrhh = "• Monitoreo de rutina / Orientación básica en seguridad.";
        logistica = "• Revisión periódica de redes sociales y seguridad residencial básica.";
      } else if (rf <= 10.0) {
        rrhh = "• Conductor capacitado en seguridad / Capacitación Antiphishing.";
        logistica = "• Monitoreo OSINT esporádico + Verificación de CCTV residencial.";
      } else if (rf <= 14.0) {
        rrhh = "• Escolta dedicada / Conductor táctico para el familiar.";
        logistica = "• Botón de pánico, vehículo con GPS/Rastreo y auditoría en colegio/trabajo.";
      } else {
        rrhh = "• Equipo de Protección Cercana + Unidad de Reacción Táctica.";
        logistica = "• Vehículo blindado, protocolo de 'Silencio Digital' estricto y rutas cambiantes.";
      }

      resourcesPanel.innerHTML = `
        <div style="margin-bottom: 4px;"><strong>Personal:</strong> ${rrhh}</div>
        <div><strong>Acciones:</strong> ${logistica}</div>
      `;
    }

    generateAlerts(dimScores, rf, iif, activeMember);
    drawChart(dimScores);
  }

  function generateAlerts(dimScores, rf, iif, member) {
    const alerts = [];

    if (rf >= 14 || iif >= 14) {
      alerts.push(`🚨 <strong>OBJETIVO FAMILIAR CRÍTICO (RF/IIF ≥ 14):</strong> Se requiere inyectar órdenes inmediatas en el Módulo M7 (Avanzada) para cubrir al familiar.`);
    }

    if ((member.values["f3_redes_sociales"] || 0) >= 15 || (member.values["f3_ubicaciones"] || 0) >= 15) {
      alerts.push(`📢 <strong>EXPOSICIÓN DIGITAL ELEVADA (M3):</strong> ${member.name} publica ubicaciones o información sensible en vivo. Se activa protocolo de Silencio Digital en M3.`);
    }

    if ((member.values["vuf_conducta_riesgo"] || 0) >= 15) {
      alerts.push(`⚠️ <strong>CONDUCTA DE ALTO RIESGO / HOSTILIDAD (F2.1):</strong> El familiar rechaza o anula los protocolos de protección. Se recomienda intervención conductual (M2).`);
    }

    if ((member.values["f4_taxonomia"] || 0) >= 15 || (member.values["f4_credibilidad"] || 0) >= 15) {
      alerts.push(`🔴 <strong>AMENAZA CONFIRMADA / MIXTA (M5):</strong> Amenaza directa detectada contra ${member.name}. Notificar a Inteligencia (M5) y reforzar patrullaje.`);
    }

    if ((member.values["f6_conflictos"] || 0) >= 15 || (member.values["f6_personal_domestico"] || 0) >= 15) {
      alerts.push(`⚡ <strong>DISFUNCIÓN INTERNA / RIESGO INSIDER (F6):</strong> Proceso de divorcio hostil o personal doméstico no verificado con acceso sensible. Alerta inyectada a M1.`);
    }

    if ((member.values["f7_colegio"] || 0) >= 15 || (member.values["f7_trabajo"] || 0) >= 15) {
      alerts.push(`🏫 <strong>ENTORNO ESPECÍFICO VULNERABLE (F7):</strong> Colegio o trabajo sin control de accesos. Solicitada inspección física de avanzadas (M7).`);
    }

    const container = document.getElementById("m6-alerts-container");
    if (container) {
      if (alerts.length > 0) {
        container.innerHTML = `
          <div style="background: #1e1b4b; border: 1px solid #6366f1; border-radius: 8px; padding: 12px 16px;">
            <h4 style="margin: 0 0 8px 0; color: #a5b4fc; font-size: 0.95rem;">🤖 Reglas Prescriptivas y Cruce de Módulos (SEEF -> M1, M2, M3, M5, M7)</h4>
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
    const canvas = document.getElementById("m6Chart");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calcular el promedio ponderado o valor actual del Riesgo Familiar (RF)
    const activeMember = currentState.familyMembers[currentState.selectedMemberIndex] || currentState.familyMembers[0];
    const scores = calculateDimensionScores(activeMember);
    const vef = scores["F1"] || 0;
    const vuf = scores["F2"] || 0;
    const nef = scores["F3"] || 0;
    const naf = scores["F4"] || 0;
    const npf = scores["F5"] || 0;
    const f6 = scores["F6"] || 0;
    const f7 = scores["F7"] || 0;

    let rf = (vef * 0.22) + (vuf * 0.18) + (nef * 0.13) + (naf * 0.20) + ((20 - npf) * 0.15) + (f6 * 0.05) + (f7 * 0.07);
    rf = Math.min(20, Math.max(0, rf));

    const centerX = canvas.width / 2;
    const centerY = canvas.height - 30; // Posición inferior para semicírculo
    const radius = 130;

    const startAngle = Math.PI; // 180° (Izquierda)
    const endAngle = 0;        // 0° / 360° (Derecha)

    // 1. Dibujar el arco de fondo por zonas de color (Estilo revoluciones)
    const zones = [
      { max: 5, color: "#10b981" },  // Verde
      { max: 10, color: "#3b82f6" }, // Azul
      { max: 14, color: "#f59e0b" }, // Amarillo
      { max: 17, color: "#f97316" }, // Naranja
      { max: 20, color: "#ef4444" }  // Rojo (Zona crítica / Redline)
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

    // 2. Dibujar marcas de graduación (Ticks estilo tacómetro)
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

      // Números en las marcas principales
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

    // 3. Dibujar la Aguja del cuenta revoluciones
    const needleAngle = startAngle + (rf / 20) * Math.PI;
    const needleLength = radius - 20;

    const needleX = centerX + Math.cos(needleAngle) * needleLength;
    const needleY = centerY + Math.sin(needleAngle) * needleLength;

    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(needleX, needleY);
    ctx.strokeStyle = "#ef4444"; // Color aguja
    ctx.lineWidth = 3;
    ctx.stroke();

    // Centro del pivote de la aguja
    ctx.beginPath();
    ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#f8fafc";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#0f172a";
    ctx.fill();

    // 4. Lectura digital central en la base
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${rf.toFixed(1)} RF`, centerX, centerY - 20);
  }

function handleReset() {
    const confirmDownload = confirm("¿Desea descargar el informe del evento familiar actual en PDF antes de reiniciar?");
    if (confirmDownload) {
      exportPDF().then(() => {
        executeReset();
      }).catch(err => {
        console.error("Error al exportar PDF previo al reinicio:", err);
        // En caso de fallo en la descarga, reiniciar de todos modos
        executeReset();
      });
    } else {
      executeReset();
    }
  }

  function executeReset() {
    const activeMember = currentState.familyMembers[currentState.selectedMemberIndex];
    if (activeMember) {
      // Limpiar valores del familiar seleccionado
      activeMember.values = {};
      activeMember.notes = "";
      activeMember.novedades = [];
    }
    
    // Volver a inicializar valores por defecto, guardar en BD y re-renderizar
    init();
    saveData();
    render(document.getElementById("module-root"));
  }

  function exportPDF() {
    return new Promise((resolve, reject) => {
      const element = document.getElementById("m6-export-area");
      if (!element) {
        alert("Error: No se encontró el área de exportación.");
        return reject("No export area");
      }

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

          const activeMember = currentState.familyMembers[currentState.selectedMemberIndex];
          const nameClean = (activeMember ? activeMember.name : "Familiar").replace(/\s+/g, "_");
          pdf.save(`Informe_M6_Evaluacion_Familiar_${nameClean}_${new Date().toISOString().slice(0, 10)}.pdf`);
          
          // Promesa resuelta con éxito tras iniciar la descarga
          resolve();
        }).catch(err => reject(err));
      } else {
        alert("Error: Las librerías de generación PDF (html2canvas / jsPDF) no están cargadas.");
        reject("Libraries not loaded");
      }
    });
  }

  function removeNovedad(index) {
    const activeMember = currentState.familyMembers[currentState.selectedMemberIndex];
    if (activeMember && activeMember.novedades && activeMember.novedades[index]) {
      activeMember.novedades.splice(index, 1);
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
        .catch(err => console.error("Error cargando M6:", err));
    }
  }

  function saveData() {
    if (window.MierpeStorage && window.MierpeVips) {
      const vipId = window.MierpeVips.getCurrentVipId();
      if (!vipId) return;

      window.MierpeStorage.setVipDoc(vipId, DB_COLLECTION, DOC_ID, currentState)
        .catch(err => console.error("Error guardando M6:", err));
    }
  }

  return {
    mount,
    removeNovedad
  };
})();