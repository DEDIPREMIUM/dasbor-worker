// Contoh script Cloudflare Worker untuk testing bot
// Simpan file ini di GitHub dan gunakan URL raw untuk deploy

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const path = url.pathname
  
  // Handle different routes
  switch (path) {
    case '/':
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Cloudflare Worker Bot Test</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .container { max-width: 600px; margin: 0 auto; }
            .success { color: #28a745; }
            .info { color: #17a2b8; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🤖 Cloudflare Worker Bot Test</h1>
            <p class="success">✅ Worker berhasil di-deploy via Telegram Bot!</p>
            <p>Ini adalah contoh worker yang dibuat menggunakan bot Telegram.</p>
            <h2>📋 Endpoints yang tersedia:</h2>
            <ul>
              <li><code>/</code> - Halaman ini</li>
              <li><code>/api</code> - JSON API</li>
              <li><code>/status</code> - Status worker</li>
              <li><code>/time</code> - Waktu server</li>
            </ul>
            <p class="info">🔗 <a href="/api">Coba endpoint /api</a></p>
          </div>
        </body>
        </html>
      `, {
        headers: { 'content-type': 'text/html;charset=UTF-8' }
      })
      
    case '/api':
      return new Response(JSON.stringify({
        success: true,
        message: 'Worker berhasil di-deploy via Telegram Bot!',
        timestamp: new Date().toISOString(),
        endpoints: ['/', '/api', '/status', '/time'],
        bot: 'Cloudflare Workers Telegram Bot'
      }, null, 2), {
        headers: { 'content-type': 'application/json' }
      })
      
    case '/status':
      return new Response(JSON.stringify({
        status: 'online',
        uptime: 'running',
        deployed: true,
        method: 'Telegram Bot'
      }, null, 2), {
        headers: { 'content-type': 'application/json' }
      })
      
    case '/time':
      return new Response(JSON.stringify({
        serverTime: new Date().toISOString(),
        timezone: 'UTC',
        timestamp: Date.now()
      }, null, 2), {
        headers: { 'content-type': 'application/json' }
      })
      
    default:
      return new Response('Not Found', { status: 404 })
  }
}