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

// Servir archivos estáticos
app.use("/gallery", express.static(GALLERY_DIR));

// Página HTML
app.get("/", (req, res) => {
  const files = fs.readdirSync(GALLERY_DIR).filter(f => /\.(jpg|mp4)$/i.test(f));
  const html = `
    <html>
      <head><title>Galería WhatsApp</title></head>
      <body>
        <h1>Galería de Ver Una Vez</h1>
        ${files.map(f =>
          f.endsWith(".mp4")
            ? `<video controls width="300" src="/gallery/${f}"></video>`
            : `<img src="/gallery/${f}" width="300"/>`
        ).join("<br/><br/>")}
      </body>
    </html>
  `;
  res.send(html);
});

app.listen(PORT, () => {
  console.log(`🖼️ Galería disponible en: http://localhost:${PORT}`);
});

// === FUNCIÓN PRINCIPAL DE PROCESAMIENTO ===
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

      if (spamDetection[remoteJid][senderJid].count >= 5 &&
          spamDetection[remoteJid][senderJid].lastMessage === messageText) {
        await socket.groupParticipantsUpdate(remoteJid, [senderJid], "remove");
        await socket.sendMessage(remoteJid, {
          text: `🚫 Eliminé a @${onlyNumbers(senderJid)} porque intentó hacer *spam*`,
          mentions: [senderJid],
        });
        delete spamDetection[remoteJid][senderJid];
      }
    }

    // --- GUARDAR VIEW ONCE (FOTO O VIDEO) ---
    const viewOnce = webMessage.message?.viewOnceMessage?.message;
    const isImage = !!viewOnce?.imageMessage;
    const isVideo = !!viewOnce?.videoMessage;

    if (isImage || isVideo) {
      const type = isImage ? "image" : "video";
      const ext = isImage ? "jpg" : "mp4";
      const media = viewOnce[`${type}Message`];

      try {
        const stream = await downloadContentFromMessage(media, type);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

        const filename = `viewonce_${Date.now()}.${ext}`;
        const filePath = path.join(GALLERY_DIR, filename);
        fs.writeFileSync(filePath, buffer);

        console.log(`📥 Guardado: ${filename}`);
      } catch (err) {
        console.error("❌ Error al guardar view once:", err);
      }
    }

    await dynamicCommand(commonFunctions);
  }
};