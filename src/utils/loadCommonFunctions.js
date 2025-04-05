const { BOT_EMOJI } = require("../krampus");
const { extractDataFromMessage, baileysIs, download } = require(".");
const { waitMessage } = require("./messages");
const fs = require("fs");

exports.loadCommonFunctions = ({ socket, webMessage }) => {
  const {
    args,
    commandName,
    fullArgs,
    fullMessage,
    isReply,
    prefix,
    remoteJid,
    replyJid,
    userJid,
  } = extractDataFromMessage(webMessage);

  if (!remoteJid) {
    return null;
  }
  // Detección de tipos de medios
  const isImage = baileysIs(webMessage, "image");
  const isVideo = baileysIs(webMessage, "video");
  const isSticker = baileysIs(webMessage, "sticker");
  const isAudio = baileysIs(webMessage, "audio");
  const isDocument = baileysIs(webMessage, "document");

  // Funciones para descargar los archivos según el tipo
  const downloadImage = async (webMessage, fileName) => {
    return await download(webMessage, fileName, "image", "png");
  };

  const downloadSticker = async (webMessage, fileName) => {
    return await download(webMessage, fileName, "sticker", "webp");
  };

  const downloadVideo = async (webMessage, fileName) => {
    return await download(webMessage, fileName, "video", "mp4");
  };

  const downloadAudio = async (webMessage, fileName) => {
    return await download(webMessage, fileName, "audio", "mp3");
  };

  const downloadDocument = async (webMessage, fileName) => {
    return await download(webMessage, fileName, "document", "pdf");
  };

  // Función para manejar los medios si se activa
  const handleMediaMessage = async (processMedia) => {
    if (!processMedia) return; // Solo procesa si se activa específicamente

    if (isImage) {
      console.log("Procesando imagen...");
      const imagePath = await downloadImage(webMessage, "image");
      return { type: "image", path: imagePath };
    }

    if (isVideo) {
      console.log("Procesando video...");
      const videoPath = await downloadVideo(webMessage, "video");
      return { type: "video", path: videoPath };
    }

    if (isAudio) {
      console.log("Procesando audio...");
      const audioPath = await downloadAudio(webMessage, "audio");
      return { type: "audio", path: audioPath };
    }

    if (isSticker) {
      console.log("Procesando sticker...");
      const stickerPath = await downloadSticker(webMessage, "sticker");
      return { type: "sticker", path: stickerPath };
    }

    if (isDocument) {
      console.log("Procesando documento...");
      const documentPath = await downloadDocument(webMessage, "document");
      return { type: "document", path: documentPath };
    }

    console.log("No se detectó ningún tipo de medio.");
    return null;
  };

  // Funciones para enviar textos y respuestas
  const sendText = async (text, mentions) => {
    let optionalParams = {};

    if (mentions?.length) {
      optionalParams = { mentions };
    }

    return await socket.sendMessage(remoteJid, {
      text: `${text}`,
      ...optionalParams,
    });
  };

  // Función para enviar respuesta a un mensaje
  const sendReply = async (text) => {
    return await socket.sendMessage(
      remoteJid,
      { text: `${text}` },
      { quoted: webMessage }
    );
  };

  // Funciones para reacciones comunes
  const sendReact = async (emoji) => {
    return await socket.sendMessage(remoteJid, {
      react: {
        text: emoji,
        key: webMessage.key,
      },
    });
  };

  const sendSuccessReact = async () => {
    return await sendReact("✅");
  };

  const sendPuzzleReact = async () => {
    return await sendReact("🧩");
  };

  const sendMusicReact = async () => {
    return await sendReact("🎵");
  };

const sendBasuraReact = async () => {
    return await sendReact("🗑️");
  };
  
  const sendWarningReply = async (text) => {
    await sendWarningReact();
    return await sendReply(`⚠️ Advertencia! ${text}`);
  };

  const sendWarningReact = async () => {
    return await sendReact("⚠️");
  };

  const sendWelcomeReact = async () => {
    return await sendReact("🫂");
  };
  
  const sendWaitReact = async () => {
    return await sendReact("⏳");
  };

  const sendErrorReact = async () => {
    return await sendReact("❌");
  };

const sendLinkReact = async () => {
    return await sendReact("🔗");
  };
  
  const sendSuccessReply = async (text) => {
    await sendSuccessReact();
    return await sendReply(`👻 ${text}`);
  };

  const sendWaitReply = async (text) => {
    await sendWaitReact();
    return await sendReply(`⏳ Espera! ${text || waitMessage}`);
  };

  const sendErrorReply = async (text) => {
    await sendErrorReact();
    return await sendReply(`☠ Error! ${text}`);
  };

  const sendAudioFromURL = async (url) => {
    try {
      console.log(`Enviando audio desde URL: ${url}`);
      return await socket.sendMessage(
        remoteJid,
        {
          audio: { url },
          mimetype: "audio/mpeg",
        },
        { quoted: webMessage }
      );
    } catch (error) {
      console.error("Error al enviar el audio:", error);
      throw new Error("No se pudo enviar el audio.");
    }
  };

  const sendVideoFromURL = async (url) => {
    console.log(`Enviando video desde URL: ${url}`);
    return await socket.sendMessage(
      remoteJid,
      {
        video: { url },
      },
      { quoted: webMessage }
    );
  };

  const sendStickerFromFile = async (file) => {
    if (!fs.existsSync(file)) {
      throw new Error(`El archivo ${file} no existe`);
    }

    const fileType = file.split('.').pop();
    if (fileType !== 'png' && fileType !== 'webp') {
      throw new Error(`El archivo ${file} no es un PNG o WEBP`);
    }

    return await socket.sendMessage(remoteJid, {
      sticker: fs.readFileSync(file),
    }, {
      quoted: webMessage
    });
  };

  const sendStickerFromURL = async (url) => {
    return await socket.sendMessage(
      remoteJid,
      {
        sticker: { url },
      },
      { quoted: webMessage }
    );
  };

  const sendMessage = async ({ messageType, caption = '', mimetype = '', url = '', text = '' }) => {
  try {
    let messageContent = {};

    if (messageType === 'audio') {
      messageContent = { audio: { url }, mimetype };
    } else if (messageType === 'video') {
      messageContent = { video: { url }, caption, mimetype };
    } else if (messageType === 'image') {
      messageContent = { image: { url }, caption, mimetype };
    } else if (messageType === 'text') {
      messageContent = { text: `${text}`, url };  // Aquí enviamos el enlace directamente
    }

    await socket.sendMessage(remoteJid, messageContent, { quoted: webMessage });
    console.log(`${messageType} enviado con éxito.`);
  } catch (error) {
    console.error(`Error al enviar el mensaje de tipo ${messageType}:`, error);
  }
};

  const sendVideoFromFile = async (filePath, caption = '') => {
    console.log(`Enviando video desde archivo: ${filePath}`);
    return await socket.sendMessage(
      remoteJid,
      {
        video: fs.readFileSync(filePath),
        caption: caption,
      },
      { quoted: webMessage }
    );
  };

  const sendImageFromFile = async (file, caption = "") => {
    return await socket.sendMessage(
      remoteJid,
      {
        image: fs.readFileSync(file),
        caption: caption ? `${caption}` : "",
      },
      { quoted: webMessage }
    );
  };

  const sendImageFromURL = async (url, caption = "") => {
    return await socket.sendMessage(
      remoteJid,
      {
        image: { url },
        caption: caption ? `${caption}` : "",
      },
      { url, quoted: webMessage }
    );
  };

  const sendReplyWithButton = async (text, buttons) => {
  const buttonMessage = {
    text: text,  // El texto del mensaje
    footer: "",   // Pie de página opcional
    buttons: buttons, // Los botones
    headerType: 1,  // Tipo de cabecera, puede ser 1 (solo texto) o 2 (con botones)
  };

  // Enviar el mensaje con los botones
  return await socket.sendMessage(remoteJid, buttonMessage, { quoted: webMessage });
};

  const sendReplyWithLink = async (text, link) => {
    return await socket.sendMessage(
      remoteJid,
      {
        text: `${text}`,
        url: link,
      },
      { quoted: webMessage }
    );
  };
  
  const sendQuotedMessage = async (text, contextInfo) => {
return await socket.sendMessage(remoteJid, { text, contextInfo }, { quoted: webMessage });
};

const sendLinkWithDelay = async (socket, remoteJid, webMessage, link, text) => {
  try {
    // Enviar el enlace con un pequeño retraso para permitir la previsualización
    await new Promise(resolve => setTimeout(resolve, 500));  // Espera de 500ms
    return await socket.sendMessage(
      remoteJid,
      {
        text: `${text}\n${link}`,
      },
      { quoted: webMessage }
    );
  } catch (error) {
    console.error("Error al enviar el enlace con retraso:", error);
  }
};

  return {
    args,
    sendQuotedMessage,
    commandName,
    downloadImage,
    downloadSticker,
    downloadVideo,
    downloadAudio,
    downloadDocument,
    fullArgs,
    fullMessage,
    handleMediaMessage,
    isReply,
    isSticker,
    isVideo,
    isAudio,
    isImage,
    isDocument,
    prefix,
    remoteJid,
    replyJid,
    sendText,
    sendReply,
    socket,
    userJid,
    webMessage,
    sendReact,
    sendPuzzleReact,
    sendImageFromFile,
    sendImageFromURL,
    sendSuccessReact,
    sendMusicReact,
    sendWarningReply,
    sendWarningReact,
    sendWaitReact,
    sendErrorReact,
    sendLinkReact,
    sendSuccessReply,
    sendWaitReply,
    sendErrorReply,
    sendLinkWithDelay,
    sendAudioFromURL,
    sendVideoFromURL,
    sendStickerFromFile,
    sendReplyWithLink,
    sendWelcomeReact,
    sendStickerFromURL,
    sendBasuraReact,
    sendMessage,
    sendVideoFromFile,
    sendReplyWithButton,
  };
};
