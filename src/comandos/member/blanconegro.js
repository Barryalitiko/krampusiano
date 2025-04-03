const { PREFIX } = require("../../krampus");
const { WarningError } = require("../../errors/WarningError");
const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");
const path = require("path");

module.exports = {
  name: "blancoynegro",
  description: "Convierte una imagen a blanco y negro",
  commands: ["blancoynegro", "bn"],
  usage: `${PREFIX}blancoynegro (responder a imagen)`,
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
      throw new WarningError("Debes responder a una imagen para convertirla a blanco y negro.");
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
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        data[i] = avg; // Rojo
        data[i + 1] = avg; // Verde
        data[i + 2] = avg; // Azul
      }
      
      ctx.putImageData(imageData, 0, 0);
      
      const outputPath = path.join(__dirname, "temp_image_bn.png");
      const out = fs.createWriteStream(outputPath);
      const stream = canvas.createPNGStream();
      stream.pipe(out);
      
      out.on("finish", async () => {
        await sendSuccessReact();
        await sendImageFromFile(outputPath, "Aquí tienes tu imagen en blanco y negro.");
        fs.unlinkSync(imagePath);
        fs.unlinkSync(outputPath);
      });
    } catch (error) {
      console.error("Error al convertir la imagen a blanco y negro:", error);
      await sendErrorReply("Hubo un error al procesar la imagen.");
    }
  },
};
