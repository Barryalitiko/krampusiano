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
      // Previsualización de texto
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
      }, {
        quoted: fakeQuotedText,
      });

      // Previsualización de imagen
      const fakeQuotedImage = {
        key: {
          remoteJid,
          fromMe: false,
          id: "FAKE-QUOTE-IMAGE",
          participant: "0@s.whatsapp.net",
        },
        message: {
          imageMessage: {
            url: "https:                         
          },
        },
      };
      await sendMediaMessage(remoteJid, {
        image: {
          url: "//example.com/image.jpg",
          },
        },
      };
      await sendMediaMessage(remoteJid, {
        image: {
          url: "https://example.com/image.jpg",
        },
      }, {
        quoted: fakeQuotedImage,
      });

      // Previsualización de vídeo
      const fakeQuotedVideo = {
        key: {
          remoteJid,
          fromMe: false,
          id: "FAKE-QUOTE-VIDEO",
          participant: "0@s.whatsapp.net",
        },
        message: {
          videoMessage: {
            url: "https:                         
          },
        },
      };
      await sendMediaMessage(remoteJid, {
        video: {
          url: "//example.com/video.mp4",
          },
        },
      };
      await sendMediaMessage(remoteJid, {
        video: {
          url: "https://example.com/video.mp4",
        },
      }, {
        quoted: fakeQuotedVideo,
      });

      // Previsualización de archivo
      const fakeQuotedFile = {
        key: {
          remoteJid,
          fromMe: false,
          id: "FAKE-QUOTE-FILE",
          participant: "0@s.whatsapp.net",
        },
        message: {
          fileMessage: {
            url: "https:                        
          },
        },
      };
      await sendMediaMessage(remoteJid, {
        file: {
          url: "//example.com/file.pdf",
          },
        },
      };
      await sendMediaMessage(remoteJid, {
        file: {
          url: "https://example.com/file.pdf",
        },
      }, {
        quoted: fakeQuotedFile,
      });

      // Previsualización de contacto
      const fakeQuotedContact = {
        key: {
          remoteJid,
          fromMe: false,
          id: "FAKE-QUOTE-CONTACT",
          participant: "0@s.whatsapp.net",
        },
        message: {
          contactMessage: {
            displayName: "Nombre del contacto",
            phoneNumber: "+1234567890",
          },
        },
      };
      await socket.sendMessage(remoteJid, {
        contact: {
          displayName: "Nombre del contacto",
          phoneNumber: "+1234567890",
        },
      }, {
        quoted: fakeQuotedContact,
      });

      // Previsualización de ubicación
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
      }, {
        quoted: fakeQuotedLocation,
      });
    } catch (error) {
      console.error("Error en test-preview:", error);
    }
  },
};