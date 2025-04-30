const { PREFIX } = require("../../krampus");
const fs = require("fs");
const path = require("path");
const gTTS = require("gtts");
const { exec } = require("child_process");

module.exports = {
  name: "aviso",
  description: "Envía un audio estilo Loquendo etiquetando a todo el grupo",
  commands: ["aviso"],
  usage: `${PREFIX}aviso <idioma opcional> <texto>`,
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

      await sendWaitReact("🎙️");

      const possibleLang = args[0].toLowerCase();
      const supportedLangs = ["es", "en", "fr", "it", "pt", "de", "ja", "ru"];
      const lang = supportedLangs.includes(possibleLang) ? possibleLang : "es";
      const texto = supportedLangs.includes(possibleLang) ? args.slice(1).join(" ") : args.join(" ");

      if (!texto || texto.length < 2) {
        await sendReply("❌ El texto es demasiado corto.");
        return;
      }

      const filename = `aviso_${Date.now()}`;
      const mp3Path = path.join(__dirname, "../../temp", `${filename}.mp3`);
      const opusPath = path.join(__dirname, "../../temp", `${filename}.opus`);

      const gtts = new gTTS(texto, lang);
      gtts.save(mp3Path, async (err) => {
        if (err) {
          console.error("Error generando voz:", err);
          await sendReply("❌ Error al generar la voz.", { quoted: webMessage });
          return;
        }

        exec(`ffmpeg -y -i "${mp3Path}" -c:a libopus -b:a 96k "${opusPath}"`, async (error) => {
          if (error) {
            console.error("Error al convertir audio:", error);
            await sendReply("❌ Error al convertir el audio.", { quoted: webMessage });
            return;
          }

          // Obtener los participantes del grupo para mencionarlos
          const metadata = await socket.groupMetadata(remoteJid);
          const mentions = metadata.participants.map(p => p.id);

          // Enviar el audio con menciones (notificación invisible para todos)
          await socket.sendMessage(remoteJid, {
            audio: { url: opusPath },
            mimetype: "audio/ogg; codecs=opus",
            ptt: true,
            contextInfo: {
              mentionedJid: mentions,
            },
          }, { quoted: webMessage });

          // Limpiar archivos temporales
          setTimeout(() => {
            fs.unlink(mp3Path, () => {});
            fs.unlink(opusPath, () => {});
          }, 5000);
        });
      });

    } catch (error) {
      console.error("Error en el comando aviso:", error);
      await sendReply("❌ Ocurrió un error procesando tu solicitud.", { quoted: webMessage });
    }
  },
};
