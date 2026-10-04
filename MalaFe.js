// Si el Node instalado es muy viejo, avisar claro
const nodeVersion = process.versions.node
const [nodeMajor, nodeMinor] = nodeVersion.split('.').map(Number)
if (nodeMajor < 20 || (nodeMajor === 20 && nodeMinor < 9)) {
  console.error(
    `\n❌ Este bot necesita Node.js 20.9.0 o más nuevo (lo piden baileys y sharp).`
  )
  console.error(`   Tienes instalada la v${nodeVersion}.`)
  console.error(
    `   Descarga una versión más nueva en https://nodejs.org y vuelve a intentar.\n`
  )
  process.exit(1)
}
// bot tooru-mutsuki
const { Boom } = require('@hapi/boom')
const P = require('pino')
const fs = require('fs')
const path = require('path')
const readline = require('readline/promises')
const PREFIX = '!'
const REACCION_VER = '👀'
const logger = P({ level: 'silent' })
// Carpeta donde se guarda la sesión de WhatsApp
const AUTH_DIR = path.join(__dirname, '../auth_info')
// ======================================================
// CARGAR COMANDOS
// ======================================================
function loadCommands() {
  const commands = new Map()
  const commandsPath = path.join(__dirname, 'commands')
  function readFolder(folder) {
    if (!fs.existsSync(folder)) return
    for (const file of fs.readdirSync(folder)) {
      const filePath = path.join(folder, file)
      const stats = fs.statSync(filePath)
      if (stats.isDirectory()) {
        readFolder(filePath)
        continue
      }
      if (!file.endsWith('.js')) continue
      try {
        const command = require(filePath)
        if (
          !command.name ||
          typeof command.execute !== 'function'
        ) {
          console.log(`Comando ignorado: ${filePath}`)
          continue
        }
        commands.set(command.name.toLowerCase(), command)
        if (Array.isArray(command.aliases)) {
          for (const alias of command.aliases) {
            commands.set(alias.toLowerCase(), command)
          }
        }
      } catch (error) {
        console.error(
          `❌ Error cargando comando ${filePath}:`,
          error
        )
      }
    }
  }
  readFolder(commandsPath)
  console.log(`┗━━╸╸╸╸╸╸╸╸╸╸╸╸╸╸╸╯🎍╭͢`)
  console.log(
    `𝜢𝜮𝑪𝜢𝜣,${commands.size}  𝑪𝜣𝜧𝜟𝜨𝑫𝜣𝑺 𝑪𝜟𝑹𝑮𝜟𝑫𝜣𝑺 𝑪𝜣𝜨 𝜮𝜩𝜤𝜪𝜣`
  )
  console.log(`┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈`)
  return commands
}
const commands = loadCommands()
// ======================================================
// OBTENER TEXTO DEL MENSAJE
// ======================================================
function getMessageText(message) {
  const content = message.message
  return (
    content?.conversation ||
    content?.extendedTextMessage?.text ||
    content?.imageMessage?.caption ||
    content?.videoMessage?.caption ||
    ''
  )
}
// ======================================================
// ¿YA ESTÁ VINCULADO?
// ======================================================
function yaEstaVinculado() {
  const credsPath = path.join(AUTH_DIR, 'creds.json')
  if (!fs.existsSync(credsPath)) return false
  try {
    const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'))
    return creds.registered === true
  } catch {
    return false
  }
}
// ======================================================
// INICIAR BOT
// ======================================================
async function startBot(phoneNumber) {
  const {
    default: makeWASocket,
    DisconnectReason,
    useMultiFileAuthState,
    makeCacheableSignalKeyStore
  } = await import('@whiskeysockets/baileys')
  const { state, saveCreds } =
    await useMultiFileAuthState(AUTH_DIR)
  const sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(
        state.keys,
        logger
      )
    },
    logger,
    markOnlineOnConnect: false,
    syncFullHistory: false
  })
  // Guardar credenciales
  sock.ev.on('creds.update', saveCreds)
  // Evitar pedir el pairing code varias veces
  let pairingRequested = false
  // ====================================================
  // CONEXIÓN
  // ====================================================
  sock.ev.on(
    'connection.update',
    async ({
      connection,
      lastDisconnect
    }) => {
      // ------------------------------------------------
      // CONECTANDO
      // ------------------------------------------------
      if (
        connection === 'connecting' &&
        !state.creds.registered &&
        !pairingRequested &&
        phoneNumber
      ) {
        pairingRequested = true
        try {
          /*
           * Esperamos un momento para que el socket
           * tenga tiempo de establecer la conexión.
           */
          await new Promise(resolve =>
            setTimeout(resolve, 1500)
          )
          const pairingCode =
            await sock.requestPairingCode(
              phoneNumber
            )
          console.log(
            `\n📱 Código de vinculación: ${pairingCode}`
          )
          console.log(
            'WhatsApp → Dispositivos vinculados → ' +
            'Vincular un dispositivo → ' +
            'Vincular con número de teléfono.\n'
          )
        } catch (error) {
          pairingRequested = false
          console.error(
            '❌ No se pudo obtener el código de vinculación:',
            error
          )
        }
      }
      // ------------------------------------------------
      // CONECTADO
      // ------------------------------------------------
      if (connection === 'open') {
        console.log(
          '✅ Bot conectado a WhatsApp.'
        )
      }
      // ------------------------------------------------
      // CONEXIÓN CERRADA
      // ------------------------------------------------
      if (connection === 'close') {
        const statusCode =
          new Boom(
            lastDisconnect?.error
          )?.output?.statusCode
        const reconnect =
          statusCode !== DisconnectReason.loggedOut
        console.log(
          'Conexión cerrada.',
          reconnect
            ? 'Reconectando...'
            : 'Sesión cerrada.'
        )
        if (reconnect) {
          console.log(
            '🔄 Intentando reconectar...'
          )
          setTimeout(() => {
            startBot(phoneNumber)
          }, 3000)
        } else {
          console.log(
            '⚠️ Elimina la carpeta auth_info y vuelve a vincular el bot.'
          )
        }
      }
    }
  )
  // ====================================================
  // MENSAJES
  // ====================================================
  sock.ev.on(
    'messages.upsert',
    async ({ messages, type }) => {
      if (type !== 'notify') return
      const message = messages[0]
      if (!message?.message) return
      const jid = message.key.remoteJid
      // Ignorar estados
      if (jid === 'status@broadcast') return
      // =================================================
      // GRUPOS
      // =================================================
      if (jid.endsWith('@g.us')) {
        const autor =
          message.key.participant ||
          message.key.remoteJid

      }
      // =================================================
      // TEXTO
      // =================================================
      const text =
        getMessageText(message).trim()
      // Si el mensaje no empieza con el prefijo, no es comando
      if (!text.startsWith(PREFIX)) return
      // =================================================
      // COMANDO
      // =================================================
      const commandText =
        text.slice(PREFIX.length).trim()
      const commandName =
        commandText
          .split(/\s+/)[0]
          ?.toLowerCase()
      const args =
        commandText
          .slice(commandName.length)
          .trimStart()
      if (!commandName) return
      const command =
        commands.get(commandName)
      if (!command) return
      // =================================================
      // EJECUTAR
      // =================================================
      try {
        await command.execute({
          sock,
          message,
          jid,
          args,
          text,
          prefix: PREFIX,
          commands
        })
      } catch (error) {
        console.error(
          `Error en ${commandName}:`,
          error
        )
        try {
          await sock.sendMessage(
            jid,
            {
              text:
                '❌ Ocurrió un error al ejecutar ese comando.'
            }
          )
        } catch (sendError) {
          console.error(
            '❌ No se pudo enviar el mensaje de error:',
            sendError
          )
        }
      }
    }
  )

}
// ======================================================
// PEDIR NÚMERO (solo si todavía no está vinculado)
// ======================================================
async function pedirNumero() {
  // Si ya hay sesión guardada, no hace falta número
  if (yaEstaVinculado()) return null
  let phoneNumber =
    process.env.BOT_PHONE_NUMBER
  if (!phoneNumber) {
    // Sin teclado (por ejemplo en pm2) no se puede preguntar
    if (!process.stdin.isTTY) {
      throw new Error(
        'El bot no está vinculado y no hay teclado para pedir el número. ' +
        'Vincúlalo una vez con "node Tooru-Mutsuki.js" o arráncalo con ' +
        'BOT_PHONE_NUMBER=521XXXXXXXXXX.'
      )
    }
    const rl =
      readline.createInterface({
        input: process.stdin,
        output: process.stdout
      })
    phoneNumber =
      await rl.question(
        'Ingresa tu número de WhatsApp con código de país (solo dígitos): '
      )
    rl.close()
  }
  phoneNumber =
    phoneNumber.replace(
      /\D/g,
      ''
    )
  if (!phoneNumber) {
    throw new Error(
      'Debes indicar un número de WhatsApp válido con código de país.'
    )
  }
  return phoneNumber
}
// ======================================================
// ARRANCAR
// ======================================================
pedirNumero()
  .then(startBot)
  .catch(error => {
    console.error(
      'No se pudo iniciar el bot:',
      error
    )
    process.exit(1)
  })
