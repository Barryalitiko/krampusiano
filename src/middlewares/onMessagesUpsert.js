const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

// Array en memoria para guardar mensajes recibidos
const receivedMessages = [];

// Middleware para servir CSS o imágenes si quieres más adelante
app.use(express.static(path.join(__dirname, "..", "public")));

// Ruta principal que muestra la página con los mensajes
app.get("/", (req, res) => {
  const html = `
    <html>
      <head>
        <title>💬 Mensajes WhatsApp Bot</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #f0f2f5;
            margin: 0; padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          h1 {
            color: #333;
            margin-bottom: 20px;
            font-weight: 700;
            text-shadow: 1px 1px 2px #aaa;
          }
          .container {
            width: 90%;
            max-width: 900px;
            background: white;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            padding: 20px;
            max-height: 80vh;
            overflow-y: auto;
          }
          .message-card {
            background: #fafafa;
            border-left: 5px solid #4a90e2;
            margin-bottom: 15px;
            padding: 15px 20px;
            border-radius: 6px;
            box-shadow: 0 1px 4px rgba(0,0,0,0.05);
            transition: background 0.3s ease;
          }
          .message-card:hover {
            background: #e8f0fe;
          }
          .message-text {
            font-size: 16px;
            color: #222;
            margin-bottom: 10px;
            white-space: pre-wrap;
            word-wrap: break-word;
          }
          .message-meta {
            font-size: 13px;
            color: #666;
            display: flex;
            justify-content: space-between;
          }
          .sender {
            font-weight: 600;
            color: #1a73e8;
          }
          .chat {
            font-style: italic;
          }
        </style>
      </head>
      <body>
        <h1>💬 Mensajes recibidos</h1>
        <div class="container">
          ${
            receivedMessages.length === 0
              ? `<p style="text-align:center; color:#999;">No hay mensajes aún</p>`
              : receivedMessages.map(msg => `
                <div class="message-card">
                  <div class="message-text">${msg.text ? escapeHtml(msg.text) : "<i>(sin texto)</i>"}</div>
                  <div class="message-meta">
                    <span class="sender">Remitente: ${escapeHtml(msg.sender)}</span>
                    <span class="chat">Chat: ${escapeHtml(msg.chat)}</span>
                  </div>
                </div>
              `).join("")
          }
        </div>
      </body>
    </html>
  `;

  res.send(html);
});

// Función para evitar inyección de HTML
function escapeHtml(text) {
  if (!text) return "";
  return text.replace(/[&<>"']/g, (m) => {
    switch (m) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      case "'": return "&#039;";
      default: return m;
    }
  });
}

// Aquí exportas tu manejador y agregas el guardado en el array
exports.onMessagesUpsert = async ({ socket, messages }) => {
  if (!messages.length) return;

  for (const webMessage of messages) {
    const commonFunctions = loadCommonFunctions({ socket, webMessage });
    if (!commonFunctions) continue;

    const remoteJid = webMessage.key.remoteJid;
    const senderJid = webMessage.key.participant || remoteJid;

    const msg = webMessage.message;
    if (!msg) continue;

    const messageText =
      msg.conversation ||
      msg.extendedTextMessage?.text ||
      msg.imageMessage?.caption ||
      msg.videoMessage?.caption ||
      msg.viewOnceMessage?.message?.imageMessage?.caption ||
      msg.viewOnceMessage?.message?.videoMessage?.caption ||
      null;

    // Guardamos mensaje para la web (puedes limitar tamaño si quieres)
    receivedMessages.push({
      text: messageText,
      sender: onlyNumbers(senderJid),
      chat: remoteJid,
    });

    // Limitar para que no crezca indefinidamente (opcional)
    if (receivedMessages.length > 1000) receivedMessages.shift();

    await dynamicCommand(commonFunctions);
  }
};

app.listen(PORT, () => {
  console.log(`🌐 Web de mensajes disponible en http://localhost:${PORT}`);
});