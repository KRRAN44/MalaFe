module.exports = {
    name: 'ver',
    aliases: ['readviewonce', 'read'],

    // Reacciona con este emoji desde el propio número del bot.
    reaction: '👁️',

    async execute({ sock, message, jid, targetMessage }) {
        if (!targetMessage?.message) {
            return sock.sendMessage(jid, {
                text: '⚠️ No encontré el mensaje al que reaccionaste. Si el bot se reinició, vuelve a recibir el mensaje y reacciona otra vez.'
            });
        }

        // El mensaje reaccionado es directamente el mensaje objetivo.
        let content = targetMessage.message;

        // Desenvuelve mensajes efímeros y de una sola vista.
        while (content?.ephemeralMessage?.message ||
               content?.viewOnceMessage?.message ||
               content?.viewOnceMessageV2?.message ||
               content?.viewOnceMessageV2Extension?.message) {
            content = content.ephemeralMessage?.message ||
                content.viewOnceMessage?.message ||
                content.viewOnceMessageV2?.message ||
                content.viewOnceMessageV2Extension?.message;
        }

        const mediaType = content?.imageMessage
            ? 'imageMessage'
            : content?.videoMessage
                ? 'videoMessage'
                : null;

        if (!mediaType) {
            return sock.sendMessage(jid, {
                text: '⚠️ El mensaje al que reaccionaste no es una imagen o video de una sola vista compatible.'
            });
        }

        try {
            const { downloadMediaMessage } = await import('@whiskeysockets/baileys');

            const media = await downloadMediaMessage(targetMessage, 'buffer', {});

            if (!media) {
                return sock.sendMessage(jid, {
                    text: '⚠️ No pude descargar el contenido. Intenta reaccionar nuevamente al mensaje.'
                });
            }

            const mediaContent = content[mediaType];
            const caption = mediaContent.caption || '';

            const payload = mediaType === 'imageMessage'
                ? { image: media, caption }
                : { video: media, caption };

            await sock.sendMessage(jid, payload);
        } catch (error) {
            console.error('Error al recuperar el mensaje de una sola vista:', error);
            await sock.sendMessage(jid, {
                text: '❌ No pude descargar el contenido. Intenta reaccionar directamente al mensaje de una sola vista.'
            });
        }
    }
};
