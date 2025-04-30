const { PREFIX } = require("../../krampus");
const fs = require("fs");
const path = require("path");
const gTTS = require("gtts");
const { exec } = require("child_process");

module.exports = {
  name: "voz",
  description: "Convierte texto en voz estilo Loquendo (multilenguaje)",
  commands: ["voz", "loquendo", "habla"],
  usage: `${PREFIX}voz <idioma opcional> <texto>`,
  handle: async ({
    socket,
    remoteJid,
    sendReply,
    args,
    sendWaitReact,
    webMessage,
  }) => {
    try {
      if (args.length === 0) {
        await sendReply("❌ Debes escribir el texto que quieres convertir en voz.");
        return;
      }

      await sendWaitReact("⏳");

      // Detectar si el primer argumento es un código de idioma
      const possibleLang = args[0].toLowerCase();
      const supportedLangs = ["es", "en", "fr", "it", "pt", "de", "ja", "ru"];
      const lang = supportedLangs.includes(possibleLang) ? possibleLang : "es";
      const texto = supportedLangs.includes(possibleLang) ? args.slice(1).join(" ") : args.join(" ");

      if (!texto || texto.length < 2) {
        await sendReply("❌ El texto es demasiado corto.");
        return;
      }

      const filename = `voz_${Date.now()}`;
      const tempDir = path.join(__dirname, "../../temp");

      // Crear carpeta temp si no existe
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const mp3Path = path.join(tempDir, `${filename}.mp3`);
      const opusPath = path.join(tempDir, `${filename}.opus`);

      const gtts = new gTTS(texto, lang);
      gtts.save(mp3Path, async (err) => {
        if (err) {
          console.error("Error generando voz:", err);
          await sendReply("❌ Error al generar la voz con gTTS.", { quoted: webMessage });
          return;
        }

        // Convertir a OPUS para compatibilidad
        exec(`ffmpeg -y -i "${mp3Path}" -c:a libopus -b:a 96k "${opusPath}"`, async (error) => {
          if (error) {
            console.error("Error al convertir a OPUS:", error);
            await sendReply("❌ Error al convertir el audio.", { quoted: webMessage });
            return;
          }

          await socket.sendMessage(remoteJid, {
            audio: { url: opusPath },
            mimetype: "audio/ogg; codecs=opus",
            ptt: true,
            contextInfo: {
              externalAdReply: {
                title: `Texto en: ${lang.toUpperCase()}`,
                body: "Krampvs OM",
                mediaType: 2,
                thumbnailUrl: "https://i.imgur.com/KaSl1I9_d.webp",
                renderLargerThumbnail: true,
                showAdAttribution: true,
                sourceUrl: "https://sokybot.fake/voz",
              },
            },
          }, { quoted: webMessage });

          setTimeout(() => {
            fs.unlink(mp3Path, () => {});
            fs.unlink(opusPath, () => {});
          }, 5000);
        });
      });

    } catch (error) {
      console.error("Error en el comando de voz:", error);
      await sendReply("❌ Ocurrió un error procesando tu solicitud.", { quoted: webMessage });
    }
  },
};
