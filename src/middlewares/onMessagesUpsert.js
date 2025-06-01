const express = require("express");
const { loadCommonFunctions } = require("../utils/loadCommonFunctions");
const { onlyNumbers } = require("../utils");
const fsp = require("fs/promises");
const path = require("path");
const { fileTypeFromBuffer } = require ("file-type");

const app = express();
const PORT = 3000;

const GALLERY_DIR = path.join(__dirname, "../services/gallery");
const AUDIO_DIR = path.join(__dirname, "../services");

// Crear carpetas necesarias
Promise.all([
  fsp.mkdir(GALLERY_DIR, { recursive: true }),
  fsp.mkdir(AUDIO_DIR, { recursive: true }),
]).then(() => {
  console.log("📁 Carpetas necesarias creadas.");
});

const receivedMessages = [];
const sseClients = [];

function escapeHtml(text) {
  if (!text) return "";
  return text.replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[m] || m));
}

// SSE: envío en vivo
app.get("/events", (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.flushHeaders();

  for (const msg of receivedMessages) {
    res.write(`data: ${JSON.stringify(msg)}\n\n`);
  }

  sseClients.push(res);

  req.on("close", () => {
    const idx = sseClients.indexOf(res);
    if (idx !== -1) sseClients.splice(idx, 1);
  });
});

app.get("/", async (_, res) => {
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>💬 Mensajes WhatsApp Bot</title>
  <style>
    /* ... (estilos igual que ya tenías, todo bien) ... */
  </style>
</head>
<body>
  <h1>💬 Mensajes recibidos</h1>
  <div class="controls">
    <input id="filterInput" type="text" placeholder="Filtrar por número..." />
    <button id="clearAllBtn">🗑️ Limpiar todo</button>
  </div>
  <div class="stats" id="stats">Total mensajes: 0 | Mostrando: 0</div>
  <div class="container" id="messagesContainer">
    <p class="no-messages" id="noMessages">No hay mensajes aún.</p>
  </div>
  <div class="modal" id="mediaModal">
    <span class="modal-close" onclick="closeModal()">&times;</span>
    <div class="modal-content" id="modalContent"></div>
  </div>

  <script>
    const container = document.getElementById("messagesContainer");
    const filterInput = document.getElementById("filterInput");
    const clearAllBtn = document.getElementById("clearAllBtn");
    const stats = document.getElementById("stats");
    const noMessages = document.getElementById("noMessages");
    const modal = document.getElementById("mediaModal");
    const modalContent = document.getElementById("modalContent");
    let messages = ${JSON.stringify(receivedMessages)};

    function escapeHtml(text) {
      if (!text) return "";
      return text.replace(/[&<>"']/g, (m) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
      }[m]));
    }

    function formatTimestamp(ts) {
      const d = new Date(ts);
      return d.toLocaleString("es-ES", {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit"
      });
    }

    function showModal(type, src) {
      modal.style.display = "flex";
      modalContent.innerHTML = type === "img"
        ? \`<img src="\${src}" />\`
        : \`<video controls autoplay><source src="\${src}" type="video/mp4" /></video>\`;
    }

    function closeModal() {
      modal.style.display = "none";
      modalContent.innerHTML = "";
    }

    window.onclick = (e) => {
      if (e.target === modal) closeModal();
    };

    function renderMessages() {
      const filterVal = filterInput.value.trim();
      const filtered = filterVal
        ? messages.filter(m => m.sender.includes(filterVal))
        : messages;

      stats.textContent = \`Total mensajes: \${messages.length} | Mostrando: \${filtered.length}\`;
      container.innerHTML = "";

      if (!filtered.length) {
        noMessages.style.display = "block";
        return;
      }

      noMessages.style.display = "none";

      for (const msg of filtered) {
        const div = document.createElement("div");
        div.classList.add("message-card");

        const audioHtml = msg.audio
          ? \`<audio controls><source src="\${escapeHtml(msg.audio)}" type="audio/mp3"></audio>\`
          : "";

        let mediaHtml = "";
        if (msg.imageUrl) {
          mediaHtml += \`<img class="thumb" src="/gallery/\${escapeHtml(msg.imageUrl)}" onclick="showModal('img', '/gallery/\${escapeHtml(msg.imageUrl)}')" />\`;
        }
        if (msg.videoUrl) {
          mediaHtml += \`<img class="thumb" src="/services/gallery/video-thumb.png" onclick="showModal('video', '/gallery/\${escapeHtml(msg.videoUrl)}')" />\`;
        }

        div.innerHTML = \`
          <button class="delete-btn">🗑️</button>
          <div class="message-text">\${escapeHtml(msg.text) || "<i>(sin texto)</i>"}</div>
          \${audioHtml}
          \${mediaHtml}
          <div class="message-meta">
            <span>Remitente: \${escapeHtml(msg.sender)}</span> | 
            <span>Chat: \${escapeHtml(msg.chat)}</span> | 
            <span>\${formatTimestamp(msg.timestamp)}</span>
          </div>
        \`;

        div.querySelector(".delete-btn").onclick = () => {
          messages = messages.filter(m => m !== msg);
          renderMessages();
        };

        container.appendChild(div);
      }
    }

    filterInput.addEventListener("input", renderMessages);

    clearAllBtn.addEventListener("click", () => {
      if (confirm("¿Borrar todos los mensajes?")) {
        messages = [];
        renderMessages();
      }
    });

    const evtSource = new EventSource("/events");
    evtSource.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      messages.push(msg);
      renderMessages();
    };

    renderMessages();
  </script>
</body>
</html>
  `;
  res.send(html);
});
// Archivos estáticos
app.use("/services", express.static(path.join(__dirname, "../services")));
app.use("/gallery", express.static(path.join(__dirname, "../gallery")));

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🌐 Servidor web activo en http://localhost:${PORT}`);
});



