const { PREFIX } = require("../../krampus");

module.exports = {
  name: "admin",
  description: "Promueve o degrada a un administrador en el grupo.",
  commands: ["promote", "demote"],
  usage: `${PREFIX}promote @usuario o responde a un mensaje\n${PREFIX}demote @usuario o responde a un mensaje`,
  handle: async ({ args, remoteJid, commandName, sendReply, socket, sendReact, message, sendMediaMessage }) => {
    if (!remoteJid.endsWith("@g.us")) {
      await sendReply("Este comando solo puede usarse en grupos.");
      return;
    }

    // Obtener ID del usuario mencionado o del mensaje respondido
    let targetId;

    if (args.length >= 1 && args[0].includes("@")) {
      targetId = args[0].replace("@", "").replace(/\D/g, "") + "@s.whatsapp.net";
    } else if (message?.quotedMessage && message?.quotedParticipant) {
      targetId = message.quotedParticipant;
    } else {
      await sendReply(`Debes mencionar o responder al mensaje del usuario.\nEjemplo:\n${PREFIX}promote @usuario o responde al mensaje del usuario.`);
      return;
    }

    try {
      if (commandName === "promote") {
        await socket.groupParticipantsUpdate(remoteJid, [targetId], "promote");
        await sendReact("✅");
      } else if (commandName === "demote") {
        await socket.groupParticipantsUpdate(remoteJid, [targetId], "demote");
        await sendReact("❌");
      }

      // Mensaje falso para previsualización
      const fakeQuoted = {
        key: {
          remoteJid,
          fromMe: false,
          id: "FAKE-QUOTE-ADMIN",
          participant: "0@s.whatsapp.net",
        },
        message: {
          conversation: "Krampus OM bot",
        },
      };

      const username = targetId.split("@")[0];
      const actionText = commandName === "promote"
        ? `@${username} ahora es administrador.`
        : `@${username} ya no es administrador.`;

      const mentions = [targetId];

      if (message?.quotedMessage) {
        if (message.quotedMessage.imageMessage) {
          await sendMediaMessage(remoteJid, message.quotedMessage.imageMessage, {
            caption: actionText,
            mentions,
            quoted: fakeQuoted,
          });
        } else if (message.quotedMessage.conversation || message.quotedMessage.extendedTextMessage) {
          const quotedText = message.quotedMessage.conversation || message.quotedMessage.extendedTextMessage?.text;
          await socket.sendMessage(remoteJid, {
            text: `${actionText}\n\n"${quotedText}"`,
            mentions,
          }, { quoted: fakeQuoted });
        } else {
          await socket.sendMessage(remoteJid, {
            text: actionText,
            mentions,
          }, { quoted: fakeQuoted });
        }
      } else {
        await socket.sendMessage(remoteJid, {
          text: actionText,
          mentions,
        }, { quoted: fakeQuoted });
      }

    } catch (error) {
      console.error("Error al actualizar administrador:", error);
      await sendReply("Hubo un error al realizar la acción.");
    }
  },
};