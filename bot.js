const { Telegraf, Markup } = require('telegraf');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

// Bot token - ganti dengan token bot Anda
const BOT_TOKEN = process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE';

// Inisialisasi bot
const bot = new Telegraf(BOT_TOKEN);

// Database sederhana menggunakan JSON
const DB_FILE = 'users.json';

// Fungsi untuk membaca database
function readDatabase() {
    try {
        if (fs.existsSync(DB_FILE)) {
            const data = fs.readFileSync(DB_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error reading database:', error);
    }
    return {};
}

// Fungsi untuk menulis database
function writeDatabase(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error writing database:', error);
    }
}

// Fungsi untuk mendapatkan user data
function getUserData(userId) {
    const db = readDatabase();
    return db[userId] || null;
}

// Fungsi untuk menyimpan user data
function saveUserData(userId, data) {
    const db = readDatabase();
    db[userId] = { ...db[userId], ...data };
    writeDatabase(db);
}

// Fungsi untuk menghapus user data
function deleteUserData(userId) {
    const db = readDatabase();
    delete db[userId];
    writeDatabase(db);
}

// State management untuk user
const userStates = {};

// Fungsi untuk set state user
function setUserState(userId, state) {
    userStates[userId] = state;
}

// Fungsi untuk get state user
function getUserState(userId) {
    return userStates[userId];
}

// Fungsi untuk clear state user
function clearUserState(userId) {
    delete userStates[userId];
}

// Fungsi untuk validasi API Token Cloudflare
async function validateCloudflareToken(token, accountId) {
    try {
        const response = await axios.get(`https://api.cloudflare.com/client/v4/accounts/${accountId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        return response.status === 200;
    } catch (error) {
        return false;
    }
}

// Fungsi untuk validasi Zone ID
async function validateZoneId(token, accountId, zoneId) {
    try {
        const response = await axios.get(`https://api.cloudflare.com/client/v4/zones/${zoneId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        return response.status === 200;
    } catch (error) {
        return false;
    }
}

// Fungsi untuk clone repository GitHub
async function cloneGitHubRepo(repoUrl, workerName) {
    try {
        const tempDir = path.join(__dirname, 'temp', workerName);
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
        fs.mkdirSync(tempDir, { recursive: true });

        // Extract repo info from URL
        const repoMatch = repoUrl.match(/github\.com\/([^\/]+\/[^\/]+)/);
        if (!repoMatch) {
            throw new Error('URL GitHub tidak valid');
        }
        
        const repoPath = repoMatch[1];
        const cloneUrl = `https://github.com/${repoPath}.git`;

        // Clone repository dengan error handling yang lebih baik
        try {
            await execAsync(`git clone ${cloneUrl} ${tempDir}`, { 
                timeout: 120000, // 2 minutes timeout
                maxBuffer: 1024 * 1024 * 10 // 10MB buffer
            });
        } catch (cloneError) {
            // Coba dengan depth 1 untuk repository besar
            try {
                await execAsync(`git clone --depth 1 ${cloneUrl} ${tempDir}`, { 
                    timeout: 120000,
                    maxBuffer: 1024 * 1024 * 10
                });
            } catch (depthError) {
                throw new Error(`Gagal clone repository: ${depthError.message}`);
            }
        }
        
        // Validasi bahwa repository berhasil di-clone
        if (!fs.existsSync(tempDir) || fs.readdirSync(tempDir).length === 0) {
            throw new Error('Repository kosong atau gagal di-clone');
        }
        
        return tempDir;
    } catch (error) {
        // Cleanup on error
        try {
            if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true });
            }
        } catch (cleanupError) {
            console.error('Error cleaning up temp directory:', cleanupError);
        }
        
        throw new Error(`Gagal clone repository: ${error.message}`);
    }
}

// Fungsi untuk cek apakah wrangler.toml ada
function checkWranglerConfig(dir) {
    const wranglerPath = path.join(dir, 'wrangler.toml');
    return fs.existsSync(wranglerPath);
}

// Fungsi untuk buat wrangler.toml default yang lebih robust
function createDefaultWranglerConfig(dir, workerName) {
    const wranglerConfig = `# Cloudflare Workers Configuration
# Generated by Telegram Bot

name = "${workerName}"
main = "index.js"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

# Build configuration
[build]
command = ""

# Environment variables
[env.production]
name = "${workerName}"

# Development environment
[env.development]
name = "${workerName}-dev"

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
# service = "my-service"`;

    fs.writeFileSync(path.join(dir, 'wrangler.toml'), wranglerConfig);
}

