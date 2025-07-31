# 🚀 Deployment Guide - Cloudflare Workers Telegram Bot

Panduan lengkap untuk menggunakan fitur deploy worker dengan 4 metode fallback.

## 📋 Alur Deployment

### 1. Mulai Deployment
1. Kirim `/start` ke bot
2. Setup akun Cloudflare (API Token, Account ID, Zone ID)
3. Pilih menu "🛠 Deploy Worker"
4. Masukkan nama worker (3-50 karakter)
5. Masukkan URL GitHub repository

### 2. Format URL GitHub
```
✅ Valid:
https://github.com/username/repo-name
https://github.com/user/worker-scripts

❌ Invalid:
https://github.com/username/repo-name/
https://github.com/username
https://raw.githubusercontent.com/user/repo/main/index.js
```

## 🔄 Metode Deployment (Fallback)

### Metode 1: Wrangler CLI
**Status:** ✅ Otomatis
**Waktu:** 1-2 menit

**Langkah-langkah:**
1. Clone repository GitHub
2. Cek apakah file `wrangler.toml` ada
3. Jika ada → jalankan `npx wrangler publish`
4. Jika tidak ada → buat `wrangler.toml` default, lalu publish
5. Jika berhasil → kirim hasil deploy ke user
6. Jika gagal → lanjut ke metode 2

**Keuntungan:**
- Deployment langsung dan otomatis
- Tidak perlu setup manual
- Hasil langsung tersedia

**Kebutuhan:**
- Repository GitHub publik
- File script utama (index.js, worker.js, main.js)
- API Token dengan permission Workers

### Metode 2: GitHub Actions
**Status:** 📋 Manual Setup
**Waktu:** 2-5 menit

**Langkah-langkah:**
1. Clone repository GitHub
2. Buat file `.github/workflows/deploy.yml`
3. Tambahkan secrets: `CF_API_TOKEN`, `CF_ACCOUNT_ID`
4. Jalankan Actions → tunggu status
5. Jika gagal → lanjut ke metode 3

**Keuntungan:**
- CI/CD otomatis
- Deployment setiap push
- Logs dan monitoring

**Kebutuhan:**
- Repository GitHub
- Setup secrets manual
- Push ke repository untuk trigger

### Metode 3: GitLab CI/CD
**Status:** 📋 Manual Setup
**Waktu:** 2-5 menit

**Langkah-langkah:**
1. Buat file `.gitlab-ci.yml` ke dalam project
2. Tambahkan secrets GitLab CI: `CF_API_TOKEN`, `CF_ACCOUNT_ID`
3. Jalankan pipeline dari GitLab CI/CD
4. Jika gagal → lanjut ke metode 4

**Keuntungan:**
- CI/CD otomatis
- Pipeline customization
- GitLab integration

**Kebutuhan:**
- Repository GitLab
- Setup variables manual
- Push ke repository untuk trigger

### Metode 4: API Cloudflare Direct
**Status:** ✅ Otomatis
**Waktu:** 30-60 detik

**Langkah-langkah:**
1. Ambil file utama (index.js, worker.js, atau main.js)
2. Upload script langsung via API Cloudflare
3. Jika berhasil → kirim hasil ke user, selesai

**Keuntungan:**
- Deployment paling cepat
- Tidak perlu setup tambahan
- Fallback terakhir yang reliable

**Kebutuhan:**
- File script valid
- API Token dengan permission Workers

## 📁 Struktur Repository yang Didukung

### Minimal Structure
```
your-worker-repo/
└── index.js          # File utama worker (wajib)
```

### Recommended Structure
```
your-worker-repo/
├── index.js          # File utama worker
├── wrangler.toml     # Konfigurasi (opsional)
├── package.json      # Dependencies (opsional)
└── README.md         # Dokumentasi
```

### Advanced Structure
```
your-worker-repo/
├── src/
│   └── index.js      # File utama worker
├── wrangler.toml     # Konfigurasi
├── package.json      # Dependencies
├── .gitignore        # Git ignore
└── README.md         # Dokumentasi
```

