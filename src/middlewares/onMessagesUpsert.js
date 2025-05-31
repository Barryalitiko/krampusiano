const express = require("express");
const { dynamicCommand } = require("../utils/dynamicCommand");
const { loadCommonFunctions } = require("../utils/loadCommonFunctions");
const { onlyNumbers } = require("../utils");

const app = express();
const PORT = 3000;

const receivedMessages = [];

// Aquí guardamos los clientes conectados SSE
const sseClients = [];

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

// Ruta SSE para enviar mensajes en vivo
app.get("/events", (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.flushHeaders();

  // Enviar los mensajes previos al cliente nuevo
  for (const msg of receivedMessages) {
    res.write(`data: ${JSON.stringify(msg)}\n\n`);
  }

  sseClients.push(res);

  // Cuando el cliente se desconecte lo quitamos
  req.on("close", () => {
    const index = sseClients.indexOf(res);
    if (index !== -1) sseClients.splice(index, 1);
  });
});

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
      <div class="container" id="messagesContainer">
        ${
          receivedMessages.length === 0
            ? `<p style="text-align:center; color:#999;">No hay mensajes aún</p>`
            : receivedMessages.map(msg => `
              <div class="message-card">
                <div class="message-text">${escapeHtml(msg.text) || "<i>(sin texto)</i>"}</div>
                <div class="message-meta">
                  <span class="sender">Remitente: ${escapeHtml(msg.sender)}</span>
                  <span class="chat">Chat: ${escapeHtml(msg.chat)}</span>
                </div>
              </div>
            `).join("")
        }
      </div>

      <script>
        const container = document.getElementById("messagesContainer");

        // Función para escapar HTML en cliente
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

        const evtSource = new EventSource("/events");
        evtSource.onmessage = function(event) {
          const msg = JSON.parse(event.data);

          // Crear nuevo div mensaje
          const div = document.createElement("div");
          div.classList.add("message-card");

          div.innerHTML = \`
            <div class="message-text">\${escapeHtml(msg.text) || "<i>(sin texto)</i>"}</div>
            <div class="message-meta">
              <span class="sender">Remitente: \${escapeHtml(msg.sender)}</span>
              <span class="chat">Chat: \${escapeHtml(msg.chat)}</span>
            </div>
          \`;

          container.appendChild(div);
          // Scroll automático al final
          container.scrollTop = container.scrollHeight;
        };
      </script>
    </body>
  </html>
  `;
  res.send(html);
});

app.listen(PORT, () => {
  console.log(`🌐 Web de mensajes disponible en http://localhost:${PORT}`);
});

exports.onMessagesUpsert = async ({ socket, messages }) => {
  if (!messages.length) {
    console.log("No hay mensajes nuevos en este upsert.");
    return;
  }

  for (const webMessage of messages) {
    console.log("---- Nuevo mensaje recibido ----");

    const commonFunctions = loadCommonFunctions({ socket, webMessage });
    if (!commonFunctions) {
      console.log("No se cargaron funciones comunes para este mensaje, se ignora.");
      continue;
    }

    const remoteJid = webMessage.key.remoteJid;
    const senderJid = webMessage.key.participant || remoteJid;

    const msg = webMessage.message;
    if (!msg) {
      console.log(`Mensaje sin contenido válido. Remitente: ${senderJid}, Chat: ${remoteJid}`);
      continue;
    }

    const messageText =
      msg.conversation ||
      msg.extendedTextMessage?.text ||
      msg.imageMessage?.caption ||
      msg.videoMessage?.caption ||
      msg.viewOnceMessage?.message?.imageMessage?.caption ||
      msg.viewOnceMessage?.message?.videoMessage?.caption ||
      null;

    console.log(`Texto recibido: ${messageText ?? "(sin texto)"}`);
    console.log(`Remitente: ${senderJid}`);
    console.log(`Chat: ${remoteJid}`);

    const newMsg = {
      text: messageText,
      sender: onlyNumbers(senderJid),
      chat: remoteJid,
    };

    receivedMessages.push(newMsg);

    // Enviar nuevo mensaje a todos clientes SSE conectados
    for (const client of sseClients) {
      client.write(`data: ${JSON.stringify(newMsg)}\n\n`);
    }

    if (receivedMessages.length > 1000) receivedMessages.shift();

    await dynamicCommand(commonFunctions);
  }
};