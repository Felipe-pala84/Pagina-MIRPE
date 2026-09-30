/**
 * MIRPE — Formulario de contacto → Gmail directo
 * -------------------------------------------------
 * Este script no depende de ningún servicio externo (Formspree, etc.):
 * corre en tu propia cuenta de Google y envía el correo usando tu Gmail.
 *
 * CÓMO INSTALARLO (una sola vez):
 * 1. Ve a https://script.google.com/ → "Nuevo proyecto"
 * 2. Borra el código de ejemplo y pega todo este archivo
 * 3. Reemplaza TU-CORREO@gmail.com más abajo por tu Gmail real
 * 4. Arriba a la derecha: "Implementar" → "Nueva implementación"
 *    - Tipo: "Aplicación web"
 *    - Ejecutar como: "Yo" (tu cuenta)
 *    - Quién tiene acceso: "Cualquier usuario"
 * 5. Autoriza los permisos que te pida Google (te va a advertir que es
 *    un script "no verificado" porque lo escribiste tú mismo — es normal,
 *    dale a "Avanzado" → "Ir a [nombre del proyecto] (no seguro)")
 * 6. Copia la URL que te entrega (termina en /exec)
 * 7. Pégala en public/script.js, en la constante APPS_SCRIPT_URL
 *
 * Nota sobre el correo "no verificado": esa advertencia aparece porque
 * el script no ha pasado la revisión de Google para apps públicas de
 * terceros — como es solo para ti, no aplica y es seguro continuar.
 */

const DESTINO = "TU-CORREO@gmail.com";

function doPost(e) {
  try {
    const params = e.parameter;
    const formType = params.formType || "contacto";

    let subject, body;

    if (formType === "articulo") {
      const name = params.name || "(sin nombre)";
      const email = params.email || "(sin correo)";
      const title = params.title || "(sin título)";
      const content = params.content || "";

      subject = `Propuesta de artículo para el blog: ${title}`;
      body =
        `Nombre: ${name}\n` +
        `Correo: ${email}\n` +
        `Título propuesto: ${title}\n\n` +
        `Contenido / link:\n${content}`;

      GmailApp.sendEmail(DESTINO, subject, body, { replyTo: email });

    } else {
      const name = params.name || "(sin nombre)";
      const email = params.email || "(sin correo)";
      const segment = params.segment || "(sin especificar)";
      const message = params.message || "";

      subject = `Nuevo contacto MIRPE (${segment}): ${name}`;
      body =
        `Nombre: ${name}\n` +
        `Correo: ${email}\n` +
        `Perfil: ${segment}\n\n` +
        `Mensaje:\n${message}`;

      GmailApp.sendEmail(DESTINO, subject, body, { replyTo: email });
    }

    return ContentService
      .createTextOutput(JSON.stringify({ result: "success" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: "error", error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