## 🔧 Konfigurasi Wrangler

### wrangler.toml Default
```toml
name = "your-worker-name"
main = "index.js"
compatibility_date = "2023-01-01"

[build]
command = ""

[env.production]
name = "your-worker-name"
```

### wrangler.toml Advanced
```toml
name = "your-worker-name"
main = "src/index.js"
compatibility_date = "2023-01-01"

[build]
command = "npm run build"

[env.production]
name = "your-worker-name"

[env.staging]
name = "your-worker-name-staging"
```

## 📝 Contoh Script Worker

### Basic Worker
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

### Advanced Worker
```javascript
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const path = url.pathname
  
  switch (path) {
    case '/':
      return new Response('Hello World!', {
        headers: { 'content-type': 'text/plain' },
      })
    case '/api':
      return new Response(JSON.stringify({
        message: 'API Response',
        timestamp: new Date().toISOString()
      }), {
        headers: { 'content-type': 'application/json' },
      })
    default:
      return new Response('Not Found', { status: 404 })
  }
}
```

## 🔑 Setup Secrets

### GitHub Actions Secrets
1. Buka repository GitHub
2. Settings → Secrets and variables → Actions
3. Tambahkan secrets:
   - `CF_API_TOKEN` (API Token Cloudflare)
   - `CF_ACCOUNT_ID` (Account ID Cloudflare)

### GitLab CI/CD Variables
1. Buka project GitLab
2. Settings → CI/CD → Variables
3. Tambahkan variables:
   - `CF_API_TOKEN` (API Token Cloudflare)
   - `CF_ACCOUNT_ID` (Account ID Cloudflare)

## 🐛 Troubleshooting

### Error: "Repository kosong atau gagal di-clone"
**Solusi:**
- Pastikan repository GitHub publik
- Cek URL repository valid
- Pastikan repository tidak kosong

### Error: "Tidak dapat menemukan file script utama"
**Solusi:**
- Pastikan ada file `index.js`, `worker.js`, atau `main.js`
- Cek struktur repository
- Pastikan file tidak kosong

### Error: "API Token tidak valid"
**Solusi:**
- Cek API Token di dashboard Cloudflare
- Pastikan permission "Workers" aktif
- Regenerate API Token jika perlu

### Error: "Wrangler publish gagal"
**Solusi:**
- Cek file `wrangler.toml` valid
- Pastikan nama worker unik
- Cek permission API Token

### Error: "Semua metode deployment gagal"
**Solusi:**
- Cek repository GitHub valid
- Pastikan API Token memiliki permission yang benar
- Coba deploy manual untuk debugging
- Cek logs error untuk detail

## 📊 Monitoring Deployment

### Status Messages
- 🔄 **Metode 1:** Mencoba Wrangler CLI
- 🔄 **Metode 2:** Mencoba GitHub Actions
- 🔄 **Metode 3:** Mencoba GitLab CI/CD
- 🔄 **Metode 4:** Mencoba API Cloudflare Direct

### Success Indicators
- ✅ Worker berhasil di-deploy
- 🔗 URL worker aktif
- 📋 Tombol salin URL tersedia

### Error Indicators
- ❌ Error message dengan detail
- 📋 Ringkasan error semua metode
- 💡 Saran troubleshooting

## 🚀 Best Practices

### Repository Setup
1. Buat repository GitHub publik
2. Tambahkan file `index.js` dengan script worker
3. Tambahkan `wrangler.toml` untuk konfigurasi
4. Tambahkan `README.md` untuk dokumentasi

### Script Development
1. Test script lokal dengan `wrangler dev`
2. Gunakan error handling yang baik
3. Tambahkan logging untuk debugging
4. Optimize script untuk performance

### Deployment Strategy
1. Gunakan nama worker yang unik
2. Test deployment di staging environment
3. Monitor logs dan performance
4. Backup script sebelum update

## 📞 Support

Jika mengalami masalah:
1. Cek troubleshooting guide
2. Lihat logs error di bot
3. Test repository manual
4. Hubungi support team