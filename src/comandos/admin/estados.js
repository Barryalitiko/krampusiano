const { PREFIX } = require("../../krampus");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const fs = require("fs");

module.exports = {
  name: "subirestado",
  description: "Sube un estado al WhatsApp del bot (texto, imagen o video)",
  commands: ["estado", "subirestado"],
  usage: `${PREFIX}estado [texto o responde a imagen/video]`,
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
      console.log("🟡 Comando subirestado invocado.");
      await sendReact("🕐");

      // 1. SUBIR ESTADO DE TEXTO
      if (fullArgs && !isReply) {
        console.log("📤 Subiendo estado de texto:", fullArgs);
        await socket.sendMessage("status@broadcast", {
          text: fullArgs,
        });
        console.log("✅ Estado de texto subido.");
        await sendReact("✅");
        return;
      }

      // 2. VALIDACIÓN DE RESPUESTA A MULTIMEDIA
      if (isReply && (isImage || isVideo)) {
        console.log("📥 Detectado respuesta a multimedia.");

        const quoted = webMessage.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        if (!quoted) {
          console.error("❌ No se encontró quotedMessage.");
          throw new Error("No se pudo obtener el mensaje citado.");
        }

        const msgContent = isImage
          ? quoted.imageMessage
          : quoted.videoMessage;

        if (!msgContent) {
          console.error("❌ No se encontró imageMessage o videoMessage en quotedMessage.");
          throw new Error("No se encontró contenido multimedia.");
        }

        console.log("📦 Descargando contenido multimedia...");
        const buffer = await downloadMediaMessage(
          { message: quoted },
          "buffer",
          {},
          { logger: console }
        );
        console.log("✅ Descarga completada. Tamaño:", buffer?.length || "desconocido");

        if (isImage) {
          console.log("📤 Subiendo imagen como estado...");
          await socket.sendMessage("status@broadcast", {
            image: buffer,
            caption: "🖼️ Imagen subida por el bot.",
          });
        } else if (isVideo) {
          console.log("📤 Subiendo video como estado...");
          await socket.sendMessage("status@broadcast", {
            video: buffer,
            caption: "🎥 Video subido por el bot.",
          });
        }

        console.log("✅ Estado multimedia subido correctamente.");
        await sendReact("✅");
        return;
      }

      console.warn("⚠️ Uso incorrecto del comando.");
      await sendErrorReply("❌ Usa texto o responde a una imagen/video para subir al estado.");

    } catch (error) {
      console.error("💥 Error en comando subirestado:", error);
      await sendErrorReply("❌ Hubo un error al subir el estado.");
    }
  },
};