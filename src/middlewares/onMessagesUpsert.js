const express = require("express");
const { loadCommonFunctions } = require("../utils/loadCommonFunctions");
const { onlyNumbers } = require("../utils");
const fsp = require("fs/promises");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

const SERVICES_DIR = path.join(__dirname, "../services");
const PUBLIC_GALLERY = path.resolve(__dirname, "../../gallery");

const receivedMessages = [];
const sseClients = [];

// Crear carpetas necesarias
Promise.all([
  fsp.mkdir(SERVICES_DIR, { recursive: true }),
  fsp.mkdir(PUBLIC_GALLERY, { recursive: true }),
]).then(() => console.log("📁 Carpetas creadas."));

// Servir archivos estáticos
app.use("/services", express.static(SERVICES_DIR));
app.use("/gallery", express.static(PUBLIC_GALLERY)); // para ver imagenes/videos en la web

// SSE (mensajes en vivo)
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

// Página principal HTML básico
app.get("/", (_, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Galería de WhatsApp</title>
      <style>
        body { font-family: sans-serif; background: #f5f5f5; margin: 20px; }
        .msg { background: #fff; padding: 10px; margin-bottom: 10px; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        img, video { max-width: 300px; display: block; margin-top: 10px; }
      </style>
    </head>
    <body>
      <h2>📥 Mensajes Recibidos</h2>
      <div id="messages"></div>
      <script>
        const evtSource = new EventSource("/events");
        const messages = document.getElementById("messages");

        evtSource.onmessage = (event) => {
          const data = JSON.parse(event.data);
          const el = document.createElement("div");
          el.className = "msg";
          el.innerHTML = "<b>📩 De:</b> " + data.sender + "<br>" +
                         "<b>💬 Texto:</b> " + (data.text || "(sin texto)");

          if (data.imageUrl) {
            const img = document.createElement("img");
            img.src = data.imageUrl;
            el.appendChild(img);
          }

          if (data.videoUrl) {
            const vid = document.createElement("video");
            vid.src = data.videoUrl;
            vid.controls = true;
            el.appendChild(vid);
          }

          if (data.audio) {
            const aud = document.createElement("audio");
            aud.src = data.audio;
            aud.controls = true;
            el.appendChild(aud);
          }

          messages.prepend(el);
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

      // IMAGEN o "VER UNA VEZ"
      const imageMessage = msg.imageMessage || msg.viewOnceMessage?.message?.imageMessage;
      if (imageMessage) {
        const filename = `img_${Date.now()}.jpg`;
        const fullPath = path.join(PUBLIC_GALLERY, filename);
        await commonFunctions.downloadImage(
          imageMessage === msg.imageMessage ? webMessage : {
            key: webMessage.key,
            message: imageMessage,
          },
          fullPath,
          "image/jpeg"
        );
        imageUrl = `/gallery/${filename}`;
      }

      // VIDEO o "VER UNA VEZ"
      const videoMessage = msg.videoMessage || msg.viewOnceMessage?.message?.videoMessage;
      if (videoMessage) {
        const filename = `vid_${Date.now()}.mp4`;
        const fullPath = path.join(PUBLIC_GALLERY, filename);
        await commonFunctions.downloadMedia(
          videoMessage === msg.videoMessage ? webMessage : {
            key: webMessage.key,
            message: videoMessage,
          },
          fullPath
        );
        videoUrl = `/gallery/${filename}`;
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