const { PREFIX } = require("../../krampus");

module.exports = {
  name: "cambiar-enlace",
  description: "Cambiar el enlace de invitación de un grupo",
  commands: [`${PREFIX}cambiarenlace`],
  usage: `${PREFIX}cambiar-enlace`,
  cooldown: 180, // 3 minutos de cooldown
  handle: async ({ sendReply, sendReact, socket, remoteJid }) => {
    try {
      // Revocar el enlace actual
      await socket.groupRevokeInvite(remoteJid);
      console.log("[CAMBIO ENLACE] Enlace revocado");

      // Generar un nuevo enlace de invitación
      const newInviteCode = await socket.groupInviteCode(remoteJid);
      console.log("[CAMBIO ENLACE] Nuevo enlace generado:", newInviteCode);

      // Previsualización falsa para simular contexto
      const fakeQuoted = {
        key: {
          remoteJid,
          fromMe: false,
          id: "FAKE-QUOTE-ENLACE",
          participant: "0@s.whatsapp.net",
        },
        message: {
          conversation: "Solicitando nuevo enlace del grupo...",
        },
      };

      // Enviar el nuevo enlace con la previsualización
      await socket.sendMessage(remoteJid, {
        text: `🔗 *Nuevo enlace de invitación del grupo:* \n\nhttps://chat.whatsapp.com/${newInviteCode}`,
      }, { quoted: fakeQuoted });

      await sendReact("🔗"); // Reacción de éxito
    } catch (error) {
      console.error("[CAMBIO ENLACE] Error al cambiar el enlace:", error);
      await sendReply("❌ Hubo un error al intentar cambiar el enlace del grupo.");
      await sendReact("❌");
    }
  },
};