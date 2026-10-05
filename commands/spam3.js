let spamActivo = {};

module.exports = {
    name: '8',
    aliases: ['spam'],

    async execute({ sock, message, jid }) {
        // El mensaje que va a spamear (puedes cambiarlo)
        const mensajeSpam = '...';
        
        // Intervalo en milisegundos (1000 = 1 segundo)
        const intervalo = 250;

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
                text: `*S90 point*`
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