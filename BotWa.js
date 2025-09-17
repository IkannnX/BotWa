const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys")
const qrcode = require("qrcode-terminal")
const axios = require("axios")

// Database sementara
let saldo = {}
let orders = []

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState("session")
    const { version } = await fetchLatestBaileysVersion()
    const sock = makeWASocket({
        auth: state,
        version,
        printQRInTerminal: true
    })

    sock.ev.on("creds.update", saveCreds)

    sock.ev.on("messages.upsert", async ({ messages }) => {
        const msg = messages[0]
        if (!msg.message) return
        const from = msg.key.remoteJid
        const text = msg.message.conversation || msg.message.extendedTextMessage?.text

        console.log("Pesan dari", from, ":", text)

        // Auto Reply sederhana
        if (text?.toLowerCase() === "hai") {
            await sock.sendMessage(from, { text: "Halo 👋, ada yang bisa dibantu?" })
        }

        // Menu
        if (text?.toLowerCase() === "menu") {
            await sock.sendMessage(from, {
                text: `📌 Menu Bot:
1. !info
2. !waktu
3. !saldo
4. !deposit <jumlah>
5. !order <produk>
6. !stiker (kirim gambar)
7. !cuaca <kota>
8. !ai <pertanyaan>`
            })
        }

        // Info
        if (text?.toLowerCase() === "!info") {
            await sock.sendMessage(from, { text: "🤖 Bot WhatsApp serba bisa aktif!" })
        }

        // Waktu
        if (text?.toLowerCase() === "!waktu") {
            const jam = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })
            await sock.sendMessage(from, { text: `⏰ Sekarang jam: ${jam}` })
        }

        // Saldo
        if (text?.toLowerCase() === "!saldo") {
            if (!saldo[from]) saldo[from] = 0
            await sock.sendMessage(from, { text: `💰 Saldo kamu: Rp${saldo[from]}` })
        }

        // Deposit
        if (text?.toLowerCase().startsWith("!deposit")) {
            const parts = text.split(" ")
            const jumlah = parseInt(parts[1]) || 0
            if (!saldo[from]) saldo[from] = 0
            saldo[from] += jumlah
            await sock.sendMessage(from, { text: `✅ Deposit Rp${jumlah} berhasil!\nSaldo sekarang: Rp${saldo[from]}` })
        }

        // Order Produk
        if (text?.toLowerCase().startsWith("!order")) {
            const produk = text.split(" ")[1]
            if (!produk) return sock.sendMessage(from, { text: "❌ Format salah. Gunakan: !order ProdukA" })
            const harga = 50000
            if (!saldo[from] || saldo[from] < harga) {
                return sock.sendMessage(from, { text: "❌ Saldo tidak cukup untuk membeli produk ini." })
            }
            saldo[from] -= harga
            orders.push({ user: from, produk, harga })
            await sock.sendMessage(from, { text: `🛒 Order ${produk} berhasil!\nSisa saldo: Rp${saldo[from]}` })
        }

        // Sticker Maker
        if (text?.toLowerCase() === "!stiker" && msg.message.imageMessage) {
            const buffer = await sock.downloadMediaMessage(msg)
            await sock.sendMessage(from, { sticker: buffer })
        }

        // Cuaca (API gratis OpenWeather)
        if (text?.toLowerCase().startsWith("!cuaca")) {
            const kota = text.split(" ")[1] || "Jakarta"
            try {
                const apiKey = "3d1724b7a19f74edac8bc3c0c81ad86b"
                const res = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${kota}&appid=${apiKey}&units=metric&lang=id`)
                const data = res.data
                await sock.sendMessage(from, {
                    text: `🌤 Cuaca di ${kota}:\n${data.weather[0].description}\n🌡 Suhu: ${data.main.temp}°C`
                })
            } catch (err) {
                await sock.sendMessage(from, { text: "❌ Gagal mengambil data cuaca." })
            }
        }

        // AI Chat (Dummy pakai quotable API)
        if (text?.toLowerCase().startsWith("!ai")) {
            const query = text.replace("!ai", "").trim()
            const res = await axios.get("https://api.quotable.io/random")
            await sock.sendMessage(from, { text: `🤖 Jawaban AI untuk: "${query}"\n\n${res.data.content}` })
        }

        // Auto Forward ke grup tertentu
        const groupTarget = "120363200000000000@g.us" // Ganti dengan ID grup target
        if (from !== groupTarget) {
            await sock.sendMessage(groupTarget, { text: `📩 Forward dari ${from}: ${text}` })
        }
    })
}

startBot()
