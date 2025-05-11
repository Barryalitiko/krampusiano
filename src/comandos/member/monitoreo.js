const { PREFIX } = require("../../krampus");
const os = require("os");
const si = require("systeminformation");

const NUMERO_AUTORIZADO = "34624041420@s.whatsapp.net";

let monitoreando = false;
let intervalo = null;

async function obtenerInfoSistema() {
  const bateria = await si.battery();
  const cpuLoad = await si.currentLoad();
  const temp = await si.cpuTemperature();

  return `
*Estado del sistema:*
• Batería: ${typeof bateria.percent === "number" ? bateria.percent + "%" : "Desconocido"} ${bateria.isCharging ? "(Cargando)" : "(No cargando)"}
• CPU: ${typeof cpuLoad.avgload === "number" ? cpuLoad.avgload.toFixed(2) + "%" : "No disponible"}
• Temp CPU: ${typeof temp.main === "number" ? temp.main + "°C" : "No disponible"}
• RAM libre: ${(os.freemem() / 1024 / 1024).toFixed(0)} MB
  `.trim();
}

module.exports = {
  name: "monitorear",
  description: "Activa o desactiva el monitoreo del sistema cada 10 minutos. Solo el número autorizado recibe los mensajes.",
  commands: ["monitorear"],
  usage: `${PREFIX}monitorear`,
  handle: async ({ sendReply, sock, client }) => {
    // Fallback si sock no está definido
    const sendToAutorizado = async (text) => {
      if (client?.sendMessage) {
        return await client.sendMessage(NUMERO_AUTORIZADO, { text });
      } else if (sock?.sendMessage) {
        return await sock.sendMessage(NUMERO_AUTORIZADO, { text });
      } else {
        throw new Error("No se encontró un método válido para enviar mensajes (sock o client).");
      }
    };

    if (monitoreando) {
      clearInterval(intervalo);
      monitoreando = false;
      intervalo = null;
      await sendReply("Monitoreo *desactivado*.");
    } else {
      monitoreando = true;
      await sendReply("Monitoreo *activado*. Enviaré información del sistema cada 10 minutos a tu número autorizado.");

      const info = await obtenerInfoSistema();
      await sendToAutorizado(info);

      intervalo = setInterval(async () => {
        const info = await obtenerInfoSistema();
        await sendToAutorizado(info);
      }, 10 * 60 * 1000);
    }
  },
};