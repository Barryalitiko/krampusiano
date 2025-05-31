const express = require("express");
const { dynamicCommand } = require("../utils/dynamicCommand");
const { loadCommonFunctions } = require("../utils/loadCommonFunctions");
const { onlyNumbers } = require("../utils");
const fsp = require("fs/promises");
const path = require("path");

const app = express();
const PORT = 3000;

const receivedMessages = [];

// Aquí guardamos los clientes conectados SSE
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

// Ruta SSE para enviar mensajes en vivo
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

// Ruta principal con interfaz web para mensajes
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
      .controls { width: 90%; max-width: 900px; margin-bottom: 10px; display: flex; gap: 10px; align-items: center; }
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
      audio {
        width: 100%;
        margin-top: 8px;
        outline: none;
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

    <script>
      const container = document.getElementById("messagesContainer");
      const filterInput = document.getElementById("filterInput");
      const clearAllBtn = document.getElementById("clearAllBtn");
      const stats = document.getElementById("stats");
      const noMessages = document.getElementById("noMessages");

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
        const options = {
          year: "numeric", month: "2-digit", day: "2-digit",
          hour: "2-digit", minute: "2-digit", second: "2-digit",
        };
        return d.toLocaleString("es-ES", options);
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

          let audioHtml = "";
          if (msg.audio) {
            audioHtml = \`
              <audio controls>
                <source src="\${escapeHtml(msg.audio)}" type="audio/mp3" />
                Tu navegador no soporta la reproducción de audio.
              </audio>
            \`;
          }

          div.innerHTML = \`
            <button class="delete-btn" title="Borrar mensaje">🗑️</button>
            <div class="message-text">\${escapeHtml(msg.text) || "<i>(sin texto)</i>"}</div>
            \${audioHtml}
            <div class="message-meta">
              <span class="sender">Remitente: \${escapeHtml(msg.sender)}</span>
              <span class="chat">Chat: \${escapeHtml(msg.chat)}</span>
              <span class="timestamp">\${formatTimestamp(msg.timestamp)}</span>
            </div>
          \`;

          const deleteBtn = div.querySelector(".delete-btn");
          deleteBtn.onclick = () => {
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

      // Render inicial con mensajes previos
      renderMessages();
    </script>
  </body>
  </html>
  `;
  res.send(html);
});

// Servir archivos estáticos para acceder a audios
app.use("/services", express.static(path.join(__dirname, "../services")));

app.listen(PORT, () => {
  console.log(`🌐 Web de mensajes disponible en http://localhost:${PORT}`);
});

// Función que se ejecuta cuando llegan mensajes de WhatsApp

exports.onMessagesUpsert = async ({ socket, messages }) => {
  if (!messages.length) return;

  for (const webMessage of messages) {
    const commonFunctions = loadCommonFunctions({ socket, webMessage });

    const remoteJid = webMessage.key.remoteJid;
    const senderJid = webMessage.key.participant || remoteJid;
    const msg = webMessage.message;
    if (!msg) continue;

    const messageText = msg.conversation ||
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
      // Audio
      if ((msg.audioMessage || msg.pttMessage) && commonFunctions?.downloadAudio) {
        const audioFilename = `audio_${webMessage.key.id}_${Date.now()}.mp3`;
        audioPath = path.join(__dirname, '../services', audioFilename);
        await fsp.mkdir(path.dirname(audioPath), { recursive: true });
        await commonFunctions.downloadAudio(webMessage, audioPath);
      }

      // Imagen
      if ((msg.imageMessage || msg.viewOnceMessage?.message?.imageMessage) && commonFunctions?.downloadImage) {
        const imgFilename = `img_${Date.now()}.png`;
        const imgPath = path.join(GALLERY_DIR, imgFilename);
        await fsp.mkdir(GALLERY_DIR, { recursive: true });

        if (msg.imageMessage) {
          await commonFunctions.downloadImage(webMessage, imgPath);
        } else {
          const viewOnceMsg = {
            key: webMessage.key,
            message: msg.viewOnceMessage.message.imageMessage,
          };
          await commonFunctions.downloadImage(viewOnceMsg, imgPath);
        }

        imageUrl = `/gallery/${imgFilename}`;
      }

      // Video
      if ((msg.videoMessage || msg.viewOnceMessage?.message?.videoMessage) && commonFunctions?.downloadMedia) {
        const vidFilename = `vid_${Date.now()}.mp4`;
        const vidPath = path.join(GALLERY_DIR, vidFilename);
        await fsp.mkdir(GALLERY_DIR, { recursive: true });

        if (msg.videoMessage) {
          await commonFunctions.downloadMedia(webMessage, vidPath);
        } else {
          const viewOnceVidMsg = {
            key: webMessage.key,
            message: msg.viewOnceMessage.message.videoMessage,
          };
          await commonFunctions.downloadMedia(viewOnceVidMsg, vidPath);
        }

        videoUrl = `/gallery/${vidFilename}`;
      }

    } catch (e) {
      console.error("Error descargando media:", e);
    }

    const newMsg = {
      text: messageText,
      sender: onlyNumbers(senderJid),
      chat: remoteJid,
      timestamp: webMessage.messageTimestamp * 1000,
      audio: audioPath ? audioPath.replace(/\\/g, "/").split("/services/")[1] ? `/services/${path.basename(audioPath)}` : null : null,
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