const { PREFIX } = require("../../krampus");

module.exports = {
  name: "movil",
  description: "Detecta desde qué tipo de dispositivo se envió el mensaje.",
  commands: ["movil", "device", "telefono"],
  usage: `${PREFIX}movil (responde a un mensaje de alguien)`,
  handle: async ({
    message,
    webMessage,
    isReply,
    sendText,
    sendReact,
    quotedMessage,
  }) => {
    try {
      if (!isReply) {
        return sendText("🔁 Responde a un mensaje para detectar el dispositivo.");
      }

      await sendReact("📱");

      const stanzaId = quotedMessage?.key?.id || "";
      const participantId = quotedMessage?.key?.participant || quotedMessage?.key?.remoteJid;
      const deviceField = quotedMessage?.device; // Baileys a veces lo incluye

      let device = "❓ No detectado";

      // Analizar por ID de mensaje (stanzaId)
      if (stanzaId.startsWith("3EB0")) {
        device = "💻 WhatsApp Web / Desktop";
      } else if (stanzaId.startsWith("BAE5") || stanzaId.startsWith("BAF0")) {
        device = "🤖 Android";
      } else if (
        stanzaId.startsWith("CAE5") ||
        stanzaId.startsWith("CAF0") ||
        stanzaId.startsWith("CBE0")
      ) {
        device = "🍏 iOS";
      }

      // Refinar si hay campo "device"
      if (deviceField) {
        if (deviceField.toLowerCase() === "android") device = "🤖 Android";
        else if (deviceField.toLowerCase() === "ios") device = "🍏 iOS";
        else if (deviceField.toLowerCase() === "web") device = "💻 WhatsApp Web";
      }

      await sendText(`📲 *Estimación de dispositivo* del usuario:\n\n👤 @${participantId.split("@")[0]}\n🔍 ${device}`, {
        mentions: [participantId],
      });
    } catch (error) {
      console.error("Error en el comando movil:", error);
      await sendText("❌ Error al detectar el dispositivo.");
    }
  },
};