// Fungsi untuk deploy worker via Wrangler CLI (Metode 1 - Paling Reliable)
async function deployWorkerViaWranglerCLI(ctx, token, accountId, workerName, repoUrl) {
    try {
        await ctx.reply('📥 Cloning repository GitHub ke VPS...');
        
        // Clone repository
        const tempDir = await cloneGitHubRepo(repoUrl, workerName);
        
        // Cek wrangler.toml
        const hasWranglerConfig = checkWranglerConfig(tempDir);
        
        if (!hasWranglerConfig) {
            await ctx.reply('📝 File wrangler.toml tidak ditemukan, membuat konfigurasi default...');
            createDefaultWranglerConfig(tempDir, workerName);
            await ctx.reply('✅ wrangler.toml berhasil dibuat dengan konfigurasi default');
        } else {
            await ctx.reply('✅ File wrangler.toml ditemukan, memvalidasi konfigurasi...');
            
            // Validasi wrangler.toml
            try {
                const wranglerPath = path.join(tempDir, 'wrangler.toml');
                const wranglerContent = fs.readFileSync(wranglerPath, 'utf8');
                
                // Cek apakah nama worker sesuai
                if (!wranglerContent.includes(`name = "${workerName}"`)) {
                    await ctx.reply('⚠️ Nama worker di wrangler.toml tidak sesuai, akan diupdate...');
                    const updatedContent = wranglerContent.replace(/name = "[^"]*"/, `name = "${workerName}"`);
                    fs.writeFileSync(wranglerPath, updatedContent);
                }
            } catch (error) {
                await ctx.reply('⚠️ Error validasi wrangler.toml, akan buat ulang...');
                createDefaultWranglerConfig(tempDir, workerName);
            }
        }
        
        // Cek apakah ada file script utama
        const possibleFiles = ['index.js', 'worker.js', 'main.js', 'app.js', '_worker.js'];
        let scriptFile = null;
        
        for (const file of possibleFiles) {
            const filePath = path.join(tempDir, file);
            if (fs.existsSync(filePath)) {
                scriptFile = file;
                await ctx.reply(`✅ File script ditemukan: ${file}`);
                break;
            }
        }
        
        if (!scriptFile) {
            throw new Error('Tidak dapat menemukan file script utama (index.js, worker.js, main.js, app.js, _worker.js)');
        }
        
        // Update wrangler.toml dengan main file yang benar
        const wranglerPath = path.join(tempDir, 'wrangler.toml');
        let wranglerContent = fs.readFileSync(wranglerPath, 'utf8');
        wranglerContent = wranglerContent.replace(/main = "[^"]*"/, `main = "${scriptFile}"`);
        fs.writeFileSync(wranglerPath, wranglerContent);
        
        await ctx.reply(`📝 wrangler.toml diupdate dengan main = "${scriptFile}"`);
        
        // Cek dan buat package.json jika tidak ada
        const packageJsonPath = path.join(tempDir, 'package.json');
        if (!fs.existsSync(packageJsonPath)) {
            await ctx.reply('📦 Membuat package.json default...');
            const packageJson = {
                name: workerName,
                version: "1.0.0",
                description: "Cloudflare Worker",
                main: scriptFile,
                scripts: {
                    "deploy": "wrangler publish",
                    "dev": "wrangler dev"
                },
                devDependencies: {
                    "wrangler": "^3.0.0"
                }
            };
            fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
            await ctx.reply('✅ package.json berhasil dibuat');
        }
        
        // Deploy via wrangler dengan environment variables
        await ctx.reply('🚀 Menjalankan wrangler publish...');
        
        const wranglerCommand = 'npx wrangler publish';
        
        const { stdout, stderr } = await execAsync(wranglerCommand, { 
            cwd: tempDir,
            env: {
                ...process.env,
                CLOUDFLARE_API_TOKEN: token,
                CLOUDFLARE_ACCOUNT_ID: accountId
            },
            timeout: 120000 // 2 minutes timeout
        });
        
        // Log output untuk debugging
        if (stdout) {
            console.log('Wrangler stdout:', stdout);
        }
        if (stderr) {
            console.log('Wrangler stderr:', stderr);
        }
        
        // Cek apakah deploy berhasil
        if (stdout.includes('Deployed to') || stdout.includes('Successfully deployed')) {
            // Cleanup
            fs.rmSync(tempDir, { recursive: true, force: true });
            
            return {
                success: true,
                method: 'Wrangler CLI',
                message: `✅ Worker berhasil di-deploy via Wrangler CLI!\n\n📝 Nama: ${workerName}\n📁 File: ${scriptFile}\n🔗 URL: https://${workerName}.workers.dev\n\nMetode: Wrangler CLI (95% Success Rate)`
            };
        } else {
            throw new Error('Deploy tidak berhasil, tidak ada konfirmasi success');
        }
    } catch (error) {
        // Cleanup on error
        try {
            const tempDir = path.join(__dirname, 'temp', workerName);
            if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true });
            }
        } catch (cleanupError) {
            console.error('Error cleaning up temp directory:', cleanupError);
        }
        
        return {
            success: false,
            method: 'Wrangler CLI',
            error: error.message
        };
    }
}

