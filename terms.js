/**
 * terms.js — Términos de Uso y Protección de Datos (SIGPE - Ley 21.719)
 */
window.MierpeTerms = (function () {
  const TERMS_VERSION = "2026-08-22.1";

  const TERMS_TEXT = `TÉRMINOS DE USO Y AVISO DE PROTECCIÓN DE DATOS — SIGPE

Última actualización: 22 de agosto de 2026
Responsable del Tratamiento: SIGPE / Protección Ejecutiva
Contacto para Protección de Datos: contacto@sigpe.app

1. NATURALEZA Y ALCANCE DE LA PLATAFORMA
SIGPE (Sistema de Gestión de Protección Ejecutiva) es una plataforma SaaS de uso corporativo exclusivo para la gestión táctica, operativa y de seguridad ejecutiva. El acceso está estrictamente limitado a clientes corporativos, sus administradores, personal de protección ejecutiva (agentes/escoltas) y personas protegidas (VIP) explícitamente autorizados.

2. CATEGORÍAS DE DATOS TRATADOS
Para la prestación de los servicios operativos, SIGPE procesa las siguientes categorías de datos:
 • Datos Identificativos y de Contacto: Nombre, correo electrónico, rol operativo, empresa y credenciales de acceso.
 • Geolocalización en Tiempo Real: Coordenadas GPS transmitidas voluntariamente desde los dispositivos durante operaciones tácticas o de acompañamiento.
 • Datos Sensibles y Perfil de Riesgo: Evaluaciones de amenaza, vulnerabilidades, estado de salud o grupo sanguíneo (módulo médico), dinámicas familiares y registros de eventos críticos.
 • Comunicaciones Tácticas: Mensajería interna resguardada mediante mecanismos de cifrado.

3. BASE DE LICITUD Y CORRESPONSABILIDAD (Ley N° 21.719)
Conforme a la Ley N° 21.719 sobre Protección de Datos Personales:
 • El Cliente Corporativo / Administrador actúa como el Responsable del Tratamiento primario de los datos de sus VIPs y personal de campo, garantizando que cuenta con el consentimiento previo, explícito e informado de los titulares, o con una base contractual legal vigente.
 • SIGPE actúa en calidad de Encargado del Tratamiento del software, proveyendo la infraestructura tecnológica y las medidas de seguridad exigidas por la ley.

4. DERECHOS DE LOS TITULARES (ARCOP)
Los titulares de los datos (VIPs, agentes y usuarios) pueden ejercer en cualquier momento sus derechos de Acceso, Rectificación, Cancelación, Oposición y Portabilidad establecidos en la Ley N° 21.719 mediante solicitud escrita al correo de contacto.

5. SEGURIDAD Y CONFIDENCIALIDAD
 • Infraestructura: La plataforma utiliza servicios en la nube con políticas de acceso basadas en roles (RBAC) y aislamiento multi-tenencia por organización.
 • Cifrado: Las comunicaciones del chat utilizan cifrado de extremo a extremo (E2EE).
 • Custodia: Cada usuario es responsable exclusivo de mantener la confidencialidad de sus credenciales de acceso.

6. USO ACEPTABLE Y RESPONSABILIDAD DEL USUARIO
Queda estrictamente prohibido utilizar la plataforma para fines ajenos a la protección ejecutiva, compartir credenciales o divulgar datos sensibles, geolocalizaciones o planes de avanzada fuera del propósito autorizado. La divulgación no autorizada de estos datos constituye una infracción grave a la Ley N° 21.719 y puede configurar delitos sancionados en el Código Penal y en la Ley N° 21.459 de Delitos Informáticos.

7. LIMITACIÓN DE RESPONSABILIDAD
SIGPE provee la plataforma como una herramienta tecnológica de soporte a la operación. El uso indebido, la falta de obtención de consentimientos por parte del Cliente Corporativo o las conductas negligentes cometidas por los usuarios serán de responsabilidad exclusiva de quien las ejecute.`;

  function showModal() {
    let modal = document.getElementById("terms-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "terms-modal";
      modal.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); display:flex; align-items:center; justify-content:center; z-index:9999; padding:16px;";
      modal.innerHTML = `
        <div style="background:#111827; border:1px solid #374151; border-radius:8px; max-width:650px; width:100%; max-height:80vh; display:flex; flex-direction:column; padding:20px; color:#f3f4f6;">
          <h3 style="margin-top:0; font-size:16px; color:#38bdf8;">TÉRMINOS DE USO Y PROTECCIÓN DE DATOS</h3>
          <div style="flex:1; overflow-y:auto; white-space:pre-wrap; font-family:monospace; font-size:12px; background:#0b0f17; padding:12px; border-radius:4px; border:1px solid #1f2937; margin:12px 0; color:#d1d5db; line-height:1.5;">${TERMS_TEXT}</div>
          <div style="text-align:right;">
            <button type="button" class="btn" id="btn-close-terms">Cerrar</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      document.getElementById("btn-close-terms").onclick = () => { modal.style.display = "none"; };
    } else {
      modal.style.display = "flex";
    }
  }

  function checkboxHtml(prefix) {
    return `
      <div style="margin: 10px 0; font-size: 12px; color: #9ca3af;">
        <label style="display: flex; align-items: flex-start; gap: 8px; cursor: pointer;">
          <input type="checkbox" id="${prefix}-terms-check" style="margin-top: 2px;">
          <span>He leído y acepto los <a href="#" id="${prefix}-link-terms" style="color:#38bdf8; text-decoration:underline;">Términos de Uso y Protección de Datos</a>.</span>
        </label>
      </div>
    `;
  }

  function bindCheckbox(prefix) {
    setTimeout(() => {
      const link = document.getElementById(`${prefix}-link-terms`);
      if (link) {
        link.addEventListener("click", (e) => {
          e.preventDefault();
          showModal();
        });
      }
    }, 100);

    return () => {
      const chk = document.getElementById(`${prefix}-terms-check`);
      return chk ? chk.checked : false;
    };
  }

  return {
    showModal,
    checkboxHtml,
    bindCheckbox,
    getVersion: () => TERMS_VERSION
  };
})();