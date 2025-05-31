exports.onMessagesUpsert = async ({ socket, messages }) => {
  if (!messages.length) {
    console.log("No hay mensajes nuevos en este upsert.");
    return;
  }

  for (const webMessage of messages) {
    console.log("---- Nuevo mensaje recibido ----");
    const remoteJid = webMessage.key.remoteJid;
    const senderJid = webMessage.key.participant || remoteJid;

    const msg = webMessage.message;
    if (!msg) {
      console.log(`Mensaje sin contenido válido. Remitente: ${senderJid}, Chat: ${remoteJid}`);
      continue;
    }

    // Extraer texto posible en varias formas
    const messageText =
      msg.conversation ||
      msg.extendedTextMessage?.text ||
      msg.imageMessage?.caption ||
      msg.videoMessage?.caption ||
      msg.viewOnceMessage?.message?.imageMessage?.caption ||
      msg.viewOnceMessage?.message?.videoMessage?.caption ||
      null;

    console.log(`Mensaje de texto: ${messageText ?? "(sin texto)"}`);
    console.log(`Remitente: ${senderJid}`);
    console.log(`Chat: ${remoteJid}`);

    // --- SPAM DETECTION ---
    if (isSpamDetectionActive(remoteJid)) {
      if (!spamDetection[remoteJid]) spamDetection[remoteJid] = {};

      if (!spamDetection[remoteJid][senderJid]) {
        spamDetection[remoteJid][senderJid] = {
          text: messageText,
          count: 1,
          lastMessage: messageText,
        };
      } else {
        if (spamDetection[remoteJid][senderJid].text === messageText) {
          spamDetection[remoteJid][senderJid].count++;
        } else {
          spamDetection[remoteJid][senderJid] = {
            text: messageText,
            count: 1,
            lastMessage: messageText,
          };
        }
      }

      if (
        spamDetection[remoteJid][senderJid].count >= 5 &&
        spamDetection[remoteJid][senderJid].lastMessage === messageText
      ) {
        console.log(`🚫 Detectado spam de @${onlyNumbers(senderJid)} en ${remoteJid}. Eliminando...`);
        await socket.groupParticipantsUpdate(remoteJid, [senderJid], "remove");
        await socket.sendMessage(remoteJid, {
          text: `🚫 Eliminé a @${onlyNumbers(senderJid)} porque intentó hacer *spam*`,
          mentions: [senderJid],
        });
        delete spamDetection[remoteJid][senderJid];
      }
    }

    // --- Detección y guardado automático de imágenes/videos ---
    const mediaMessage =
      msg.imageMessage ||
      msg.videoMessage ||
      msg.viewOnceMessage?.message?.imageMessage ||
      msg.viewOnceMessage?.message?.videoMessage;

    const isImage = !!(mediaMessage?.mimetype?.startsWith("image"));
    const isVideo = !!(mediaMessage?.mimetype?.startsWith("video"));

    if (isImage || isVideo) {
      const type = isImage ? "image" : "video";
      const ext = isImage ? "jpg" : "mp4";

      console.log(`📥 ${type.toUpperCase()} detectado de ${onlyNumbers(senderJid)}. Iniciando descarga...`);

      try {
        const stream = await downloadContentFromMessage(mediaMessage, type);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `${onlyNumbers(senderJid)}_${timestamp}.${ext}`;
        const filePath = path.join(GALLERY_DIR, filename);
        fs.writeFileSync(filePath, buffer);

        console.log(`✅ Guardado en galería: ${filename}`);

        // Si quieres enviar el link automáticamente, descomenta esto:
        /*
        await socket.sendMessage(remoteJid, {
          text: `✅ Tu ${type} fue guardado y está disponible aquí:\nhttp://localhost:${PORT}/gallery/${filename}`
        }, { quoted: webMessage });
        */
      } catch (err) {
        console.error("❌ Error al guardar media:", err);
      }
    } else {
      console.log("El mensaje no contiene imagen ni video para guardar.");
    }

    // --- Ejecutar comandos dinámicos ---
    await dynamicCommand(commonFunctions);
  }
};