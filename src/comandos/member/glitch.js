const { PREFIX } = require("../../krampus");
const { WarningError } = require("../../errors/WarningError");
const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");
const path = require("path");

module.exports = {
  name: "glitch",
  description: "Aplica un efecto glitch a una imagen",
  commands: ["glitch"],
  usage: `${PREFIX}glitch (responder a imagen)`,
  handle: async ({
    webMessage,
    isReply,
    isImage,
    downloadImage,
    sendImageFromFile,
    sendErrorReply,
    sendWaitReact,
    sendSuccessReact,
  }) => {
    if (!isReply || !isImage) {
      throw new WarningError("Debes responder a una imagen para aplicarle el efecto glitch.");
    }

    await sendWaitReact();

    try {
      const imagePath = await downloadImage(webMessage, "temp_image");
      const image = await loadImage(imagePath);
      const canvas = createCanvas(image.width, image.height);
      const ctx = canvas.getContext("2d");

      ctx.drawImage(image, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Aplica efecto glitch desplazando líneas
      for (let i = 0; i < image.height; i += 4) {
        let shift = Math.random() * 20 - 10; // Desplazamiento aleatorio
        const row = ctx.getImageData(0, i, canvas.width, 4);
        ctx.putImageData(row, shift, i);
      }

      ctx.putImageData(imageData, 0, 0);

      const outputPath = path.join(__dirname, "temp_image_glitch.png");
      const out = fs.createWriteStream(outputPath);
      const stream = canvas.createPNGStream();
      stream.pipe(out);

      out.on("finish", async () => {
        await sendSuccessReact();
        await sendImageFromFile(outputPath, "Aquí tienes tu imagen con efecto glitch.");
        fs.unlinkSync(imagePath);
        fs.unlinkSync(outputPath);
      });
    } catch (error) {
      console.error("Error al aplicar el efecto glitch:", error);
      await sendErrorReply("Hubo un error al procesar la imagen.");
    }
  },
};