// Función para procesar mensajes desde Baileys

exports.onMessagesUpsert = async ({ socket, messages }) => {
  if (!messages?.length) return;

  for (const webMessage of messages) {
    const commonFunctions = loadCommonFunctions({ socket, webMessage });
    if (!commonFunctions) continue;

    const remoteJid = webMessage.key.remoteJid;
    const senderJid = webMessage.key.participant || remoteJid;
    const msg = webMessage.message;
    if (!msg) continue;

    console.log("📥 Mensaje recibido");

    const messageText =
      msg.conversation ||
      msg.extendedTextMessage?.text ||
      msg.imageMessage?.caption ||
      msg.videoMessage?.caption ||
      msg.viewOnceMessage?.message?.imageMessage?.caption ||
      msg.viewOnceMessage?.message?.videoMessage?.caption ||
      null;

    let audioPath = null,
      imageUrl = null,
      videoUrl = null;

    try {
      if (msg.audioMessage || msg.pttMessage) {
        const filename = `audio_${webMessage.key.id}_${Date.now()}.mp3`;
        audioPath = path.join(AUDIO_DIR, filename);
        await commonFunctions.downloadAudio(webMessage, audioPath);
      }

      let filePath = "";
      let ext = "";

      if (msg.imageMessage) {
        ext = ".jpg";
        filePath = path.join(GALLERY_DIR, `img_${Date.now()}${ext}`);
        await commonFunctions.downloadImage(webMessage, filePath, 'image/jpeg');
        imageUrl = `/services/gallery/${path.basename(filePath)}`;
      } else if (msg.viewOnceMessage?.message?.imageMessage) {
        const viewOnceImg = {
          key: webMessage.key,
          message: msg.viewOnceMessage.message.imageMessage,
        };
        ext = ".jpg";
        filePath = path.join(GALLERY_DIR, `img_${Date.now()}${ext}`);
        await commonFunctions.downloadImage(viewOnceImg, filePath, 'image/jpeg');
        imageUrl = `/services/gallery/${path.basename(filePath)}`;
      }

      if (msg.videoMessage) {
        ext = ".mp4";
        filePath = path.join(GALLERY_DIR, `vid_${Date.now()}${ext}`);
        await commonFunctions.downloadMedia(webMessage, filePath);
        videoUrl = `/services/gallery/${path.basename(filePath)}`;
      } else if (msg.viewOnceMessage?.message?.videoMessage) {
        const viewOnceVid = {
          key: webMessage.key,
          message: msg.viewOnceMessage.message.videoMessage,
        };
        ext = ".mp4";
        filePath = path.join(GALLERY_DIR, `vid_${Date.now()}${ext}`);
        await commonFunctions.downloadMedia(viewOnceVid, filePath);
        videoUrl = `/services/gallery/${path.basename(filePath)}`;
      }
    } catch (err) {
      console.error("❌ Error descargando media:", err);
    }

    const newMsg = {
      text: messageText,
      sender: onlyNumbers(senderJid),
      chat: remoteJid,
      timestamp: webMessage.messageTimestamp * 1000,
      audio: audioPath ? `/services/${path.basename(audioPath)}` : null,
      imageUrl,
      videoUrl,
    };

    receivedMessages.push(newMsg);

    const dataStr = `data: ${JSON.stringify(newMsg)}\n\n`;
    sseClients.forEach((client) => client.write(dataStr));
  }
};
