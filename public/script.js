// ============================================================
// MIERPE / SIGPE — interactividad del sitio
// Sitio 100% estático: sin backend propio. El pago del curso y
// la agenda de demo se resuelven con links externos (ver index.html,
// buscar "PEGA-AQUI"). El formulario de contacto usa Formspree.
// ============================================================

document.getElementById("year").textContent = new Date().getFullYear();

/* ---------- Gauge del hero: animación única al cargar ---------- */
window.addEventListener("load", () => {
  const gauge = document.getElementById("heroGauge");
  requestAnimationFrame(() => {
    setTimeout(() => gauge.classList.add("animate"), 150);
  });
});

/* ---------- Menú móvil ---------- */
const navToggle = document.getElementById("navToggle");
const mainNav = document.querySelector(".main-nav");
navToggle.addEventListener("click", () => {
  const isOpen = mainNav.style.display === "flex";
  mainNav.style.display = isOpen ? "none" : "flex";
  mainNav.style.flexDirection = "column";
  mainNav.style.position = "absolute";
  mainNav.style.top = "72px";
  mainNav.style.left = "0";
  mainNav.style.right = "0";
  mainNav.style.background = "var(--bg)";
  mainNav.style.padding = "16px 28px";
  mainNav.style.borderBottom = "1px solid var(--border-soft)";
  navToggle.setAttribute("aria-expanded", String(!isOpen));
});

/* ---------- Selector de audiencia ---------- */
const audienceTabs = document.querySelectorAll(".audience-tab");
audienceTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    audienceTabs.forEach((t) => t.setAttribute("aria-selected", "false"));
    document.querySelectorAll(".audience-panel").forEach((p) => p.classList.remove("active"));

    tab.setAttribute("aria-selected", "true");
    document.getElementById(tab.dataset.target).classList.add("active");
  });
});

/* ---------- FAQ: filtro por grupo ---------- */
const faqTabs = document.querySelectorAll(".faq-group-tab");
faqTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    faqTabs.forEach((t) => t.setAttribute("aria-selected", "false"));
    document.querySelectorAll(".faq-list").forEach((l) => l.classList.remove("active"));

    tab.setAttribute("aria-selected", "true");
    document.getElementById(tab.dataset.faq).classList.add("active");
  });
});

/* ---------- FAQ: acordeón ---------- */
document.querySelectorAll(".faq-item").forEach((item) => {
  const question = item.querySelector(".faq-question");
  const answer = item.querySelector(".faq-answer");

  question.addEventListener("click", () => {
    const isOpen = item.dataset.open === "true";

    // cierra los demás items del mismo grupo
    item.closest(".faq-list").querySelectorAll(".faq-item").forEach((other) => {
      other.dataset.open = "false";
      other.querySelector(".faq-answer").style.maxHeight = null;
    });

    if (!isOpen) {
      item.dataset.open = "true";
      answer.style.maxHeight = answer.scrollHeight + "px";
    }
  });
});

/* ---------- Envío de formularios → Google Apps Script ----------
   Pega aquí la URL que te entrega Apps Script al implementar
   (ver /apps-script/Code.gs), termina en /exec */
const APPS_SCRIPT_URL = "PEGA-AQUI-TU-URL-DE-APPS-SCRIPT";

function wireForm(formId, statusId) {
  const form = document.getElementById(formId);
  const status = document.getElementById(statusId);
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.textContent = "Enviando…";
    status.className = "form-status";

    const formData = new FormData(form);

    try {
      // mode: "no-cors" es necesario porque Apps Script no agrega headers
      // CORS a su respuesta. No podemos leer si Google respondió "success"
      // o "error", pero la petición sí llega y el script sí se ejecuta y
      // envía el correo. Si algo no llega, revisa el registro de
      // ejecuciones en script.google.com (ícono de reloj, a la izquierda).
      await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body: formData,
      });

      status.textContent = "Recibido. Te responderemos pronto.";
      status.className = "form-status ok";
      form.reset();
    } catch (err) {
      status.textContent = "No pudimos enviar tu mensaje. Escríbenos por WhatsApp mientras lo resolvemos.";
      status.className = "form-status err";
      console.error(err);
    }
  });
}

wireForm("contactForm", "formStatus");
wireForm("blogForm", "blogFormStatus");

/* ---------- Botones de PayPal (Nivel 1, 2 y 3 del curso) ----------
   Requiere que el SDK de PayPal esté cargado en index.html con tu
   client-id real (ver README.md, sección "Pagos"). Si el client-id
   sigue siendo el de ejemplo, el SDK no carga y estos botones
   simplemente no aparecen — no rompe el resto de la página. */
