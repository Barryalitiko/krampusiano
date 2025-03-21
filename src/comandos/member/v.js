const { PREFIX } = require("../../krampus");
const path = require("path");
const fs = require("fs");
const { downloadVideo } = require("../../services/ytdpl");
const ytSearch = require("yt-search");
const cooldowns = new Map();

module.exports = {
  name: "video",
  description: "Buscar y enviar un video",
  commands: ["video", "v"],
  usage: `${PREFIX}video <nombre del video>`,

  handle: async ({
    socket,
    remoteJid,
    sendReply,
    args,
    sendReact,
    webMessage,
    sendMessage,
  }) => {
    try {
      const userId = remoteJid;
      const now = Date.now();
      const cooldownTime = 20 * 1000;

      if (cooldowns.has(userId)) {
        const lastUsed = cooldowns.get(userId);
        if (now - lastUsed < cooldownTime) {
          const remainingTime = Math.ceil((cooldownTime - (now - lastUsed)) / 1000);
          await sendReply(`❌ Estás en cooldown. Espera ${remainingTime} segundos para usar el comando nuevamente.`);
          return;
        }
      }

      cooldowns.set(userId, now);

      const videoQuery = args.join(" ");
      if (!videoQuery) {
        await sendReply("❌ Por favor, proporciona el nombre del video que deseas buscar.");
        return;
      }

      await sendReply(`ᴏᴘᴇʀᴀᴄɪᴏɴ ᴍᴀʀsʜᴀʟʟ\n> Krampus OM bot procesando...`);

      await sendReact("⏳", webMessage.key);

      const searchResult = await ytSearch(videoQuery);
      const video = searchResult.videos.find(v => v.seconds <= 480); // 480 segundos = 8 minutos

      if (!video) {
        await sendReply("❌ No se encontró ningún video con duración menor o igual a 8 minutos.");
        return;
      }

      const videoUrl = video.url;
      const title = video.title;
      const channelName = video.author.name;
      const duration = video.timestamp; // Duración en formato de tiempo (ej. "3:30")
      console.log(`Video encontrado: ${title}, URL: ${videoUrl}`);

      const videoPath = await downloadVideo(videoUrl);

      await sendReact("🎬", webMessage.key);

      const videoCaption = `> Krampus OM bot\n\n*Título:* ${title}\n\n*Canal:* ${channelName}\n\n*Duración:* ${duration}`;

      await sendMessage({
        messageType: "video",
        url: videoPath,
        mimetype: "video/mp4",
        caption: videoCaption,
      });

      // Elimina el archivo inmediatamente después de enviarlo
      fs.unlink(videoPath, (err) => {
        if (err) {
          console.error(`Error al eliminar el archivo de video: ${err}`);
        } else {
          console.log(`Archivo de video eliminado: ${videoPath}`);
        }
      });

    } catch (error) {
      console.error("Error al buscar o enviar el video:", error);
      await sendReply("❌ Hubo un error al procesar el video.");
    }
  },
};