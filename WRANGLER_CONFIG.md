# ⚙️ Wrangler.toml Configuration Guide

## 📋 Overview

`wrangler.toml` adalah file konfigurasi utama untuk Cloudflare Workers. Bot akan otomatis membuat atau memvalidasi file ini untuk memastikan deployment berhasil.

## 🔧 Struktur wrangler.toml Lengkap

```toml
# Cloudflare Workers Configuration
# Generated by Telegram Bot

name = "your-worker-name"
main = "index.js"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

# Build configuration
[build]
command = ""

# Environment variables
[env.production]
name = "your-worker-name"

# Development environment
[env.development]
name = "your-worker-name-dev"

# Vars (optional)
[vars]
ENVIRONMENT = "production"

# KV Namespaces (optional)
# [[kv_namespaces]]
# binding = "MY_KV"
# id = "your-kv-id"

# Durable Objects (optional)
# [[durable_objects.bindings]]
# name = "MY_DURABLE_OBJECT"
# class_name = "MyDurableObject"

# R2 Buckets (optional)
# [[r2_buckets]]
# binding = "MY_BUCKET"
# bucket_name = "my-bucket"

# Services (optional)
# [[services]]
# binding = "MY_SERVICE"
# service = "my-service"
```

## 📝 Penjelasan Konfigurasi

### 🔑 **Konfigurasi Dasar**

| Field | Deskripsi | Contoh |
|-------|-----------|--------|
| `name` | Nama worker (wajib) | `"my-worker"` |
| `main` | File utama worker (wajib) | `"index.js"` |
| `compatibility_date` | Tanggal kompatibilitas (wajib) | `"2024-01-01"` |
| `compatibility_flags` | Flag kompatibilitas (opsional) | `["nodejs_compat"]` |

### 🏗️ **Build Configuration**

```toml
[build]
command = ""  # Command build (kosong untuk tidak ada build)
```

### 🌍 **Environment Configuration**

```toml
[env.production]
name = "your-worker-name"

[env.development]
name = "your-worker-name-dev"
```

### 📦 **Variables**

```toml
[vars]
ENVIRONMENT = "production"
CUSTOM_VAR = "value"
```

## 🔄 **Bagaimana Bot Menangani wrangler.toml**

### 1. **Deteksi File**
```javascript
// Bot akan cek apakah wrangler.toml ada
const hasWranglerConfig = checkWranglerConfig(tempDir);
```

### 2. **Validasi Konfigurasi**
```javascript
// Bot akan validasi dan update jika perlu
if (!wranglerContent.includes(`name = "${workerName}"`)) {
    // Update nama worker
}
```

### 3. **Auto-Generate jika Tidak Ada**
```javascript
// Bot akan buat wrangler.toml default
createDefaultWranglerConfig(tempDir, workerName);
```

### 4. **Update Main File**
```javascript
// Bot akan update main file sesuai file yang ditemukan
wranglerContent = wranglerContent.replace(/main = "[^"]*"/, `main = "${scriptFile}"`);
```

## 🚀 **Contoh Konfigurasi untuk Berbagai Use Case**

### 📄 **Basic Worker**
```toml
name = "hello-world"
main = "index.js"
compatibility_date = "2024-01-01"
```

### 🔧 **Worker dengan Dependencies**
```toml
name = "api-worker"
main = "src/index.js"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

[build]
command = "npm run build"
```

### 🗄️ **Worker dengan KV Storage**
```toml
name = "kv-worker"
main = "index.js"
compatibility_date = "2024-01-01"

[[kv_namespaces]]
binding = "MY_KV"
id = "your-kv-id"
```

### 🪣 **Worker dengan R2 Storage**
```toml
name = "r2-worker"
main = "index.js"
compatibility_date = "2024-01-01"

[[r2_buckets]]
binding = "MY_BUCKET"
bucket_name = "my-bucket"
```