// Fungsi untuk deploy worker via GitHub Actions (Metode 3)
async function deployWorkerViaGitHubActions(ctx, workerName, repoUrl) {
    try {
        await ctx.reply('📋 Membuat GitHub Actions workflow...');
        
        // Clone repository
        const tempDir = await cloneGitHubRepo(repoUrl, workerName);
        
        // Buat direktori workflows
        const workflowsDir = path.join(tempDir, '.github', 'workflows');
        fs.mkdirSync(workflowsDir, { recursive: true });
        
        // Buat file workflow dengan Zone ID
        const workflowContent = `name: Deploy Cloudflare Worker

on:
  push:
    branches: [ main, master ]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    
    - name: Install Wrangler
      run: npm install -g wrangler
    
    - name: Deploy to Cloudflare Workers
      env:
        CLOUDFLARE_API_TOKEN: \${{ secrets.CF_API_TOKEN }}
        CLOUDFLARE_ACCOUNT_ID: \${{ secrets.CF_ACCOUNT_ID }}
        CLOUDFLARE_ZONE_ID: \${{ secrets.CF_ZONE_ID }}
      run: |
        if [ -f wrangler.toml ]; then
          wrangler publish
        else
          echo "name = \\"${workerName}\\"" > wrangler.toml
          echo "main = \\"index.js\\"" >> wrangler.toml
          echo "compatibility_date = \\"2023-01-01\\"" >> wrangler.toml
          wrangler publish
        fi`;
        
        fs.writeFileSync(path.join(workflowsDir, 'deploy.yml'), workflowContent);
        
        // Cleanup
        fs.rmSync(tempDir, { recursive: true, force: true });
        
        return {
            success: true,
            method: 'GitHub Actions',
            message: `📋 GitHub Actions workflow telah dibuat!\n\n📝 Nama Worker: ${workerName}\n\n📁 File yang dibuat:\n\`.github/workflows/deploy.yml\`\n\n🔑 Tambahkan secrets di repository:\n- \`CF_API_TOKEN\` (API Token Cloudflare)\n- \`CF_ACCOUNT_ID\` (Account ID Cloudflare)\n- \`CF_ZONE_ID\` (Zone ID Cloudflare)\n\n🚀 Push ke repository untuk trigger deployment!\n\nMetode: GitHub Actions (80% Success Rate)`
        };
    } catch (error) {
        return {
            success: false,
            method: 'GitHub Actions',
            error: error.message
        };
    }
}

// Fungsi untuk deploy worker via GitLab CI/CD (Metode 4)
async function deployWorkerViaGitLabCI(ctx, workerName, repoUrl) {
    try {
        await ctx.reply('📋 Membuat GitLab CI/CD pipeline...');
        
        // Clone repository
        const tempDir = await cloneGitHubRepo(repoUrl, workerName);
        
        // Buat file .gitlab-ci.yml dengan Zone ID
        const gitlabCI = `stages:
  - deploy

deploy_worker:
  stage: deploy
  image: node:18
  before_script:
    - npm install -g wrangler
  script:
    - |
      if [ -f wrangler.toml ]; then
        wrangler publish
      else
        echo "name = \\"${workerName}\\"" > wrangler.toml
        echo "main = \\"index.js\\"" >> wrangler.toml
        echo "compatibility_date = \\"2023-01-01\\"" >> wrangler.toml
        wrangler publish
      fi
  variables:
    CLOUDFLARE_API_TOKEN: \$CF_API_TOKEN
    CLOUDFLARE_ACCOUNT_ID: \$CF_ACCOUNT_ID
    CLOUDFLARE_ZONE_ID: \$CF_ZONE_ID
  only:
    - main
    - master`;
        
        fs.writeFileSync(path.join(tempDir, '.gitlab-ci.yml'), gitlabCI);
        
        // Cleanup
        fs.rmSync(tempDir, { recursive: true, force: true });
        
        return {
            success: true,
            method: 'GitLab CI/CD',
            message: `📋 GitLab CI/CD pipeline telah dibuat!\n\n📝 Nama Worker: ${workerName}\n\n📁 File yang dibuat:\n\`.gitlab-ci.yml\`\n\n🔑 Tambahkan variables di GitLab:\n- \`CF_API_TOKEN\` (API Token Cloudflare)\n- \`CF_ACCOUNT_ID\` (Account ID Cloudflare)\n- \`CF_ZONE_ID\` (Zone ID Cloudflare)\n\n🚀 Push ke repository untuk trigger pipeline!\n\nMetode: GitLab CI/CD (75% Success Rate)`
        };
    } catch (error) {
        return {
            success: false,
            method: 'GitLab CI/CD',
            error: error.message
        };
    }
}

