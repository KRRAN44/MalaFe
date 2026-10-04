let spamActivo = {};

module.exports = {
    name: '8',
    aliases: ['spam'],

    async execute({ sock, message, jid }) {
        // El mensaje que va a spamear (puedes cambiarlo)
        const mensajeSpam = '𝐒𝟕$𝐊𝐈𝐋𝐋𝗘𝐑 〽️😂/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n/n';
        
        // Intervalo en milisegundos (1000 = 1 segundo)
        const intervalo = 760;

        if (!spamActivo[jid]) {
            // ACTIVAR spam
            spamActivo[jid] = setInterval(async () => {
                try {
                    await sock.sendMessage(jid, { text: mensajeSpam });
                } catch (error) {
                    console.error('Error en spam:', error);
                }
            }, intervalo);

            await sock.sendMessage(jid, {
                text: `𝐒𝟕$𝐊𝐈𝐋𝐋𝗘𝐑 〽️😂`
            });
        } else {
            // DESACTIVAR spam
            clearInterval(spamActivo[jid]);
            spamActivo[jid] = null;

            await sock.sendMessage(jid, {
                text: '🌴'
            });
        }
    }
};