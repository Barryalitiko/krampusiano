const { PREFIX } = require("../../krampus");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");

module.exports = {
  name: "fakereply",
  description: "Responde con un mensaje falso. Soporta texto o imagen.",
  commands: ["fakereply", "fq"],
  usage: `${PREFIX}fakereply número|nombre|mensaje_falso`,
  handle: async ({ fullArgs, sendText, socket, remoteJid, message, sendReact }) => {
    try {
      if (!fullArgs.includes("|")) {
        return sendText("❌ Formato incorrecto. Usa:\n/fakereply número|nombre|mensaje_falso");
      }

      const [rawNumber, fakeName, fakeQuoteText] = fullArgs.split("|").map(t => t.trim());

      if (!rawNumber || !fakeName || !fakeQuoteText) {
        return sendText("❌ Faltan datos. Asegúrate de escribir: número|nombre|mensaje_falso");
      }

      const fakeQuoted = {
        key: {
          remoteJid,
          fromMe: false,
          id: "FAKE-MSG-ID-" + Date.now(),
          participant: `${rawNumber}@s.whatsapp.net`
        },
        message: {
          conversation: fakeQuoteText
        },
        pushName: fakeName
      };

      await sendReact("🌀");

      // Detectar si el usuario envió o respondió a una imagen
      const quoted = message?.quotedMessage;
      const isImage = quoted?.imageMessage || message?.message?.imageMessage;

      if (isImage) {
        // Si es imagen (adjunta o citada), descargar el buffer
        const imgMsg = quoted?.imageMessage || message.message.imageMessage;
        const buffer = await downloadMediaMessage(imgMsg, "buffer", {}, { logger: console });

        // Enviar la imagen con caption y quote falso
        await socket.sendMessage(remoteJid, {
          image: buffer,
          caption: `😗`,
        }, {
          quoted: fakeQuoted
        });

      } else {
        // Si no hay imagen, enviar texto normal
        await socket.sendMessage(remoteJid, {
          text: `🤓`,
        }, {
          quoted: fakeQuoted
        });
      }

    } catch (error) {
      console.error("❌ Error en /fakereply:", error);
      sendText("❌ Ocurrió un error al intentar enviar el mensaje falso.");
    }
  },
};