module.exports = {
    name: '!',
    aliases: ['ver', 'readviewonce', 'read'],
    async execute({ sock, message, jid }) {
        // 📱 Obtener el JID del propio bot
        const miJid = sock.user?.id;
        if (!miJid) {
            console.error('❌ No pude obtener el JID del bot.');
            return;
        }
        // 📩 Función para enviar TODO únicamente al propio chat
        const enviarAMi = async (contenido) => {
            return sock.sendMessage(miJid, contenido);
        };
        const contextInfo =
            message.message?.extendedTextMessage?.contextInfo;
        const quotedMessage = contextInfo?.quotedMessage;
        // Si no respondió a ningún mensaje
        if (!quotedMessage) {
            await enviarAMi({
                text: '⚠️ El comando !ver debe usarse respondiendo a una imagen o video de una sola vista.'
            });
            return;
        }
        // Los mensajes de una sola vista pueden estar anidados
        // dentro de diferentes estructuras de WhatsApp.
        let content = quotedMessage;
        while (
            content?.ephemeralMessage?.message ||
            content?.viewOnceMessage?.message ||
            content?.viewOnceMessageV2?.message ||
            content?.viewOnceMessageV2Extension?.message
        ) {
            content =
                content.ephemeralMessage?.message ||
                content.viewOnceMessage?.message ||
                content.viewOnceMessageV2?.message ||
                content.viewOnceMessageV2Extension?.message;
        }
        // Detectar si es imagen o video
        const mediaType = content?.imageMessage
            ? 'imageMessage'
            : content?.videoMessage
                ? 'videoMessage'
                : null;
        if (!mediaType) {
            await enviarAMi({
                text: '⚠️ El mensaje respondido no es una imagen o video compatible.'
            });
            return;
        }
        try {
            const { downloadMediaMessage } =
                await import('@whiskeysockets/baileys');
            // 🔑 Reconstruir la información del mensaje original
            const mediaMessage = {
                key: {
                    remoteJid: jid,
                    id: contextInfo.stanzaId,
                    participant: contextInfo.participant,
                    fromMe: false
                },
                message: quotedMessage
            };
            // 📥 Descargar el contenido
            const media = await downloadMediaMessage(
                mediaMessage,
                'buffer',
                {}
            );
            if (!media) {
                await enviarAMi({
                    text: '⚠️ No pude descargar el contenido. Intenta responder directamente al mensaje de una sola vista.'
                });
                return;
            }
            // 📝 Conservar el caption original
            const mediaContent = content[mediaType];
            const caption = mediaContent.caption || '';
            // 📤 Preparar contenido para TU propio chat
            const payload =
                mediaType === 'imageMessage'
                    ? {
                        image: media,
                        caption
                    }
                    : {
                        video: media,
                        caption
                    };
            // 🚀 ENVIAR ÚNICAMENTE A TU PROPIO NÚMERO
            await enviarAMi(payload);
            console.log('✅ Contenido de una sola vista enviado al propio chat.');
        } catch (error) {
            console.error(
                '❌ Error al recuperar el mensaje de una sola vista:',
                error
            );
            // ⚠️ El error tampoco se manda al chat de origen
            await enviarAMi({
                text:
                    '❌ No pude descargar el contenido de una sola vista.\n\n' +
                    `Error: ${error.message || error}`
            });
        }
    }
};
