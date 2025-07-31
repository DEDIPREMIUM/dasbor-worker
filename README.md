# 🤖 Cloudflare Workers Telegram Bot

Bot Telegram untuk mengelola Cloudflare Workers dengan mudah melalui chat. Mendukung multi-user dan berbagai metode deployment.

## ✨ Fitur

- 🛠 **Deploy Worker** dengan 4 metode fallback:
  1. API Cloudflare langsung
  2. Wrangler CLI
  3. GitHub Actions
  4. GitLab CI/CD
- 📜 **Daftar Worker** - Lihat semua workers Anda
- ❌ **Hapus Worker** - Hapus worker yang tidak diperlukan
- 🔒 **Multi-user Support** - Setiap user memiliki data terpisah
- 📱 **Interface yang Mudah** - Menu interaktif dengan tombol

## 🚀 Instalasi

### 1. Clone Repository
```bash
git clone <repository-url>
cd cloudflare-workers-telegram-bot
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Bot Token
Buat bot Telegram baru melalui [@BotFather](https://t.me/botfather) dan dapatkan token.

Set environment variable:
```bash
export BOT_TOKEN="your_bot_token_here"
```

Atau edit file `bot.js` dan ganti `YOUR_BOT_TOKEN_HERE` dengan token Anda.

### 4. Jalankan Bot
```bash
npm start
```

Untuk development dengan auto-restart:
```bash
npm run dev
```

## 📋 Cara Penggunaan

### 1. Mulai Bot
Kirim `/start` ke bot Anda di Telegram.

### 2. Setup Akun Cloudflare
Bot akan meminta data berikut secara bertahap:

#### 🔑 API Token Cloudflare
1. Login ke [dashboard Cloudflare](https://dash.cloudflare.com)
2. Buka "My Profile" → "API Tokens"
3. Klik "Create Token"
4. Pilih template "Custom token"
5. Berikan permission:
   - Account: Cloudflare Workers (Read, Write)
   - Zone: Zone (Read)
6. Copy token dan paste ke bot

#### 🆔 Account ID
1. Di dashboard Cloudflare, lihat sidebar kanan
2. Copy "Account ID" (32 karakter hex)

#### 🌐 Zone ID
1. Pilih domain Anda di dashboard
2. Lihat sidebar kanan, copy "Zone ID" (32 karakter hex)

### 3. Menu Utama
Setelah setup selesai, Anda akan melihat menu dengan opsi:
- 🛠 **Deploy Worker** - Deploy worker baru
- 📜 **Daftar Worker** - Lihat workers yang ada
- ❌ **Hapus Worker** - Hapus worker
- 🔧 **Ganti Akun** - Setup ulang akun

## 🛠 Deploy Worker

### Langkah 1: Nama Worker
- 3-50 karakter
- Hanya huruf, angka, underscore (_), dash (-)
- Contoh: `my-worker`, `api_service`, `test123`

### Langkah 2: URL GitHub Repository
Format: `https://github.com/username/repo-name`

Bot akan clone repository dan mencoba deploy dengan 4 metode fallback:

### Metode Deployment (Fallback)

#### 🔄 Metode 1: Wrangler CLI
1. Clone repository GitHub
2. Cek apakah file `wrangler.toml` ada
3. Jika ada → jalankan `npx wrangler publish`
4. Jika tidak ada → buat `wrangler.toml` default, lalu publish
5. Jika berhasil → kirim hasil deploy ke user
6. Jika gagal → lanjut ke metode 2

#### 🔄 Metode 2: GitHub Actions
1. Clone repository GitHub
2. Buat file `.github/workflows/deploy.yml`
3. Tambahkan secrets: `CF_API_TOKEN`, `CF_ACCOUNT_ID`
4. Jalankan Actions → tunggu status
5. Jika gagal → lanjut ke metode 3

#### 🔄 Metode 3: GitLab CI/CD
1. Buat file `.gitlab-ci.yml` ke dalam project
2. Tambahkan secrets GitLab CI: `CF_API_TOKEN`, `CF_ACCOUNT_ID`
3. Jalankan pipeline dari GitLab CI/CD
4. Jika gagal → lanjut ke metode 4

#### 🔄 Metode 4: API Cloudflare Direct
1. Ambil file utama (index.js, worker.js, atau main.js)
2. Upload script langsung via API Cloudflare
3. Jika berhasil → kirim hasil ke user, selesai

### Struktur Repository yang Didukung
```
your-worker-repo/
├── index.js          # File utama worker
├── wrangler.toml     # Konfigurasi (opsional)
├── package.json      # Dependencies (opsional)
└── README.md         # Dokumentasi
```

Contoh script Worker sederhana:
```javascript
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  return new Response('Hello World!', {
    headers: { 'content-type': 'text/plain' },
  })
}
```

## 📜 Daftar Worker
Menampilkan semua workers di akun Anda dengan:
- Nama worker
- URL worker
- Tombol salin URL

## ❌ Hapus Worker
1. Pilih worker dari daftar
2. Konfirmasi penghapusan
3. Worker akan dihapus dari Cloudflare

## 🔧 Ganti Akun
Hapus data akun saat ini dan setup ulang dengan akun baru.

## 📁 Struktur File

```
cloudflare-workers-telegram-bot/
├── bot.js              # File utama bot
├── package.json        # Dependencies
├── README.md          # Dokumentasi
├── users.json         # Database user (auto-generated)
└── temp/              # Direktori temporary (auto-generated)
```

## 🔒 Keamanan

- Data user disimpan lokal dalam file JSON
- API Token tidak dienkripsi (simpan di environment variable untuk production)
- Setiap user memiliki data terpisah berdasarkan Telegram ID
- Bot hanya mengakses data user yang sedang aktif

## 🐛 Troubleshooting

### Bot tidak merespon
- Pastikan token bot valid
- Cek log error di console
- Restart bot dengan `npm start`

### Deploy gagal
- Pastikan API Token memiliki permission yang benar
- Cek format URL script
- Pastikan script valid JavaScript

### Error "Account ID tidak valid"
- Pastikan Account ID 32 karakter hex
- Cek apakah API Token memiliki akses ke account tersebut

## 📝 Contoh Script Worker

### Hello World
```javascript
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  return new Response('Hello World!', {
    headers: { 'content-type': 'text/plain' },
  })
}
```

### API Proxy
```javascript
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const targetUrl = url.searchParams.get('url')
  
  if (!targetUrl) {
    return new Response('Missing url parameter', { status: 400 })
  }
  
  const response = await fetch(targetUrl)
  return response
}
```

## 🤝 Kontribusi

1. Fork repository
2. Buat branch fitur baru
3. Commit perubahan
4. Push ke branch
5. Buat Pull Request

## 📄 License

MIT License - lihat file LICENSE untuk detail.

## 🆘 Support

Jika ada masalah atau pertanyaan:
1. Cek dokumentasi ini
2. Lihat log error di console
3. Buat issue di repository

---

**⚠️ Disclaimer:** Bot ini untuk keperluan development dan testing. Gunakan dengan bijak dan bertanggung jawab.