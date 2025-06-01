const { PREFIX } = require("../../krampus");
const fs = require("fs");
const path = require("path");

const GALLERY_DIR = path.resolve(__dirname, "../../gallery");

// Asegurarse que la carpeta exista
if (!fs.existsSync(GALLERY_DIR)) {
  fs.mkdirSync(GALLERY_DIR, { recursive: true });
}

module.exports = {
  name: "savegallery",
  description: "Guarda la imagen/video respondido y comparte un link público",
  commands: ["savegallery", "sg"],
  usage: `${PREFIX}savegallery (responde a imagen o video)`,
  handle: async ({
    webMessage,
    isReply,
    isImage,
    isVideo,
    downloadImage,
    downloadMedia,
    sendText,
    sendErrorReply,
    sendWaitReact,
    sendSuccessReact,
  }) => {
    if (!isReply || (!isImage && !isVideo)) {
      return sendErrorReply("❌ Debes responder a una imagen o video.");
    }

    await sendWaitReact();

    try {
      let filePath = "";
      let ext = "";

      if (isImage) {
        ext = ".png";
        filePath = path.join(GALLERY_DIR, `img_${Date.now()}${ext}`);
        await downloadImage(webMessage, filePath);
      } else if (isVideo) {
        ext = ".mp4";
        filePath = path.join(GALLERY_DIR, `vid_${Date.now()}${ext}`);
        await downloadMedia(webMessage, filePath);
      }

      await sendSuccessReact();

      // Aquí colocas la IP o dominio público del servidor y puerto donde sirves la galería
      // Si es local y pruebas en localhost o red local, ajusta el host:
      const host = "http://localhost:4000"; // Cambia según tu configuración

      const publicUrl = `${host}/gallery/${path.basename(filePath)}`;

      await sendText(`✅ Contenido guardado y disponible aquí:\n${publicUrl}`);

    } catch (error) {
      console.error("Error en savegallery:", error);
      await sendErrorReply("❌ Hubo un error al guardar y compartir el archivo.");
    }
  },
};