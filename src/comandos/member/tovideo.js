const { PREFIX } = require("../../krampus");
const { WarningError } = require("../../errors/WarningError");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

module.exports = {
  name: "audiovideo",
  description: "Convierte un audio en un video con fondo negro y texto",
  commands: ["audiovideo", "a2v"],
  usage: `${PREFIX}audiovideo (responder a un audio) [texto opcional]`,
  handle: async ({
    webMessage,
    isReply,
    isAudio,
    downloadAudio,
    sendVideoFromFile,
    sendErrorReply,
    sendWaitReact,
    sendSuccessReact,
    args, // <--- Asegúrate de que tu sistema de comandos te pase los args
  }) => {
    if (!isReply || !isAudio) {
      console.log("Error: No se respondió a un audio o el mensaje no contiene un audio.");
      throw new WarningError("Debes responder a un audio para convertirlo en video.");
    }

    await sendWaitReact();
    console.log("Esperando... proceso en curso.");

    try {
      console.log("Intentando descargar el audio...");
      const audioPath = await downloadAudio(webMessage, "input_audio.mp3");
      console.log("Audio descargado con éxito en:", audioPath);

      const outputPath = path.join(__dirname, "output_video.mp4");
      console.log("Ruta de salida del video:", outputPath);

      // Texto base
      let text = "Krampus OM\nOperacion Marshall";
      // Si hay texto adicional del usuario, se añade
      if (args.length > 0) {
        const userText = args.join(" ").replace(/'/g, ""); // eliminar comillas para evitar errores
        text += `\n${userText}`;
      }

      console.log("Texto a mostrar en el video:", text);

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

      console.log("Comandos de FFmpeg:", ffmpegArgs);

      const ffmpegProcess = spawn("ffmpeg", ffmpegArgs);

      ffmpegProcess.on("close", async (code) => {
        if (code === 0) {
          console.log("Conversión completada con éxito.");
          await sendSuccessReact();
          await sendVideoFromFile(outputPath, "Audio a video\n> Krampus OM");
          fs.unlinkSync(audioPath);
          fs.unlinkSync(outputPath);
        } else {
          console.log("Error en el proceso de FFmpeg, código de salida:", code);
          await sendErrorReply("Hubo un error al convertir el audio en video.");
        }
      });

      ffmpegProcess.on("error", async (err) => {
        console.error("Error en el proceso de FFmpeg:", err);
        await sendErrorReply("Ocurrió un error inesperado durante el procesamiento.");
      });

    } catch (error) {
      console.error("Error en el proceso de conversión:", error);
      await sendErrorReply("Ocurrió un error inesperado.");
    }
  },
};
