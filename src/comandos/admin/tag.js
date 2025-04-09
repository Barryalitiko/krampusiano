const { PREFIX } = require("../../krampus");

module.exports = {
  name: "hide-tag",
  description: "Para mencionar a todos, incluso si se responde a un mensaje.",
  commands: ["tag", "t"],
  usage: `${PREFIX}hidetag motivo`,
  handle: async ({ fullArgs, sendText, socket, remoteJid, sendReact, message, sendMediaMessage }) => {
    try {
      const { participants } = await socket.groupMetadata(remoteJid);
      const mentions = participants.map(({ id }) => id);

      await sendReact("📎");

      const fakeQuoted = {
        key: {
          remoteJid,
          fromMe: false,
          id: "FAKE-QUOTE-HIDETAG",
          participant: "0@s.whatsapp.net",
        },
        message: {
          conversation: "Krampus OM",
        },
      };

      if (message?.quotedMessage) {
        if (message.quotedMessage.type === 'text') {
          await socket.sendMessage(remoteJid, {
            text: `\n\n${message.quotedMessage.text}`,
            mentions,
          }, { quoted: fakeQuoted });
        } else if (message.quotedMessage.type === 'image') {
          await sendMediaMessage(remoteJid, message.quotedMessage.imageMessage, {
            caption: `Etiquetando a todos:\n\n${fullArgs}`,
            mentions,
            quoted: fakeQuoted,
          });
        }
      } else {
        await socket.sendMessage(remoteJid, {
          text: `\n\n${fullArgs}`,
          mentions,
        }, { quoted: fakeQuoted });
      }

    } catch (error) {
      console.error("Error en hide-tag:", error);
    }
  },
};
