const { PREFIX } = require("../../krampus");

module.exports = {
  name: "test-preview",
  description: "Enviar mensajes con diferentes tipos de previsualización.",
  commands: ["test", "t"],
  usage: `${PREFIX}test-preview`,
  handle: async ({
    socket,
    remoteJid,
    sendImageFromURL,
    sendVideoFromURL,
    sendAudioFromURL,
    sendStickerFromURL,
    sendReplyWithButton,
    sendMessage,
    sendLinkReact,
  }) => {
    try {
      // Texto
      await socket.sendMessage(remoteJid, {
        text: "Este es un mensaje de texto",
      });

      // Imagen
      await sendImageFromURL("https://picsum.photos/400/400", "Imagen de prueba");

      // Video
      await sendVideoFromURL("https://sample-videos.com/video123/mp4/480/asdasdas.mp4");

      // Documento PDF
      await sendMessage({
        messageType: "document",
        mimetype: "application/pdf",
        url: "https://file-examples.com/wp-content/uploads/2017/10/file-sample_150kB.pdf",
      });

      // Ubicación
      await socket.sendMessage(remoteJid, {
        location: {
          degreesLatitude: 37.7749,
          degreesLongitude: -122.4194,
        },
      });

      // Contacto
      const vcard = `BEGIN:VCARD
VERSION:3.0
FN:Nombre del contacto
TEL;type=CELL:+1234567890
END:VCARD`;
      await socket.sendMessage(remoteJid, {
        contacts: {
          displayName: "Nombre del contacto",
          contacts: [{ vcard }],
        },
      });

      // Sticker
      await sendStickerFromURL("https://raw.githubusercontent.com/WhatsApp/stickers/master/Android/app/src/main/assets/01_Cuppy/Cuppy_01.webp");

      // Audio
      await sendAudioFromURL("https://file-examples.com/wp-content/uploads/2017/11/file_example_MP3_700KB.mp3");

      // Botones simples
      await sendReplyWithButton("Elige una opción:", [
        { buttonId: "opt1", buttonText: { displayText: "Opción 1" }, type: 1 },
        { buttonId: "opt2", buttonText: { displayText: "Opción 2" }, type: 1 },
      ]);

      // Lista de opciones
      await socket.sendMessage(remoteJid, {
        title: "Menú de prueba",
        text: "Selecciona una opción del menú:",
        buttonText: "Ver opciones",
        sections: [
          {
            title: "Sección 1",
            rows: [
              { title: "Opción A", rowId: "op_a", description: "Primera opción" },
              { title: "Opción B", rowId: "op_b", description: "Segunda opción" },
            ],
          },
          {
            title: "Sección 2",
            rows: [
              { title: "Opción C", rowId: "op_c" },
            ],
          },
        ],
      });

      // Botón con enlace
      await socket.sendMessage(remoteJid, {
        text: "Este es un mensaje con botón de enlace",
        footer: "Haz clic abajo para visitar OpenAI",
        templateButtons: [
          {
            index: 1,
            urlButton: {
              displayText: "Visitar OpenAI",
              url: "https://openai.com",
            },
          },
        ],
      });

      // Link (Enlace previsualizado)
      await sendLinkReact(
        remoteJid,
        "https://www.wikipedia.org",
        "Wikipedia"
      );

      // Reacción a un mensaje (especificando el emoji)
      await socket.sendMessage(remoteJid, {
        react: {
          text: "👍",
          key: {
            remoteJid,
            fromMe: false,
            id: "FAKE-QUOTE-REACTION",
            participant: "0@s.whatsapp.net",
          },
        },
      });

      // Mensaje citado (quote) - Enviar un mensaje que cite otro
      const fakeQuotedText = {
        key: {
          remoteJid,
          fromMe: false,
          id: "FAKE-QUOTE-TEXT",
          participant: "0@s.whatsapp.net",
        },
        message: {
          conversation: "Este es el mensaje que será citado",
        },
      };
      await socket.sendMessage(remoteJid, {
        text: "Este es un mensaje citado",
      }, { quoted: fakeQuotedText });

      // Imagen citada
      const fakeQuotedImage = {
        key: {
          remoteJid,
          fromMe: false,
          id: "FAKE-QUOTE-IMAGE",
          participant: "0@s.whatsapp.net",
        },
        message: {
          imageMessage: {
            mimetype: "image/jpeg",
            caption: "Imagen citada",
            jpegThumbnail: null,
          },
        },
      };
      await sendImageFromURL("https://picsum.photos/400/400", "Imagen citada", { quoted: fakeQuotedImage });

    } catch (error) {
      console.error("Error en test-preview:", error);
    }
  },
};