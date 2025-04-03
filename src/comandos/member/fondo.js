const { PREFIX } = require("../../krampus");
const { WarningError } = require("../../errors/WarningError");
const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");
const path = require("path");

module.exports = {
  name: "quitarfondo",
  description: "Quita el fondo de una imagen (solo color sólido)",
  commands: ["quitarfondo", "fondo"],
  usage: `${PREFIX}quitarfondo (responder a imagen)`,
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
      throw new WarningError("Debes responder a una imagen para quitar el fondo.");
    }

    await sendWaitReact();

    try {
      // Descarga la imagen
      const imagePath = await downloadImage(webMessage, "image_to_remove_bg");
      const image = await loadImage(imagePath);
      const canvas = createCanvas(image.width, image.height);
      const ctx = canvas.getContext("2d");

      // Dibuja la imagen en el canvas
      ctx.drawImage(image, 0, 0);

      // Obtén los datos de la imagen
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Función para contar colores
      const colorCount = {};
      for (let i = 0; i < data.length; i += 4) {
        const colorKey = `${data[i]},${data[i + 1]},${data[i + 2]}`;
        colorCount[colorKey] = (colorCount[colorKey] || 0) + 1;
      }

      // Encontrar el color más frecuente (posible fondo)
      const mostFrequentColor = Object.entries(colorCount).reduce((a, b) => (a[1] > b[1] ? a : b))[0];
      const [r, g, b] = mostFrequentColor.split(",").map(Number);

      // Elimina el fondo basado en el color más frecuente
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] === r && data[i + 1] === g && data[i + 2] === b) {
          data[i + 3] = 0; // Hace el fondo transparente
        }
      }

      // Actualiza la imagen
      ctx.putImageData(imageData, 0, 0);

      // Guarda la imagen modificada
      const outputPath = path.join(__dirname, "image_no_bg.png");
      const out = fs.createWriteStream(outputPath);
      const stream = canvas.createPNGStream();
      stream.pipe(out);

      out.on("finish", async () => {
        await sendSuccessReact();
        await sendImageFromFile(outputPath, "Aquí tienes tu imagen sin fondo.");
        fs.unlinkSync(imagePath);
        fs.unlinkSync(outputPath);
      });
    } catch (error) {
      console.error("Error al quitar el fondo:", error);
      await sendErrorReply("Hubo un error al procesar la imagen.");
    }
  },
};