if (window.paypal) {
  const nivelesPago = [
    { id: "paypal-nivel1", amount: "175.00" },
    { id: "paypal-nivel2", amount: "350.00" },
    { id: "paypal-nivel3", amount: "350.00" },
  ];

  nivelesPago.forEach(({ id, amount }) => {
    const el = document.getElementById(id);
    if (!el) return;

    paypal.Buttons({
      style: { layout: "horizontal", color: "gold", shape: "rect", label: "paypal", height: 40 },
      createOrder: (data, actions) =>
        actions.order.create({
          purchase_units: [{ amount: { value: amount, currency_code: "USD" } }],
        }),
      onApprove: (data, actions) =>
        actions.order.capture().then(() => {
          window.location.href = "gracias.html";
        }),
    }).render(`#${id}`);
  });
}

// Gráfico 3D Interactivo - Ataques en Latinoamérica
document.addEventListener("DOMContentLoaded", function() {
    const container = document.getElementById('chart-container');
    if (!container) return; // Si la sección no está en esta página específica, evita errores

    const paises = ['México', 'Colombia', 'Brasil', 'Perú', 'Ecuador', 'Chile'];
    const anos = ['2022', '2023', '2024', '2025'];

    const zData = [
        [274, 290, 310, 324], // México
        [85, 92, 95, 100],   // Colombia
        [60, 68, 75, 81],    // Brasil
        [20, 28, 35, 48],    // Perú
        [15, 22, 30, 42],    // Ecuador
        [10, 14, 18, 25]     // Chile
    ];

    let xValues = [];
    let yValues = [];
    let zValues = [];
    let textValues = [];

    paises.forEach((pais, i) => {
        anos.forEach((ano, j) => {
            xValues.push(pais);
            yValues.push(ano);
            zValues.push(zData[i][j]);
            textValues.push(`<b>${pais} (${ano})</b><br>Incidentes: ${zData[i][j]}`);
        });
    });

    const trace = {
        type: 'scatter3d',
        mode: 'lines+markers',
        x: xValues,
        y: yValues,
        z: zValues,
        text: textValues,
        hoverinfo: 'text',
        marker: {
            size: 8,
            color: zValues,
            colorscale: 'Viridis',
            opacity: 0.9,
            colorbar: {
                title: '<b>Incidentes</b>',
                titlefont: { color: '#ffffff', size: 12 },
                tickfont: { color: '#94a3b8' },
                len: 0.6
            },
            line: {
                color: '#ffffff',
                width: 0.5
            }
        },
        line: {
            color: '#38bdf8',
            width: 4
        }
    };

    const layout = {
        paper_bgcolor: '#0b0f19',
        plot_bgcolor: '#0b0f19',
        margin: { l: 0, r: 0, b: 0, t: 0 },
        scene: {
            xaxis: {
                title: { text: '<b>País</b>', font: { color: '#e2e8f0', size: 12 } },
                tickfont: { color: '#cbd5e1', size: 10 },
                gridcolor: '#1e293b',
                zerolinecolor: '#334155'
            },
            yaxis: {
                title: { text: '<b>Año</b>', font: { color: '#e2e8f0', size: 12 } },
                tickfont: { color: '#cbd5e1', size: 10 },
                gridcolor: '#1e293b',
                zerolinecolor: '#334155'
            },
            zaxis: {
                title: { text: '<b>N° Incidentes</b>', font: { color: '#e2e8f0', size: 12 } },
                tickfont: { color: '#cbd5e1', size: 10 },
                gridcolor: '#1e293b',
                zerolinecolor: '#334155'
            },
            camera: {
                eye: { x: 1.8, y: -1.8, z: 1.2 }
            }
        }
    };

    const config = {
        responsive: true, // Esto hace que Plotly detecte cambios de tamaño en la pantalla
        displayModeBar: true,
        modeBarButtonsToRemove: ['sendDataToCloud']
    };

    Plotly.newPlot('chart-container', [trace], layout, config);

    // Forzar un reajuste automático por si el navegador carga con elementos colapsados
    window.addEventListener('resize', function() {
        Plotly.Plots.resize('chart-container');
    });
});

