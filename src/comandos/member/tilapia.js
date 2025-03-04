const { PREFIX } = require("../../krampus");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");

const cooldowns = {}; // Almacena los tiempos de cooldown de los usuarios
const COOLDOWN_TIME = 25 * 1000; // 25 segundos en milisegundos

module.exports = {
  name: "miniVideo",
  description: "Genera un mini video con la foto de perfil de un usuario y un audio.",
  commands: ["tilapia"],
  usage: `${PREFIX}minivideo @usuario`,
  handle: async ({ args, socket, remoteJid, sendReply, sendReact, isReply, replyJid, senderJid }) => {
    let userJid;

    if (isReply) {
      userJid = replyJid;
    } else if (args.length < 1) {
      await sendReply("Uso incorrecto. Usa el comando así:\n" + `${PREFIX}tilapia @usuario`);
      return;
    } else {
      userJid = args[0].replace("@", "") + "@s.whatsapp.net";
    }

    // Verificar cooldown
    const lastUsed = cooldowns[senderJid] || 0;
    const now = Date.now();
    if (now - lastUsed < COOLDOWN_TIME) {
      const remainingTime = ((COOLDOWN_TIME - (now - lastUsed)) / 1000).toFixed(1);
      await sendReply(`Espera ${remainingTime} segundos antes de volver a usar el comando.`);
      return;
    }

    try {
      let profilePicUrl;
      try {
        profilePicUrl = await socket.profilePictureUrl(userJid, "image");
      } catch (err) {
        console.error(err);
        await sendReply(`@${args[0] || userJid.split('@')[0]} no tiene foto de perfil, no puedo generar el video.`);
        return;
      }

      if (!profilePicUrl) {
        await sendReply(`@${args[0] || userJid.split('@')[0]} no tiene foto de perfil, no puedo generar el video.`);
        return;
      }

      const tempFolder = path.resolve(__dirname, "../../../assets/temp");
      if (!fs.existsSync(tempFolder)) {
        fs.mkdirSync(tempFolder, { recursive: true });
      }

      const imageFilePath = path.resolve(tempFolder, `${userJid}_profile.jpg`);
      const response = await axios({ url: profilePicUrl, responseType: "arraybuffer" });
      fs.writeFileSync(imageFilePath, response.data);

      const audioFilePath = path.resolve(__dirname, "../../../assets/audio/tilapia.mp3");
      const videoFilePath = path.resolve(tempFolder, `${userJid}_video.mp4`);

      ffmpeg()
        .input(imageFilePath)
        .loop(10)
        .input(audioFilePath)
        .audioCodec("aac")
        .videoCodec("libx264")
        .outputOptions(["-t 20", "-vf fade=t=in:st=0:d=4", "-preset fast"])
        .output(videoFilePath)
        .on("end", async () => {
          try {
            await socket.sendMessage(remoteJid, {
              video: {
                url: videoFilePath,
              },
              caption: `No sabia eso de ti\n@${userJid.split("@")[0]}`,
              mentions: [userJid],
            });

            fs.unlinkSync(imageFilePath);
            fs.unlinkSync(videoFilePath);

            // Registrar el tiempo de uso para aplicar el cooldown
            cooldowns[senderJid] = Date.now();
          } catch (error) {
            console.error(error);
            await sendReply("Hubo un problema al generar el video.");
          }
        })
        .on("error", (err) => {
          console.error(err);
          sendReply("Hubo un problema al crear el video.");
        })
        .run();
    } catch (error) {
      console.error(error);
      await sendReply("Hubo un error al procesar el comando.");
    }
  },
};
