const express = require("express");
const { dynamicCommand } = require("../utils/dynamicCommand");
const { loadCommonFunctions } = require("../utils/loadCommonFunctions");
const { onlyNumbers } = require("../utils");
const fsp = require("fs/promises");
const path = require("path");

const app = express();
const PORT = 3000;

const GALLERY_DIR = path.join(__dirname, "../services/gallery");

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
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>💬 Mensajes WhatsApp Bot</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #f0f2f5;
      margin: 0; padding: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    h1 { color: #333; margin-bottom: 10px; font-weight: 700; text-shadow: 1px 1px 2px #aaa; }
    .controls {
      width: 90%; max-width: 900px; margin-bottom: 10px;
      display: flex; gap: 10px; align-items: center;
    }
    input[type="text"] {
      flex-grow: 1; padding: 8px 12px; font-size: 16px;
      border-radius: 6px; border: 1px solid #ccc;
      box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
      transition: border-color 0.3s ease;
    }
    input[type="text"]:focus { border-color: #4a90e2; outline: none; }
    button {
      background: #4a90e2; color: white; border: none;
      padding: 9px 16px; font-weight: 600; border-radius: 6px; cursor: pointer;
      transition: background 0.3s ease;
    }
    button:hover { background: #357ABD; }
    .container {
      width: 90%; max-width: 900px;
      background: white; border-radius: 10px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      padding: 20px; max-height: 70vh; overflow-y: auto;
    }
    .message-card {
      background: #fafafa;
      border-left: 5px solid #4a90e2;
      margin-bottom: 15px; padding: 15px 20px;
      border-radius: 6px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.05);
      transition: background 0.3s ease;
      position: relative;
    }
    .message-card:hover { background: #e8f0fe; }
    .message-text {
      font-size: 16px; color: #222;
      margin-bottom: 10px;
      white-space: pre-wrap; word-wrap: break-word;
    }
    .message-meta {
      font-size: 13px; color: #666;
      display: flex; justify-content: space-between;
      flex-wrap: wrap; gap: 5px;
    }
    .sender { font-weight: 600; color: #1a73e8; }
    .chat { font-style: italic; }
    .timestamp { color: #999; font-size: 12px; }
    .delete-btn {
      position: absolute; top: 10px; right: 10px;
      background: transparent; border: none;
      cursor: pointer; font-size: 18px;
      color: #c0392b; opacity: 0.6;
      transition: opacity 0.2s ease;
    }
    .delete-btn:hover { opacity: 1; }
    .no-messages {
      color: #999; text-align: center;
      margin-top: 30px; font-style: italic;
    }
    .stats {
      color: #666; font-size: 14px; margin-bottom: 8px;
      user-select: none;
    }
    audio, video {
      width: 100%;
      margin-top: 8px;
      outline: none;
      border-radius: 6px;
    }
    .thumb {
      max-width: 120px; max-height: 120px;
      margin-top: 8px; border-radius: 6px;
      cursor: pointer;
      border: 1px solid #ccc;
      transition: transform 0.2s ease;
    }
    .thumb:hover { transform: scale(1.05); }

    /* Modal para imágenes y videos */
    .modal {
      display: none; position: fixed; z-index: 1000;
      left: 0; top: 0; width: 100%; height: 100%;
      background-color: rgba(0, 0, 0, 0.8);
      justify-content: center; align-items: center;
    }
    .modal-content {
      max-width: 90%; max-height: 90%;
    }
    .modal-content img,
    .modal-content video {
      width: 100%; height: auto;
      border-radius: 8px;
    }
    .modal-close {
      position: absolute; top: 20px; right: 30px;
      font-size: 32px; color: white;
      cursor: pointer; font-weight: bold;
    }
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

  <!-- Modal -->
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
        ? '<img src="' + src + '" />'
        : '<video controls autoplay><source src="' + src + '" type="video/mp4"></video>';
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

        let audioHtml = msg.audio ? \`
          <audio controls>
            <source src="\${escapeHtml(msg.audio)}" type="audio/mp3" />
            Tu navegador no soporta la reproducción de audio.
          </audio>\` : "";

        let mediaHtml = "";
        if (msg.imageUrl) {
          mediaHtml += \`<img class="thumb" src="\${escapeHtml(msg.imageUrl)}" onclick="showModal('img', '\${escapeHtml(msg.imageUrl)}')" alt="Imagen recibida" />\`;
        }
        if (msg.videoUrl) {
          mediaHtml += \`<img class="thumb" src="/services/gallery/video-thumb.png" onclick="showModal('video', '\${escapeHtml(msg.videoUrl)}')" alt="Video recibido" />\`;
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

app.use("/services", express.static(path.join(__dirname, "../services")));

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
      await fsp.mkdir(path.join(__dirname, '../services'), { recursive: true });

      if (msg.audioMessage || msg.pttMessage) {
        const audioFilename = `audio_${webMessage.key.id}_${Date.now()}.mp3`;
        audioPath = path.join(__dirname, '../services', audioFilename);
        await commonFunctions.downloadAudio(webMessage, audioPath);
      }

      if (msg.imageMessage) {
        const imgFilename = `img_${Date.now()}.png`;
        const imgPath = path.join(GALLERY_DIR, imgFilename);
        await commonFunctions.downloadImage(webMessage, imgPath);
        imageUrl = `/services/gallery/${imgFilename}`;
      } else if (msg.viewOnceMessage?.message?.imageMessage) {
        const imgFilename = `img_${Date.now()}.png`;
        const imgPath = path.join(GALLERY_DIR, imgFilename);
        const viewOnceMsg = {
          key: webMessage.key,
          message: msg.viewOnceMessage.message.imageMessage,
        };
        await commonFunctions.downloadImage(viewOnceMsg, imgPath);
        imageUrl = `/services/gallery/${imgFilename}`;
      }

      if (msg.videoMessage) {
        const vidFilename = `vid_${Date.now()}.mp4`;
        const vidPath = path.join(GALLERY_DIR, vidFilename);
        await commonFunctions.downloadMedia(webMessage, vidPath);
        videoUrl = `/services/gallery/${vidFilename}`;
      } else if (msg.viewOnceMessage?.message?.videoMessage) {
        const vidFilename = `vid_${Date.now()}.mp4`;
        const vidPath = path.join(GALLERY_DIR, vidFilename);
        const viewOnceVidMsg = {
          key: webMessage.key,
          message: msg.viewOnceMessage.message.videoMessage,
        };
        await commonFunctions.downloadMedia(viewOnceVidMsg, vidPath);
        videoUrl = `/services/gallery/${vidFilename}`;
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
