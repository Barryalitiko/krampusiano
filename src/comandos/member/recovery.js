const { PREFIX } = require("../../krampus");
const { WarningError } = require("../../errors/WarningError");
const fs = require("fs");

module.exports = {
  name: "recovery",
  description: "Reenvía una imagen o video sin editar (prueba)",
  commands: ["recovery", "rec"],
  usage: `${PREFIX}recovery (responder a imagen o video)`,
  handle: async ({
    webMessage,
    isReply,
    isImage,
    isVideo,
    downloadImage,
    downloadMedia,
    sendImageFromFile,
    sendVideoFromFile,
    sendErrorReply,
    sendWaitReact,
    sendSuccessReact,
  }) => {
    if (!isReply || (!isImage && !isVideo)) {
      throw new WarningError("Debes responder a una imagen o video.");
    }

    await sendWaitReact();

    try {
      if (isImage) {
        const imagePath = await downloadImage(webMessage, "temp_recovery_image.png");
        await sendSuccessReact();
        await sendImageFromFile(imagePath);
        fs.unlinkSync(imagePath);
      } else if (isVideo) {
        const videoPath = await downloadMedia(webMessage, "temp_recovery_video.mp4");
        await sendSuccessReact();
        await sendVideoFromFile(videoPath);
        fs.unlinkSync(videoPath);
      }
    } catch (error) {
      console.error("Error en el comando recovery:", error);
      await sendErrorReply("Hubo un error al reenviar el archivo.");
    }
  },
};
