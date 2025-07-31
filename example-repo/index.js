// Example Cloudflare Worker Script
// Repository: https://github.com/username/example-repo

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
          <title>Example Cloudflare Worker</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 40px; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
            }
            .container { 
              max-width: 600px; 
              margin: 0 auto; 
              background: rgba(255,255,255,0.1);
              padding: 30px;
              border-radius: 15px;
              backdrop-filter: blur(10px);
            }
            .success { color: #4ade80; }
            .info { color: #60a5fa; }
            .endpoint { 
              background: rgba(255,255,255,0.2);
              padding: 10px;
              border-radius: 5px;
              margin: 10px 0;
            }
            a { color: #fbbf24; text-decoration: none; }
            a:hover { text-decoration: underline; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🚀 Example Cloudflare Worker</h1>
            <p class="success">✅ Successfully deployed via Telegram Bot!</p>
            <p>This is an example worker deployed using the Telegram bot.</p>
            
            <h2>📋 Available Endpoints:</h2>
            <div class="endpoint">
              <strong>/</strong> - This page (HTML)
            </div>
            <div class="endpoint">
              <strong>/api</strong> - JSON API response
            </div>
            <div class="endpoint">
              <strong>/status</strong> - Worker status
            </div>
            <div class="endpoint">
              <strong>/time</strong> - Server time
            </div>
            
            <p class="info">🔗 <a href="/api">Try /api endpoint</a></p>
            <p class="info">📊 <a href="/status">Check status</a></p>
            <p class="info">⏰ <a href="/time">Get server time</a></p>
          </div>
        </body>
        </html>
      `, {
        headers: { 'content-type': 'text/html;charset=UTF-8' }
      })
      
    case '/api':
      return new Response(JSON.stringify({
        success: true,
        message: 'Example Cloudflare Worker API',
        timestamp: new Date().toISOString(),
        endpoints: ['/', '/api', '/status', '/time'],
        deployed_by: 'Telegram Bot',
        repository: 'https://github.com/username/example-repo'
      }, null, 2), {
        headers: { 'content-type': 'application/json' }
      })
      
    case '/status':
      return new Response(JSON.stringify({
        status: 'online',
        uptime: 'running',
        deployed: true,
        method: 'Telegram Bot',
        worker_name: 'example-worker',
        environment: 'production'
      }, null, 2), {
        headers: { 'content-type': 'application/json' }
      })
      
    case '/time':
      return new Response(JSON.stringify({
        serverTime: new Date().toISOString(),
        timezone: 'UTC',
        timestamp: Date.now(),
        formatted: new Date().toLocaleString()
      }, null, 2), {
        headers: { 'content-type': 'application/json' }
      })
      
    default:
      return new Response(JSON.stringify({
        error: 'Not Found',
        message: 'Endpoint not found',
        available_endpoints: ['/', '/api', '/status', '/time']
      }, null, 2), {
        status: 404,
        headers: { 'content-type': 'application/json' }
      })
  }
}