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

#### ✅ Metode 1: API Langsung (Direct Upload via API)
1. Bot clone repo GitHub → hanya baca file secara langsung via raw.githubusercontent.com
2. Bot cari file utama: index.js, worker.js, main.js, app.js, _worker.js, dist/index.js, src/index.js
3. Jika file ditemukan → ambil konten
4. Upload ke Cloudflare via API: PUT https://api.cloudflare.com/client/v4/accounts/:account_id/workers/scripts/:script_name
5. Jika berhasil → selesai ✅
6. Jika gagal (file tidak ada / upload error) → lanjut ke Metode 2 ❌

#### ⚙️ Metode 2: Wrangler CLI (Deploy dari VPS via Wrangler)
1. Bot clone repo GitHub ke folder sementara di VPS
2. Cek apakah ada file wrangler.toml
3. Jalankan: npx wrangler publish --name nama_worker --account-id ACCOUNT_ID --zone-id ZONE_ID --api-token API_TOKEN
4. Jika sukses → selesai ✅
5. Jika gagal (no wrangler.toml, dependency error, atau publish gagal) → lanjut ke Metode 3 ❌

#### 🔄 Metode 3: GitHub Actions
1. Cek apakah repo GitHub user bisa dipush atau user upload sendiri file .github/workflows/deploy.yml
2. File workflow berisi langkah wrangler publish
3. Pastikan user punya secret: CLOUDFLARE_API_TOKEN, ACCOUNT_ID, ZONE_ID
4. Bot bantu buat file CI otomatis (jika diizinkan user)
5. Jika sukses → selesai ✅
6. Jika gagal → lanjut ke Metode 4 ❌

#### 🦊 Metode 4: GitLab CI/CD
1. Sama seperti GitHub Actions tapi pakai .gitlab-ci.yml
2. Bot bantu generate file CI
3. Bot bantu user setting GitLab secrets
4. Jika sukses → selesai ✅
5. Jika gagal → tampilkan pesan bahwa semua metode gagal ❌

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