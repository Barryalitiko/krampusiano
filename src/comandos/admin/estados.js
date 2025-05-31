const { PREFIX } = require("../../krampus");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const fs = require("fs");
const path = require("path");

module.exports = {
  name: "subirestado",
  description: "Sube un estado al WhatsApp del bot (texto, imagen o video)",
  commands: ["estado", "subirestado"],
  usage: `${PREFIX}estado [texto o responder a imagen/video]`,
  handle: async ({
    fullArgs,
    message,
    webMessage,
    socket,
    isReply,
    isImage,
    isVideo,
    sendReact,
    sendErrorReply,
    sendSuccessReact,
  }) => {
    try {
      await sendReact("🕐");

      // Caso 1: Texto como estado
      if (fullArgs && !isReply) {
        await socket.sendMessage("status@broadcast", {
          text: fullArgs,
        });
        await sendReact("✅");
        return;
      }

      // Caso 2: Responder a imagen o video
      if (isReply && (isImage || isVideo)) {
        const quotedMsg = webMessage.message.extendedTextMessage?.contextInfo?.quotedMessage;
        const msgContent = isImage
          ? quotedMsg.imageMessage
          : quotedMsg.videoMessage;

        if (!msgContent) {
          throw new Error("No se encontró contenido multimedia.");
        }

        const buffer = await downloadMediaMessage(msgContent, "buffer", {}, { logger: console });

        if (isImage) {
          await socket.sendMessage("status@broadcast", {
            image: buffer,
            caption: "🖼️ Imagen subida por el bot.",
          });
        } else if (isVideo) {
          await socket.sendMessage("status@broadcast", {
            video: buffer,
            caption: "🎥 Video subido por el bot.",
          });
        }

        await sendReact("✅");
        return;
      }

      await sendErrorReply("❌ Usa texto o responde a una imagen/video para subir al estado.");
    } catch (error) {
      console.error("❌ Error en comando subirestado:", error);
      await sendErrorReply("❌ Hubo un error al subir el estado.");
    }
  },
};