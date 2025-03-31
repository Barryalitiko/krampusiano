const { PREFIX, TEMP_DIR } = require("../../krampus");
const { InvalidParameterError } = require("../../errors/InvalidParameterError");
const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const { Sticker } = require("wa-sticker-formatter");

module.exports = {
  name: "sticker",
  description: "Crea stickers de imagen/gif/vídeo",
  commands: ["s", "sticker", "fig", "f"],
  usage: `${PREFIX}sticker (etiqueta imagen/gif/vídeo) o ${PREFIX}sticker (responde a imagen/gif/vídeo)`,
  handle: async ({
    isImage,
    isVideo,
    downloadImage,
    downloadVideo,
    webMessage,
    sendErrorReply,
    sendSuccessReact,
    sendStickerFromFile,
  }) => {
    if (!isImage && !isVideo) {
      throw new InvalidParameterError(
        "Debes marcar o responder lo que convertire a sticker\n> Krampus OM bot"
      );
    }

    const outputPath = path.resolve(TEMP_DIR, "output.webp");

    const stickerPackName = "Operacion Marshall";  // Nombre del paquete de stickers
    const authorName = "Krampus bot\n\nby Krampus ༴༎om༎";  // Nombre del autor

    if (isImage) {
      const inputPath = await downloadImage(webMessage, "input");
      const imageBuffer = fs.readFileSync(inputPath);

      // Crear sticker desde imagen usando wa-sticker-formatter
      const sticker = new Sticker(imageBuffer, {
        pack: stickerPackName,
        author: authorName,
      });

      await sticker.toFile(outputPath);

      await sendSuccessReact();
      await sendStickerFromFile(outputPath);

      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
    } else {
      const inputPath = await downloadVideo(webMessage, "input");

      const sizeInSeconds = 10;

      const seconds =
        webMessage.message?.videoMessage?.seconds ||
        webMessage.message?.extendedTextMessage?.contextInfo?.quotedMessage
          ?.videoMessage?.seconds;

      const haveSecondsRule = seconds <= sizeInSeconds;

      if (!haveSecondsRule) {
        fs.unlinkSync(inputPath);

        await sendErrorReply(`Este video tiene más de ${sizeInSeconds} segundos!

Envia un video más corto!`);

        return;
      }

      exec(
        `ffmpeg -i ${inputPath} -y -vcodec libwebp -fs 0.99M -filter_complex "[0:v] scale='if(gt(iw,ih),512,-2)':'if(gt(ih,iw),512,-2)',fps=12,pad=ceil(iw/2)*2:ceil(ih/2)*2:-1:-1:color=white@0.0,split[a][b];[a]palettegen=reserve_transparent=on:transparency_color=ffffff[p];[b][p]paletteuse" -f webp ${outputPath}`,
        async (error) => {
          if (error) {
            console.log(error);
            fs.unlinkSync(inputPath);

            throw new Error(error);
          }

          const videoBuffer = fs.readFileSync(outputPath);

          // Crear sticker desde video usando wa-sticker-formatter
          const sticker = new Sticker(videoBuffer, {
            pack: stickerPackName,
            author: authorName,
          });

          await sticker.toFile(outputPath);

          await sendSuccessReact();
          await sendStickerFromFile(outputPath);

          fs.unlinkSync(inputPath);
          fs.unlinkSync(outputPath);
        }
      );
    }
  },
};
