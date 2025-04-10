const { PREFIX } = require("../../krampus");

module.exports = {
  name: "admin",
  description: "Promueve o degrada a un administrador en el grupo.",
  commands: ["promote", "demote"],
  usage: `${PREFIX}promote @usuario\n${PREFIX}demote @usuario`,
  handle: async ({ args, remoteJid, commandName, sendReply, socket, sendReact, message, sendMediaMessage }) => {
    if (!remoteJid.endsWith("@g.us")) {
      await sendReply("Este comando solo puede usarse en grupos.");
      return;
    }

    if (args.length < 1) {
      await sendReply(
        `Uso incorrecto. Ejemplo:\n${PREFIX}promote @usuario\n${PREFIX}demote @usuario`
      );
      return;
    }

    const mentionedUser = args[0].replace("@", "").replace(/\D/g, "") + "@s.whatsapp.net";

    try {
      if (commandName === "promote") {
        await socket.groupParticipantsUpdate(remoteJid, [mentionedUser], "promote");
        await sendReact("✅");
      } else if (commandName === "demote") {
        await socket.groupParticipantsUpdate(remoteJid, [mentionedUser], "demote");
        await sendReact("❌");
      }

      const { participants } = await socket.groupMetadata(remoteJid);
      const mentions = participants.map(({ id }) => id);

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

      // Previsualización del mensaje según la acción
      const actionText = commandName === "promote"
        ? `@${args[0]} ahora es administrador.`
        : `@${args[0]} ya no es administrador.`;

      // Si hay un mensaje citado con contenido visual, se envía como media
      if (message?.quotedMessage) {
        if (message.quotedMessage.type === "image") {
          await sendMediaMessage(remoteJid, message.quotedMessage.imageMessage, {
            caption: actionText,
            mentions,
            quoted: fakeQuoted,
          });
        } else if (message.quotedMessage.type === "text") {
          await socket.sendMessage(remoteJid, {
            text: `${actionText}\n\n"${message.quotedMessage.text}"`,
            mentions,
          }, { quoted: fakeQuoted });
        } else {
          await socket.sendMessage(remoteJid, {
            text: actionText,
            mentions,
          }, { quoted: fakeQuoted });
        }
      } else {
        // Si no se citó nada, solo enviar el texto
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