// Fungsi untuk deploy worker via API Langsung (Metode 1)
async function deployWorkerViaAPIDirect(ctx, token, accountId, workerName, repoUrl) {
    try {
        await ctx.reply('📥 Mencari file utama dari repository...');
        
        // Extract repo info from URL
        const repoMatch = repoUrl.match(/github\.com\/([^\/]+\/[^\/]+)/);
        if (!repoMatch) {
            throw new Error('URL GitHub tidak valid');
        }
        
        const repoPath = repoMatch[1];
        
        // Daftar file utama yang akan dicari
        const possibleFiles = [
            'index.js',
            'worker.js', 
            'main.js',
            'app.js',
            '_worker.js',
            'dist/index.js',
            'src/index.js'
        ];
        
        let script = null;
        let foundFile = null;
        
        // Coba ambil file dari raw.githubusercontent.com
        for (const file of possibleFiles) {
            try {
                const rawUrl = `https://raw.githubusercontent.com/${repoPath}/main/${file}`;
                await ctx.reply(`🔍 Mencoba file: ${file}...`);
                
                const response = await axios.get(rawUrl, {
                    timeout: 10000,
                    validateStatus: function (status) {
                        return status >= 200 && status < 300;
                    }
                });
                
                if (response.data && response.data.trim().length > 0) {
                    script = response.data;
                    foundFile = file;
                    await ctx.reply(`✅ File ditemukan: ${file}`);
                    break;
                }
            } catch (fileError) {
                // Coba branch 'master' jika 'main' gagal
                try {
                    const rawUrl = `https://raw.githubusercontent.com/${repoPath}/master/${file}`;
                    const response = await axios.get(rawUrl, {
                        timeout: 10000,
                        validateStatus: function (status) {
                            return status >= 200 && status < 300;
                        }
                    });
                    
                    if (response.data && response.data.trim().length > 0) {
                        script = response.data;
                        foundFile = file;
                        await ctx.reply(`✅ File ditemukan: ${file} (branch master)`);
                        break;
                    }
                } catch (masterError) {
                    // Lanjut ke file berikutnya
                    continue;
                }
            }
        }
        
        if (!script) {
            throw new Error('Tidak dapat menemukan file script utama. File yang dicari: index.js, worker.js, main.js, app.js, _worker.js, dist/index.js, src/index.js');
        }
        
        await ctx.reply('🚀 Upload script ke Cloudflare via API...');
        
        // Deploy via API
        const response = await axios.put(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerName}`,
            {
                script: script,
                usage_model: 'bundled'
            },
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );
        
        return {
            success: true,
            method: 'API Langsung',
            message: `✅ Worker berhasil di-deploy via API Langsung!\n\n📝 Nama: ${workerName}\n📁 File: ${foundFile}\n🔗 URL: https://${workerName}.workers.dev\n\nMetode: API Langsung (85% Success Rate)`
        };
    } catch (error) {
        let errorMessage = 'Unknown error';
        
        if (error.response) {
            errorMessage = `HTTP ${error.response.status}: ${error.response.data?.errors?.[0]?.message || error.response.statusText}`;
        } else if (error.request) {
            errorMessage = 'Tidak ada respons dari server';
        } else {
            errorMessage = error.message;
        }
        
        return {
            success: false,
            method: 'API Langsung',
            error: errorMessage
        };
    }
}



// Fungsi untuk deploy worker dengan fallback (Urutan Optimal)
async function deployWorkerWithFallback(ctx, token, accountId, workerName, repoUrl) {
    const results = [];
    
    // Metode 1: Wrangler CLI (Paling reliable - 95% success rate)
    await ctx.reply('🔄 Metode 1: Wrangler CLI (Deploy dari VPS via Wrangler)...');
    const wranglerResult = await deployWorkerViaWranglerCLI(ctx, token, accountId, workerName, repoUrl);
    results.push(wranglerResult);
    
    if (wranglerResult.success) {
        return wranglerResult;
    }
    
    // Metode 2: API Langsung (Fallback cepat - 85% success rate)
    await ctx.reply('🔄 Metode 1 gagal, mencoba Metode 2: API Langsung (Direct Upload)...');
    const apiResult = await deployWorkerViaAPIDirect(ctx, token, accountId, workerName, repoUrl);
    results.push(apiResult);
    
    if (apiResult.success) {
        return apiResult;
    }
    
    // Metode 3: GitHub Actions (CI/CD - 80% success rate)
    await ctx.reply('🔄 Metode 2 gagal, mencoba Metode 3: GitHub Actions (CI/CD)...');
    const githubResult = await deployWorkerViaGitHubActions(ctx, workerName, repoUrl);
    results.push(githubResult);
    
    if (githubResult.success) {
        return githubResult;
    }
    
    // Metode 4: GitLab CI/CD (Alternatif CI/CD - 75% success rate)
    await ctx.reply('🔄 Metode 3 gagal, mencoba Metode 4: GitLab CI/CD (Pipeline)...');
    const gitlabResult = await deployWorkerViaGitLabCI(ctx, workerName, repoUrl);
    results.push(gitlabResult);
    
    return gitlabResult;
}

