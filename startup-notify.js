const fs = require('fs')
const path = require('path')

const DESTINO = '4915124477722@s.whatsapp.net'
const CARPETA_CONTENIDO = path.join(__dirname, 'M44')
const ARCHIVOS_IMAGEN = new Set(['.jpg', '.jpeg', '.png', '.webp'])

function leerContenidoInicio() {
  const rutaTexto = path.join(CARPETA_CONTENIDO, 'texto.txt')
  if (!fs.existsSync(rutaTexto)) {
    throw new Error(`Falta el archivo ${rutaTexto}`)
  }

  const texto = fs.readFileSync(rutaTexto, 'utf8').trim()
  if (!texto) throw new Error(`El archivo ${rutaTexto} está vacío`)

  const nombreImagen = fs.readdirSync(CARPETA_CONTENIDO)
    .filter(nombre => ARCHIVOS_IMAGEN.has(path.extname(nombre).toLowerCase()))
    .sort((a, b) => a.localeCompare(b))[0]
  if (!nombreImagen) {
    throw new Error(`No hay imagen JPG, PNG o WEBP en ${CARPETA_CONTENIDO}`)
  }

  return {
    image: fs.readFileSync(path.join(CARPETA_CONTENIDO, nombreImagen)),
    caption: texto
  }
}

module.exports = function configurarAvisoInicial(sock) {
  let envioEnCurso = false
  let enviado = false

  sock.ev.on('connection.update', async ({ connection }) => {
    if (connection !== 'open' || envioEnCurso || enviado) return

    envioEnCurso = true
    try {
      const contenido = leerContenidoInicio()
      await sock.sendMessage(DESTINO, contenido)
      enviado = true
      console.log('✅ Texto e imagen de inicio enviados al destino.')
    } catch (error) {
      console.error('❌ No se pudo enviar el aviso inicial:', error)
      envioEnCurso = false
    }
  })
}
