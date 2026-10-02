const fs = require('node:fs')
const path = require('node:path')
const readline = require('node:readline/promises')
const { stdin, stdout } = require('node:process')
const pino = require('pino')

const AUTH_DIR = path.join(__dirname, 'auth_info')
const COMMANDS_DIR = path.join(__dirname, 'ZZX')
const TEXT_DIR = path.join(__dirname, 'Txm')
const logger = pino({ level: 'silent' })
const messages = new Map()
const MAX_MESSAGES = 2000
let pairingNumber = ''
let startupSentThisRun = false

function messageIdKey(key = {}) {
  return `${key.remoteJid || ''}|${key.id || ''}`
}

function remember(message) {
  const key = message?.key
  if (!key?.id || !key?.remoteJid || !message.message) return
  messages.set(messageIdKey(key), message)
  if (messages.size > MAX_MESSAGES) messages.delete(messages.keys().next().value)
}

function findTarget(key = {}) {
  if (!key.id) return null
  const exact = key.remoteJid ? messages.get(messageIdKey(key)) : null
  if (exact) return exact

  // WhatsApp puede expresar el mismo chat con JID distintos (por ejemplo,
  // número/LID). Solo usamos el ID alternativo cuando la coincidencia es única.
  const matches = [...messages.values()].filter(item => item.key?.id === key.id)
  return matches.length === 1 ? matches[0] : null
}

function loadCommands() {
  const commands = new Map()
  if (!fs.existsSync(COMMANDS_DIR)) fs.mkdirSync(COMMANDS_DIR, { recursive: true })

  for (const file of fs.readdirSync(COMMANDS_DIR, { withFileTypes: true })) {
    if (!file.isFile() || !file.name.endsWith('.js')) continue
    const filename = path.join(COMMANDS_DIR, file.name)
    try {
      delete require.cache[require.resolve(filename)]
      const command = require(filename)
      if (!command?.name || typeof command.execute !== 'function' || !command.reaction) {
        console.error(`Ignorado ${file.name}: debe exportar name, reaction y execute().`)
        continue
      }
      const reactions = Array.isArray(command.reaction) ? command.reaction : [command.reaction]
      for (const reaction of reactions) commands.set(reaction, command)
      console.log(`Comando cargado: ${command.name} (${reactions.join(', ')})`)
    } catch (error) {
      console.error(`No se pudo cargar ${file.name}:`, error.message)
    }
  }
  return commands
}

function namedFile(baseName) {
  if (!fs.existsSync(TEXT_DIR)) return null
  const files = fs.readdirSync(TEXT_DIR)
  return files.find(name => name === baseName || name.startsWith(`${baseName}.`))
    ? path.join(TEXT_DIR, files.find(name => name === baseName || name.startsWith(`${baseName}.`)))
    : null
}

async function sendStartupMessage(sock) {
  const imagePath = namedFile('Img')
  const textPath = namedFile('Text')
  if (!imagePath || !textPath) {
    console.warn('Mensaje de inicio omitido: agrega Txm/Img (con extensión) y Txm/Text.txt.')
    return
  }

  const caption = fs.readFileSync(textPath, 'utf8').trim()
  if (!caption) {
    console.warn('Mensaje de inicio omitido: Txm/Text está vacío.')
    return
  }

  // STARTUP_CHAT acepta un JID (ej. 5215512345678@s.whatsapp.net o ...@g.us).
  // Sin configuración, lo envía al chat privado del propio número vinculado.
  const jid = process.env.STARTUP_CHAT || sock.user?.id
  if (!jid) {
    console.warn('Mensaje de inicio omitido: no pude determinar el chat destino.')
    return
  }
  await sock.sendMessage(jid, { image: fs.readFileSync(imagePath), caption })
  console.log(`Mensaje de inicio enviado a ${jid}`)
}

async function startBot() {
  const {
    default: makeWASocket,
    DisconnectReason,
    useMultiFileAuthState,
    makeCacheableSignalKeyStore
  } = await import('@whiskeysockets/baileys')

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)
  if (!state.creds.registered) {
    const rl = readline.createInterface({ input: stdin, output: stdout })
    try {
      while (pairingNumber.length < 8) {
        pairingNumber = (await rl.question('Número del bot con código de país, sin + ni espacios: ')).replace(/\D/g, '')
      }
    } finally {
      rl.close()
    }
  }

  const sock = makeWASocket({
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
    logger,
    markOnlineOnConnect: false,
    syncFullHistory: false
  })
  sock.ev.on('creds.update', saveCreds)
  const commands = loadCommands()
  let pairingRequested = false

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr && !sock.authState.creds.registered && !pairingRequested) {
      pairingRequested = true
      try {
        const code = await sock.requestPairingCode(pairingNumber)
        console.log(`\nCódigo para vincular: ${code.match(/.{1,4}/g)?.join('-') || code}`)
        console.log('WhatsApp → Dispositivos vinculados → Vincular dispositivo → Vincular con número de teléfono.\n')
      } catch (error) {
        pairingRequested = false
        console.error('No se pudo generar el código de vinculación:', error.message)
      }
    }

    if (connection === 'open') {
      console.log('Bot conectado.')
      if (!startupSentThisRun) {
        startupSentThisRun = true
        try { await sendStartupMessage(sock) } catch (error) {
          console.error('No se pudo enviar el mensaje de inicio:', error.message)
          startupSentThisRun = false
        }
      }
    }

    if (connection === 'close') {
      const status = lastDisconnect?.error?.output?.statusCode
      if (status === DisconnectReason.loggedOut) {
        console.error('Sesión cerrada desde WhatsApp. Elimina auth_info y vuelve a vincular.')
      } else {
        console.log('Conexión cerrada; reconectando…')
        startBot().catch(error => console.error('Error al reconectar:', error))
      }
    }
  })

  sock.ev.on('messages.upsert', async ({ messages: incoming }) => {
    for (const message of incoming) {
      if (!message?.message) continue
      remember(message)
      const reaction = message.message.reactionMessage
      if (!reaction || !message.key.fromMe) continue

      const command = commands.get(reaction.text)
      if (!command) continue
      const targetKey = reaction.key
      const targetMessage = findTarget(targetKey)
      console.log(`Reacción propia ${JSON.stringify(reaction.text)} → ${command.name}; destino en caché: ${Boolean(targetMessage)}`)
      try {
        await command.execute({
          sock,
          message,
          jid: message.key.remoteJid,
          reaction,
          targetKey,
          targetMessage,
          cache: messages
        })
      } catch (error) {
        console.error(`Error ejecutando ${command.name}:`, error)
      }
    }
  })
}

startBot().catch(error => {
  console.error('Error fatal:', error)
  process.exitCode = 1
})
