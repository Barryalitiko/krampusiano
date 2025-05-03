const { PREFIX } = require("../../krampus");

module.exports = {
  name: "test-preview",
  description: "Enviar mensajes con diferentes tipos de previsualización.",
  commands: ["test", "t"],
  usage: `${PREFIX}test-preview`,
  handle: async ({
    fullArgs,
    sendText,
    socket,
    remoteJid,
    sendReact,
    message,
    sendMediaMessage,
  }) => {
    try {
      // Texto
      const fakeQuotedText = {
        key: {
          remoteJid,
          fromMe: false,
          id: "FAKE-QUOTE-TEXT",
          participant: "0@s.whatsapp.net",
        },
        message: {
          conversation: "Previsualización de texto",
        },
      };
      await socket.sendMessage(remoteJid, {
        text: "Este es un mensaje de texto",
      }, { quoted: fakeQuotedText });

      // Imagen
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
            caption: "Imagen de prueba",
            jpegThumbnail: null,
          },
        },
      };
      await sendMediaMessage(remoteJid, {
        image: { url: "https://picsum.photos/400/400" },
        caption: "Imagen con previsualización",
      }, { quoted: fakeQuotedImage });

      // Video
      const fakeQuotedVideo = {
        key: {
          remoteJid,
          fromMe: false,
          id: "FAKE-QUOTE-VIDEO",
          participant: "0@s.whatsapp.net",
        },
        message: {
          videoMessage: {
            mimetype: "video/mp4",
            caption: "Video de prueba",
          },
        },
      };
      await sendMediaMessage(remoteJid, {
        video: { url: "https://sample-videos.com/video123/mp4/480/asdasdas.mp4" },
        caption: "Video con previsualización",
      }, { quoted: fakeQuotedVideo });

      // Documento (PDF)
      const fakeQuotedDocument = {
        key: {
          remoteJid,
          fromMe: false,
          id: "FAKE-QUOTE-DOC",
          participant: "0@s.whatsapp.net",
        },
        message: {
          documentMessage: {
            mimetype: "application/pdf",
            fileName: "archivo.pdf",
          },
        },
      };
      await sendMediaMessage(remoteJid, {
        document: { url: "https://file-examples.com/wp-content/uploads/2017/10/file-sample_150kB.pdf" },
        mimetype: "application/pdf",
        fileName: "archivo.pdf",
      }, { quoted: fakeQuotedDocument });

      // Ubicación
      const fakeQuotedLocation = {
        key: {
          remoteJid,
          fromMe: false,
          id: "FAKE-QUOTE-LOCATION",
          participant: "0@s.whatsapp.net",
        },
        message: {
          locationMessage: {
            degreesLatitude: 37.7749,
            degreesLongitude: -122.4194,
          },
        },
      };
      await socket.sendMessage(remoteJid, {
        location: {
          degreesLatitude: 37.7749,
          degreesLongitude: -122.4194,
        },
      }, { quoted: fakeQuotedLocation });

      // Contacto
      const fakeQuotedContact = {
        key: {
          remoteJid,
          fromMe: false,
          id: "FAKE-QUOTE-CONTACT",
          participant: "0@s.whatsapp.net",
        },
        message: {
          contactMessage: {
            vcard: `BEGIN:VCARD
VERSION:3.0
FN:Nombre del contacto
TEL;type=CELL:+1234567890
END:VCARD`,
          },
        },
      };
      await socket.sendMessage(remoteJid, {
        contacts: {
          displayName: "Nombre del contacto",
          contacts: [{
            vcard: `BEGIN:VCARD
VERSION:3.0
FN:Nombre del contacto
TEL;type=CELL:+1234567890
END:VCARD`,
          }],
        },
      }, { quoted: fakeQuotedContact });

      // Sticker
      const fakeQuotedSticker = {
        key: {
          remoteJid,
          fromMe: false,
          id: "FAKE-QUOTE-STICKER",
          participant: "0@s.whatsapp.net",
        },
        message: {
          stickerMessage: {},
        },
      };
      await sendMediaMessage(remoteJid, {
        sticker: { url: "https://raw.githubusercontent.com/WhatsApp/stickers/master/Android/app/src/main/assets/01_Cuppy/Cuppy_01.webp" },
      }, { quoted: fakeQuotedSticker });

      // Audio
      const fakeQuotedAudio = {
        key: {
          remoteJid,
          fromMe: false,
          id: "FAKE-QUOTE-AUDIO",
          participant: "0@s.whatsapp.net",
        },
        message: {
          audioMessage: {
            mimetype: "audio/mp4",
            ptt: true,
          },
        },
      };
      await sendMediaMessage(remoteJid, {
        audio: { url: "https://file-examples.com/wp-content/uploads/2017/11/file_example_MP3_700KB.mp3" },
        mimetype: "audio/mp4",
        ptt: true,
      }, { quoted: fakeQuotedAudio });

      // Botones simples
      await socket.sendMessage(remoteJid, {
        text: "Elige una opción:",
        buttons: [
          { buttonId: "opt1", buttonText: { displayText: "Opción 1" }, type: 1 },
          { buttonId: "opt2", buttonText: { displayText: "Opción 2" }, type: 1 },
        ],
        headerType: 1,
      });

    } catch (error) {
      console.error("Error en test-preview:", error);
    }
  },
};