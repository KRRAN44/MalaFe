const fs = require('fs');
const path = require('path');
let spamActivo = {};

module.exports = {
    name: '🔥',
    aliases: ['spam'],

    async execute({ sock, message, jid }) {
        // El mensaje que va a spamear (puedes cambiarlo)
        const mensajeSpam = fs.readFileSync(path.join(__dirname, '../DDS', 'fogo.txt'), 'utf-8');
     
        // Intervalo en milisegundos (1000 = 1 segundo)
        const intervalo = 444;

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
                text: `*这.⛩️ 🔥𝑿 𝑺 𝑻  🦉🥃./ ⛩️.*`
            });
        } else {
            // DESACTIVAR spam
            clearInterval(spamActivo[jid]);
            spamActivo[jid] = null;

            await sock.sendMessage(jid, {
                text: '*这.⛩️ 🔥𝑿 𝑺 𝑻  🦉🥃./ ⛩️.*'
            });
        }
    }
};
