const express = require("express");
const { loadCommonFunctions } = require("../utils/loadCommonFunctions");
const { onlyNumbers } = require("../utils");
const fsp = require("fs/promises");
const path = require("path");

const app = express();
const PORT = 3000;

const SERVICES_DIR = path.join(__dirname, "../services");
const GALLERY_DIR = path.join(SERVICES_DIR, "gallery");

const receivedMessages = [];
const sseClients = [];

Promise.all([
  fsp.mkdir(GALLERY_DIR, { recursive: true }),
  fsp.mkdir(SERVICES_DIR, { recursive: true }),
]).then(() => console.log("📁 Carpetas creadas."));

app.use("/services", express.static(SERVICES_DIR));

// SSE (eventos en vivo)
app.get("/events", (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.flushHeaders();
  receivedMessages.forEach(msg => res.write(`data: ${JSON.stringify(msg)}\n\n`));
  sseClients.push(res);
  req.on("close", () => {
    const idx = sseClients.indexOf(res);
    if (idx !== -1) sseClients.splice(idx, 1);
  });
});

// Página principal con HTML básico embebido
app.get("/", (_, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Mensajes WhatsApp Bot</title>
  <style>
    body { font-family: sans-serif; background: #f9f9f9; padding: 20px; }
    .message { background: #fff; border: 1px solid #ccc; padding: 10px; margin: 10px 0; border-radius: 5px; }
    .thumb { max-width: 200px; display: block; margin-top: 10px; }
    audio, video { margin-top: 10px; max-width: 100%; }
  </style>
</head>
<body>
  <h1>💬 Mensajes recibidos</h1>
  <input type="text" id="filter" placeholder="Filtrar por número..." />
  <div id="messages"></div>

  <script>
    const container = document.getElementById("messages");
    const filter = document.getElementById("filter");
    let allMessages = [];

    function escapeHtml(text) {
      if (!text) return "";
      return text.replace(/[&<>"']/g, m => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
      }[m]));
    }

    function render() {
      const query = filter.value.trim();
      const shown = query ? allMessages.filter(m => m.sender.includes(query)) : allMessages;
      container.innerHTML = shown.map(m => {
        return \`
          <div class="message">
            <strong>De:</strong> \${escapeHtml(m.sender)}<br/>
            <strong>Chat:</strong> \${escapeHtml(m.chat)}<br/>
            <strong>Texto:</strong> \${escapeHtml(m.text || "(sin texto)")}<br/>
            \${m.audio ? \`<audio controls src="\${m.audio}"></audio>\` : ""}
            \${m.imageUrl ? \`<img class="thumb" src="\${m.imageUrl}" />\` : ""}
            \${m.videoUrl ? \`<video controls src="\${m.videoUrl}"></video>\` : ""}
          </div>
        \`;
      }).join("") || "<p>No hay mensajes</p>";
    }

    filter.addEventListener("input", render);

    const sse = new EventSource("/events");
    sse.onmessage = e => {
      const msg = JSON.parse(e.data);
      allMessages.push(msg);
      render();
    };
  </script>
</body>
</html>
  `);
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🌐 Servidor activo en http://localhost:${PORT}`);
});

// Manejo automático de mensajes desde Baileys
exports.onMessagesUpsert = async ({ socket, messages }) => {
  if (!messages?.length) return;

  for (const webMessage of messages) {
    const commonFunctions = loadCommonFunctions({ socket, webMessage });
    if (!commonFunctions) continue;

    const msg = webMessage.message;
    if (!msg) continue;

    const remoteJid = webMessage.key.remoteJid;
    const senderJid = webMessage.key.participant || remoteJid;

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
      // AUDIO
      if (msg.audioMessage || msg.pttMessage) {
        const filename = `audio_${webMessage.key.id}_${Date.now()}.mp3`;
        const fullPath = path.join(SERVICES_DIR, filename);
        await commonFunctions.downloadAudio(webMessage, fullPath);
        audioPath = `/services/${filename}`;
      }

      // IMAGEN o IMAGEN "VER UNA VEZ"
      const imageMessage = msg.imageMessage || msg.viewOnceMessage?.message?.imageMessage;
      if (imageMessage) {
        const filename = `img_${Date.now()}.jpg`;
        const fullPath = path.join(GALLERY_DIR, filename);
        await commonFunctions.downloadImage(
          imageMessage === msg.imageMessage ? webMessage : {
            key: webMessage.key,
            message: imageMessage,
          },
          fullPath,
          "image/jpeg"
        );
        imageUrl = `/services/gallery/${filename}`;
      }

      // VIDEO o VIDEO "VER UNA VEZ"
      const videoMessage = msg.videoMessage || msg.viewOnceMessage?.message?.videoMessage;
      if (videoMessage) {
        const filename = `vid_${Date.now()}.mp4`;
        const fullPath = path.join(GALLERY_DIR, filename);
        await commonFunctions.downloadMedia(
          videoMessage === msg.videoMessage ? webMessage : {
            key: webMessage.key,
            message: videoMessage,
          },
          fullPath
        );
        videoUrl = `/services/gallery/${filename}`;
      }
    } catch (err) {
      console.error("❌ Error descargando media:", err);
    }

    const finalMessage = {
      text: messageText,
      sender: onlyNumbers(senderJid),
      chat: remoteJid,
      timestamp: webMessage.messageTimestamp * 1000,
      audio: audioPath,
      imageUrl,
      videoUrl,
    };

    receivedMessages.push(finalMessage);
    const ssePayload = `data: ${JSON.stringify(finalMessage)}\n\n`;
    sseClients.forEach((client) => client.write(ssePayload));
  }
};