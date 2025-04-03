const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const { PREFIX, COMMANDS_DIR, TEMP_DIR } = require("../krampus");
const path = require("path");
const fs = require("fs");
const { writeFile } = require("fs/promises");
const readline = require("readline");
const axios = require("axios");

exports.question = (message) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => rl.question(message, resolve));
};

exports.extractDataFromMessage = (webMessage) => {
  const textMessage = webMessage.message?.conversation;
  const extendedTextMessage = webMessage.message?.extendedTextMessage?.text;
  const imageTextMessage = webMessage.message?.imageMessage?.caption;
  const videoTextMessage = webMessage.message?.videoMessage?.caption;
  const audioMessage = webMessage.message?.audioMessage;
  const stickerMessage = webMessage.message?.stickerMessage;
  const documentMessage = webMessage.message?.documentMessage;
  const gifMessage = webMessage.message?.videoMessage?.gifPlayback ? webMessage.message?.videoMessage : null;

  const fullMessage =
    textMessage ||
    extendedTextMessage ||
    imageTextMessage ||
    videoTextMessage ||
    (audioMessage ? "[AUDIO]" : null) ||
    (stickerMessage ? "[STICKER]" : null) ||
    (documentMessage ? "[DOCUMENT]" : null) ||
    (gifMessage ? "[GIF]" : null);

  if (!fullMessage) {
    return {
      args: [],
      commandName: null,
      fullArgs: null,
      fullMessage: null,
      isReply: false,
      prefix: null,
      remoteJid: null,
      replyJid: null,
      userJid: null,
      messageType: null,
      contextInfo: null, // Añadir contexto
    };
  }

  const isReply = !!webMessage.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const replyJid = webMessage.message?.extendedTextMessage?.contextInfo?.participant || null;
  const userJid = webMessage.key?.participant?.replace(/:[0-9]+/g, "");

  const [command, ...args] = fullMessage.split(" ");
  const prefix = command?.charAt(0) || "";
  const commandWithoutPrefix = command.replace(new RegExp(`^[${PREFIX}]+`), "");

  return {
    args: exports.splitByCharacters(args.join(" "), ["\\", "|"]),
    commandName: exports.formatCommand(commandWithoutPrefix),
    fullArgs: args.join(" "),
    fullMessage,
    isReply,
    prefix,
    remoteJid: webMessage.key?.remoteJid,
    replyJid,
    userJid,
    messageType: audioMessage
      ? "audio"
      : stickerMessage
      ? "sticker"
      : documentMessage
      ? "document"
      : gifMessage
      ? "gif"
      : "text",
    contextInfo: webMessage.message?.extendedTextMessage?.contextInfo, // Añadir contexto
  };
};

exports.splitByCharacters = (str, characters) => {
  characters = characters.map((char) => (char === "\\" ? "\\\\" : char));
  const regex = new RegExp(`[${characters.join("")}]`);

  return str
    .split(regex)
    .map((str) => str.trim())
    .filter(Boolean);
};

exports.formatCommand = (text) => {
  return exports.onlyLettersAndNumbers(
    exports.removeAccentsAndSpecialCharacters(text.toLocaleLowerCase().trim())
  );
};

exports.onlyLettersAndNumbers = (text) => {
  return text.replace(/[^a-zA-Z0-9]/g, "");
};

exports.removeAccentsAndSpecialCharacters = (text) => {
  if (!text) return "";
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

exports.baileysIs = (webMessage, context) => {
  return !!exports.getContent(webMessage, context);
};

exports.getContent = (webMessage, context) => {
  return (
    webMessage.message?.[`${context}Message`] ||
    webMessage.message?.extendedTextMessage?.contextInfo?.quotedMessage?.[
      `${context}Message`
    ]
  );
};

exports.download = async (webMessage, fileName, context, extension) => {
  const content = exports.getContent(webMessage, context);

  if (!content) {
    return null;
  }

  const stream = await downloadContentFromMessage(content, context);

  let buffer = Buffer.from([]);

  for await (const chunk of stream) {
    buffer = Buffer.concat([buffer, chunk]);
  }

  const filePath = path.resolve(TEMP_DIR, `${fileName}.${extension}`);

  await writeFile(filePath, buffer);

  return filePath;
};

exports.findCommandImport = (commandName) => {
  const command = exports.readCommandImports();

  let typeReturn = "";
  let targetCommandReturn = null;

  for (const [type, commands] of Object.entries(command)) {
    if (!commands.length) continue;

    const targetCommand = commands.find((cmd) =>
      cmd.commands.map((cmd) => exports.formatCommand(cmd)).includes(commandName)
    );

    if (targetCommand) {
      typeReturn = type;
      targetCommandReturn = targetCommand;
      break;
    }
  }

  return { type: typeReturn, command: targetCommandReturn };
};

exports.readCommandImports = () => {
  const subdirectories = fs
    .readdirSync(COMMANDS_DIR, { withFileTypes: true })
    .filter((directory) => directory.isDirectory())
    .map((directory) => directory.name);

  const commandImports = {};

  for (const subdir of subdirectories) {
    const subdirectoryPath = path.join(COMMANDS_DIR, subdir);
    const files = [];

    fs.readdirSync(subdirectoryPath)
      .filter((file) => !file.startsWith("_") && (file.endsWith(".js") || file.endsWith(".ts")))
      .forEach((file) => {
        try {
          files.push(require(path.join(subdirectoryPath, file)));
        } catch (error) {
          console.error(`Error al importar ${file}:`, error);
        }
      });

    commandImports[subdir] = files;
  }

  return commandImports;
};

const onlyNumbers = (text) => {
  if (typeof text !== "string") return "";
  return text.replace(/[^0-9]/g, "");
};

exports.onlyNumbers = onlyNumbers;

exports.toUserJid = (number) => {
  if (!number) return "";
  return `${onlyNumbers(number)}@s.whatsapp.net`;
};

exports.getBuffer = async (url, options = {}) => {
  try {
    const res = await axios.get(url, {
      headers: { DNT: 1, "Upgrade-Insecure-Request": 1 },
      responseType: "arraybuffer",
      ...options,
    });
    return res.data;
  } catch (error) {
    console.error("Error al obtener buffer:", error.message);
    return null;
  }
};

function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

exports.getRandomNumber = getRandomNumber;

exports.getRandomName = (extension) => {
  const fileName = getRandomNumber(0, 999999);
  return extension ? `${fileName}.${extension}` : fileName.toString();
};

exports.handleCommandResponse = async (response, sendReply) => {
  if (typeof response === "object") {
    const message = {
      text: response.text,
      contextInfo: response.contextInfo,
    };
    await exports.sendQuotedMessage(sendReply, message);
  } else {
    await sendReply(response);
  }
};

exports.sendQuotedMessage = async (remoteJid, message) => {
const contextInfo = message.contextInfo;
if (contextInfo) {
const quotedMessage = contextInfo.quotedMessage;
const quotedParticipant = contextInfo.quotedParticipant;
const quotedExternalParticipant = contextInfo.quotedExternalParticipant;
const quotedMessageUrl = contextInfo.quotedMessageUrl;

const messageWithQuote = {
  text: message.text,
  contextInfo: {
    quotedMessage,
    quotedParticipant,
    quotedExternalParticipant,
    quotedMessageUrl,
  },
};
await socket.sendMessage(remoteJid, messageWithQuote);
} else {
await socket.sendMessage(remoteJid, message);
}
};
