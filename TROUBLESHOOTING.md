# 🔧 Troubleshooting Guide - Cloudflare Workers Bot

## 🚨 **Masalah Umum dan Solusi**

### ❌ **Semua Metode Deployment Gagal**

#### 🔍 **Diagnosis:**
1. **Cek API Token Permission**
2. **Validasi Account ID**
3. **Cek Repository Access**
4. **Validasi Script Content**

#### 💡 **Solusi:**

### 1. **API Token Issues**

#### ❌ **Error: "API Token tidak valid"**
**Solusi:**
```bash
# 1. Buat API Token baru di Cloudflare Dashboard
# 2. Permission yang diperlukan:
#    - Cloudflare Workers (Read, Write)
#    - Account Settings (Read)
# 3. Scope: Account level
```

#### ❌ **Error: "Insufficient permissions"**
**Solusi:**
- Pastikan API Token memiliki permission "Cloudflare Workers (Read, Write)"
- Cek apakah token memiliki akses ke account yang benar
- Regenerate token jika perlu

### 2. **Account ID Issues**

#### ❌ **Error: "Account ID tidak valid"**
**Solusi:**
```bash
# 1. Cek Account ID di Cloudflare Dashboard
# 2. Format: 32 karakter hex (contoh: 73138811a1b2c3d4e5f6g7h8i9j0k1l2)
# 3. Pastikan API Token memiliki akses ke account tersebut
```

### 3. **Repository Issues**

