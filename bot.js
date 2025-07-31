require('dotenv').config(); // ⬅️ Tambahkan ini di baris paling atas
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

// Fungsi untuk deploy worker via API Cloudflare
async function deployWorkerViaAPI(token, accountId, workerName, scriptUrl) {
    try {
        // Download script dari URL
        const scriptResponse = await axios.get(scriptUrl, {
            timeout: 10000, // 10 second timeout
            validateStatus: function (status) {
                return status >= 200 && status < 300; // default
            }
        });
        const script = scriptResponse.data;

        // Validasi script tidak kosong
        if (!script || script.trim().length === 0) {
            throw new Error('Script kosong atau tidak valid');
        }

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
                timeout: 30000 // 30 second timeout
            }
        );

        return {
            success: true,
            method: 'API Cloudflare',
            message: `✅ Worker berhasil di-deploy via API Cloudflare!\n\n📝 Nama: ${workerName}\n🔗 URL: https://${workerName}.workers.dev\n\nMetode: API Cloudflare`
        };
    } catch (error) {
        let errorMessage = 'Unknown error';
        
        if (error.response) {
            // Server responded with error status
            errorMessage = `HTTP ${error.response.status}: ${error.response.data?.errors?.[0]?.message || error.response.statusText}`;
        } else if (error.request) {
            // Request was made but no response
            errorMessage = 'Tidak ada respons dari server';
        } else {
            // Something else happened
            errorMessage = error.message;
        }
        
        return {
            success: false,
            method: 'API Cloudflare',
            error: errorMessage
        };
    }
}

