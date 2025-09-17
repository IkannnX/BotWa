const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys")

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("session")
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    auth: state,
    version,
    printQRInTerminal: false // pakai pairing code, bukan QR
  })

  sock.ev.on("creds.update", saveCreds)

  // 🔹 Pairing Code
  if (!sock.authState.creds.registered) {
    const phoneNumber = process.env.PHONE_NUMBER || "62xxxxxxxxxx" // ganti nomor kamu
    const code = await sock.requestPairingCode(phoneNumber)
    console.log("📱 Pairing Code:", code)
  }

  sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message) return

    const from = msg.key.remoteJid
    const text =
      msg.message.conversation ||
      msg.message.extendedTextMessage?.text ||
      ""

    console.log("📩 Pesan dari", from, ":", text)

    // 🔹 Auto Reply
    if (text.toLowerCase() === "hai") {
      await sock.sendMessage(from, { text: "Halo 👋, saya bot WhatsApp pairing code!" })
    }

    // 🔹 Ping Test
    if (text.toLowerCase() === "!ping") {
      await sock.sendMessage(from, { text: "🏓 Pong!" })
    }

    // 🔹 Buat stiker dari gambar
    if (text.toLowerCase() === "!stiker" && msg.message.imageMessage) {
      const buffer = await sock.downloadMediaMessage(msg)
      await sock.sendMessage(from, { sticker: buffer })
    }

    // 🔹 Menu
    if (text.toLowerCase() === "menu") {
      await sock.sendMessage(from, {
        text: `📌 Menu Bot:
1. hai → auto reply
2. !ping → tes bot
3. !stiker → buat stiker dari gambar
`
      })
    }
  })
}

startBot()