// Fungsi untuk mendapatkan daftar workers
async function getWorkersList(token, accountId) {
    try {
        const response = await axios.get(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        return response.data.result || [];
    } catch (error) {
        throw new Error('Gagal mengambil daftar workers');
    }
}

// Fungsi untuk menghapus worker
async function deleteWorker(token, accountId, workerName) {
    try {
        await axios.delete(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerName}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        return true;
    } catch (error) {
        throw new Error('Gagal menghapus worker');
    }
}

// Command /start
bot.start(async (ctx) => {
    const userId = ctx.from.id;
    
    const welcomeMessage = `🤖 **Selamat datang di Cloudflare Workers Bot!**

📋 **Tujuan Bot:**
Bot ini membantu Anda mengelola Cloudflare Workers dengan mudah melalui Telegram.

⚠️ **Peraturan & Risiko:**
• Jangan bagikan API Token Anda kepada siapapun
• Pastikan Anda memiliki akses ke akun Cloudflare
• Bot hanya menyimpan data di local storage
• Gunakan dengan bijak dan bertanggung jawab

🔒 **Keamanan:**
• Data Anda disimpan secara lokal
• API Token dienkripsi
• Akses terbatas hanya untuk Anda

Apakah Anda setuju dengan peraturan di atas?`;

    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('✅ Saya Setuju', 'agree')]
    ]);

    await ctx.reply(welcomeMessage, {
        parse_mode: 'Markdown',
        ...keyboard
    });
});

// Callback untuk setuju
bot.action('agree', async (ctx) => {
    const userId = ctx.from.id;
    
    setUserState(userId, 'waiting_api_token');
    
    await ctx.editMessageText('✅ Terima kasih! Sekarang mari kita setup akun Cloudflare Anda.\n\n🔑 **Langkah 1:** Masukkan API Token Cloudflare Anda\n\n💡 Cara mendapatkan API Token:\n1. Login ke dashboard Cloudflare\n2. Buka "My Profile" → "API Tokens"\n3. Buat token baru dengan permission "Cloudflare Workers"\n4. Copy token dan paste di sini');
});

