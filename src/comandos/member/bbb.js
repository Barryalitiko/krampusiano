const { PREFIX } = require("../../krampus");
const { WarningError } = require("../../errors/WarningError");

module.exports = {
  name: "reportar",
  description: "Reporta y bloquea a un usuario que haya enviado contenido indebido.",
  commands: ["reportar", "reporte", "bloquear"],
  usage: `${PREFIX}reportar (responde a un mensaje)`,
  handle: async ({
    socket,
    isReply,
    quotedMessage,
    sendText,
    sendReact,
    remoteJid,
  }) => {
    try {
      if (!isReply || !quotedMessage?.key?.participant) {
        throw new WarningError("❗ Debes responder al mensaje del usuario que deseas reportar.");
      }

      const targetId = quotedMessage.key.participant;

      await sendReact("🚨");

      // 1. Bloquear al usuario
      await socket.updateBlockStatus(targetId, "block");

      // 2. Enviar log a consola o a tu número privado si lo deseas
      const reportMessage = `
📛 *USUARIO REPORTADO Y BLOQUEADO*

🧾 *Número:* @${targetId.split("@")[0]}
🗨️ *Mensaje citado:* ${
        quotedMessage.message?.conversation ||
        quotedMessage.message?.extendedTextMessage?.text ||
        "[Contenido no textual]"
      }

🔐 El usuario ha sido bloqueado desde la sesión del bot.
      `.trim();

      console.log(reportMessage);

      // 3. Confirmar al grupo o al usuario que se bloqueó correctamente
      await sendText(`✅ Usuario @${targetId.split("@")[0]} ha sido *reportado y bloqueado*.`, {
        mentions: [targetId],
      });
    } catch (err) {
      console.error("Error en el comando reportar:", err);
      await sendText("❌ No se pudo reportar al usuario.");
    }
  },
};