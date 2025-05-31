const { PREFIX } = require("../../krampus");

module.exports = {
  name: "fakereply",
  description: "Responder a un mensaje falso personalizado.",
  commands: ["fakereply", "fq"],
  usage: `${PREFIX}fakereply número|nombre|mensaje_citado`,
  handle: async ({ fullArgs, sendText, socket, remoteJid, sendReact }) => {
    try {
      // Verificamos que el input tenga el formato correcto
      if (!fullArgs.includes("|")) {
        return sendText("❌ Formato incorrecto. Usa:\n/fakereply número|nombre|mensaje_falso");
      }

      const [rawNumber, fakeName, fakeMessage] = fullArgs.split("|").map(t => t.trim());

      if (!rawNumber || !fakeName || !fakeMessage) {
        return sendText("❌ Faltan datos. Asegúrate de escribir: número|nombre|mensaje_citado");
      }

      const fakeQuoted = {
        key: {
          remoteJid,
          fromMe: false,
          id: "FAKE-MSG-ID-" + Date.now(),
          participant: `${rawNumber}@s.whatsapp.net`
        },
        message: {
          conversation: fakeMessage
        },
        pushName: fakeName
      };

      await sendReact("💬");

      await socket.sendMessage(remoteJid, {
        text: `💭 Esta es una respuesta a un mensaje falso.`,
      }, {
        quoted: fakeQuoted
      });

    } catch (error) {
      console.error("❌ Error en /fakereply:", error);
      sendText("❌ Ocurrió un error al intentar enviar el mensaje falso.");
    }
  },
};