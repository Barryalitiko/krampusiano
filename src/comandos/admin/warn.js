const fs = require('fs');
const path = require('path');
const { PREFIX } = require("../../krampus");

// Ruta del archivo donde se guardan las advertencias
const warningsFile = path.join(__dirname, "../../assets/warnings.json");

// Cargar advertencias desde un archivo
let warnings = {};
if (fs.existsSync(warningsFile)) {
  warnings = JSON.parse(fs.readFileSync(warningsFile, 'utf-8'));
}

module.exports = {
  name: 'warn',
  description: 'Sistema de advertencias para usuarios',
  commands: ['warn', 'warnlist', 'warnreset', 'warnclear'],
  usage: `${PREFIX}warn @usuario\n${PREFIX}warnreset @usuario\n${PREFIX}warnlist\n${PREFIX}warnclear`,
  handle: async ({ args, remoteJid, sendReply, socket, webMessage, mentions }) => {
    const command = args[0]?.toLowerCase();

    switch (command) {
      case 'list':
        await handleWarnList(remoteJid, sendReply, socket);
        break;
      case 'reset':
        await handleWarnReset(remoteJid, args, sendReply, mentions, webMessage);
        break;
      case 'clear':
        await handleWarnClear(remoteJid, sendReply);
        break;
      default:
        await handleWarn(remoteJid, sendReply, socket, webMessage, mentions);
    }

    saveWarnings();
  },
};

async function handleWarn(remoteJid, sendReply, socket, webMessage, mentions) {
  let userId = mentions[0];

  if (!userId && webMessage?.message?.extendedTextMessage?.contextInfo?.participant) {
    userId = webMessage.message.extendedTextMessage.contextInfo.participant;
  }

  if (!userId) {
    sendReply('Por favor, menciona al usuario o responde a su mensaje para advertirlo.');
    return;
  }

  // Obtener el nombre del usuario
  const participant = await socket.groupMetadata(remoteJid);
  const user = participant.participants.find(p => p.id === userId);
  const userName = user?.name || userId.split('@')[0]; // Usar nombre, si está disponible, o el ID

  if (!warnings[remoteJid]) warnings[remoteJid] = {};
  warnings[remoteJid][userId] = (warnings[remoteJid][userId] || 0) + 1;

  const userWarnings = warnings[remoteJid][userId];
  sendReply(`⚠️ ${userName} ha recibido una advertencia. Advertencias acumuladas: ${userWarnings}/3.`);

  if (userWarnings >= 3) {
    sendReply(`🚨 ${userName} ha sido expulsado por acumular 3 advertencias.`);
    await socket.groupParticipantsUpdate(remoteJid, [userId], 'remove');
    delete warnings[remoteJid][userId]; // Limpiar advertencias tras la expulsión
  }
}

async function handleWarnList(remoteJid, sendReply, socket) {
  if (!warnings[remoteJid] || Object.keys(warnings[remoteJid]).length === 0) {
    sendReply('No hay usuarios con advertencias en este grupo.');
    return;
  }

  const participant = await socket.groupMetadata(remoteJid);
  const warnList = Object.entries(warnings[remoteJid])
    .map(([userId, count], index) => {
      const user = participant.participants.find(p => p.id === userId);
      const userName = user?.name || userId.split('@')[0]; // Nombre si disponible, o ID
      return `${index + 1}. ${userName} - ${count} advertencias`;
    })
    .join('\n');

  sendReply(`Lista de usuarios advertidos:\n${warnList}`);
}

async function handleWarnReset(remoteJid, args, sendReply, mentions, webMessage) {
  let userId = mentions[0];

  if (!userId && webMessage?.message?.extendedTextMessage?.contextInfo?.participant) {
    userId = webMessage.message.extendedTextMessage.contextInfo.participant;
  }

  if (!userId) {
    sendReply('Por favor, menciona o responde al usuario cuyas advertencias deseas restablecer.');
    return;
  }

  const participant = await socket.groupMetadata(remoteJid);
  const user = participant.participants.find(p => p.id === userId);
  const userName = user?.name || userId.split('@')[0]; // Nombre si disponible, o ID

  if (warnings[remoteJid] && warnings[remoteJid][userId]) {
    delete warnings[remoteJid][userId];
    sendReply(`✅ Advertencias de ${userName} restablecidas.`);
  } else {
    sendReply(`ℹ️ ${userName} no tiene advertencias registradas.`);
  }
}

async function handleWarnClear(remoteJid, sendReply) {
  if (warnings[remoteJid]) {
    delete warnings[remoteJid];
    sendReply('✅ Todas las advertencias del grupo han sido borradas.');
  } else {
    sendReply('ℹ️ No hay advertencias registradas en este grupo.');
  }
}

function saveWarnings() {
  fs.writeFileSync(warningsFile, JSON.stringify(warnings, null, 2), 'utf-8');
}