const { PREFIX } = require("../../krampus");
const { WarningError } = require("../../errors/WarningError");
const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");
const path = require("path");

module.exports = {
  name: "sepia",
  description: "Aplica un filtro sepia a una imagen",
  commands: ["sepia"],
  usage: `${PREFIX}sepia (responder a imagen)`,
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
      throw new WarningError("Debes responder a una imagen para aplicar el filtro sepia.");
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
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        data[i] = r * 0.393 + g * 0.769 + b * 0.189; // Rojo
        data[i + 1] = r * 0.349 + g * 0.686 + b * 0.168; // Verde
        data[i + 2] = r * 0.272 + g * 0.534 + b * 0.131; // Azul
      }
      
      ctx.putImageData(imageData, 0, 0);
      
      const outputPath = path.join(__dirname, "temp_image_sepia.png");
      const out = fs.createWriteStream(outputPath);
      const stream = canvas.createPNGStream();
      stream.pipe(out);
      
      out.on("finish", async () => {
        await sendSuccessReact();
        await sendImageFromFile(outputPath, "Aquí tienes tu imagen con efecto sepia.");
        fs.unlinkSync(imagePath);
        fs.unlinkSync(outputPath);
      });
    } catch (error) {
      console.error("Error al aplicar el filtro sepia:", error);
      await sendErrorReply("Hubo un error al procesar la imagen.");
    }
  },
};
