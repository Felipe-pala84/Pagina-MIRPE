/**
 * crypto.js — Cifrado de extremo a extremo para la mensajería.
 *
 * Modelo (similar en espíritu al de Signal, simplificado):
 *  - Cada usuario genera un par de llaves ECDH (P-256) la primera vez
 *    que inicia sesión. La llave PRIVADA nunca sale del dispositivo
 *    (se guarda en IndexedDB local). La llave PÚBLICA se sube a su
 *    perfil en Firestore — es pública por diseño, cualquiera puede
 *    verla, pero de nada sirve sin la privada.
 *  - Cada VIP tiene UNA llave simétrica de chat (AES-256-GCM), generada
 *    una sola vez al crear el VIP. Esa llave nunca se sube en texto
 *    plano a Firestore: se "envuelve" (cifra) individualmente para
 *    cada miembro autorizado, usando un secreto ECDH derivado entre
 *    quien envuelve y el miembro. Firebase solo almacena envoltorios
 *    cifrados — nunca ve la llave real ni el contenido de los mensajes.
 *  - Fotos, videos y notas de voz se cifran igual que el texto antes
 *    de subirse a Storage; Storage guarda bytes cifrados, no el
 *    archivo original.
 *
 * Limitación honesta: si alguien pierde el dispositivo (y con él la
 * llave privada) sin haber respaldado el par de llaves, pierde acceso
 * a los chats donde era el único que podía envolver la llave para
 * nuevos miembros. Para producción, conviene agregar un mecanismo de
 * respaldo de llaves (ej. cifradas con la clave del Administrador).
 */

const MierpeCrypto = (() => {
  const IDB_NAME = "mierpe-keys";
  const IDB_STORE = "ecdh";

  function openIDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbGet(key) {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbSet(key, value) {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // ---- llaves ECDH por usuario ----
  async function ensureKeypair(uid) {
    let priv = await idbGet(`priv:${uid}`);
    if (priv) return priv;

    const pair = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey", "deriveBits"]);
    const privJwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
    const pubJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
    await idbSet(`priv:${uid}`, privJwk);
    await idbSet(`pub:${uid}`, pubJwk);
    return privJwk;
  }

  async function getPrivateKey(uid) {
    const jwk = await idbGet(`priv:${uid}`);
    if (!jwk) return null;
    return crypto.subtle.importKey("jwk", jwk, { name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey", "deriveBits"]);
  }

  async function getPublicJwk(uid) {
    return idbGet(`pub:${uid}`);
  }

  async function importPublicKey(jwk) {
    return crypto.subtle.importKey("jwk", jwk, { name: "ECDH", namedCurve: "P-256" }, true, []);
  }

  async function deriveWrappingKey(myPrivateKey, otherPublicJwk) {
    const otherPub = await importPublicKey(otherPublicJwk);
    return crypto.subtle.deriveKey(
      { name: "ECDH", public: otherPub },
      myPrivateKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  // ---- llave simétrica de chat por VIP ----
  async function generateChatKey() {
    return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  }

  async function wrapChatKeyFor(myUid, myPrivateKey, chatKey, targetPublicJwk) {
    const wrappingKey = await deriveWrappingKey(myPrivateKey, targetPublicJwk);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const rawChatKey = await crypto.subtle.exportKey("raw", chatKey);
    const wrapped = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, wrappingKey, rawChatKey);
    return { wrappedKey: buf2b64(wrapped), iv: buf2b64(iv), wrappedByUid: myUid };
  }

  async function unwrapChatKey(myPrivateKey, wrapperPublicJwk, wrap) {
    const wrappingKey = await deriveWrappingKey(myPrivateKey, wrapperPublicJwk);
    const raw = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: b642buf(wrap.iv) },
      wrappingKey,
      b642buf(wrap.wrappedKey)
    );
    return crypto.subtle.importKey("raw", raw, { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  }

  // ---- cifrado de mensajes / archivos con la llave de chat ----
  async function encryptText(chatKey, text) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, chatKey, new TextEncoder().encode(text));
    return { ciphertext: buf2b64(enc), iv: buf2b64(iv) };
  }

  async function decryptText(chatKey, payload) {
    const dec = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b642buf(payload.iv) }, chatKey, b642buf(payload.ciphertext));
    return new TextDecoder().decode(dec);
  }

  async function encryptBlob(chatKey, arrayBuffer) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, chatKey, arrayBuffer);
    return { blob: new Blob([enc]), iv: buf2b64(iv) };
  }

  async function decryptBlob(chatKey, arrayBuffer, ivB64) {
    return crypto.subtle.decrypt({ name: "AES-GCM", iv: b642buf(ivB64) }, chatKey, arrayBuffer);
  }

  function buf2b64(buf) {
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
  }
  function b642buf(b64) {
    return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer;
  }

  return {
    ensureKeypair, getPrivateKey, getPublicJwk, importPublicKey,
    generateChatKey, wrapChatKeyFor, unwrapChatKey,
    encryptText, decryptText, encryptBlob, decryptBlob
  };
})();

window.MierpeCrypto = MierpeCrypto;
