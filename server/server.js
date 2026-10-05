require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { routeApi } = require('./router');
const db = require('./db');

require('dotenv').config();

console.log("DB_USER =", JSON.stringify(process.env.DB_USER));
console.log("DB_PASSWORD =", process.env.DB_PASSWORD ? "Loaded" : "Missing");
console.log("DB_SERVICE_NAME =", process.env.DB_SERVICE_NAME);

const PORT = parseInt(process.env.PORT || '3000', 10);
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

function serveStatic(req, res) {
  const parsed = url.parse(req.url);
  let pathname = decodeURIComponent(parsed.pathname);
  if (pathname === '/') pathname = '/index.html';

  // Prevent directory traversal
  const safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      // SPA-ish fallback: unknown .html paths -> 404 page, others -> 404
      res.writeHead(404, { 'Content-Type': 'text/html' });
      return res.end('<h1>404 - Page not found</h1><p><a href="/">Go home</a></p>');
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const handled = await routeApi(req, res);
    if (handled) return;
    serveStatic(req, res);
  } catch (err) {
    console.error('[server] unhandled error', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Internal server error.' }));
    }
  }
});

async function start() {
  try {
    await db.initPool();
  } catch (err) {
    console.error('\n[FATAL] Could not connect to Oracle database.');
    console.error('Check your .env DB_USER / DB_PASSWORD / DB_HOST / DB_PORT / DB_SERVICE_NAME values.');
    console.error(err.message);
    console.error('\nStarting HTTP server anyway so static pages still load, but API calls will fail until the DB connection works.\n');
  }
  server.listen(PORT, () => {
    const openUrl = `http://localhost:${PORT}`;
    console.log(`\n  Inovaantage Payroll Portal running at ${openUrl}\n`);
    if (process.env.OPEN_BROWSER !== 'false') {
      openInBrowser(openUrl);
    }
  });
}

/**
 * Best-effort cross-platform "open URL in default browser", no extra
 * npm dependency required. Failures are logged but never crash the server.
 */
function openInBrowser(target) {
  const { exec } = require('child_process');
  const platform = process.platform;
  let cmd;
  if (platform === 'darwin') cmd = `open "${target}"`;
  else if (platform === 'win32') cmd = `start "" "${target}"`;
  else cmd = `xdg-open "${target}"`; // linux and others

  exec(cmd, (err) => {
    if (err) {
      console.log(`(Could not auto-open browser — visit ${target} manually.)`);
    }
  });
}

process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await db.closePool().catch(() => {});
  process.exit(0);
});

start();
