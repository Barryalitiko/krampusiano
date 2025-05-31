const { dynamicCommand } = require("../utils/dynamicCommand");
const { loadCommonFunctions } = require("../utils/loadCommonFunctions");
const { onlyNumbers } = require("../utils");

exports.onMessagesUpsert = async ({ socket, messages }) => {
  if (!messages.length) {
    console.log("No hay mensajes nuevos en este upsert.");
    return;
  }

  for (const webMessage of messages) {
    console.log("---- Nuevo mensaje recibido ----");

    const commonFunctions = loadCommonFunctions({ socket, webMessage });
    if (!commonFunctions) {
      console.log("No se cargaron funciones comunes para este mensaje, se ignora.");
      continue;
    }

    const remoteJid = webMessage.key.remoteJid;
    const senderJid = webMessage.key.participant || remoteJid;

    // Intentamos obtener el texto en varias formas comunes
    const msg = webMessage.message;
    if (!msg) {
      console.log(`Mensaje sin contenido válido. Remitente: ${senderJid}, Chat: ${remoteJid}`);
      continue;
    }

    const messageText =
      msg.conversation ||
      msg.extendedTextMessage?.text ||
      msg.imageMessage?.caption ||
      msg.videoMessage?.caption ||
      msg.viewOnceMessage?.message?.imageMessage?.caption ||
      msg.viewOnceMessage?.message?.videoMessage?.caption ||
      null;

    console.log(`Texto recibido: ${messageText ?? "(sin texto)"}`);
    console.log(`Remitente: ${senderJid}`);
    console.log(`Chat: ${remoteJid}`);

    await dynamicCommand(commonFunctions);
  }
};