# Example Cloudflare Worker Repository

Repository contoh untuk testing bot Telegram Cloudflare Workers.

## 📁 Struktur Repository

```
example-repo/
├── index.js          # File utama worker
├── wrangler.toml     # Konfigurasi Wrangler
├── package.json      # Dependencies (opsional)
└── README.md         # Dokumentasi ini
```

## 🚀 Cara Deploy

1. Fork repository ini
2. Gunakan bot Telegram untuk deploy
3. Masukkan URL repository: `https://github.com/username/example-repo`

## 📝 Script Worker

File `index.js` berisi script worker sederhana yang menampilkan halaman web dengan beberapa endpoint.

## ⚙️ Konfigurasi

File `wrangler.toml` berisi konfigurasi untuk deployment ke Cloudflare Workers.

## 🔗 Endpoints

Setelah deploy, worker akan memiliki endpoint:
- `/` - Halaman utama
- `/api` - JSON API
- `/status` - Status worker
- `/time` - Waktu server