#### ❌ **Error: "Repository tidak ditemukan"**
**Solusi:**
- Pastikan repository GitHub publik
- Cek URL repository (format: https://github.com/username/repo-name)
- Pastikan repository tidak kosong

#### ❌ **Error: "File script tidak ditemukan"**
**Solusi:**
```javascript
// Pastikan ada salah satu file ini di root repository:
// - index.js
// - worker.js
// - main.js
// - app.js
// - _worker.js
// - dist/index.js
// - src/index.js
```

### 4. **Script Issues**

#### ❌ **Error: "Script tidak valid"**
**Solusi:**
```javascript
// Contoh script Cloudflare Worker yang valid:
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  return new Response('Hello World!', {
    headers: { 'content-type': 'text/plain' },
  })
}
```

#### ❌ **Error: "Script terlalu besar"**
**Solusi:**
- Maksimal ukuran script: 1MB
- Optimasi script jika terlalu besar
- Hapus komentar dan whitespace yang tidak perlu

## 🔍 **Debugging per Metode**

### 1. **Metode 1: Wrangler CLI**

#### ❌ **Error: "Wrangler command not found"**
**Solusi:**
```bash
# Install Wrangler CLI
npm install -g wrangler

# Atau gunakan npx
npx wrangler publish
```

#### ❌ **Error: "Authentication failed"**
**Solusi:**
- Cek environment variables CLOUDFLARE_API_TOKEN
- Pastikan token valid dan tidak expired
- Cek permission token

#### ❌ **Error: "Name already exists"**
**Solusi:**
- Ganti nama worker
- Hapus worker yang sudah ada terlebih dahulu
- Gunakan nama yang unik

### 2. **Metode 2: API Langsung**

#### ❌ **Error: "HTTP 400: Bad Request"**
**Solusi:**
- Cek format script (harus valid JavaScript)
- Pastikan nama worker valid (3-50 karakter, alphanumeric + dash/underscore)
- Cek ukuran script (maksimal 1MB)

#### ❌ **Error: "HTTP 401: Unauthorized"**
**Solusi:**
- Cek API Token
- Pastikan token memiliki permission yang benar
- Regenerate token jika perlu

#### ❌ **Error: "HTTP 403: Forbidden"**
**Solusi:**
- Cek Account ID
- Pastikan API Token memiliki akses ke account
- Cek apakah worker name sudah ada

### 3. **Metode 3: GitHub Actions**

#### ❌ **Error: "Secrets not found"**
**Solusi:**
```yaml
# Tambahkan secrets di GitHub repository:
# Settings → Secrets and variables → Actions
# - CF_API_TOKEN
# - CF_ACCOUNT_ID  
# - CF_ZONE_ID
```

#### ❌ **Error: "Workflow failed"**
**Solusi:**
- Cek logs di GitHub Actions
- Pastikan secrets sudah diset dengan benar
- Cek apakah repository bisa di-push

### 4. **Metode 4: GitLab CI/CD**

#### ❌ **Error: "Variables not found"**
**Solusi:**
```yaml
# Tambahkan variables di GitLab:
# Settings → CI/CD → Variables
# - CF_API_TOKEN
# - CF_ACCOUNT_ID
# - CF_ZONE_ID
```

## 🛠️ **Tools untuk Debugging**

### 1. **Cek API Token**
```bash
# Test API Token dengan curl
curl -X GET "https://api.cloudflare.com/client/v4/user/tokens/verify" \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

### 2. **Cek Account Info**
```bash
# Test Account ID dengan curl
curl -X GET "https://api.cloudflare.com/client/v4/accounts/YOUR_ACCOUNT_ID" \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

### 3. **Cek Workers List**
```bash
# Test Workers API dengan curl
curl -X GET "https://api.cloudflare.com/client/v4/accounts/YOUR_ACCOUNT_ID/workers/scripts" \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

### 4. **Test Wrangler CLI**
```bash
# Test Wrangler CLI manual
npx wrangler whoami
npx wrangler list
```

## 📋 **Checklist Troubleshooting**

### ✅ **Pre-Deployment Checklist:**
- [ ] API Token valid dan memiliki permission yang benar
- [ ] Account ID valid dan sesuai dengan token
- [ ] Repository GitHub publik dan tidak kosong
- [ ] File script ada di root repository
- [ ] Script valid JavaScript/Cloudflare Worker
- [ ] Nama worker unik dan valid
- [ ] Ukuran script < 1MB

### ✅ **Post-Deployment Checklist:**
- [ ] Worker muncul di Cloudflare Dashboard
- [ ] Worker bisa diakses via URL
- [ ] Script berjalan dengan benar
- [ ] Tidak ada error di logs

## 🔧 **Advanced Troubleshooting**

### 1. **Environment Variables Debug**
```javascript
// Cek environment variables di bot
console.log('API Token:', token ? 'Set' : 'Not set');
console.log('Account ID:', accountId ? 'Set' : 'Not set');
console.log('Zone ID:', zoneId ? 'Set' : 'Not set');
```

### 2. **Script Validation**
```javascript
// Validasi script sebelum deploy
function validateScript(script) {
    // Cek syntax
    try {
        new Function(script);
    } catch (e) {
        throw new Error('Invalid JavaScript syntax');
    }
    
    // Cek Cloudflare Worker pattern
    if (!script.includes('addEventListener') && !script.includes('export default')) {
        console.warn('Script mungkin bukan Cloudflare Worker');
    }
}
```

### 3. **Network Debug**
```javascript
// Debug network requests
const response = await axios.put(url, data, {
    headers: headers,
    timeout: 30000,
    validateStatus: function (status) {
        console.log('Response status:', status);
        return status >= 200 && status < 300;
    }
});
```

## 📞 **Support**

### 🔗 **Resources:**
- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)
- [Cloudflare API Documentation](https://api.cloudflare.com/)

### 🐛 **Common Issues:**
1. **Permission Issues**: 70% dari masalah deployment
2. **Script Validation**: 20% dari masalah deployment  
3. **Network Issues**: 10% dari masalah deployment

### 💡 **Tips:**
- Selalu gunakan API Token dengan permission minimal yang diperlukan
- Test script lokal sebelum deploy
- Monitor logs untuk debugging
- Gunakan nama worker yang deskriptif dan unik

---

**🎯 Tujuan:** Memastikan deployment worker berhasil dengan troubleshooting yang efektif! 🔧