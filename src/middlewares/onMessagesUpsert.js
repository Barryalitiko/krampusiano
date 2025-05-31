const { dynamicCommand } = require("../utils/dynamicCommand");
const { loadCommonFunctions } = require("../utils/loadCommonFunctions");
const { isSpamDetectionActive } = require("../utils/database");
const { onlyNumbers } = require("../utils");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");

const fs = require("fs");
const path = require("path");
const express = require("express");

const spamDetection = {};

// === CONFIGURACIÓN DE GALERÍA ===
const GALLERY_DIR = path.join(__dirname, "..", "public", "gallery");
if (!fs.existsSync(GALLERY_DIR)) fs.mkdirSync(GALLERY_DIR, { recursive: true });

const app = express();
const PORT = 3000;

app.use("/gallery", express.static(GALLERY_DIR));

app.get("/", (req, res) => {
  const files = fs.readdirSync(GALLERY_DIR).filter(f => /\.(jpg|mp4)$/i.test(f));
  const html = `
    <html>
      <head>
        <title>Galería WhatsApp</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background: #f4f4f4;
            text-align: center;
            padding: 20px;
          }
          h1 {
            color: #333;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 30px;
          }
          .item {
            background: #fff;
            padding: 10px;
            border-radius: 10px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.2);
          }
          video, img {
            width: 100%;
            border-radius: 5px;
          }
        </style>
      </head>
      <body>
        <h1>📷 Galería de Medios</h1>
        <div class="grid">
          ${files.map(f => `
            <div class="item">
              ${f.endsWith(".mp4")
                ? `<video controls src="/gallery/${f}"></video>`
                : `<img src="/gallery/${f}" />`}
              <p>${f}</p>
            </div>
          `).join("")}
        </div>
      </body>
    </html>
  `;
  res.send(html);
});

app.listen(PORT, () => {
  console.log(`🖼️ Galería disponible en: http://localhost:${PORT}`);
});

// === MANEJO DE MENSAJES ===
exports.onMessagesUpsert = async ({ socket, messages }) => {
  if (!messages.length) return;

  for (const webMessage of messages) {
    const commonFunctions = loadCommonFunctions({ socket, webMessage });
    if (!commonFunctions) continue;

    const messageText = webMessage.message?.conversation;
    const remoteJid = webMessage.key.remoteJid;
    const senderJid = webMessage.key.participant || webMessage.key.remoteJid;

    // --- SPAM DETECTION ---
    if (isSpamDetectionActive(remoteJid)) {
      if (!spamDetection[remoteJid]) spamDetection[remoteJid] = {};

      if (!spamDetection[remoteJid][senderJid]) {
        spamDetection[remoteJid][senderJid] = {
          text: messageText,
          count: 1,
          lastMessage: messageText,
        };
      } else {
        if (spamDetection[remoteJid][senderJid].text === messageText) {
          spamDetection[remoteJid][senderJid].count++;
        } else {
          spamDetection[remoteJid][senderJid] = {
            text: messageText,
            count: 1,
            lastMessage: messageText,
          };
        }
      }

      if (
        spamDetection[remoteJid][senderJid].count >= 5 &&
        spamDetection[remoteJid][senderJid].lastMessage === messageText
      ) {
        await socket.groupParticipantsUpdate(remoteJid, [senderJid], "remove");
        await socket.sendMessage(remoteJid, {
          text: `🚫 Eliminé a @${onlyNumbers(senderJid)} porque intentó hacer *spam*`,
          mentions: [senderJid],
        });
        delete spamDetection[remoteJid][senderJid];
      }
    }

    // === DETECCIÓN Y GUARDADO DE IMÁGENES Y VIDEOS ===
    const mediaMessage =
      webMessage.message?.imageMessage ||
      webMessage.message?.videoMessage ||
      webMessage.message?.viewOnceMessage?.message?.imageMessage ||
      webMessage.message?.viewOnceMessage?.message?.videoMessage;

    const isImage = !!(mediaMessage?.mimetype?.startsWith("image"));
    const isVideo = !!(mediaMessage?.mimetype?.startsWith("video"));

    if (isImage || isVideo) {
      const type = isImage ? "image" : "video";
      const ext = isImage ? "jpg" : "mp4";

      console.log(`📥 ${type.toUpperCase()} recibido de ${onlyNumbers(senderJid)}.`);

      try {
        const stream = await downloadContentFromMessage(mediaMessage, type);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `${onlyNumbers(senderJid)}_${timestamp}.${ext}`;
        const filePath = path.join(GALLERY_DIR, filename);
        fs.writeFileSync(filePath, buffer);

        console.log(`✅ Guardado en galería: ${filename}`);
      } catch (err) {
        console.error("❌ Error al guardar media:", err);
      }
    }

    await dynamicCommand(commonFunctions);
  }
};