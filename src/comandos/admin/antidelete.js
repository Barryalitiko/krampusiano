module.exports = {
  name: "anti-delete",
  description: "Recupera mensajes eliminados y se los reenvía al usuario que los borró.",
  commands: [], // No se invoca con comando
  usage: "Automático",
  handle: async ({ socket }) => {
    const deletedMessages = new Map();

    // Guardar mensajes recibidos
    socket.ev.on("messages.upsert", async ({ messages }) => {
      console.log("Mensaje recibido:", messages); // Log para ver los mensajes que llegan

      for (const msg of messages) {
        if (!msg.message || msg.key.fromMe) continue;

        deletedMessages.set(msg.key.id, {
          message: msg.message,
          remoteJid: msg.key.remoteJid,
          participant: msg.key.participant,
        });

        console.log(`Mensaje guardado con ID: ${msg.key.id}`); // Log para ver los mensajes guardados

        // Limpiar después de 10 minutos
        setTimeout(() => {
          deletedMessages.delete(msg.key.id);
          console.log(`Mensaje con ID: ${msg.key.id} eliminado del cache.`);
        }, 10 * 60 * 1000);
      }
    });

    // Detectar mensaje eliminado
    socket.ev.on("messages.update", async (updates) => {
      console.log("Detectando actualización de mensaje:", updates); // Log para ver las actualizaciones de los mensajes

      for (const update of updates) {
        const protocol = update.update?.protocolMessage;
        if (!protocol || protocol.type !== 0) continue;

        const deletedKey = update.key;
        const deleted = deletedMessages.get(deletedKey.id);

        if (!deleted) {
          console.log(`Mensaje con ID: ${deletedKey.id} no encontrado en cache.`);
          return;
        }

        const { participant, message } = deleted;

        let texto = "[Contenido no soportado]";
        if (message.conversation) texto = message.conversation;
        else if (message.extendedTextMessage) texto = message.extendedTextMessage.text;
        else if (message.imageMessage) texto = "[Imagen eliminada]";
        else if (message.videoMessage) texto = "[Video eliminado]";
        else if (message.audioMessage) texto = "[Audio eliminado]";
        else if (message.stickerMessage) texto = "[Sticker eliminado]";

        console.log(`Enviando mensaje recuperado a ${participant}: ${texto}`); // Log antes de enviar el mensaje

        try {
          await socket.sendMessage(participant, {
            text: `Recuperaste tu mensaje eliminado:\n\n${texto}`,
          });
          console.log(`Mensaje enviado a ${participant} correctamente.`);
        } catch (err) {
          console.error("Error reenviando mensaje eliminado:", err);
        }
      }
    });
  },
};