const express = require("express");
const { dynamicCommand } = require("../utils/dynamicCommand");
const { loadCommonFunctions } = require("../utils/loadCommonFunctions");
const { onlyNumbers } = require("../utils");
const fsp = require("fs/promises");
const path = require("path");

const app = express();
const PORT = 3000;

const GALLERY_DIR = path.join(__dirname, "services/gallery");

// Crear carpeta gallery si no existe
fsp.mkdir(GALLERY_DIR, { recursive: true }).then(() => {
  console.log("📁 Carpeta 'gallery' asegurada.");
});

const receivedMessages = [];
const sseClients = [];

function escapeHtml(text) {
  if (!text) return "";
  return text.replace(/[&<>"']/g, (m) => {
    switch (m) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      case "'": return "&#039;";
      default: return m;
    }
  });
}

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
    const index = sseClients.indexOf(res);
    if (index !== -1) sseClients.splice(index, 1);
  });
});

app.get("/", (req, res) => {
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>💬 Mensajes WhatsApp Bot</title>
  <style>
    /* ... estilos CSS sin cambios ... */
  </style>
</head>
<body>
  <h1>💬 Mensajes recibidos</h1>

  <div class="controls">
    <input id="filterInput" type="text" placeholder="Filtrar por remitente (número completo o parcial)" />
    <button id="clearAllBtn" title="Borrar todos los mensajes">🗑️ Limpiar todo</button>
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
      }[m] || m));
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
        ? \`<img src="\${src}" alt="imagen" />\`
        : \`<video controls autoplay><source src="\${src}" type="video/mp4"></video>\`;
    }

    function closeModal() {
      modal.style.display = "none";
      modalContent.innerHTML = "";
    }

    window.onclick = function(e) {
      if (e.target === modal) closeModal();
    }

    function renderMessages() {
      const filterVal = filterInput.value.trim();
      let filtered = messages;

      if (filterVal) {
        filtered = messages.filter(m => m.sender.includes(filterVal));
      }

      stats.textContent = \`Total mensajes: \${messages.length} | Mostrando: \${filtered.length}\`;
      container.innerHTML = "";

      if (filtered.length === 0) {
        noMessages.style.display = "block";
        return;
      } else {
        noMessages.style.display = "none";
      }

      for (const msg of filtered) {
        const div = document.createElement("div");
        div.classList.add("message-card");

        const audioHtml = msg.audio ? \`
          <audio controls>
            <source src="\${escapeHtml(msg.audio)}" type="audio/mp3" />
          </audio>\` : "";

        let mediaHtml = "";
        if (msg.imageUrl) {
          mediaHtml += \`
            <img class="thumb" src="\${escapeHtml(msg.imageUrl)}"
              onclick="showModal('img', '\${escapeHtml(msg.imageUrl)}')" alt="Imagen recibida" />\`;
        }
        if (msg.videoUrl) {
          mediaHtml += \`
            <img class="thumb" src="/services/gallery/video-thumb.png"
              onclick="showModal('video', '\${escapeHtml(msg.videoUrl)}')" alt="Video recibido" />\`;
        }

        div.innerHTML = \`
          <button class="delete-btn" title="Borrar mensaje">🗑️</button>
          <div class="message-text">\${escapeHtml(msg.text) || "<i>(sin texto)</i>"}</div>
          \${audioHtml}
          \${mediaHtml}
          <div class="message-meta">
            <span class="sender">Remitente: \${escapeHtml(msg.sender)}</span>
            <span class="chat">Chat: \${escapeHtml(msg.chat)}</span>
            <span class="timestamp">\${formatTimestamp(msg.timestamp)}</span>
          </div>
        \`;

        div.querySelector(".delete-btn").onclick = () => {
          messages = messages.filter(m => m !== msg);
          renderMessages();
        };

        container.appendChild(div);
      }

      container.scrollTop = container.scrollHeight;
    }

    filterInput.addEventListener("input", renderMessages);

    clearAllBtn.addEventListener("click", () => {
      if (confirm("¿Seguro que quieres borrar todos los mensajes?")) {
        messages = [];
        renderMessages();
      }
    });

    const evtSource = new EventSource("/events");
    evtSource.onmessage = function(event) {
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

// ✅ Esta es la línea corregida:
app.use("/services", express.static(path.join(__dirname, "services")));

app.listen(PORT, () => {
  console.log(`🌐 Web de mensajes disponible en http://localhost:${PORT}`);
});


exports.onMessagesUpsert = async ({ socket, messages }) => {
  if (!messages.length) return;

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

    let audioPath = null;
    let imageUrl = null;
    let videoUrl = null;

    try {
      await fsp.mkdir(GALLERY_DIR, { recursive: true });
      await fsp.mkdir(path.join(__dirname, 'services'), { recursive: true });

      if (msg.audioMessage || msg.pttMessage) {
        const audioFilename = `audio_${webMessage.key.id}_${Date.now()}.mp3`;
        audioPath = path.join(__dirname, 'services', audioFilename);
        await commonFunctions.downloadAudio(webMessage, audioPath);
      }

      if (msg.imageMessage) {
        const imgFilename = `img_${Date.now()}.png`;
        const imgPath = path.join(GALLERY_DIR, imgFilename);
        await commonFunctions.downloadImage(webMessage, imgPath);
        imageUrl = `/services/gallery/${path.basename(imgPath)}`;
      } else if (msg.viewOnceMessage?.message?.imageMessage) {
        const imgFilename = `img_${Date.now()}.png`;
        const imgPath = path.join(GALLERY_DIR, imgFilename);
        const viewOnceMsg = {
          key: webMessage.key,
          message: msg.viewOnceMessage.message.imageMessage,
        };
        await commonFunctions.downloadImage(viewOnceMsg, imgPath);
        imageUrl = `/services/gallery/${path.basename(imgPath)}`;
      }

      if (msg.videoMessage) {
        const vidFilename = `vid_${Date.now()}.mp4`;
        const vidPath = path.join(GALLERY_DIR, vidFilename);
        await commonFunctions.downloadMedia(webMessage, vidPath);
        videoUrl = `/services/gallery/${path.basename(vidPath)}`;
      } else if (msg.viewOnceMessage?.message?.videoMessage) {
        const vidFilename = `vid_${Date.now()}.mp4`;
        const vidPath = path.join(GALLERY_DIR, vidFilename);
        const viewOnceVidMsg = {
          key: webMessage.key,
          message: msg.viewOnceMessage.message.videoMessage,
        };
        await commonFunctions.downloadMedia(viewOnceVidMsg, vidPath);
        videoUrl = `/services/gallery/${path.basename(vidPath)}`;
      }
    } catch (error) {
      console.error("❌ Error descargando media:", error);
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
    for (const client of sseClients) {
      client.write(dataStr);
    }
  }
};