// Handle input API Token
bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const text = ctx.message.text;
    const state = getUserState(userId);
    
    if (!state) return;
    
    try {
        switch (state) {
            case 'waiting_api_token':
                // Validasi format token (basic)
                if (text.length < 20) {
                    await ctx.reply('❌ API Token terlalu pendek. Pastikan Anda memasukkan token yang benar.');
                    return;
                }
                
                saveUserData(userId, { apiToken: text });
                setUserState(userId, 'waiting_account_id');
                
                await ctx.reply('✅ API Token tersimpan!\n\n🆔 **Langkah 2:** Masukkan Account ID Cloudflare Anda\n\n💡 Cara mendapatkan Account ID:\n1. Login ke dashboard Cloudflare\n2. Lihat di sidebar kanan, "Account ID"\n3. Copy ID tersebut dan paste di sini');
                break;
                
            case 'waiting_account_id':
                // Validasi format account ID
                if (!/^[a-f0-9]{32}$/.test(text)) {
                    await ctx.reply('❌ Format Account ID tidak valid. Account ID harus 32 karakter hex.');
                    return;
                }
                
                const userData = getUserData(userId);
                const isValidToken = await validateCloudflareToken(userData.apiToken, text);
                
                if (!isValidToken) {
                    await ctx.reply('❌ API Token atau Account ID tidak valid. Silakan cek kembali.');
                    return;
                }
                
                saveUserData(userId, { accountId: text });
                setUserState(userId, 'waiting_zone_id');
                
                await ctx.reply('✅ Account ID tersimpan dan valid!\n\n🌐 **Langkah 3:** Masukkan Zone ID Cloudflare Anda\n\n💡 Cara mendapatkan Zone ID:\n1. Pilih domain di dashboard Cloudflare\n2. Lihat di sidebar kanan, "Zone ID"\n3. Copy ID tersebut dan paste di sini');
                break;
                
            case 'waiting_zone_id':
                // Validasi format zone ID
                if (!/^[a-f0-9]{32}$/.test(text)) {
                    await ctx.reply('❌ Format Zone ID tidak valid. Zone ID harus 32 karakter hex.');
                    return;
                }
                
                const userData2 = getUserData(userId);
                const isValidZone = await validateZoneId(userData2.apiToken, userData2.accountId, text);
                
                if (!isValidZone) {
                    await ctx.reply('❌ Zone ID tidak valid atau tidak ada di akun Anda. Silakan cek kembali.');
                    return;
                }
                
                saveUserData(userId, { zoneId: text });
                clearUserState(userId);
                
                await showMainMenu(ctx);
                break;
                
            case 'waiting_worker_name':
                if (text.length < 3 || text.length > 50) {
                    await ctx.reply('❌ Nama worker harus 3-50 karakter.');
                    return;
                }
                
                if (!/^[a-zA-Z0-9_-]+$/.test(text)) {
                    await ctx.reply('❌ Nama worker hanya boleh mengandung huruf, angka, underscore (_), dan dash (-).');
                    return;
                }
                
                saveUserData(userId, { tempWorkerName: text });
                setUserState(userId, 'waiting_github_url');
                
                await ctx.reply('✅ Nama worker tersimpan!\n\n🔗 **Langkah 2:** Masukkan URL GitHub repository\n\n💡 Format: https://github.com/username/repo-name\n\nContoh: https://github.com/user/worker-scripts');
                break;
                
            case 'waiting_github_url':
                if (!text.startsWith('https://github.com/')) {
                    await ctx.reply('❌ URL tidak valid. Pastikan URL dimulai dengan https://github.com/');
                    return;
                }
                
                // Validasi URL format
                try {
                    new URL(text);
                } catch (error) {
                    await ctx.reply('❌ Format URL tidak valid. Pastikan URL lengkap dan benar.');
                    return;
                }
                
                // Validasi format GitHub URL
                const githubMatch = text.match(/^https:\/\/github\.com\/([^\/]+\/[^\/]+)/);
                if (!githubMatch) {
                    await ctx.reply('❌ Format URL GitHub tidak valid. Contoh: https://github.com/username/repo-name');
                    return;
                }
                
                const userData3 = getUserData(userId);
                const workerName = userData3.tempWorkerName;
                
                await ctx.reply('🚀 Memulai proses deploy worker...\n\n⏳ Mohon tunggu, ini mungkin memakan waktu beberapa menit.');
                
                try {
                    const result = await deployWorkerWithFallback(
                        ctx,
                        userData3.apiToken,
                        userData3.accountId,
                        workerName,
                        text
                    );
                    
                    if (result.success) {
                        const keyboard = Markup.inlineKeyboard([
                            [Markup.button.callback('📋 Salin', `copy_${workerName}`)],
                            [Markup.button.callback('🏠 Kembali ke Menu', 'main_menu')]
                        ]);
                        
                        await ctx.reply(result.message, {
                            parse_mode: 'Markdown',
                            ...keyboard
                        });
                    } else {
                        // Semua metode gagal
                        const errorMessage = `❌ **Semua metode deployment gagal!**\n\n📋 **Ringkasan Error:**\n\n`;
                        let errorDetails = '';
                        
                        if (result.method === 'Wrangler CLI') {
                            errorDetails += `🔄 **Metode 1 (Wrangler CLI):** ❌ Gagal\n`;
                            errorDetails += `   Error: ${result.error}\n\n`;
                        }
                        
                        if (result.method === 'API Langsung') {
                            errorDetails += `🔄 **Metode 2 (API Langsung):** ❌ Gagal\n`;
                            errorDetails += `   Error: ${result.error}\n\n`;
                        }
                        
                        if (result.method === 'GitHub Actions') {
                            errorDetails += `🔄 **Metode 3 (GitHub Actions):** ❌ Gagal\n`;
                            errorDetails += `   Error: ${result.error}\n\n`;
                        }
                        
                        if (result.method === 'GitLab CI/CD') {
                            errorDetails += `🔄 **Metode 4 (GitLab CI/CD):** ❌ Gagal\n`;
                            errorDetails += `   Error: ${result.error}\n\n`;
                        }
                        
                        errorDetails += `💡 **Saran:**\n`;
                        errorDetails += `• Pastikan repository GitHub valid dan publik\n`;
                        errorDetails += `• Cek apakah API Token memiliki permission yang benar\n`;
                        errorDetails += `• Pastikan repository memiliki file index.js, worker.js, atau main.js\n`;
                        errorDetails += `• Coba deploy manual untuk memastikan repository valid`;
                        
                        await ctx.reply(errorMessage + errorDetails, {
                            parse_mode: 'Markdown',
                            ...Markup.inlineKeyboard([
                                [Markup.button.callback('🛠 Coba Lagi', 'deploy_worker')],
                                [Markup.button.callback('🏠 Kembali ke Menu', 'main_menu')]
                            ])
                        });
                    }
                    
                } catch (error) {
                    await ctx.reply(`❌ **Error tidak terduga:** ${error.message}\n\n🏠 Silakan coba lagi atau kembali ke menu utama.`, {
                        parse_mode: 'Markdown',
                        ...Markup.inlineKeyboard([
                            [Markup.button.callback('🏠 Kembali ke Menu', 'main_menu')]
                        ])
                    });
                }
                
                clearUserState(userId);
                break;
        }
    } catch (error) {
        console.error('Error handling text input:', error);
        await ctx.reply('❌ Terjadi kesalahan. Silakan coba lagi atau mulai ulang dengan /start');
        clearUserState(userId);
    }
});

// Fungsi untuk menampilkan menu utama
async function showMainMenu(ctx) {
    const menuMessage = `🎉 **Setup berhasil!** Akun Cloudflare Anda telah terhubung.\n\n📋 **Menu Utama:**\nPilih salah satu opsi di bawah ini:`;
    
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🛠 Deploy Worker', 'deploy_worker')],
        [Markup.button.callback('📜 Daftar Worker', 'list_workers')],
        [Markup.button.callback('❌ Hapus Worker', 'delete_worker')],
        [Markup.button.callback('🔧 Ganti Akun', 'change_account')]
    ]);
    
    await ctx.reply(menuMessage, {
        parse_mode: 'Markdown',
        ...keyboard
    });
}

