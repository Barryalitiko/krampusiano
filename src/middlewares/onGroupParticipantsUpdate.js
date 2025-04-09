const { getProfileImageData } = require("../services/baileys");
const fs = require("fs");
const path = require("path");
const { onlyNumbers } = require("../utils");
const { isActiveWelcomeGroup, getWelcomeMode, isActiveGoodbyeGroup } = require("../utils/database");
const { warningLog } = require("../utils/logger");

exports.onGroupParticipantsUpdate = async ({ groupParticipantsUpdate, socket }) => {
    const remoteJid = groupParticipantsUpdate.id;
    const userJid = groupParticipantsUpdate.participants[0];

    // Comprobación de bienvenida
    if (isActiveWelcomeGroup(remoteJid)) {
        const welcomeMode = getWelcomeMode(remoteJid);

        if (groupParticipantsUpdate.action === "add") {
            try {
                let buffer = null;
                let profileImage = null;

                if (welcomeMode === "2") {
                    // Si el modo es 2, obtenemos la imagen de perfil
                    ({ buffer, profileImage } = await getProfileImageData(socket, userJid));
                }

                const welcomeMessage = `¡𝗕𝗶𝗲𝗻𝘃𝗲𝗻𝗶𝗱@ 𝗮𝗹 𝗴𝗿𝘂𝗽𝗼! @${userJid ? onlyNumbers(userJid) : ''}\n\nPresentate ᶜᵒⁿ 𝐟𝐨𝐭𝐨 y 𝐧𝐨𝐦𝐛𝐫𝐞\n> Bot by Krampus OM Oᴘᴇʀᴀᴄɪᴏɴ Mᴀʀsʜᴀʟʟ ༴༎𝙾𝙼༎\n> https://www.instagram.com/p/DGjMug8shLI/?igsh=MXMzaGN0NjJ1MDkxMw==`;

                const fakeQuoted = {
                    key: {
                        remoteJid: remoteJid,
                        fromMe: false,
                        id: "FAKE-WELCOME",
                        participant: "0@s.whatsapp.net",
                    },
                    message: {
                        conversation: "✨ Bienvenid@ ✨",
                    },
                };

                if (welcomeMode === "2") {
                    await socket.sendMessage(remoteJid, {
                        image: buffer,
                        caption: welcomeMessage,
                        mentions: [userJid],
                    }, { quoted: fakeQuoted });

                    if (profileImage && !profileImage.includes("default-user")) {
                        fs.unlinkSync(profileImage); // Elimina la imagen descargada
                    }
                } else {
                    await socket.sendMessage(remoteJid, {
                        text: welcomeMessage,
                        mentions: [userJid],
                    });
                }
            } catch (error) {
                warningLog("👻 𝙺𝚛𝚊𝚖𝚙𝚞𝚜.𝚋𝚘𝚝 👻 No se pudo enviar el mensaje de Bienvenida");
            }
        }
    }

    // Comprobación de despedida
    if (isActiveGoodbyeGroup(remoteJid)) {
        if (groupParticipantsUpdate.action === "remove") {
            try {
                const goodbyeMessage = `> ¿Que esta pasando aqui?\nDe tanto llorar @${userJid ? onlyNumbers(userJid) : ''} salio del grupo 💔😞`;

                await socket.sendMessage(remoteJid, {
                    text: goodbyeMessage,
                    mentions: [userJid],
                });
            } catch (error) {
                warningLog("👻 𝙺𝚛𝚊𝚖𝚙𝚞𝚜.𝚋𝚘𝚝 👻 No se pudo enviar el mensaje de Despedida");
            }
        }
    }
};
