const { PREFIX } = require("../../krampus");
const { WarningError } = require("../../errors/WarningError");

module.exports = {
  name: "info",
  description: "Muestra información del usuario.",
  commands: ["info", "usuario", "perfil"],
  usage: `${PREFIX}info (responde a alguien)`,
  handle: async ({
    socket,
    webMessage,
    message,
    isReply,
    quotedMessage,
    sendText,
    sendReact,
    remoteJid,
  }) => {
    try {
      if (!isReply) throw new WarningError("🔁 Responde a un mensaje para obtener información del usuario.");

      await sendReact("📲");

      const id = quotedMessage?.key?.participant || quotedMessage?.key?.remoteJid;
      const stanzaId = quotedMessage?.key?.id || "";
      const name = await socket.getName(id);
      let device = "❓ No detectado";

      // Detectar plataforma desde el ID del mensaje
      if (stanzaId.startsWith("3EB0")) device = "💻 WhatsApp Web / Desktop";
      else if (stanzaId.startsWith("BAE5") || stanzaId.startsWith("BAF0")) device = "🤖 Android";
      else if (stanzaId.startsWith("CAE5") || stanzaId.startsWith("CAF0") || stanzaId.startsWith("CBE0")) device = "🍏 iOS";

      // Obtener estado ("Hey there..." u otro)
      let statusText = "No disponible";
      try {
        const status = await socket.fetchStatus(id);
        if (status?.status) statusText = status.status;
      } catch {}

      // Obtener foto de perfil
      let profilePicUrl = "No disponible";
      try {
        profilePicUrl = await socket.profilePictureUrl(id, "image");
      } catch {}

      // Intentar detectar rol (si es grupo)
      let groupRole = null;
      try {
        const groupMetadata = await socket.groupMetadata(remoteJid);
        const participant = groupMetadata.participants.find(p => p.id === id);
        if (participant) {
          groupRole = participant.admin === "admin" ? "Administrador" : participant.admin === "superadmin" ? "Creador" : "Miembro";
        }
      } catch {
        // Ignorar si no está en un grupo
      }

      // Armar mensaje final
      const userInfo = `
📲 *Información del usuario*

👤 *Nombre:* ${name || "No disponible"}
📞 *Número:* @${id.split("@")[0]}
🗣️ *Estado:* ${statusText}
📸 *Foto de perfil:* ${profilePicUrl !== "No disponible" ? profilePicUrl : "No disponible"}
🛠️ *Plataforma:* ${device}
${groupRole ? `👑 *Rol en el grupo:* ${groupRole}` : ""}
      `.trim();

      await sendText(userInfo, { mentions: [id] });

    } catch (error) {
      console.error("Error en el comando info:", error);
      await sendText("❌ No se pudo obtener la información del usuario.");
    }
  },
};