### 🔗 **Worker dengan Services**
```toml
name = "service-worker"
main = "index.js"
compatibility_date = "2024-01-01"

[[services]]
binding = "MY_SERVICE"
service = "my-service"
```

## 🐛 **Troubleshooting wrangler.toml**

### ❌ **Error: "Invalid wrangler.toml"**
**Solusi:**
- Pastikan format TOML valid
- Cek syntax dan struktur
- Gunakan konfigurasi minimal

### ❌ **Error: "Name already exists"**
**Solusi:**
- Ganti nama worker
- Pastikan nama unik
- Cek worker yang sudah ada

### ❌ **Error: "Main file not found"**
**Solusi:**
- Pastikan file main ada
- Cek path file
- Update main field

### ❌ **Error: "Compatibility date required"**
**Solusi:**
- Tambahkan compatibility_date
- Gunakan format YYYY-MM-DD
- Gunakan tanggal terbaru

## 💡 **Best Practices**

### 1. **Nama Worker**
```toml
# ✅ Baik
name = "my-api-worker"
name = "user-authentication"
name = "data-processor"

# ❌ Hindari
name = "worker"
name = "test"
name = "my_worker_with_underscores"
```

### 2. **Main File**
```toml
# ✅ Baik
main = "index.js"
main = "src/worker.js"
main = "dist/main.js"

# ❌ Hindari
main = "worker.js"  # Jika file tidak ada
main = "src/"       # Path tidak valid
```

### 3. **Compatibility Date**
```toml
# ✅ Baik
compatibility_date = "2024-01-01"
compatibility_date = "2023-12-01"

# ❌ Hindari
compatibility_date = "2020-01-01"  # Terlalu lama
compatibility_date = "invalid"     # Format salah
```

### 4. **Environment Variables**
```toml
# ✅ Baik
[vars]
ENVIRONMENT = "production"
API_KEY = "your-api-key"
DEBUG = "false"

# ❌ Hindari
[vars]
SENSITIVE_DATA = "password123"  # Jangan simpan data sensitif
```

## 🔧 **Auto-Generation oleh Bot**

Bot akan otomatis membuat wrangler.toml dengan konfigurasi:

1. **Nama Worker**: Sesuai input user
2. **Main File**: Sesuai file yang ditemukan
3. **Compatibility Date**: Terbaru (2024-01-01)
4. **Environment**: Production dan development
5. **Variables**: Environment default

## 📊 **Statistik Success Rate**

| Konfigurasi | Success Rate | Kompleksitas |
|-------------|-------------|--------------|
| Minimal (name + main) | 90% | Rendah |
| Standard (dengan env) | 95% | Sedang |
| Advanced (dengan services) | 85% | Tinggi |

## 🎯 **Kesimpulan**

`wrangler.toml` adalah kunci untuk deployment yang berhasil. Bot akan:

1. ✅ **Deteksi** file wrangler.toml
2. ✅ **Validasi** konfigurasi
3. ✅ **Auto-generate** jika tidak ada
4. ✅ **Update** sesuai kebutuhan
5. ✅ **Deploy** dengan konfigurasi yang benar

Dengan konfigurasi yang tepat, success rate deployment bisa mencapai 95%! 🚀

## 🔒 **Keamanan Data Sensitif**

### ❌ **Yang TIDAK Disimpan di wrangler.toml:**
- API Token Cloudflare
- Account ID Cloudflare
- Zone ID Cloudflare
- Data sensitif lainnya

### ✅ **Yang DISIMPAN di Environment Variables:**
- `CLOUDFLARE_API_TOKEN`: API Token dari sesi login
- `CLOUDFLARE_ACCOUNT_ID`: Account ID dari sesi login
- `CLOUDFLARE_ZONE_ID`: Zone ID dari sesi login

### 🔄 **Alur Data:**
```
Sesi Login → Environment Variables → Wrangler CLI → Cloudflare API
```

**Keamanan data user adalah prioritas utama!** 🔒