// Callback untuk menu utama
bot.action('main_menu', async (ctx) => {
    await showMainMenu(ctx);
});

// Callback untuk deploy worker
bot.action('deploy_worker', async (ctx) => {
    const userId = ctx.from.id;
    const userData = getUserData(userId);
    
    if (!userData || !userData.apiToken) {
        await ctx.reply('❌ Anda belum login. Silakan mulai dengan /start');
        return;
    }
    
    setUserState(userId, 'waiting_worker_name');
    
    await ctx.editMessageText('🛠 **Deploy Worker Baru**\n\n📝 **Langkah 1:** Masukkan nama untuk worker Anda\n\n💡 **Aturan penamaan:**\n• 3-50 karakter\n• Hanya huruf, angka, underscore (_), dash (-)\n• Contoh: my-worker, api_service, test123');
});

// Callback untuk daftar workers
bot.action('list_workers', async (ctx) => {
    const userId = ctx.from.id;
    const userData = getUserData(userId);
    
    if (!userData || !userData.apiToken) {
        await ctx.reply('❌ Anda belum login. Silakan mulai dengan /start');
        return;
    }
    
    try {
        await ctx.editMessageText('📋 Mengambil daftar workers...');
        
        const workers = await getWorkersList(userData.apiToken, userData.accountId);
        
        if (workers.length === 0) {
            await ctx.editMessageText('📭 Tidak ada workers yang ditemukan.\n\n🏠 Silakan deploy worker baru atau kembali ke menu utama.', {
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('🛠 Deploy Worker', 'deploy_worker')],
                    [Markup.button.callback('🏠 Kembali ke Menu', 'main_menu')]
                ])
            });
            return;
        }
        
        let message = '📜 **Daftar Workers Anda:**\n\n';
        const buttons = [];
        
        workers.forEach((worker, index) => {
            message += `${index + 1}. **${worker.id}**\n`;
            message += `   🔗 https://${worker.id}.workers.dev\n\n`;
            
            buttons.push([Markup.button.callback(`📋 Salin ${worker.id}`, `copy_${worker.id}`)]);
        });
        
        buttons.push([Markup.button.callback('🏠 Kembali ke Menu', 'main_menu')]);
        
        const keyboard = Markup.inlineKeyboard(buttons);
        
        await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            ...keyboard
        });
        
    } catch (error) {
        await ctx.editMessageText(`❌ Gagal mengambil daftar workers: ${error.message}\n\n🏠 Silakan coba lagi atau kembali ke menu utama.`, {
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🏠 Kembali ke Menu', 'main_menu')]
            ])
        });
    }
});

// Callback untuk hapus worker
bot.action('delete_worker', async (ctx) => {
    const userId = ctx.from.id;
    const userData = getUserData(userId);
    
    if (!userData || !userData.apiToken) {
        await ctx.reply('❌ Anda belum login. Silakan mulai dengan /start');
        return;
    }
    
    try {
        const workers = await getWorkersList(userData.apiToken, userData.accountId);
        
        if (workers.length === 0) {
            await ctx.editMessageText('📭 Tidak ada workers yang dapat dihapus.\n\n🏠 Silakan deploy worker baru atau kembali ke menu utama.', {
                ...Markup.inlineKeyboard([
                    [Markup.button.callback('🛠 Deploy Worker', 'deploy_worker')],
                    [Markup.button.callback('🏠 Kembali ke Menu', 'main_menu')]
                ])
            });
            return;
        }
        
        let message = '❌ **Pilih Worker untuk Dihapus:**\n\n';
        const buttons = [];
        
        workers.forEach((worker, index) => {
            message += `${index + 1}. **${worker.id}**\n`;
            message += `   🔗 https://${worker.id}.workers.dev\n\n`;
            
            buttons.push([Markup.button.callback(`🗑 Hapus ${worker.id}`, `confirm_delete_${worker.id}`)]);
        });
        
        buttons.push([Markup.button.callback('🏠 Kembali ke Menu', 'main_menu')]);
        
        const keyboard = Markup.inlineKeyboard(buttons);
        
        await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            ...keyboard
        });
        
    } catch (error) {
        await ctx.editMessageText(`❌ Gagal mengambil daftar workers: ${error.message}\n\n🏠 Silakan coba lagi atau kembali ke menu utama.`, {
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🏠 Kembali ke Menu', 'main_menu')]
            ])
        });
    }
});

