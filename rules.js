/**
 * rules.js
 * Tablas de reglas del módulo M8 (MCTRO), tomadas directamente del
 * documento fuente. Mantenerlas como datos (no lógica embebida) facilita
 * ajustarlas sin tocar m8.js, y sirve de plantilla para los módulos
 * M1-M7 cuando se agreguen.
 */

const MierpeRules = {
  fep: {
    variables: [
      { code: "F", label: "Fatiga", desc: "Nivel de cansancio físico y mental." },
      { code: "E", label: "Estrés", desc: "Presión percibida y reactividad emocional." },
      { code: "A", label: "Ánimo y Cooperación", desc: "Irritabilidad, hostilidad o cooperación." },
      { code: "D", label: "Capacidad de Decisión", desc: "Claridad mental y rapidez de juicio." }
    ],
    scaleLabels: ["Óptimo", "Leve", "Moderado", "Significativo", "Crítico", "Crítico"],
    rules: [
      { id: "R-FEP-004", test: (f) => f.A >= 3, msg: "Alerta de Conducta Hostil — intervención del Jefe de Protección." },
      { id: "R-FEP-003", test: (f) => f.total >= 16, msg: "NO AUTORIZAR MISIÓN — requerir descanso del VIP." },
      { id: "R-FEP-002", test: (f) => f.total >= 12, msg: "Posponer decisiones estratégicas; reducir exposición pública." },
      { id: "R-FEP-001", test: (f) => f.total >= 8, msg: "Estado VIP Crítico — notificar al Jefe de Protección." }
    ]
  },

  cct: {
    levels: [
      { code: "N", name: "Negro", color: "#000000", border: "#ff2b2b", meaning: "Emergencia extrema (vida en peligro)", action: "Evacuación inmediata al punto de encuentro; no detenerse.", businessLabel: "🔴 CRÍTICO", businessDesc: "Emergencia activa. Se ha ejecutado el protocolo de evacuación inmediata." },
      { code: "R", name: "Rojo", color: "#ff2b2b", meaning: "Peligro inminente (amenaza activa)", action: "Confinamiento en Safe Room o vehículo blindado; cerrar accesos.", businessLabel: "🟠 ALTO", businessDesc: "Amenaza confirmada. El equipo activó protocolos de contención y resguardo." },
      { code: "A", name: "Ámbar", color: "#ffb000", meaning: "Alerta alta (amenaza probable)", action: "Cambio de ruta inmediato; activar contravigilancia.", businessLabel: "🟡 ELEVADO", businessDesc: "Situación bajo vigilancia reforzada. Se tomaron medidas preventivas (cambio de ruta / contravigilancia)." },
      { code: "V", name: "Verde", color: "#33ff33", meaning: "Alerta moderada (condiciones normales)", action: "Seguir plan estándar; mantener contravigilancia.", businessLabel: "🟢 NORMAL", businessDesc: "Operación dentro de los parámetros estándar, sin novedades relevantes." },
      { code: "Z", name: "Azul", color: "#3aa0ff", meaning: "Alerta máxima de seguridad (defensa total)", action: "Todas las barreras cerradas; comunicaciones cifradas; posiciones defensivas.", businessLabel: "🔵 MÁXIMA PRECAUCIÓN", businessDesc: "Postura defensiva total activada de forma preventiva." }
    ],
    // Orden de evaluación: la primera condición que se cumple determina el CCT.
    resolve(ctx) {
      if (ctx.brechaIndefension || ctx.igrDinamico >= 17) return "N";
      if (ctx.amenazaConfirmada || ctx.igrDinamico >= 14) return "R";
      if (ctx.fep >= 12 || ctx.vigilanciaActiva || ctx.iamAlto) return "A";
      if (ctx.defensaTotal) return "Z";
      return "V";
    },
    // Traducción del IGR dinámico (número técnico) a una categoría que
    // cualquier persona entiende sin saber qué es un "IGR".
    igrBusinessLevel(igr) {
      if (igr >= 17) return { label: "CRÍTICO", desc: "El nivel de riesgo está fuera de los parámetros normales de operación." };
      if (igr >= 14) return { label: "ALTO", desc: "El riesgo está significativamente elevado respecto a lo esperado para este protegido." };
      if (igr >= 9) return { label: "MODERADO", desc: "El riesgo está dentro de un rango que amerita atención, sin ser crítico." };
      return { label: "BAJO", desc: "El riesgo se mantiene dentro de los parámetros normales de operación." };
    },
    // Traducción del FEP (estado del VIP) a lenguaje simple — usa los
    // mismos umbrales (8/12/16) que ya disparan las reglas R-FEP-00X.
    fepBusinessLevel(fep) {
      if (fep >= 16) return { label: "CRÍTICO", desc: "El estado del protegido requiere pausar la actividad y evaluar descanso." };
      if (fep >= 12) return { label: "ELEVADO", desc: "Se recomendó reducir la exposición pública del protegido." };
      if (fep >= 8) return { label: "CON OBSERVACIONES", desc: "El estado del protegido quedó bajo seguimiento cercano." };
      return { label: "ÓPTIMO", desc: "El protegido se encontró en condiciones normales durante el período." };
    }
  },

  reportTypes: [
    { code: "R-AM", label: "Amenaza observada", example: "Vehículo sospechoso estacionado." },
    { code: "R-EN", label: "Cambio de entorno", example: "Manifestación en la zona." },
    { code: "R-IN", label: "Incidente", example: "Accidente o bloqueo en ruta." },
    { code: "R-CV", label: "Conducta VIP", example: "VIP rechaza cambio de ruta." },
    { code: "R-LO", label: "Logística", example: "Fallo de radio o vehículo." }
  ],

  reportPriority(score) {
    if (score >= 17) return { label: "Crítico", cct: "R/N" };
    if (score >= 13) return { label: "Alerta Alta", cct: "A (inmediato)" };
    if (score >= 9) return { label: "Alerta Media", cct: "Verificar / posible Ámbar" };
    if (score >= 5) return { label: "Alerta Baja", cct: "Monitoreo continuo" };
    return { label: "Informativo", cct: "Registro" };
  },

  cio: {
    capacidades: [
      { code: "CV", label: "Contra-Vigilancia Activa", desc: "Maniobras para detectar seguimientos (giros en U, paradas)." },
      { code: "DI", label: "Desinformación", desc: "Rutas, horarios y eventos falsos para confundir." },
      { code: "SA", label: "Saturación", desc: "Múltiples vehículos o actores para ocultar el movimiento real." },
      { code: "PC", label: "Provocación Controlada", desc: "Movimiento predecible para confirmar reacción." }
    ],
    level(iccio) {
      if (iccio <= 4) return { label: "Excelente", action: "Mantener protocolos ofensivos." };
      if (iccio <= 8) return { label: "Bueno", action: "Reforzar con entrenamiento." };
      if (iccio <= 12) return { label: "Moderado", action: "Priorizar mejora de contra-vigilancia." };
      if (iccio <= 16) return { label: "Deficiente", action: "Solicitar recursos externos." };
      return { label: "Nulo", action: "No realizar misiones de alto riesgo." };
    }
  },

  rcp: {
    methods: [
      { code: "manual", label: "Manual (botón)", response: "< 3 s" },
      { code: "geocerca", label: "Automática (geocerca > 20 m)", response: "< 5 s" },
      { code: "tiempo", label: "Automática (sin señal 60 s)", response: "60 s" },
      { code: "fep", label: "Por Alerta de Conducta (FEP ≥ 14)", response: "Inmediato" }
    ],
    escalateAfterSeconds: 120
  }
};

window.MierpeRules = MierpeRules;
