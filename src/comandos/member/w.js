const { PREFIX } = require("../../krampus");
const { downloadMusic } = require("../../services/ytdpl");
const ytSearch = require("yt-search");
const fs = require("fs");
const cooldowns = new Map();

module.exports = {
  name: "musica",
  description: "Descargar y enviar música desde YouTube",
  commands: ["musica", "m", "music", "play", "audio"],
  usage: `${PREFIX}musica <nombre del video>`,
  handle: async ({
    socket,
    remoteJid,
    sendReply,
    args,
    sendWaitReact,
    sendMusicReact,
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

      await sendWaitReact("⏳");

      const searchResult = await ytSearch(videoQuery);
      const video = searchResult.videos[0];

      if (!video) {
        await sendReply("❌ No se encontró ningún video con ese nombre.", { quoted: webMessage });
        return;
      }

      const videoUrl = video.url;
      const videoTitle = video.title;
      const videoAuthor = video.author.name;
      const videoViews = video.views;

      const message = `🎶 ${videoTitle} 

📺 Canal: ${videoAuthor}
👀 Visualizaciones: ${videoViews}

> SOKY bot Oᴘᴇʀᴀᴄɪᴏɴ Mᴀʀsʜᴀʟʟ ༴༎𝙾𝙼༎`;

      const firstMessage = await sendReply(message, { quoted: webMessage });


      setTimeout(async () => {
        await socket.sendMessage(remoteJid, {
          delete: {
            remoteJid: remoteJid,
            fromMe: true, 
            id: firstMessage.key.id, 
          },
        });
        console.log(`Primer mensaje eliminado: ${firstMessage.key.id}`);
      }, 15000); 

      const musicPath = await downloadMusic(videoUrl);
      console.log(`Música descargada correctamente: ${musicPath}`);

      await sendMusicReact("🎵");


      await socket.sendMessage(remoteJid, {
        audio: { url: musicPath },
        mimetype: "audio/mp4",
        ptt: true, 
        caption: `🎶 ${videoTitle}`,
        contextInfo: {
          externalAdReply: {
            title: videoTitle, // Nombre de la canción
            body: "KRAMPUS ༴༎𝙾𝙼༎",
            mediaType: 2,
            thumbnailUrl: "https://i.imgur.com/KaSl1I9_d.webp?maxwidth=760&fidelity=grand", // miniatura del canal
            renderLargerThumbnail: true,
            showAdAttribution: true,
            sourceUrl: "Oᴘᴇʀᴀᴄɪᴏɴ Mᴀʀsʜᴀʟʟ", // link del canal (ficticio o real)
          },
        },
      }, { quoted: webMessage });

      fs.unlinkSync(musicPath);
      console.log(`Archivo de música eliminado: ${musicPath}`);

    } catch (error) {
      console.error("Error al descargar o enviar la música:", error);
      await sendReply("❌ Hubo un error al procesar la música.", { quoted: webMessage });
    }
  },
};