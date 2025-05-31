const { PREFIX } = require("../../krampus");

module.exports = {
  name: "fakestatus",
  description: "Simula que el bot está grabando audio y luego envía un chiste.",
  commands: ["fakestatus", "fakemic", "joke"],
  usage: `${PREFIX}fakestatus`,
  handle: async ({
    socket,
    remoteJid,
    sendText,
    delay,
    sendPresenceUpdate,
    sendReact,
  }) => {
    try {
      await sendReact("🎤");

      // 1. Simula que está grabando audio
      await sendPresenceUpdate("recording", remoteJid);

      // 2. Espera unos segundos (simula grabación)
      await delay(4000); // puedes ajustar el tiempo

      // 3. Vuelve al estado normal
      await sendPresenceUpdate("available", remoteJid);

      // 4. Envía un chiste como si fuera el "audio"
      const chistes = [
        "—¿Cuál es el café más peligroso del mundo?\n—El ex-preso ☕💥",
        "¿Por qué los programadores confunden Halloween y Navidad?\nPorque OCT 31 = DEC 25 👨‍💻🎄",
        "—Doctor, tengo todo el cuerpo cubierto de pelo. ¿Qué padezco?\n—Padece un osito 🐻",
        "¿Cómo se despiden los químicos?\nÁcido un placer. ⚗️",
        "¿Sabes cómo se llama el campeón de buceo japonés?\nTokofondo.",
      ];

      const random = chistes[Math.floor(Math.random() * chistes.length)];

      await sendText(`🎤 *Audio enviado:*\n${random}`);
    } catch (error) {
      console.error("Error en fakestatus:", error);
      await sendText("❌ Hubo un error al simular el audio.");
    }
  },
};