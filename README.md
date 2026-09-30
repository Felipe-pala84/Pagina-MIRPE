# Sitio MIRPE / SIGPE — versión estática

Sitio 100% estático. No requiere backend, servidor ni Firebase Functions.
El pago del curso, la agenda de demo y el envío del formulario se resuelven
con enlaces y servicios externos.

## Estructura

```
mirpe-site/
├── firebase.json        ← opcional, solo si despliegas con Firebase Hosting
├── apps-script/
│   └── Code.gs           ← pégalo en script.google.com (ver instrucciones dentro del archivo)
└── public/
    ├── index.html
    ├── privacidad.html
    ├── terminos.html
    ├── gracias.html
    ├── style.css
    └── script.js
```

## Pendientes marcados en el código — busca "PEGA-AQUI" y "[COMPLETAR]"

1. **Link del curso** (`index.html`, sección Cursos): reemplaza
   `PEGA-AQUI-TU-LINK-DEL-CURSO` por la URL de checkout de tu plataforma
   de curso (Hotmart, Teachable, Circle, etc.).

2. **Link de agenda para la demo en vivo** (`index.html`, sección SIGPE):
   reemplaza `PEGA-AQUI-TU-LINK-DE-AGENDA` por tu link de Calendly,
   Cal.com o similar.

3. **Video de la demo** (`index.html`, sección SIGPE): cuando grabes el
   video (con datos ficticios, nunca una misión real), reemplaza el
   `<div class="video-frame">...</div>` por un iframe de YouTube, ej.:
   ```html
   <iframe class="video-frame" src="https://www.youtube.com/embed/TU-ID-DE-VIDEO" title="Demo SIGPE" allowfullscreen></iframe>
   ```

4. **Formulario de contacto → Google Apps Script**: sigue las
   instrucciones dentro de `apps-script/Code.gs` para instalarlo (se
   hace una sola vez, directo en tu navegador en script.google.com, sin
   instalar nada). Al terminar, copia la URL que te entrega y pégala en
   `public/script.js`, en la constante `APPS_SCRIPT_URL`. El correo te
   llegará directo a tu Gmail, sin ninguna empresa de por medio.

5. **WhatsApp**: reemplaza el número de ejemplo `56900000000` en dos
   lugares de `index.html` (el botón flotante y la tarjeta de contacto)
   por tu número real, en formato internacional sin signos ni espacios.

6. **Redes sociales y correo**: reemplaza los `#` de la sección de
   redes y el `contacto@mirpe.cl` de ejemplo por tus datos reales.

7. **Páginas legales** (`privacidad.html`, `terminos.html`): completa los
   `[COMPLETAR]` con tus datos legales, y hazlas revisar por un abogado
   chileno antes de publicar — ver la nota en la parte superior de cada
   documento.

8. **Fotos** (secciones SIGPE, Cursos y Quiénes somos): busca los bloques
   `<div class="photo-slot">...</div>` en `index.html` y reemplázalos por
   una etiqueta `<img src="tu-foto.jpg" alt="...">`. Recuerda: en SIGPE,
   solo capturas con datos ficticios, nunca una misión real.

9. **Quiénes somos**: completa el texto marcado `[COMPLETAR]` con la
   historia real de MIRPE y los datos del equipo.

10. **Blog**: este sitio no tiene un sistema de publicación automática
    (sigue siendo estático). El formulario "¿Quieres publicar en el blog
    de MIRPE?" te llega por correo (vía el mismo Apps Script, ahora
    distingue el tipo de formulario con el campo oculto `formType`) para
    que revises cada propuesta antes de publicarla — no se publica sola,
    y así evitas contenido de baja calidad o problemas legales asociados
    a tu marca. Para publicar un artículo (tuyo o aprobado), la forma más
    simple sin agregar un backend es duplicar `index.html` como plantilla,
    crear un archivo nuevo (ej. `blog-nombre-del-articulo.html`) con el
    contenido del artículo, y agregar una tarjeta con el link dentro de
    `.blog-grid` en la sección Blog. Si más adelante quieres un blog con
    muchos artículos y no quieres crear un archivo HTML por cada uno,
    ahí sí conviene migrar esa sección específica a un generador de sitios
    estáticos con soporte de blog (como Astro u Eleventy) — pero no hace
    falta para partir.

## Cómo publicarlo

Cualquiera de estas opciones funciona igual de bien para un sitio estático:

**Opción A — Netlify (más simple, sin instalar nada)**
Entra a https://app.netlify.com/drop y arrastra la carpeta `public/`
completa. Netlify te entrega una URL al instante. Para conectar tu
dominio propio, ve a Site settings → Domain management.

**Opción B — Firebase Hosting (si prefieres seguir en el ecosistema de Firebase)**
```bash
npm install -g firebase-tools
firebase login
cd mirpe-site
firebase init hosting   # elige la carpeta "public" cuando te pregunte
firebase deploy
```

**Opción C — Vercel**
```bash
npm install -g vercel
cd mirpe-site/public
vercel
```

## Pagos (PayPal y Mercado Pago)

El sitio cobra los 3 niveles pagados del curso directamente, sin backend propio.

### PayPal (botón embebido, se ve dentro de la página)

1. Entra a https://developer.paypal.com/dashboard/ con tu cuenta de PayPal.
2. En "Apps & Credentials", crea una app (modo "Live" para cobrar de verdad,
   "Sandbox" para probar primero sin dinero real).
3. Copia el **Client ID** que te entrega.
4. Pégalo en `index.html`, en la línea del SDK de PayPal, reemplazando
   `PEGA-AQUI-TU-CLIENT-ID-DE-PAYPAL`.
5. Listo — los 3 botones de PayPal (Nivel 1, 2 y 3) se activan solos, ya
   están conectados en `script.js` con los montos correctos (175 / 350 / 350 USD).

PayPal te avisa por correo automáticamente cada vez que alguien paga — no
necesitas configurar nada adicional para enterarte.

> Nota técnica: el monto se define en el propio JavaScript de la página
> (sin backend que lo valide). Es el método estándar para sitios estáticos
> sin servidor, pero si más adelante manejas montos altos o mucho volumen,
> lo más seguro es validar la orden desde un servidor — eso ya requeriría
> volver a un backend como el que sacamos.

### Mercado Pago (link de pago, sin código)

Esta es más simple todavía, cero JavaScript:

1. Entra a tu cuenta de Mercado Pago → "Tu negocio" → "Cobros" → "Link de pago".
2. Crea un link nuevo por **USD 175** (o el equivalente en tu moneda local)
   para el Nivel 1. Ponle un nombre como "MIRPE — Nivel 1".
3. Repite para el Nivel 2 y el Nivel 3 (ambos por 350).
4. Copia cada URL que te entrega Mercado Pago y pégala en `index.html`,
   reemplazando `PEGA-AQUI-LINK-MERCADOPAGO-NIVEL1` (y 2, y 3) por el link
   correspondiente.

Igual que PayPal, Mercado Pago te notifica automáticamente por correo
cuando alguien paga.



Este sitio estático no cobra la licencia de SIGPE directamente — el
modelo de precios por dispositivo/día/mes que definimos se cotiza por
contacto (formulario, WhatsApp o correo), no con un botón de compra
automático. Si más adelante quieres automatizar ese cobro con Stripe o
Webpay, eso vuelve a requerir un backend — lo dejamos pendiente para
cuando tengas ese volumen.