// Indicador de Riesgo 3D Interactivo (Three.js)
document.addEventListener("DOMContentLoaded", function() {
    const container = document.getElementById('risk-3d-container');
    if (!container) return;

    // Respaldo por si el navegador mide 0 antes de que termine de acomodar el layout
    const anchoInicial = container.clientWidth || 300;
    const altoInicial = container.clientHeight || 280;

    // 1. Configuración de Escena, Cámara y Renderizador
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, anchoInicial / altoInicial, 0.1, 1000);
    camera.position.z = 6;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(anchoInicial, altoInicial);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // 2. Iluminación ambiental y direccional para dar volumen 3D
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 2);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    // 3. Crear el Anillo 3D (TorusGeometry) simulando el medidor de progreso (100%)
    // Creamos un grupo para poder rotarlo suavemente
    const ringGroup = new THREE.Group();
    scene.add(ringGroup);

    // Anillo de fondo (sutil gris oscuro)
    const bgRingGeo = new THREE.TorusGeometry(1.8, 0.12, 16, 100);
    const bgRingMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.05 });
    const bgRing = new THREE.Mesh(bgRingGeo, bgRingMat);
    ringGroup.add(bgRing);

    // Anillo activo con degradado/color dinámico simulando el 73% (aprox 4.5 radianes de los 6.28 totales)
    // Para darle un toque sofisticado de degradado, usamos un material dorado/ámbar institucional (#f59e0b)
    const progressGeo = new THREE.TorusGeometry(1.8, 0.15, 16, 100, (73 / 100) * Math.PI * 2);
    const progressMat = new THREE.MeshStandardMaterial({ 
        color: 0xf59e0b, 
        roughness: 0.3, 
        metalness: 0.8,
        emissive: 0xd97706,
        emissiveIntensity: 0.2
    });
    const progressRing = new THREE.Mesh(progressGeo, progressMat);
    // Centrar la rotación del arco
    progressRing.rotation.z = Math.PI / 2;
    ringGroup.add(progressRing);

    // Pequeña esfera brillante en la punta del indicador para darle dinamismo 3D
    const tipGeo = new THREE.SphereGeometry(0.18, 32, 32);
    const tipMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xf59e0b, emissiveIntensity: 0.8 });
    const tipMesh = new THREE.Mesh(tipGeo, tipMat);
    ringGroup.add(tipMesh);

    // Posicionar la esfera en el ángulo correspondiente al 73%
    const angle = (90 / 100) * Math.PI * 2 - (Math.PI / 2);
    tipMesh.position.x = Math.cos(angle) * 1.8;
    tipMesh.position.y = Math.sin(angle) * 1.8;

    // 4. Crear texto HTML flotante en el centro para el porcentaje (73% Bajo control)
    let centerLabel = document.createElement('div');
    centerLabel.style.position = 'absolute';
    centerLabel.style.top = '50%';
    centerLabel.style.left = '50%';
    centerLabel.style.transform = 'translate(-50%, -50%)';
    centerLabel.style.textAlign = 'center';
    centerLabel.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
    centerLabel.style.pointerEvents = 'none';
    centerLabel.innerHTML = `
        <div style="font-size: 1.8rem; font-weight: bold; color: #f8fafc; letter-spacing: 1px;">73%</div>
        <div style="font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; margin-top: 2px;">Bajo control</div>
    `;
    container.style.position = 'relative';
    container.appendChild(centerLabel);

   // 5. Animación de valor dinámico (oscilando entre 15 y 95) y rotación 3D continua
    let time = 0;
    const centerValueElement = centerLabel.querySelector('div:first-child');
    const centerStatusElement = centerLabel.querySelector('div:last-child');

    function animate() {
        requestAnimationFrame(animate);
        
        time += 0.008;
        
        // Generar un valor fluctuante cíclico entre 15 y 95 usando una onda sinusoidal
        let dynamicRisk = Math.round(55 + Math.sin(time) * 40);
        
        // Actualizar el número en el texto central HTML
        if (centerValueElement) {
            centerValueElement.innerText = dynamicRisk + '%';
            
            // Cambiar dinámicamente el estado y color según el puntaje de riesgo
            if (dynamicRisk < 40) {
                centerStatusElement.innerText = "Bajo control";
                centerStatusElement.style.color = "#10b981"; // Verde
                progressMat.color.setHex(0x10b981);
                tipMat.color.setHex(0x34d399);
            } else if (dynamicRisk < 75) {
                centerStatusElement.innerText = "Atención requerida";
                centerStatusElement.style.color = "#f59e0b"; // Amarillo/Ámbar
                progressMat.color.setHex(0xf59e0b);
                tipMat.color.setHex(0xfbbf24);
            } else {
                centerStatusElement.innerText = "Nivel crítico";
                centerStatusElement.style.color = "#ef4444"; // Rojo
                progressMat.color.setHex(0xef4444);
                tipMat.color.setHex(0xf87171);
            }
        }

        // Reconstruir dinámicamente la geometría del arco 3D según el nuevo porcentaje
        const newAngleSpan = (dynamicRisk / 100) * Math.PI * 2;
        progressRing.geometry.dispose();
        progressRing.geometry = new THREE.TorusGeometry(1.8, 0.15, 16, 100, newAngleSpan > 0.1 ? newAngleSpan : 0.1);

        // Actualizar la posición de la esfera brillante en la punta del anillo
        const angle = newAngleSpan - (Math.PI / 2);
        tipMesh.position.x = Math.cos(angle) * 1.8;
        tipMesh.position.y = Math.sin(angle) * 1.8;

        // Rotación continua 3D del conjunto
        ringGroup.rotation.y += 0.005;
        ringGroup.rotation.x = Math.sin(time * 0.5) * 0.1;

        renderer.render(scene, camera);
    }
    animate();

    // 6. Adaptabilidad responsiva si cambia el tamaño de la ventana
    window.addEventListener('resize', function() {
        if (!container) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });
});