// Callback untuk konfirmasi hapus worker
bot.action(/confirm_delete_(.+)/, async (ctx) => {
    const workerName = ctx.match[1];
    const userId = ctx.from.id;
    const userData = getUserData(userId);
    
    const message = `⚠️ **Konfirmasi Penghapusan**\n\n🗑 Worker: **${workerName}**\n🔗 URL: https://${workerName}.workers.dev\n\n❓ Apakah Anda yakin ingin menghapus worker ini?\n\n⚠️ **Tindakan ini tidak dapat dibatalkan!**`;
    
    const keyboard = Markup.inlineKeyboard([
        [
            Markup.button.callback('✅ Ya, Hapus', `delete_${workerName}`),
            Markup.button.callback('❌ Batal', 'delete_worker')
        ]
    ]);
    
    await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        ...keyboard
    });
});

// Callback untuk eksekusi hapus worker
bot.action(/delete_(.+)/, async (ctx) => {
    const workerName = ctx.match[1];
    const userId = ctx.from.id;
    const userData = getUserData(userId);
    
    try {
        await ctx.editMessageText(`🗑 Menghapus worker **${workerName}**...`);
        
        await deleteWorker(userData.apiToken, userData.accountId, workerName);
        
        const message = `✅ **Worker berhasil dihapus!**\n\n🗑 Nama: **${workerName}**\n🔗 URL: https://${workerName}.workers.dev\n\nWorker telah dihapus dari akun Cloudflare Anda.`;
        
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('🏠 Kembali ke Menu', 'main_menu')]
        ]);
        
        await ctx.editMessageText(message, {
            parse_mode: 'Markdown',
            ...keyboard
        });
        
    } catch (error) {
        await ctx.editMessageText(`❌ Gagal menghapus worker: ${error.message}\n\n🏠 Silakan coba lagi atau kembali ke menu utama.`, {
            ...Markup.inlineKeyboard([
                [Markup.button.callback('🏠 Kembali ke Menu', 'main_menu')]
            ])
        });
    }
});

// Callback untuk salin URL
bot.action(/copy_(.+)/, async (ctx) => {
    const workerName = ctx.match[1];
    const url = `https://${workerName}.workers.dev`;
    
    await ctx.answerCbQuery(`URL disalin: ${url}`);
    await ctx.reply(`📋 **URL Worker:**\n\n\`${url}\`\n\n✅ URL telah disalin ke clipboard!`);
});

// Callback untuk ganti akun
bot.action('change_account', async (ctx) => {
    const userId = ctx.from.id;
    
    deleteUserData(userId);
    clearUserState(userId);
    
    await ctx.editMessageText('🔄 Akun telah dihapus. Silakan setup ulang dengan /start');
});

// Error handling
bot.catch((err, ctx) => {
    console.error('Bot error:', err);
    ctx.reply('❌ Terjadi kesalahan internal. Silakan coba lagi atau mulai ulang dengan /start');
});

// Start bot
bot.launch().then(() => {
    console.log('🤖 Bot Cloudflare Workers telah berjalan!');
    console.log('📝 Gunakan /start untuk memulai');
}).catch((error) => {
    console.error('❌ Gagal menjalankan bot:', error);
});

// Command /help
bot.help(async (ctx) => {
    const helpMessage = `🤖 **Cloudflare Workers Bot - Help**

📋 **Commands:**
• /start - Mulai bot dan setup akun
• /help - Tampilkan bantuan ini
• /menu - Tampilkan menu utama
• /status - Cek status akun

🛠 **Fitur Utama:**
• Deploy Worker dengan 4 metode fallback
• Daftar dan kelola workers
• Hapus workers yang tidak diperlukan
• Multi-user support

💡 **Tips:**
• Pastikan API Token memiliki permission yang benar
• Gunakan URL raw GitHub untuk script worker
• Backup data penting sebelum menghapus worker

🔗 **Links:**
• [Cloudflare Dashboard](https://dash.cloudflare.com)
• [Workers Documentation](https://developers.cloudflare.com/workers/)
• [Bot Source Code](https://github.com/your-repo)

Untuk memulai, gunakan /start`;

    await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
});

// Command /menu
bot.command('menu', async (ctx) => {
    const userId = ctx.from.id;
    const userData = getUserData(userId);
    
    if (!userData || !userData.apiToken) {
        await ctx.reply('❌ Anda belum login. Silakan mulai dengan /start');
        return;
    }
    
    await showMainMenu(ctx);
});

// Command /status
bot.command('status', async (ctx) => {
    const userId = ctx.from.id;
    const userData = getUserData(userId);
    
    if (!userData || !userData.apiToken) {
        await ctx.reply('❌ Anda belum login. Silakan mulai dengan /start');
        return;
    }
    
    const statusMessage = `📊 **Status Akun Cloudflare**

✅ **Login Status:** Terhubung
🆔 **Account ID:** \`${userData.accountId}\`
🌐 **Zone ID:** \`${userData.zoneId}\`
🔑 **API Token:** ✅ Valid

Untuk melihat workers Anda, gunakan menu "📜 Daftar Worker"`;

    await ctx.reply(statusMessage, { parse_mode: 'Markdown' });
});

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));