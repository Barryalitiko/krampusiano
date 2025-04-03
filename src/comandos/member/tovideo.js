const { PREFIX } = require("../../krampus");
const { WarningError } = require("../../errors/WarningError");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

module.exports = {
  name: "audiovideo",
  description: "Convierte un audio en un video con fondo negro y texto",
  commands: ["audiovideo", "a2v"],
  usage: `${PREFIX}audiovideo (responder a un audio)`,
  handle: async ({
    webMessage,
    isReply,
    isAudio,
    downloadAudio,
    sendVideoFromFile,
    sendErrorReply,
    sendWaitReact,
    sendSuccessReact,
  }) => {
    if (!isReply || !isAudio) {
      throw new WarningError("Debes responder a un audio para convertirlo en video.");
    }

    await sendWaitReact();

    try {
      const audioPath = await downloadAudio(webMessage, "input_audio.mp3");
      const outputPath = path.join(__dirname, "output_video.mp4");
      const text = "Krampus OM\nOperacion Marshall";

      const ffmpegArgs = [
        "-y",
        "-f", "lavfi",
        "-t", "10",
        "-i", "color=c=black:s=720x720",
        "-i", audioPath,
        "-vf", `drawtext=text='${text}':fontcolor=white:fontsize=40:x=(w-text_w)/2:y=(h-text_h)/2`,
        "-c:v", "libx264",
        "-tune", "stillimage",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        outputPath
      ];

      const ffmpegProcess = spawn("ffmpeg", ffmpegArgs);

      ffmpegProcess.on("close", async (code) => {
        if (code === 0) {
          await sendSuccessReact();
          await sendVideoFromFile(outputPath, "Aquí tienes tu audio convertido en video.");
          fs.unlinkSync(audioPath);
          fs.unlinkSync(outputPath);
        } else {
          await sendErrorReply("Hubo un error al convertir el audio en video.");
        }
      });
    } catch (error) {
      await sendErrorReply("Ocurrió un error inesperado.");
    }
  },
};
