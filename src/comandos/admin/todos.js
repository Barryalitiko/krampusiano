const { PREFIX } = require("../../krampus");

// Objeto para rastrear el tiempo de uso del comando por grupo
const cooldowns = {};

module.exports = {
  name: "hide-tag",
  description: "Para mencionar a todos",
  commands: ["krampus-bot", "todos"],
  usage: `${PREFIX}hidetag motivo`,
  handle: async ({ fullArgs, sendText, socket, remoteJid, sendReact }) => {
    const cooldownTime = 120 * 1000; // 120 segundos
    const now = Date.now();

    // Verificar si el comando está en cooldown
    if (cooldowns[remoteJid] && now - cooldowns[remoteJid] < cooldownTime) {
      const remainingTime = Math.ceil((cooldownTime - (now - cooldowns[remoteJid])) / 1000);
      await sendText(`⏳ Este comando solo puede usarse cada 2 minutos. Por favor, espera ${remainingTime} segundos.`);
      return;
    }

    try {
      const { participants } = await socket.groupMetadata(remoteJid);
      const mentions = participants.map(({ id }) => id);

      await sendReact("👻");

      // Previsualización simulada
      const fakeQuoted = {
        key: {
          remoteJid,
          fromMe: false,
          id: "FAKE-KRAMPUS-BOT",
          participant: "0@s.whatsapp.net",
        },
        message: {
          conversation: "Krampus invocando a todos...",
        },
      };

      await socket.sendMessage(remoteJid, {
        text: `👻 𝙺𝚛𝚊𝚖𝚙𝚞𝚜.𝚋𝚘𝚝 👻\nHe llamado a todos!\n\n${fullArgs || ''}`,
        mentions,
      }, { quoted: fakeQuoted });

      // Guardar timestamp del uso del comando
      cooldowns[remoteJid] = now;
    } catch (error) {
      console.error("Error al ejecutar el comando hide-tag:", error);
      await sendText("❌ Ocurrió un error al intentar mencionar a todos.");
    }
  },
};