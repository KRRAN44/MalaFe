const fs = require('fs')
const path = require('path')

const DESTINO = '523334445555@s.whatsapp.net'
const MARCA_PATH = path.join(__dirname, 'aviso-inicial-enviado.json')
let envioEnCurso = false

module.exports = function configurarAvisoInicial(sock) {
  sock.ev.on('connection.update', async ({ connection }) => {
    if (connection !== 'open' || envioEnCurso || fs.existsSync(MARCA_PATH)) {
      return
    }

    envioEnCurso = true
    try {
      await sock.sendMessage(DESTINO, {
        text: '✅ El bot se inició y quedó conectado correctamente.'
      })
      fs.writeFileSync(
        MARCA_PATH,
        JSON.stringify({ enviado: true, fecha: new Date().toISOString() }, null, 2),
        'utf8'
      )
      console.log('✅ Aviso inicial enviado al destino.')
    } catch (error) {
      console.error('❌ No se pudo enviar el aviso inicial:', error)
      envioEnCurso = false
    }
  })
}
