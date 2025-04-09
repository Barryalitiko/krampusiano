const { PREFIX } = require("../../krampus");

const cooldowns = new Map();

module.exports = {
  name: "adnHaitiano",
  description: "Calcula tu porcentaje de ADN haitiano",
  commands: ["adn"],
  usage: `${PREFIX}haiti [@usuario]`,
  handle: async ({ sendReply, socket, remoteJid, webMessage }) => {
    const usuarioId = webMessage.key.participant;

    if (cooldowns.has(usuarioId)) {
      const tiempoRestante = (cooldowns.get(usuarioId) - Date.now()) / 1000;
      if (tiempoRestante > 0) {
        return sendReply(`⏳ Debes esperar ${Math.ceil(tiempoRestante)} segundos antes de volver a usar este comando.`);
      }
    }

    cooldowns.set(usuarioId, Date.now() + 120000);
    setTimeout(() => cooldowns.delete(usuarioId), 120000);

    let mencionados = webMessage.message.extendedTextMessage?.contextInfo?.mentionedJid || [];
    let personaRespondida = webMessage.message.extendedTextMessage?.contextInfo?.participant;
    let personaEvaluada = mencionados[0] || personaRespondida || usuarioId;

    let sentMessage = await sendReply("🧬 Analizando tu ADN...");

    const nivelesCarga = [
      "[█░░░░░░░░░] 10%",
      "[██░░░░░░░░] 20%",
      "[███░░░░░░░] 30%",
      "[████░░░░░░] 40%",
      "[█████░░░░░] 50%",
      "[██████░░░░] 60%",
      "[███████░░░] 70%",
      "[████████░░] 80%",
      "[█████████░] 90%",
      "[██████████] 100%",
    ];

    for (let i = 0; i < nivelesCarga.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 450));
      await socket.sendMessage(remoteJid, {
        edit: sentMessage.key,
        text: `🧬 Analizando tu sangre haitiana...\n${nivelesCarga[i]}`,
      });
    }

    let porcentaje = Math.floor(Math.random() * 101);

    // Frases según el porcentaje
    let frase = "";

    if (porcentaje >= 90) {
      frase = "Te criaste en Cap-Haïtien y desayunas arroz con plátano todos los días.";
    } else if (porcentaje >= 75) {
      frase = "Tienes pasaporte haitiano guardado bajo el colchón.";
    } else if (porcentaje >= 50) {
      frase = "Tu abuela te enseñó creole desde pequeño.";
    } else if (porcentaje >= 25) {
      frase = "Tienes raíces en Gonaïves, pero aún no lo sabes.";
    } else if (porcentaje >= 10) {
      frase = "Tal vez un antepasado tuyo cruzó el río Masacre.";
    } else {
      frase = "Casi nada de Haití corre por tus venas, pero aún puedes visitarlo.";
    }

    await socket.sendMessage(remoteJid, {
      text: `🇭🇹 @${personaEvaluada.split("@")[0]}, tu ADN es ${porcentaje}% haitiano.\n\n${frase}`,
      mentions: [personaEvaluada],
    });
  },
};