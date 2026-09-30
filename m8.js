/**
 * m8.js — Módulo de Comando Táctico y Respuesta Operativa (MCTRO)
 * Autocontenido: expone MierpeM8.mount(rootEl) para que app.js lo monte.
 */

const MierpeM8 = (() => {
  const R = () => window.MierpeRules;
  const S = () => window.MierpeStorage;
  const A = () => window.MierpeAuth;

  let state = defaultState();
  let reports = [];
  let incidentes = [];
  let terrenoEntries = [];
  let resolucionesPorReporte = {};
  let ubicacionesPorReporte = {};
  let ubicacionesPorIncidente = {};
  
  let terrenoLocal = { 
    liveTrackingSalida: false, 
    liveTrackingLlegada: false, 
    lastPosition: null, 
    currentLugaresSalida: [],
    currentLugaresLlegada: []
  };

  let root = null;
  let readOnly = false;

  let watchId = null;
  let terrenoMap = null;
  let terrenoMarker = null;

  function defaultState() {
    // Carga de persisitencia local para datos frecuentes que se repiten al día siguiente
    const savedJefe = localStorage.getItem("m8_saved_jefe") || "";
    const savedEscolta = localStorage.getItem("m8_saved_escolta") || "";
    const savedConductor = localStorage.getItem("m8_saved_conductor") || "";
    const savedPatente = localStorage.getItem("m8_saved_patente") || "";

    return {
      vip: { 
        id: "VIP-007", 
        nombre: "", 
        jefe: savedJefe, 
        jefeArma: "pistola", jefeSerie: "", jefeMunicion: 15, jefeElementos: [],
        escoltaPpal: savedEscolta, 
        escoltaArma: "pistola", escoltaSerie: "", escoltaMunicion: 15, escoltaElementos: [],
        conductor: savedConductor, 
        conductorTipo: "capacitado conducción avanzada",
        conductorArma: "pistola", conductorSerie: "", conductorMunicion: 15, conductorElementos: []
      },
      terrenoForm: {
        fecha: todayFormatted(),
        hsal: "",
        hlle: "",
        tipoServicio: "servicio diario",
        gastosAlimentacion: "alimentacion fiscal",
        gastosAlojamiento: "alojamiento fiscal",
        vehiculoTipo: "vehiculo fiscal",
        patente: savedPatente,
        rutas: "",
        novedades: ""
      },
      igrEstatico: 8,
      fep: { F: 0, E: 0, A: 0, D: 0 },
      ctx: { brechaIndefension: false, amenazaConfirmada: false, vigilanciaActiva: false, iamAlto: false, defensaTotal: false },
      cio: { CV: 0, DI: 0, SA: 0, PC: 0 },
      alerts: [],
      rcp: { active: false, startedAt: null, method: null },
      missionStart: null,
      missionEnd: null
    };
  }

  function agenteTag() {
    const u = A().currentUser();
    return u ? { name: u.name, email: u.email } : { name: "desconocido", email: "—" };
  }
  function agenteStr(a) { return a ? `${a.name} <${a.email}>` : "—"; }

  function fepTotal() { return state.fep.F + state.fep.E + state.fep.A + state.fep.D; }
  function fmr() { return 1 + fepTotal() / 20; }
  function igrDinamico() { return +(state.igrEstatico * fmr()).toFixed(1); }
  function currentCCT() {
    const ctx = { ...state.ctx, igrDinamico: igrDinamico(), fep: fepTotal() };
    return R().cct.resolve(ctx);
  }

  function newId() { return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }
  function getDeviceId() {
    let id = localStorage.getItem("sigpe:deviceId");
    if (!id) { id = newId(); localStorage.setItem("sigpe:deviceId", id); }
    return id;
  }

  function vibrate(pattern) {
    try { if (navigator.vibrate) navigator.vibrate(pattern); } catch (e) {}
  }

  let sharedAudioCtx = null;
  function ensureAudioCtx() {
    try {
      if (!sharedAudioCtx) sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (sharedAudioCtx.state === "suspended") sharedAudioCtx.resume();
    } catch (e) {}
    return sharedAudioCtx;
  }

  function beep(freq = 880, duration = 150) {
    const ctxA = ensureAudioCtx();
    if (!ctxA) return;
    try {
      const osc = ctxA.createOscillator();
      const gain = ctxA.createGain();
      osc.type = "square";
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctxA.destination);
      const now = ctxA.currentTime;
      const secs = duration / 1000;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.95, now + 0.02);
      gain.gain.setValueAtTime(0.95, now + secs - 0.03);
      gain.gain.linearRampToValueAtTime(0, now + secs);
      osc.start(now);
      osc.stop(now + secs);
    } catch (e) {}
  }

  let alarmActive = false;
  let alarmTimers = [];
  let wakeLock = null;

  async function requestWakeLock() {
    try { if ("wakeLock" in navigator) wakeLock = await navigator.wakeLock.request("screen"); }
    catch (e) {}
  }
  function releaseWakeLock() { try { wakeLock?.release(); } catch (e) {} wakeLock = null; }

  function runAlarmCycle(freqA, freqB) {
    if (!alarmActive) return;
    beep(freqA, 380);
    vibrate([350, 50]);
    alarmTimers.push(setTimeout(() => {
      if (!alarmActive) return;
      beep(freqB, 380);
      vibrate([350, 50]);
      alarmTimers.push(setTimeout(() => runAlarmCycle(freqA, freqB), 400));
    }, 400));
  }

  function startAlarm(freqA, freqB, maxSeconds = 90) {
    if (alarmActive) return;
    alarmActive = true;
    ensureAudioCtx();
    requestWakeLock();
    runAlarmCycle(freqA, freqB);
    alarmTimers.push(setTimeout(stopAlarm, maxSeconds * 1000));
    render();
  }
  function stopAlarm() {
    alarmActive = false;
    alarmTimers.forEach(clearTimeout);
    alarmTimers = [];
    vibrate(0);
    releaseWakeLock();
    render();
  }
  function panicTotalAlarm() { startAlarm(220, 440, 90); }
  function panicSilentAlarmForOthers() { startAlarm(660, 990, 90); }

  function pushAlert(text) {
    state.alerts.unshift({ text, at: new Date().toLocaleTimeString() });
    state.alerts = state.alerts.slice(0, 6);
  }

  let seenIncidentIds = new Set();
  let firstIncidentSnapshot = true;

  function handleIncomingIncidents(rows) {
    const myDeviceId = getDeviceId();
    incidentes = rows.map((r) => ({ ...r.value, _id: r.id, _updatedAt: r.updatedAt }));

    if (firstIncidentSnapshot) {
      incidentes.forEach((i) => seenIncidentIds.add(i.id));
      firstIncidentSnapshot = false;
      render();
      return;
    }
    incidentes.forEach((i) => {
      if (seenIncidentIds.has(i.id)) return;
      seenIncidentIds.add(i.id);
      if (i.tipo === "PÁNICO TOTAL") {
        panicTotalAlarm();
      } else if (i.tipo === "PÁNICO SILENCIOSO" && i.sourceDeviceId !== myDeviceId) {
        panicSilentAlarmForOthers();
      }
    });
    render();
  }

  function evaluateFEPRules() {
    const f = { ...state.fep, total: fepTotal() };
    R().fep.rules.forEach((rule) => { if (rule.test(f)) pushAlert(`[${rule.id}] ${rule.msg}`); });
  }

  function gaugeSvg({ value, max, displayValue, label, color }) {
    const pct = Math.max(0, Math.min(1, value / max));
    const r = 30;
    const circumference = 2 * Math.PI * r;
    const dash = (circumference * pct).toFixed(1);
    return `
      <div class="gauge" style="width:78px; max-width:78px; flex:0 0 auto;">
        <svg viewBox="0 0 80 80" class="gauge-svg" width="70" height="70" style="width:70px; height:70px; display:block; margin:0 auto;">
          <circle cx="40" cy="40" r="${r}" fill="none" stroke="var(--border)" stroke-width="6"/>
          <circle cx="40" cy="40" r="${r}" fill="none" stroke="${color}" stroke-width="6"
            stroke-dasharray="${dash} ${circumference.toFixed(1)}"
            stroke-linecap="round" transform="rotate(-90 40 40)"/>
          <text x="40" y="45" text-anchor="middle" class="gauge-value" style="font-size:14px;">${displayValue}</text>
        </svg>
        <div class="gauge-label" style="font-size:9.5px; margin-top:2px; text-align:center;">${label}</div>
      </div>
    `;
  }
  function levelColor(label) {
    const l = (label || "").toUpperCase();
    if (l.includes("CRÍTICO") || l.includes("CRITICO")) return "#ef4444";
    if (l.includes("ALTO") || l.includes("ELEVADO")) return "#ff8000";
    if (l.includes("MODERADO") || l.includes("OBSERVACIONES")) return "#ffb000";
    return "#34d399";
  }

  function renderElemOpts(selectedArr, dis) {
    const opts = [
      { id: "esposas", label: "esposas de seguridad" },
      { id: "baston", label: "baston" },
      { id: "gas", label: "gas lacrimogeno" },
      { id: "linterna", label: "linterna" },
      { id: "radio", label: "radio comunicaciones" },
      { id: "chaleco", label: "chaleco antibala" },
      { id: "casco", label: "casco balistico" },
      { id: "otros", label: "otros" }
    ];
    return opts.map(o => `
      <label class="checkbox-inline">
        <input type="checkbox" value="${o.id}" ${selectedArr?.includes(o.id) ? "checked" : ""} ${dis}> ${o.label}
      </label>
    `).join(" ");
  }

  function renderArmaSelect(selectedVal, dis) {
    const armst = ["revolver", "pistola", "sub ametralladora", "sub fusil", "fusil", "otro"];
    return armst.map(a => `<option value="${a}" ${a === selectedVal ? "selected" : ""}>${a}</option>`).join("");
  }

  function renderNumSelect(selectedVal, dis) {
    let opts = "";
    for(let i=1; i<=999; i++) {
      opts += `<option value="${i}" ${i == selectedVal ? "selected" : ""}>${i}</option>`;
    }
    return opts;
  }

  function tipoServicioLabel(v) {
    return v === "comision de servicio" ? "Comisión de Servicio" : "Servicio Diario";
  }

  function alimentacionLabel(v) {
    return v === "alimentacion particular" ? "Alimentación Particular" : "Alimentación Fiscal";
  }

  function alojamientoLabel(v) {
    return v === "alojamiento particular" ? "Alojamiento Particular" : "Alojamiento Fiscal";
  }

  function render() {
    if (!root) return;
    readOnly = !A().canEditModule("m8");

    const cctCode = currentCCT();
    const cctDef = R().cct.levels.find((l) => l.code === cctCode);
    const iccio = (state.cio.CV + state.cio.DI + state.cio.SA + state.cio.PC) / 4;
    const cioLevel = R().cio.level(iccio);
    const dis = readOnly ? "disabled" : "";
    const { repPeriodo, incPeriodo, terrPeriodo } = getPeriodData();

    root.innerHTML = `
      ${alarmActive ? `
        <div class="alarm-banner">
          <span>🚨 ALARMA DE PÁNICO ACTIVA</span>
          <button class="btn btn-panic-total" id="btn-stop-alarm">🔇 Silenciar alarma</button>
        </div>
      ` : ""}
      ${readOnly ? `<div class="readonly-banner">MODO SOLO LECTURA — tu rol (${A().roleDef().label}) puede ver informes y módulos, pero no modificarlos.</div>` : ""}

      <section class="panel panel-status">
        <div class="panel-title">MCTRO — PANEL TÁCTICO</div>

        <div class="cct-badge cct-badge-${cctCode}">
          <span class="cct-badge-label">CCT ACTUAL</span>
          <span class="cct-badge-value">${cctDef.name.toUpperCase()}</span>
        </div>
        <p class="cct-meaning">${cctDef.meaning} — <em>${cctDef.action}</em></p>
        ${cctCode !== "V" && !readOnly ? `
          <div class="btn-row">
            <button class="btn btn-warn" id="btn-normalize-cct">🔓 Normalizar CCT (cerrar alerta)</button>
          </div>
        ` : ""}

        <div class="gauge-row" style="display:flex; justify-content:center; align-items:flex-start; gap:14px; flex-wrap:wrap;">
          ${gaugeSvg({ value: igrDinamico(), max: 20, displayValue: igrDinamico(), label: "IGR DINÁMICO", color: levelColor(R().cct.igrBusinessLevel(igrDinamico()).label) })}
          ${gaugeSvg({ value: fepTotal(), max: 20, displayValue: fepTotal(), label: "FEP", color: levelColor(R().cct.fepBusinessLevel(fepTotal()).label) })}
          ${gaugeSvg({ value: fmr(), max: 2, displayValue: fmr().toFixed(2) + "×", label: "FMR", color: "var(--gold)" })}
        </div>
      </section>

      <section class="panel">
        <div class="panel-title">EMERGENCIA</div>
        <div class="panic-row">
          <button class="btn btn-panic-total" id="btn-panic-total" ${dis}>
            🚨<br>PÁNICO TOTAL<br><span class="btn-sub">evacuación inmediata + alarma</span>
          </button>
          <button class="btn btn-panic-silent" id="btn-panic-silent" ${dis}>
            ●<br>SILENCIOSO<br><span class="btn-sub">alerta discreta, sin sonido</span>
          </button>
        </div>
        <div class="btn-row">
          <button class="btn ${state.rcp.active ? "btn-warn" : ""}" id="btn-rcp" ${dis}>
            ${state.rcp.active ? "RCP ACTIVO — cancelar" : "Activar RCP (pérdida de contacto)"}
          </button>
        </div>
        ${state.rcp.active ? `<div class="rcp-timer" id="rcp-timer">00:00</div>` : ""}
        <div class="sound-check">
          <button class="btn btn-outline" id="btn-test-sound">🔊 Probar sonido y vibración</button>
          <span class="muted">Tócalo al empezar el turno para asegurar que las alarmas se escuchen en este dispositivo.</span>
        </div>
      </section>

     <!-- 1. IDENTIFICACIÓN MODIFICADO -->
<section class="panel" id="panel-identificacion">
  <style>
    /* Estilos exclusivos del punto 1: no afectan .sub-panel/.field-row del punto 2 */
    #panel-identificacion .id-vip-row { padding-bottom:12px; margin-bottom:14px; border-bottom:1px solid var(--border); }
    #panel-identificacion .id-roles { display:flex; flex-direction:column; gap:10px; }
    #panel-identificacion .id-role { background:rgba(127,127,127,0.06); border:1px solid var(--border); border-left:3px solid var(--gold); border-radius:8px; padding:10px 12px 12px; }
    
    /* Títulos de roles (Jefe de Escolta, Escolta Principal, etc.) */
    #panel-identificacion .id-role-header { 
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-weight: 400; 
      font-size: 13px; 
      color: #8b949e; 
      letter-spacing: .2px; 
      margin-bottom: 8px; 
      opacity: 1; 
    }

    #panel-identificacion .id-elem-label { display:block; margin-top:8px; opacity:.65; }
    #panel-identificacion #group-jefe-elem,
    #panel-identificacion #group-escolta-elem,
    #panel-identificacion #group-cond-elem { display:flex; flex-wrap:wrap; gap:4px 12px; margin-top:4px; }
    #panel-identificacion .id-footer { margin-top:14px; padding-top:14px; border-top:1px solid var(--border); }
    #panel-identificacion .id-footer .field-row { margin-bottom:10px; }

    /* Cuadros de nombre de agentes */
    #panel-identificacion #f-jefe,
    #panel-identificacion #f-escolta,
    #panel-identificacion #f-conductor {
      font-size: 13px;
      font-weight: 400;
      padding: 10px 12px;
      min-width: 240px;
      flex: 1 1 240px;
      border: 1.5px solid var(--gold);
      border-radius: 6px;
      background: rgba(15, 14, 14, 0.87);
      color: #c9d1d9;                                    /*  MODIFICADO: Letra en gris claro táctico al rellenar */
    }

    /* Texto de sugerencia cuando el cuadro está vacío */
    #panel-identificacion #f-jefe::placeholder,
    #panel-identificacion #f-escolta::placeholder,
    #panel-identificacion #f-conductor::placeholder {
      color: #8b949e;                                 /* MODIFICADO: Gris atenuado idéntico al texto de apoyo */
      font-weight: 400;
    }
  </style>

        <div class="panel-title">1. IDENTIFICACIÓN</div>

        <div class="id-vip-row field-row">
          <label>VIP-ID <input id="f-vipid" value="${state.vip.id || 'VIP-007'}" placeholder="VIP-007" ${dis}></label>
        </div>

        <div class="id-roles">
          <div class="sub-panel id-role">
            <div class="id-role-header"> Jefe de Escolta</div>
            <div class="field-row">
              <input id="f-jefe" value="${state.vip.jefe || ''}" placeholder="Nombre y apellidos" ${dis}>
              <label>Armamento: 
                <select id="f-jefe-arma" ${dis}>${renderArmaSelect(state.vip.jefeArma, dis)}</select>
              </label>
              <label>N° serie: <input id="f-jefe-serie" value="${state.vip.jefeSerie || ''}" placeholder="Escribir N° Serie" ${dis}></label>
              <label>Munición: 
                <select id="f-jefe-municion" ${dis}>${renderNumSelect(state.vip.jefeMunicion, dis)}</select>
              </label>
            </div>
            <small class="id-elem-label">Elementos de seguridad:</small>
            <div id="group-jefe-elem">${renderElemOpts(state.vip.jefeElementos, dis)}</div>
          </div>

          <div class="sub-panel id-role">
            <div class="id-role-header"> Escolta Principal</div>
            <div class="field-row">
              <input id="f-escolta" value="${state.vip.escoltaPpal || ''}" placeholder="Nombre y apellidos" ${dis}>
              <label>Armamento: 
                <select id="f-escolta-arma" ${dis}>${renderArmaSelect(state.vip.escoltaArma, dis)}</select>
              </label>
              <label>N° serie: <input id="f-escolta-serie" value="${state.vip.escoltaSerie || ''}" placeholder="Escribir N° Serie" ${dis}></label>
              <label>Munición: 
                <select id="f-escolta-municion" ${dis}>${renderNumSelect(state.vip.escoltaMunicion, dis)}</select>
              </label>
            </div>
            <small class="id-elem-label">Elementos de seguridad:</small>
            <div id="group-escolta-elem">${renderElemOpts(state.vip.escoltaElementos, dis)}</div>
          </div>

          <div class="sub-panel id-role">
            <div class="id-role-header"> Conductor</div>
            <div class="field-row">
              <select id="f-cond-tipo" ${dis}>
                <option value="conductor capacitado en temas de seguridad" ${state.vip.conductorTipo === "conductor capacitado en temas de seguridad" ? "selected" : ""}>conductor capacitado en temas de seguridad</option>
                <option value="conductor sin capacitación" ${state.vip.conductorTipo === "conductor sin capacitación" ? "selected" : ""}>conductor sin capacitación</option>
              </select>
              <input id="f-conductor" value="${state.vip.conductor || ''}" placeholder="Nombre y apellidos" ${dis}>
              <label>Armamento: 
                <select id="f-cond-arma" ${dis}>${renderArmaSelect(state.vip.conductorArma, dis)}</select>
              </label>
              <label>N° serie: <input id="f-cond-serie" value="${state.vip.conductorSerie || ''}" placeholder="Escribir N° Serie" ${dis}></label>
              <label>Munición: 
                <select id="f-cond-municion" ${dis}>${renderNumSelect(state.vip.conductorMunicion, dis)}</select>
              </label>
            </div>
            <small class="id-elem-label">Elementos de seguridad:</small>
            <div id="group-cond-elem">${renderElemOpts(state.vip.conductorElementos, dis)}</div>
          </div>
        </div>

        <div class="id-footer">
          <div class="field-row">
            <label>IGR estático (M1-M7): <input id="f-igrestatico" type="text" readonly value="${igrDinamico()} (Autogenerado)" ${dis}></label>
          </div>

          <div class="btn-row">
            <button class="btn" id="btn-mission-start" ${dis}>${(!state.missionStart || state.missionEnd) ? "Iniciar Misión" : "Misión en curso — " + new Date(state.missionStart).toLocaleTimeString()}</button>
            ${state.missionStart && !state.missionEnd ? `<button class="btn btn-outline" id="btn-mission-end" ${dis}>Finalizar Misión</button>` : ""}
          </div>
          ${state.missionEnd ? `<p class="muted">Última misión finalizada: ${new Date(state.missionEnd).toLocaleString()}</p>` : ""}
          <p class="muted agent-line">Sesión: ${agenteStr(agenteTag())}</p>
        </div>
      </section>

      <!-- 2. SALIDA A TERRENO MODIFICADO -->
      <section class="panel">
        <div class="panel-title">2. SALIDA A TERRENO — REGISTRO DIARIO</div>
        
        <div class="field-row">
          <label>Tipo de servicio: 
            <select id="tr-tipo-servicio" ${dis}>
              <option value="servicio diario" ${state.terrenoForm.tipoServicio === "servicio diario" ? "selected" : ""}>Servicio Diario</option>
              <option value="comision de servicio" ${state.terrenoForm.tipoServicio === "comision de servicio" ? "selected" : ""}>Comisión de Servicio</option>
            </select>
          </label>
        </div>

        <div class="field-row">
          <label>GASTOS DIARIOS — Alimentación: 
            <select id="tr-gastos-alimentacion" ${dis}>
              <option value="alimentacion fiscal" ${state.terrenoForm.gastosAlimentacion === "alimentacion fiscal" ? "selected" : ""}>Alimentación Fiscal</option>
              <option value="alimentacion particular" ${state.terrenoForm.gastosAlimentacion === "alimentacion particular" ? "selected" : ""}>Alimentación Particular</option>
            </select>
          </label>
          <label>Alojamiento: 
            <select id="tr-gastos-alojamiento" ${dis}>
              <option value="alojamiento fiscal" ${state.terrenoForm.gastosAlojamiento === "alojamiento fiscal" ? "selected" : ""}>Alojamiento Fiscal</option>
              <option value="alojamiento particular" ${state.terrenoForm.gastosAlojamiento === "alojamiento particular" ? "selected" : ""}>Alojamiento Particular</option>
            </select>
          </label>
        </div>

        <div class="field-row">
          <label>Fecha: <input id="tr-fecha" type="text" value="${state.terrenoForm.fecha || todayFormatted()}" ${dis}></label>
          <label>Hora de salida: <input id="tr-hsal" type="time" value="${state.terrenoForm.hsal}" ${dis}></label>
          <label>Hora de llegada: <input id="tr-hlle" type="time" value="${state.terrenoForm.hlle}" ${dis}></label>
        </div>

        <div class="field-row">
          <label>Vehículo: 
            <select id="tr-vehiculo-tipo" ${dis}>
              <option value="vehiculo fiscal" ${state.terrenoForm.vehiculoTipo === "vehiculo fiscal" ? "selected" : ""}>vehiculo fiscal</option>
              <option value="vehiculo particular" ${state.terrenoForm.vehiculoTipo === "vehiculo particular" ? "selected" : ""}>vehiculo particular</option>
              <option value="en arriendo" ${state.terrenoForm.vehiculoTipo === "en arriendo" ? "selected" : ""}>en arriendo</option>
            </select>
          </label>
          <label>Patente: <input id="tr-patente" placeholder="Texto libre para anotar la patente" value="${state.terrenoForm.patente}" ${dis}></label>
        </div>

        <div class="sub-panel">
          <strong>Lugar salida:</strong>
          <label class="checkbox-row">
            <input type="checkbox" id="tr-live-salida" ${terrenoLocal.liveTrackingSalida ? "checked" : ""} ${dis}>
            Compartir ubicación en tiempo real en el mapa (opcional)
          </label>
          <div class="btn-row">
            <button class="btn btn-outline" id="btn-add-lugar-salida" ${dis}>📍 Registrar lugar actual</button>
          </div>
          ${terrenoLocal.currentLugaresSalida.length ? `
            <ul class="alert-list">
              ${terrenoLocal.currentLugaresSalida.map((l) => `<li>[Salida ${l.at}] ${l.lat.toFixed(4)}, ${l.lng.toFixed(4)}</li>`).join("")}
            </ul>` : ""}
        </div>

        <div style="margin: 10px 0;">
          <label>Rutas y lugares visitados:</label>
          <textarea id="tr-rutas" placeholder="(texto libre)..." rows="2" ${dis}>${state.terrenoForm.rutas}</textarea>
        </div>

        <div class="sub-panel">
          <strong>Lugar llegada:</strong>
          <label class="checkbox-row">
            <input type="checkbox" id="tr-live-llegada" ${terrenoLocal.liveTrackingLlegada ? "checked" : ""} ${dis}>
            Compartir ubicación en tiempo real en el mapa (opcional)
          </label>
          <div class="btn-row">
            <button class="btn btn-outline" id="btn-add-lugar-llegada" ${dis}>📍 Registrar lugar actual</button>
          </div>
          ${terrenoLocal.currentLugaresLlegada.length ? `
            <ul class="alert-list">
              ${terrenoLocal.currentLugaresLlegada.map((l) => `<li>[Llegada ${l.at}] ${l.lat.toFixed(4)}, ${l.lng.toFixed(4)}</li>`).join("")}
            </ul>` : ""}
        </div>

        ${(terrenoLocal.liveTrackingSalida || terrenoLocal.liveTrackingLlegada) ? `<div id="terreno-map" class="terreno-map"></div><p class="muted" id="tr-pos-label">Obteniendo ubicación...</p>` : ""}

        <div style="margin: 10px 0;">
          <label>Novedades:</label>
          <textarea id="tr-novedades" placeholder="(texto libre para escribir las novedades si las hay)..." rows="2" ${dis}>${state.terrenoForm.novedades}</textarea>
        </div>

        <div class="btn-row">
          <button class="btn" id="btn-save-terreno" ${dis}>Guardar registro del día (generar el informe)</button>
        </div>

        <table class="log-table">
          <thead><tr><th>Fecha</th><th>Tipo</th><th>Gastos diarios</th><th>Vehículo / Patente</th><th>Salida</th><th>Llegada</th><th>Rutas / Novedades</th><th>Agente</th></tr></thead>
          <tbody>
            ${terrPeriodo.length ? terrPeriodo.map((e) => `
              <tr>
                <td>${e.fecha}</td>
                <td>${tipoServicioLabel(e.tipoServicio)}</td>
                <td>${alimentacionLabel(e.gastosAlimentacion)} / ${alojamientoLabel(e.gastosAlojamiento)}</td>
                <td>${e.vehiculoTipo || "—"} (${e.patente || "s/p"})</td>
                <td>${e.hsal || "—"}</td>
                <td>${e.hlle || "—"}</td>
                <td>${e.rutas || "—"} | Nov: ${e.novedades || "ninguna"}</td>
                <td>${agenteStr(e.agente)}</td>
              </tr>
            `).join("") : `<tr><td colspan="8" class="muted">Sin registros de terreno.</td></tr>`}
          </tbody>
        </table>
      </section>

      <section class="panel">
        <div class="panel-title">3. 📝 REPORTE RÁPIDO (IMC)</div>
        <select id="rep-type" ${dis}>
          ${R().reportTypes.map((t) => `<option value="${t.code}">${t.code} — ${t.label}</option>`).join("")}
        </select>
        <textarea id="rep-text" placeholder="Descripción breve..." rows="2" ${dis}></textarea>
        <label class="field-row">Puntaje de prioridad (0-20)
          <input type="range" min="0" max="20" value="10" id="rep-score" ${dis}>
          <span id="rep-score-val">10</span>
        </label>
        <button class="btn" id="btn-report" ${dis}>Enviar reporte</button>
      </section>

      <section class="panel">
        <div class="panel-title">4. FEP — FACTOR DE ESTADO DEL VIP</div>
        ${R().fep.variables.map((v) => `
          <div class="slider-row">
            <label>${v.label} (${v.code})</label>
            <input type="range" min="0" max="5" value="${state.fep[v.code]}" data-fep="${v.code}" ${dis}>
            <span class="slider-val">${state.fep[v.code]} — ${R().fep.scaleLabels[state.fep[v.code]]}</span>
          </div>
        `).join("")}
      </section>

      <section class="panel">
        <div class="panel-title">5. CIO — CONTRA-INTELIGENCIA OFENSIVA</div>
        ${R().cio.capacidades.map((c) => `
          <div class="slider-row">
            <label>${c.label} (${c.code})</label>
            <input type="range" min="0" max="20" value="${state.cio[c.code]}" data-cio="${c.code}" ${dis}>
            <span class="slider-val">${state.cio[c.code]}</span>
          </div>
        `).join("")}
        <div class="cct-meaning">ICCIO: <strong>${iccio.toFixed(1)}</strong> — ${cioLevel.label}. ${cioLevel.action}</div>
      </section>

      <section class="panel">
        <div class="panel-title">ALERTAS ACTIVAS</div>
        <ul class="alert-list">
          ${state.alerts.length ? state.alerts.map((a) => `<li>[${a.at}] ${a.text}</li>`).join("") : "<li class='muted'>Sin alertas activas.</li>"}
        </ul>
      </section>

      <section class="panel">
        <div class="panel-title"> REGISTRO OPERATIVO (DRO) — REPORTES Y AMENAZAS</div>
        <table class="log-table">
          <thead><tr><th>Hora</th><th>Tipo</th><th>Prioridad</th><th>Descripción</th><th>Agente</th><th>Estado</th></tr></thead>
          <tbody>
            ${repPeriodo.length ? repPeriodo.map((r) => {
              const estadoActual = (resolucionesPorReporte[r._id] && resolucionesPorReporte[r._id].estado) || "Pendiente";
              return `
              <tr>
                <td>${r.at}</td><td>${r.type}</td><td>${r.priority.label}</td><td>${r.text || "—"}</td><td>${agenteStr(r.agente)}</td>
                <td>
                  <select data-report-status="${r._id}" ${dis}>
                    ${["Pendiente", "Verificado — falso positivo", "Escalado", "Resuelto"].map((s) => `<option value="${s}" ${s === estadoActual ? "selected" : ""}>${s}</option>`).join("")}
                  </select>
                </td>
              </tr>
            `;
            }).join("") : `<tr><td colspan="6" class="muted">Sin reportes registrados.</td></tr>`}
          </tbody>
        </table>
        <table class="log-table">
          <thead><tr><th>Hora</th><th>Tipo</th><th>Detalle</th><th>Agente</th></tr></thead>
          <tbody>
            ${incPeriodo.length ? incPeriodo.map((i) => `
              <tr><td>${i.at}</td><td>${i.tipo}</td><td>${i.desc}</td><td>${agenteStr(i.agente)}</td></tr>
            `).join("") : `<tr><td colspan="4" class="muted">Sin incidentes registrados.</td></tr>`}
          </tbody>
        </table>
        <div class="btn-row">
          <button class="btn" id="btn-informe">Generar Informe de Misión</button>
          <button class="btn" id="btn-pdf">Descargar PDF</button>
          <button class="btn btn-outline" id="btn-csv-coords">📍 Descargar coordenadas (CSV)</button>
          ${!readOnly ? `<button class="btn btn-outline" id="btn-reset">Reiniciar módulo (nuevo turno)</button>` : ""}
        </div>
      </section>

      <section class="panel" id="informe-panel" style="display:none">
        <div class="panel-title">INFORME DE MISIÓN</div>
        <pre id="informe-text"></pre>
      </section>
    `;

    bindEvents();
    if (terrenoLocal.liveTrackingSalida || terrenoLocal.liveTrackingLlegada) initMap();
  }

  function todayFormatted() { 
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`; 
  }

  function initMap() {
    const container = root.querySelector("#terreno-map");
    if (!container || typeof L === "undefined") return;
    terrenoMap = L.map(container, { attributionControl: false }).setView([-33.45, -70.66], 13);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18 }).addTo(terrenoMap);
    if (terrenoLocal.lastPosition) {
      const p = terrenoLocal.lastPosition;
      terrenoMap.setView([p.lat, p.lng], 15);
      terrenoMarker = L.marker([p.lat, p.lng]).addTo(terrenoMap);
    }
    startWatch();
  }

  function startWatch() {
    if (watchId !== null || !navigator.geolocation) return;
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude, at: new Date().toLocaleTimeString() };
        terrenoLocal.lastPosition = p;
        const label = root.querySelector("#tr-pos-label");
        if (label) label.textContent = `Última posición: ${p.lat.toFixed(5)}, ${p.lng.toFixed(5)} (${p.at})`;
        if (terrenoMap) {
          if (!terrenoMarker) terrenoMarker = L.marker([p.lat, p.lng]).addTo(terrenoMap);
          else terrenoMarker.setLatLng([p.lat, p.lng]);
          terrenoMap.setView([p.lat, p.lng]);
        }
      },
      (err) => {
        const label = root.querySelector("#tr-pos-label");
        if (label) label.textContent = "No se pudo obtener ubicación: " + err.message;
      },
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
  }

  function stopWatch() {
    if (watchId !== null) { navigator.geolocation.clearWatch(watchId); watchId = null; }
    if (terrenoMap) { terrenoMap.remove(); terrenoMap = null; terrenoMarker = null; }
  }

  function captureLocationInto(locCollectionFn, idPromise) {
    if (!navigator.geolocation) return;
    idPromise.then((targetId) => {
      if (!targetId) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          S().addToLog(locCollectionFn(), { targetId, lat: pos.coords.latitude, lng: pos.coords.longitude })
            .catch((e) => console.error("Error al guardar ubicación del registro", e));
        },
        () => {},
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 15000 }
      );
    });
  }

  function getCheckboxesValues(containerId) {
    const el = root.querySelector(containerId);
    if (!el) return [];
    return Array.from(el.querySelectorAll("input[type=checkbox]:checked")).map(c => c.value);
  }

  function bindEvents() {
    ensureAudioCtx();
    root.querySelector("#btn-stop-alarm")?.addEventListener("click", stopAlarm);
    root.querySelector("#btn-test-sound")?.addEventListener("click", () => {
      ensureAudioCtx();
      beep(880, 250);
      setTimeout(() => beep(1320, 250), 280);
      vibrate([250, 100, 250]);
    });

    if (readOnly) {
      root.querySelector("#btn-informe")?.addEventListener("click", showInforme);
      root.querySelector("#btn-pdf")?.addEventListener("click", downloadPDF);
      root.querySelector("#btn-csv-coords")?.addEventListener("click", downloadCoordsCsv);
      return;
    }

    root.querySelectorAll("[data-fep]").forEach((input) => {
      input.addEventListener("input", (e) => {
        state.fep[e.target.dataset.fep] = +e.target.value;
        evaluateFEPRules();
        render(); persistDebounced();
      });
    });
    root.querySelectorAll("[data-cio]").forEach((input) => {
      input.addEventListener("input", (e) => {
        state.cio[e.target.dataset.cio] = +e.target.value;
        render(); persistDebounced();
      });
    });

    // Binds de los nuevos campos de Identificación
    const bindVal = (id, fn) => root.querySelector(id)?.addEventListener("change", (e) => { fn(e.target.value); persist(); });

    bindVal("#f-vipid", (v) => state.vip.id = v);
    bindVal("#f-jefe", (v) => { state.vip.jefe = v; localStorage.setItem("m8_saved_jefe", v); });
    bindVal("#f-jefe-arma", (v) => state.vip.jefeArma = v);
    bindVal("#f-jefe-serie", (v) => state.vip.jefeSerie = v);
    bindVal("#f-jefe-municion", (v) => state.vip.jefeMunicion = +v);

    bindVal("#f-escolta", (v) => { state.vip.escoltaPpal = v; localStorage.setItem("m8_saved_escolta", v); });
    bindVal("#f-escolta-arma", (v) => state.vip.escoltaArma = v);
    bindVal("#f-escolta-serie", (v) => state.vip.escoltaSerie = v);
    bindVal("#f-escolta-municion", (v) => state.vip.escoltaMunicion = +v);

    bindVal("#f-conductor", (v) => { state.vip.conductor = v; localStorage.setItem("m8_saved_conductor", v); });
    bindVal("#f-cond-tipo", (v) => state.vip.conductorTipo = v);
    bindVal("#f-cond-arma", (v) => state.vip.conductorArma = v);
    bindVal("#f-cond-serie", (v) => state.vip.conductorSerie = v);
    bindVal("#f-cond-municion", (v) => state.vip.conductorMunicion = +v);

    // Eventos Checkboxes elementos
    root.querySelectorAll("#group-jefe-elem input").forEach(i => i.addEventListener("change", () => {
      state.vip.jefeElementos = getCheckboxesValues("#group-jefe-elem"); persist();
    }));
    root.querySelectorAll("#group-escolta-elem input").forEach(i => i.addEventListener("change", () => {
      state.vip.escoltaElementos = getCheckboxesValues("#group-escolta-elem"); persist();
    }));
    root.querySelectorAll("#group-cond-elem input").forEach(i => i.addEventListener("change", () => {
      state.vip.conductorElementos = getCheckboxesValues("#group-cond-elem"); persist();
    }));

    // Binds de Salida a Terreno
    bindVal("#tr-fecha", (v) => state.terrenoForm.fecha = v);
    bindVal("#tr-hsal", (v) => state.terrenoForm.hsal = v);
    bindVal("#tr-hlle", (v) => state.terrenoForm.hlle = v);
    bindVal("#tr-tipo-servicio", (v) => state.terrenoForm.tipoServicio = v);
    bindVal("#tr-gastos-alimentacion", (v) => state.terrenoForm.gastosAlimentacion = v);
    bindVal("#tr-gastos-alojamiento", (v) => state.terrenoForm.gastosAlojamiento = v);
    bindVal("#tr-vehiculo-tipo", (v) => state.terrenoForm.vehiculoTipo = v);
    bindVal("#tr-patente", (v) => { state.terrenoForm.patente = v; localStorage.setItem("m8_saved_patente", v); });
    bindVal("#tr-rutas", (v) => state.terrenoForm.rutas = v);
    bindVal("#tr-novedades", (v) => state.terrenoForm.novedades = v);

    root.querySelector("#btn-mission-start")?.addEventListener("click", () => {
      if (!state.missionStart || state.missionEnd) {
        state.missionStart = Date.now();
        state.missionEnd = null;
        pushAlert("Misión iniciada.");
        render(); persist();
      }
    });
    root.querySelector("#btn-mission-end")?.addEventListener("click", () => {
      if (!confirm("¿Finalizar la misión actual? El próximo Informe de Misión se limitará a este turno.")) return;
      state.missionEnd = Date.now();
      pushAlert("Misión finalizada.");
      render(); persist();
    });

    root.querySelector("#btn-normalize-cct")?.addEventListener("click", () => {
      const nota = prompt("Motivo de la normalización del CCT:");
      if (!nota || !nota.trim()) { alert("Debes indicar un motivo."); return; }
      state.ctx = { brechaIndefension: false, amenazaConfirmada: false, vigilanciaActiva: false, iamAlto: false, defensaTotal: false };
      S().addToLog(m8IncidentesCollection(), {
        id: newId(), sourceDeviceId: getDeviceId(),
        at: new Date().toLocaleTimeString(), tipo: "NORMALIZACIÓN CCT",
        desc: `CCT normalizado manualmente. Motivo: ${nota.trim()}`, agente: agenteTag()
      }).catch((e) => console.error("Error al registrar normalización", e));
      pushAlert("CCT normalizado manualmente.");
      render(); persist();
    });

    root.querySelector("#btn-panic-total")?.addEventListener("click", () => {
      state.ctx.brechaIndefension = true;
      pushAlert("🚨 PÁNICO TOTAL ACTIVADO — CCT NEGRO. Evacuación inmediata.");
      const idPromise = S().addToLog(m8IncidentesCollection(), {
        id: newId(), sourceDeviceId: getDeviceId(),
        at: new Date().toLocaleTimeString(), tipo: "PÁNICO TOTAL",
        desc: "Botón de pánico total activado.", agente: agenteTag()
      }).catch((e) => { console.error("Error al registrar pánico total", e); return null; });
      captureLocationInto(m8IncidenteLocationsCollection, idPromise);
      render(); persist();
    });

    root.querySelector("#btn-panic-silent")?.addEventListener("click", () => {
      state.ctx.vigilanciaActiva = true;
      const idPromise = S().addToLog(m8IncidentesCollection(), {
        id: newId(), sourceDeviceId: getDeviceId(),
        at: new Date().toLocaleTimeString(), tipo: "PÁNICO SILENCIOSO",
        desc: "Alerta discreta enviada a central.", agente: agenteTag()
      }).catch((e) => { console.error("Error al registrar pánico silencioso", e); return null; });
      captureLocationInto(m8IncidenteLocationsCollection, idPromise);
      render(); persist();
    });

    root.querySelector("#btn-rcp")?.addEventListener("click", () => {
      if (state.rcp.active) {
        const secs = Math.round((Date.now() - state.rcp.startedAt) / 1000);
        S().addToLog(m8IncidentesCollection(), {
          id: newId(), sourceDeviceId: getDeviceId(),
          at: new Date().toLocaleTimeString(), tipo: "RCP", desc: `Protocolo resuelto en ${secs}s.`, agente: agenteTag()
        }).catch((e) => console.error("Error al registrar RCP", e));
        state.rcp.active = false;
        pushAlert(`RCP cancelado/resuelto (${secs}s).`);
      } else {
        state.rcp.active = true;
        state.rcp.startedAt = Date.now();
        pushAlert("RCP ACTIVADO.");
        beep(660, 200); setTimeout(() => beep(660, 200), 300); setTimeout(() => beep(660, 200), 600);
      }
      render(); persist();
      if (state.rcp.active) startRcpTimer();
    });

    root.querySelector("#btn-report")?.addEventListener("click", () => {
      const type = root.querySelector("#rep-type").value;
      const text = root.querySelector("#rep-text").value;
      const score = +root.querySelector("#rep-score").value;
      const priority = R().reportPriority(score);
      const idPromise = S().addToLog(m8ReportsCollection(), {
        id: newId(), at: new Date().toLocaleTimeString(), type, text, score, priority, agente: agenteTag()
      }).catch((e) => { console.error("Error al registrar reporte", e); return null; });
      captureLocationInto(m8ReportLocationsCollection, idPromise);
      if (score >= 14) {
        state.ctx.amenazaConfirmada = score >= 17;
        state.ctx.vigilanciaActiva = true;
        pushAlert(`Reporte ${type} (score ${score}) — ${priority.cct}`);
      }
      render(); persist();
    });
    root.querySelector("#rep-score")?.addEventListener("input", (e) => {
      root.querySelector("#rep-score-val").textContent = e.target.value;
    });

    root.querySelectorAll("[data-report-status]").forEach((sel) => {
      sel.addEventListener("change", (e) => {
        const reportId = e.target.dataset.reportStatus;
        const estado = e.target.value;
        S().addToLog(m8ReportResolutionsCollection(), {
          reportId, estado, agente: agenteTag(), at: new Date().toLocaleString()
        }).catch((err) => console.error("Error al registrar resolución del reporte", err));
      });
    });

    root.querySelector("#tr-live-salida")?.addEventListener("change", (e) => {
      terrenoLocal.liveTrackingSalida = e.target.checked;
      if (!e.target.checked && !terrenoLocal.liveTrackingLlegada) stopWatch();
      render();
    });

    root.querySelector("#tr-live-llegada")?.addEventListener("change", (e) => {
      terrenoLocal.liveTrackingLlegada = e.target.checked;
      if (!e.target.checked && !terrenoLocal.liveTrackingSalida) stopWatch();
      render();
    });

    root.querySelector("#btn-add-lugar-salida")?.addEventListener("click", () => {
      if (!navigator.geolocation) { alert("Geolocalización no disponible."); return; }
      navigator.geolocation.getCurrentPosition((pos) => {
        terrenoLocal.currentLugaresSalida.push({ at: new Date().toLocaleTimeString(), lat: pos.coords.latitude, lng: pos.coords.longitude });
        render();
      }, (err) => alert("No se pudo obtener ubicación: " + err.message));
    });

    root.querySelector("#btn-add-lugar-llegada")?.addEventListener("click", () => {
      if (!navigator.geolocation) { alert("Geolocalización no disponible."); return; }
      navigator.geolocation.getCurrentPosition((pos) => {
        terrenoLocal.currentLugaresLlegada.push({ at: new Date().toLocaleTimeString(), lat: pos.coords.latitude, lng: pos.coords.longitude });
        render();
      }, (err) => alert("No se pudo obtener ubicación: " + err.message));
    });

    root.querySelector("#btn-save-terreno")?.addEventListener("click", () => {
      const entryData = {
        id: newId(),
        fecha: state.terrenoForm.fecha,
        hsal: state.terrenoForm.hsal,
        hlle: state.terrenoForm.hlle,
        tipoServicio: state.terrenoForm.tipoServicio,
        gastosAlimentacion: state.terrenoForm.gastosAlimentacion,
        gastosAlojamiento: state.terrenoForm.gastosAlojamiento,
        vehiculoTipo: state.terrenoForm.vehiculoTipo,
        patente: state.terrenoForm.patente,
        rutas: state.terrenoForm.rutas,
        novedades: state.terrenoForm.novedades,
        lugaresSalida: terrenoLocal.currentLugaresSalida,
        lugaresLlegada: terrenoLocal.currentLugaresLlegada,
        agente: agenteTag()
      };

      S().addToLog(m8TerrenoCollection(), entryData)
        .catch((e) => console.error("Error al registrar salida a terreno", e));

      terrenoLocal.currentLugaresSalida = [];
      terrenoLocal.currentLugaresLlegada = [];
      pushAlert(`Registro de salida a terreno guardado (${state.terrenoForm.fecha}).`);
      showInforme();
      render();
    });

    root.querySelector("#btn-informe")?.addEventListener("click", showInforme);
    root.querySelector("#btn-pdf")?.addEventListener("click", downloadPDF);
    root.querySelector("#btn-csv-coords")?.addEventListener("click", downloadCoordsCsv);

    root.querySelector("#btn-reset")?.addEventListener("click", () => {
      if (confirm("¿Reiniciar el panel para un nuevo turno?")) {
        stopWatch();
        state = defaultState();
        state.missionStart = Date.now();
        persist(); render();
      }
    });
  }

  function showInforme() {
    const panel = root.querySelector("#informe-panel");
    panel.style.display = "block";
    root.querySelector("#informe-text").textContent = buildInforme();
    panel.scrollIntoView({ behavior: "smooth" });
  }

  let rcpInterval = null;
  function startRcpTimer() {
    clearInterval(rcpInterval);
    rcpInterval = setInterval(() => {
      const el = root.querySelector("#rcp-timer");
      if (!el || !state.rcp.active) { clearInterval(rcpInterval); return; }
      const secs = Math.round((Date.now() - state.rcp.startedAt) / 1000);
      const mm = String(Math.floor(secs / 60)).padStart(2, "0");
      const ss = String(secs % 60).padStart(2, "0");
      el.textContent = `${mm}:${ss}`;
      if (secs >= R().rcp.escalateAfterSeconds) {
        pushAlert("RCP sin resolver > 120s");
        clearInterval(rcpInterval);
      }
    }, 1000);
  }

  function getPeriodData() {
    const periodStart = state.missionStart || 0;
    const periodEnd = state.missionEnd || Date.now();
    const enPeriodo = (item) => !state.missionStart || (item._updatedAt >= periodStart && item._updatedAt <= periodEnd);
    return {
      periodStart, periodEnd,
      repPeriodo: reports.filter(enPeriodo),
      incPeriodo: incidentes.filter(enPeriodo),
      terrPeriodo: terrenoEntries.filter(enPeriodo)
    };
  }

  function buildInforme() {
    const cctDef = R().cct.levels.find((l) => l.code === currentCCT());
    const { periodStart, periodEnd, repPeriodo, incPeriodo, terrPeriodo } = getPeriodData();

    const porPrioridad = {};
    repPeriodo.forEach((r) => { const l = r.priority?.label || "—"; porPrioridad[l] = (porPrioridad[l] || 0) + 1; });
    const maxScore = repPeriodo.reduce((m, r) => Math.max(m, r.score || 0), 0);
    const huboPanicoTotal = incPeriodo.some((i) => i.tipo === "PÁNICO TOTAL");
    const huboPanicoSilencioso = incPeriodo.some((i) => i.tipo === "PÁNICO SILENCIOSO");
    const pendientes = repPeriodo.filter((r) => {
      const est = (resolucionesPorReporte[r._id] && resolucionesPorReporte[r._id].estado) || "Pendiente";
      return est === "Pendiente";
    }).length;

    const v = state.vip;
    const lines = [
      "════════════════════════════════════════════════",
      " INFORME DE MISIÓN — SIGPE 1.0",
      "════════════════════════════════════════════════",
      `Generado por: ${agenteStr(agenteTag())}`,
      `Fecha: ${new Date().toLocaleString()}`,
      "",
      "1. IDENTIFICACIÓN",
      ` VIP-ID: ${v.id || "VIP-007"}`,
      "",
      ` JEFE DE ESCOLTA: ${v.jefe || "—"}`,
      `   Arma: ${v.jefeArma} | N° Serie: ${v.jefeSerie || "s/n"} | Munición: ${v.jefeMunicion}`,
      `   Elementos: ${v.jefeElementos.join(", ") || "ninguno"}`,
      "",
      ` ESCOLTA PRINCIPAL: ${v.escoltaPpal || "—"}`,
      `   Arma: ${v.escoltaArma} | N° Serie: ${v.escoltaSerie || "s/n"} | Munición: ${v.escoltaMunicion}`,
      `   Elementos: ${v.escoltaElementos.join(", ") || "ninguno"}`,
      "",
      ` CONDUCTOR: ${v.conductor || "—"} (${v.conductorTipo})`,
      `   Arma: ${v.conductorArma} | N° Serie: ${v.conductorSerie || "s/n"} | Munición: ${v.conductorMunicion}`,
      `   Elementos: ${v.conductorElementos.join(", ") || "ninguno"}`,
      "",
      "── 2. SALIDA A TERRENO — REGISTROS ──",
      ...(terrPeriodo.length ? terrPeriodo.map((e) => 
        ` • Fecha: ${e.fecha} | Tipo de servicio: ${tipoServicioLabel(e.tipoServicio)}\n` +
        `   Gastos diarios: ${alimentacionLabel(e.gastosAlimentacion)} | ${alojamientoLabel(e.gastosAlojamiento)}\n` +
        `   Vehículo: ${e.vehiculoTipo} (Patente: ${e.patente || "s/p"})\n` +
        `   Salida: ${e.hsal || "s/h"} | Llegada: ${e.hlle || "s/h"}\n` +
        `   Rutas: ${e.rutas || "Sin detalles"}\n` +
        `   Novedades: ${e.novedades || "Ninguna"}\n` +
        `   Agente: ${agenteStr(e.agente)}`
      ) : [" • Sin registros de terreno en este período."]),
      "",
      ` IGR ESTÁTICO (M1-M7): Auto-Generado [${igrDinamico()}]`,
      "",
      "── RESUMEN PARA CLIENTE ──",
      ` • Nivel de riesgo general: ${cctDef.businessLabel} — ${cctDef.businessDesc}`,
      ` • Riesgo del entorno: ${R().cct.igrBusinessLevel(igrDinamico()).label} — ${R().cct.igrBusinessLevel(igrDinamico()).desc}`,
      ` • Estado del protegido: ${R().cct.fepBusinessLevel(fepTotal()).label} — ${R().cct.fepBusinessLevel(fepTotal()).desc}`,
      ` • Alertas de emergencia: ${huboPanicoTotal || huboPanicoSilencioso ? "Sí — ver detalle" : "Ninguna"}`,
      "",
      "── RESUMEN EJECUTIVO (TÉCNICO) ──",
      state.missionStart
        ? ` • Período: ${new Date(periodStart).toLocaleString()} → ${state.missionEnd ? new Date(periodEnd).toLocaleString() : "en curso"}`
        : " • Período: HISTORIAL COMPLETO",
      ` • Reportes de campo: ${repPeriodo.length}`,
      ` • Reportes pendientes: ${pendientes}`,
      ` • Puntaje máx de prioridad: ${maxScore || "—"}`,
      ` • Salidas a terreno registradas: ${terrPeriodo.length}`,
      ` • CCT actual: ${cctDef.name.toUpperCase()} — IGR dinámico ${igrDinamico()}, FEP ${fepTotal()}`,
      "",
      "── REPORTES DE CAMPO ──",
      ...(repPeriodo.length ? repPeriodo.map((r) => {
        const estado = (resolucionesPorReporte[r._id] && resolucionesPorReporte[r._id].estado) || "Pendiente";
        return ` • [${r.at}] ${r.type} (score ${r.score}) [${estado}] — ${r.text || "s/desc"} — Agente: ${agenteStr(r.agente)}`;
      }) : [" • Sin reportes en este período."]),
      "",
      "── INCIDENTES / RCP / PÁNICO ──",
      ...(incPeriodo.length ? incPeriodo.map((i) => ` • [${i.at}] ${i.tipo} — ${i.desc} — Agente: ${agenteStr(i.agente)}`) : [" • Sin incidentes en este período."]),
      "",
      "════════════════════════════════════════════════"
    ];
    return lines.join("\n");
  }

  async function buildMapImageDataUrl(repPeriodo, incPeriodo) {
    if (typeof L === "undefined" || typeof html2canvas === "undefined") return null;

    const puntos = [
      ...repPeriodo.filter((r) => ubicacionesPorReporte[r._id]).map((r) => ({
        lat: ubicacionesPorReporte[r._id].lat, lng: ubicacionesPorReporte[r._id].lng,
        color: r.priority?.label === "Crítico" || r.priority?.label === "Alerta Alta" ? "#ef4444" : "#f5a623",
        label: `${r.type} (${r.priority?.label || ""})`
      })),
      ...incPeriodo.filter((i) => ubicacionesPorIncidente[i._id]).map((i) => ({
        lat: ubicacionesPorIncidente[i._id].lat, lng: ubicacionesPorIncidente[i._id].lng,
        color: i.tipo === "PÁNICO TOTAL" ? "#ef4444" : "#8b5cf6",
        label: i.tipo
      }))
    ];
    if (!puntos.length) return null;

    const container = document.createElement("div");
    container.style.cssText = "position:fixed; left:-9999px; top:0; width:640px; height:400px;";
    document.body.appendChild(container);

    try {
      const tempMap = L.map(container, { attributionControl: false, zoomControl: false });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, crossOrigin: true }).addTo(tempMap);

      const bounds = L.latLngBounds(puntos.map((p) => [p.lat, p.lng]));
      tempMap.fitBounds(bounds.pad(0.25));

      puntos.forEach((p) => {
        L.circleMarker([p.lat, p.lng], {
          radius: 9, color: "#fff", weight: 2, fillColor: p.color, fillOpacity: 1
        }).bindTooltip(p.label, { permanent: false }).addTo(tempMap);
      });

      await new Promise((resolve) => {
        let resolved = false;
        tempMap.whenReady(() => {
          setTimeout(() => { if (!resolved) { resolved = true; resolve(); } }, 1200);
        });
        setTimeout(() => { if (!resolved) { resolved = true; resolve(); } }, 2500);
      });

      const canvas = await html2canvas(container, { useCORS: true, logging: false });
      const dataUrl = canvas.toDataURL("image/png");
      tempMap.remove();
      return dataUrl;
    } catch (e) {
      console.error("No se pudo generar el mapa", e);
      return null;
    } finally {
      container.remove();
    }
  }

  function sanitizeForPdf(text) {
    return text
      .replace(/═/g, "=")
      .replace(/─/g, "-")
      .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]\s?/gu, "");
  }

  function downloadCoordsCsv() {
    const { repPeriodo, incPeriodo, terrPeriodo } = getPeriodData();
    const rows = [["tipo", "subtipo", "fecha_hora", "descripcion", "lat", "lng", "agente_nombre", "agente_email"]];

    repPeriodo.forEach((r) => {
      const loc = ubicacionesPorReporte[r._id];
      if (!loc) return;
      rows.push(["Reporte", r.type, r.at, r.text || "", loc.lat, loc.lng, r.agente?.name || "", r.agente?.email || ""]);
    });
    incPeriodo.forEach((i) => {
      const loc = ubicacionesPorIncidente[i._id];
      if (!loc) return;
      rows.push(["Incidente", i.tipo, i.at, i.desc || "", loc.lat, loc.lng, i.agente?.name || "", i.agente?.email || ""]);
    });
    terrPeriodo.forEach((e) => {
      (e.lugaresSalida || []).forEach((l) => {
        rows.push(["Terreno Salida", e.rutas || "", `${e.fecha} ${l.at || ""}`, e.rutas || "", l.lat, l.lng, e.agente?.name || "", e.agente?.email || ""]);
      });
      (e.lugaresLlegada || []).forEach((l) => {
        rows.push(["Terreno Llegada", e.rutas || "", `${e.fecha} ${l.at || ""}`, e.rutas || "", l.lat, l.lng, e.agente?.name || "", e.agente?.email || ""]);
      });
    });

    if (rows.length === 1) { alert("No hay coordenadas registradas en este período."); return; }

    const csv = rows.map((row) => row.map((cell) => {
      const s = String(cell ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(",")).join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `coordenadas-${todayFormatted()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function downloadPDF() {
    if (!window.jspdf) { alert("No se pudo cargar el generador de PDF."); return; }
    const btn = root.querySelector("#btn-pdf");
    if (btn) { btn.disabled = true; btn.textContent = "Generando PDF..."; }

    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const text = sanitizeForPdf(buildInforme());
      doc.setFont("courier", "normal");
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(text, 500);
      let y = 40;
      lines.forEach((line) => {
        if (y > 780) { doc.addPage(); y = 40; }
        doc.text(line, 40, y);
        y += 12;
      });

      const { repPeriodo, incPeriodo } = getPeriodData();
      const mapImg = await buildMapImageDataUrl(repPeriodo, incPeriodo);
      if (mapImg) {
        doc.addPage();
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("MAPA DE ALERTAS DEL PERÍODO", 40, 40);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text("Puntos registrados con coordenadas.", 40, 55, { maxWidth: 500 });
        doc.addImage(mapImg, "PNG", 40, 75, 500, 312);
      }

      doc.save(`informe-mision-${todayFormatted()}.pdf`);
    } finally {
      if (btn) { btn.disabled = readOnly; btn.textContent = "Descargar PDF"; }
    }
  }

  function m8Collection() { return `vips/${window.MierpeVips.getCurrentVipId()}/m8State`; }
  function m8ReportsCollection() { return `vips/${window.MierpeVips.getCurrentVipId()}/reports`; }
  function m8IncidentesCollection() { return `vips/${window.MierpeVips.getCurrentVipId()}/incidentes`; }
  function m8TerrenoCollection() { return `vips/${window.MierpeVips.getCurrentVipId()}/terreno`; }
  function m8ReportResolutionsCollection() { return `vips/${window.MierpeVips.getCurrentVipId()}/reportResolutions`; }
  function m8ReportLocationsCollection() { return `vips/${window.MierpeVips.getCurrentVipId()}/reportLocations`; }
  function m8IncidenteLocationsCollection() { return `vips/${window.MierpeVips.getCurrentVipId()}/incidenteLocations`; }

  function persist() { S().set(m8Collection(), "current-state", state).catch((e) => console.error("Error al guardar estado M8", e)); }

  let persistTimer = null;
  function persistDebounced(delay = 450) {
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
    stopWatch();
    unsubscribeAll();
    clearTimeout(persistTimer);

    if (!window.MierpeVips.getCurrentVipId()) {
      root.innerHTML = `<div class="panel"><div class="panel-title">MCTRO</div><p class="muted">${window.MierpeI18n.t("select_vip_first")}</p></div>`;
      return;
    }

    state = defaultState();
    reports = []; incidentes = []; terrenoEntries = []; resolucionesPorReporte = {};
    ubicacionesPorReporte = {}; ubicacionesPorIncidente = {};
    terrenoLocal = { liveTrackingSalida: false, liveTrackingLlegada: false, lastPosition: null, currentLugaresSalida: [], currentLugaresLlegada: [] };
    seenIncidentIds = new Set();
    firstIncidentSnapshot = true;

    unsubscribers.push(S().onDocSnapshot(m8Collection(), "current-state", (saved) => {
    if (saved) state = { ...defaultState(), ...saved };
      render();
    }));
    unsubscribers.push(S().onSnapshot(m8ReportsCollection(), 200, (rows) => {
      reports = rows.map((r) => ({ ...r.value, _id: r.id, _updatedAt: r.updatedAt }));
      render();
    }));
    unsubscribers.push(S().onSnapshot(m8IncidentesCollection(), 200, (rows) => {
      handleIncomingIncidents(rows);
    }));
    unsubscribers.push(S().onSnapshot(m8TerrenoCollection(), 200, (rows) => {
      terrenoEntries = rows.map((r) => ({ ...r.value, _updatedAt: r.updatedAt }));
      render();
    }));
    unsubscribers.push(S().onSnapshot(m8ReportResolutionsCollection(), 500, (rows) => {
      resolucionesPorReporte = {};
      rows.forEach((r) => {
        const v = r.value;
        if (!resolucionesPorReporte[v.reportId] || r.updatedAt > resolucionesPorReporte[v.reportId]._updatedAt) {
          resolucionesPorReporte[v.reportId] = { ...v, _updatedAt: r.updatedAt };
        }
      });
      render();
    }));
    unsubscribers.push(S().onSnapshot(m8ReportLocationsCollection(), 500, (rows) => {
      ubicacionesPorReporte = {};
      rows.forEach((r) => { ubicacionesPorReporte[r.value.targetId] = { lat: r.value.lat, lng: r.value.lng }; });
      render();
    }));
    unsubscribers.push(S().onSnapshot(m8IncidenteLocationsCollection(), 500, (rows) => {
      ubicacionesPorIncidente = {};
      rows.forEach((r) => { ubicacionesPorIncidente[r.value.targetId] = { lat: r.value.lat, lng: r.value.lng }; });
      render();
    }));
  }

  return { mount, primeAudio: () => ensureAudioCtx() };
})();

window.MierpeM8 = MierpeM8;