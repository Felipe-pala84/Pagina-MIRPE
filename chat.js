/**
 * chat.js — Mensajería cifrada de extremo a extremo, por VIP.
 * Texto, notas de voz, fotos y videos cortos. Firebase Storage y
 * Firestore solo ven bytes cifrados (ver crypto.js para el modelo).
 */

const MierpeChat = (() => {
  let root, unsub, chatKey, mediaRecorder, recordedChunks = [];

  function vipId() { return window.MierpeVips.getCurrentVipId(); }

  async function mount(el) {
    root = el;
    if (unsub) { unsub(); unsub = null; }

    if (!vipId()) {
      root.innerHTML = `<div class="panel"><div class="panel-title">MENSAJERÍA</div><p class="muted">${window.MierpeI18n.t("select_vip_first")}</p></div>`;
      return;
    }

    root.innerHTML = `
      <section class="panel">
        <div class="panel-title">🔒 MENSAJERÍA CIFRADA — ${window.MierpeVips.getCurrentVip()?.nombre || ""}</div>
        <div id="chat-members-box"></div>
        <div id="chat-messages" class="chat-messages"><p class="muted">Desbloqueando llave de chat…</p></div>
        <div class="chat-input-row">
          <textarea id="chat-text" placeholder="Escribe un mensaje..." rows="2"></textarea>
          <div class="chat-actions">
            <button class="btn btn-outline" id="btn-chat-send">Enviar</button>
            <button class="btn btn-outline" id="btn-chat-mic">🎙 Voz</button>
            <label class="btn btn-outline file-btn">📷 Foto/Video<input type="file" id="chat-file" accept="image/*,video/*" hidden></label>
          </div>
        </div>
        <p class="muted" id="chat-status"></p>
      </section>
    `;

    if (window.MierpeAuth.canEditModule("chat")) renderMemberBox();

    try {
      chatKey = await window.MierpeVips.getChatKey(vipId());
    } catch (e) {
      root.querySelector("#chat-messages").innerHTML = `<p class="muted">${e.message}</p>`;
      return;
    }
    if (!chatKey) {
      root.querySelector("#chat-messages").innerHTML = `<p class="muted">No tienes acceso a este chat todavía. Pide a un Táctico o Administrador que te agregue como miembro.</p>`;
      return;
    }

    bindEvents();
    subscribeMessages();
  }

  async function renderMemberBox() {
    const box = root.querySelector("#chat-members-box");
    box.innerHTML = `<p class="muted">Cargando usuarios...</p>`;

    const [allUsers, vip] = await Promise.all([
      window.MierpeAuth.listUsers(),
      Promise.resolve(window.MierpeVips.getCurrentVip())
    ]);
    const currentMembers = new Set(vip?.miembros || []);
    const candidates = allUsers.filter((u) => !currentMembers.has(u.uid));

    if (!candidates.length) {
      box.innerHTML = `<p class="muted">Todos los usuarios registrados ya están en este chat.</p>`;
      return;
    }

    box.innerHTML = `
      <div class="field-row">
        <label>Agregar participante
          <select id="chat-add-select">
            ${candidates.map((u) => `<option value="${u.uid}">${u.name} — ${window.MierpeRoles[u.role]?.label.split(" — ")[0] || u.role}</option>`).join("")}
          </select>
        </label>
        <div style="align-self:flex-end"><button class="btn btn-outline" id="btn-chat-add-member">Agregar al chat</button></div>
      </div>
      <p class="muted" id="chat-add-msg"></p>
    `;
    box.querySelector("#btn-chat-add-member").addEventListener("click", async () => {
      const uid = box.querySelector("#chat-add-select").value;
      const name = candidates.find((u) => u.uid === uid)?.name || uid;
      const msg = box.querySelector("#chat-add-msg");
      try {
        await window.MierpeVips.addMember(vipId(), uid);
        msg.textContent = `${name} agregado al chat.`;
        renderMemberBox(); // refresca la lista para sacarlo de "candidatos"
      } catch (e) { msg.textContent = e.message; }
    });
  }

  function bindEvents() {
    root.querySelector("#btn-chat-send").addEventListener("click", sendText);
    root.querySelector("#chat-text").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText(); }
    });
    root.querySelector("#btn-chat-mic").addEventListener("click", toggleRecording);
    root.querySelector("#chat-file").addEventListener("change", (e) => {
      if (e.target.files[0]) sendFile(e.target.files[0]);
    });
  }

  async function sendText() {
    const ta = root.querySelector("#chat-text");
    const text = ta.value.trim();
    if (!text) return;
    ta.value = "";
    const payload = await window.MierpeCrypto.encryptText(chatKey, text);
    await postMessage({ type: "text", ...payload });
  }

  async function toggleRecording() {
    const btn = root.querySelector("#btn-chat-mic");
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
      btn.textContent = "🎙 Voz";
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordedChunks = [];
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (e) => recordedChunks.push(e.data);
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(recordedChunks, { type: "audio/webm" });
        await sendFile(new File([blob], "nota-de-voz.webm", { type: "audio/webm" }), "voice");
      };
      mediaRecorder.start();
      btn.textContent = "⏹ Detener";
    } catch (e) {
      alert("No se pudo acceder al micrófono: " + e.message);
    }
  }

  async function sendFile(file, forcedType) {
    const status = root.querySelector("#chat-status");
    if (file.size > 30 * 1024 * 1024) { alert("Archivo muy grande (máx. 30MB para esta base)."); return; }
    status.textContent = "Cifrando y subiendo…";
    try {
      const buf = await file.arrayBuffer();
      const { blob, iv } = await window.MierpeCrypto.encryptBlob(chatKey, buf);
      const type = forcedType || (file.type.startsWith("video") ? "video" : "photo");
      const path = `vips/${vipId()}/chat/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.enc`;
      const ref = window.fb.storage.ref(path);
      await ref.put(blob);
      await postMessage({ type, storagePath: path, iv, mime: file.type });
      status.textContent = "";
    } catch (e) {
      status.textContent = "Error al subir: " + e.message;
    }
  }

  async function postMessage(fields) {
    const u = window.MierpeAuth.currentUser();
    await window.MierpeStorage.addToLog(`vips/${vipId()}/chat`, {
      senderUid: u.uid, senderName: u.name, at: new Date().toLocaleString(), ...fields
    });
  }

  function subscribeMessages() {
    unsub = window.MierpeStorage.onSnapshot(`vips/${vipId()}/chat`, 100, async (rows) => {
      const box = root.querySelector("#chat-messages");
      const ordered = rows.slice().reverse();
      box.innerHTML = "";
      for (const row of ordered) {
        box.appendChild(await renderMessage(row.value));
      }
      box.scrollTop = box.scrollHeight;
    });
  }

  async function renderMessage(m) {
    const me = window.MierpeAuth.currentUser().uid === m.senderUid;
    const div = document.createElement("div");
    div.className = `chat-msg ${me ? "chat-msg-me" : ""}`;
    const header = `<div class="chat-msg-meta">${m.senderName} · ${m.at}</div>`;

    try {
      if (m.type === "text") {
        const text = await window.MierpeCrypto.decryptText(chatKey, { ciphertext: m.ciphertext, iv: m.iv });
        div.innerHTML = `${header}<div class="chat-msg-body">${escapeHtml(text)}</div>`;
      } else {
        const ref = window.fb.storage.ref(m.storagePath);
        const url = await ref.getDownloadURL();
        const encBuf = await fetch(url).then((r) => r.arrayBuffer());
        const decBuf = await window.MierpeCrypto.decryptBlob(chatKey, encBuf, m.iv);
        const blobUrl = URL.createObjectURL(new Blob([decBuf], { type: m.mime || "" }));
        if (m.type === "voice") {
          div.innerHTML = `${header}<audio controls src="${blobUrl}"></audio>`;
        } else if (m.type === "photo") {
          div.innerHTML = `${header}<img class="chat-media" src="${blobUrl}">`;
        } else if (m.type === "video") {
          div.innerHTML = `${header}<video class="chat-media" controls src="${blobUrl}"></video>`;
        }
      }
    } catch (e) {
      div.innerHTML = `${header}<div class="chat-msg-body muted">[No se pudo descifrar: ${e.message}]</div>`;
    }
    return div;
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  return { mount };
})();

window.MierpeChat = MierpeChat;