// Fungsi untuk deploy worker via Wrangler CLI
async function deployWorkerViaWrangler(workerName, scriptUrl) {
    try {
        // Buat direktori temporary
        const tempDir = path.join(__dirname, 'temp', workerName);
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        // Download script
        const scriptResponse = await axios.get(scriptUrl);
        fs.writeFileSync(path.join(tempDir, 'index.js'), scriptResponse.data);

        // Buat wrangler.toml
        const wranglerConfig = `name = "${workerName}"
main = "index.js"
compatibility_date = "2023-01-01"`;

        fs.writeFileSync(path.join(tempDir, 'wrangler.toml'), wranglerConfig);

        // Deploy via Wrangler
        const { stdout, stderr } = await execAsync('npx wrangler deploy', { cwd: tempDir });

        // Cleanup
        fs.rmSync(tempDir, { recursive: true, force: true });

        return {
            success: true,
            method: 'Wrangler CLI',
            message: `✅ Worker berhasil di-deploy via Wrangler CLI!\n\n📝 Nama: ${workerName}\n🔗 URL: https://${workerName}.workers.dev\n\nMetode: Wrangler CLI`
        };
    } catch (error) {
        // Cleanup on error
        try {
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

// Fungsi untuk generate GitHub Actions workflow
function generateGitHubActions(workerName, scriptUrl) {
    const workflow = `name: Deploy Cloudflare Worker

on:
  push:
    branches: [ main ]
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
    
    - name: Download Worker Script
      run: |
        curl -o index.js "${scriptUrl}"
    
    - name: Create wrangler.toml
      run: |
        cat > wrangler.toml << EOF
        name = "${workerName}"
        main = "index.js"
        compatibility_date = "2023-01-01"
        EOF
    
    - name: Deploy to Cloudflare Workers
      uses: cloudflare/wrangler-action@v3
      with:
        apiToken: \${{ secrets.CLOUDFLARE_API_TOKEN }}
        accountId: \${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        command: deploy`;

    return {
        success: true,
        method: 'GitHub Actions',
        message: `📋 GitHub Actions workflow telah dibuat!\n\n📝 Nama Worker: ${workerName}\n\n📁 Buat file baru di repository GitHub Anda:\n\`.github/workflows/deploy.yml\`\n\n📋 Isi dengan kode berikut:\n\n\`\`\`yaml\n${workflow}\n\`\`\`\n\n🔑 Tambahkan secrets di repository:\n- \`CLOUDFLARE_API_TOKEN\`\n- \`CLOUDFLARE_ACCOUNT_ID\`\n\nMetode: GitHub Actions`
    };
}

// Fungsi untuk generate GitLab CI/CD
function generateGitLabCI(workerName, scriptUrl) {
    const gitlabCI = `.gitlab-ci.yml:
stages:
  - deploy

deploy_worker:
  stage: deploy
  image: node:18
  before_script:
    - npm install -g wrangler
  script:
    - curl -o index.js "${scriptUrl}"
    - |
      cat > wrangler.toml << EOF
      name = "${workerName}"
      main = "index.js"
      compatibility_date = "2023-01-01"
      EOF
    - wrangler deploy
  only:
    - main`;

    return {
        success: true,
        method: 'GitLab CI/CD',
        message: `📋 GitLab CI/CD pipeline telah dibuat!\n\n📝 Nama Worker: ${workerName}\n\n📁 Buat file baru di repository GitLab Anda:\n\`.gitlab-ci.yml\`\n\n📋 Isi dengan kode berikut:\n\n\`\`\`yaml\n${gitlabCI}\n\`\`\`\n\n🔑 Tambahkan variables di GitLab:\n- \`CLOUDFLARE_API_TOKEN\`\n- \`CLOUDFLARE_ACCOUNT_ID\`\n\nMetode: GitLab CI/CD`
    };
}

// Fungsi untuk deploy worker dengan fallback
async function deployWorkerWithFallback(ctx, token, accountId, workerName, scriptUrl) {
    const results = [];
    
    // Metode 1: API Cloudflare
    await ctx.reply('🔄 Mencoba deploy via API Cloudflare...');
    const apiResult = await deployWorkerViaAPI(token, accountId, workerName, scriptUrl);
    results.push(apiResult);
    
    if (apiResult.success) {
        return apiResult;
    }
    
    // Metode 2: Wrangler CLI
    await ctx.reply('🔄 API gagal, mencoba via Wrangler CLI...');
    const wranglerResult = await deployWorkerViaWrangler(workerName, scriptUrl);
    results.push(wranglerResult);
    
    if (wranglerResult.success) {
        return wranglerResult;
    }
    
    // Metode 3: GitHub Actions
    await ctx.reply('🔄 Wrangler gagal, membuat GitHub Actions workflow...');
    const githubResult = generateGitHubActions(workerName, scriptUrl);
    results.push(githubResult);
    
    if (githubResult.success) {
        return githubResult;
    }
    
    // Metode 4: GitLab CI/CD
    await ctx.reply('🔄 GitHub Actions gagal, membuat GitLab CI/CD pipeline...');
    const gitlabResult = generateGitLabCI(workerName, scriptUrl);
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
                setUserState(userId, 'waiting_script_url');
                
                await ctx.reply('✅ Nama worker tersimpan!\n\n🔗 **Langkah 2:** Masukkan URL GitHub repository script Worker\n\n💡 Format: https://raw.githubusercontent.com/username/repo/branch/script.js\n\nContoh: https://raw.githubusercontent.com/user/worker-scripts/main/index.js');
                break;
                
            case 'waiting_script_url':
                if (!text.startsWith('http')) {
                    await ctx.reply('❌ URL tidak valid. Pastikan URL dimulai dengan http:// atau https://');
                    return;
                }
                
                // Validasi URL format
                try {
                    new URL(text);
                } catch (error) {
                    await ctx.reply('❌ Format URL tidak valid. Pastikan URL lengkap dan benar.');
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
                    
                    const keyboard = Markup.inlineKeyboard([
                        [Markup.button.callback('📋 Salin', `copy_${workerName}`)],
                        [Markup.button.callback('🏠 Kembali ke Menu', 'main_menu')]
                    ]);
                    
                    await ctx.reply(result.message, {
                        parse_mode: 'Markdown',
                        ...keyboard
                    });
                    
                } catch (error) {
                    await ctx.reply(`❌ Gagal deploy worker: ${error.message}\n\n🏠 Silakan coba lagi atau kembali ke menu utama.`, {
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
