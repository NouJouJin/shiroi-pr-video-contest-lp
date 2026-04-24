import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const root = process.cwd();
const preferredPort = Number(process.env.PORT || 4173);
const host = process.env.HOST || '127.0.0.1';

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function routePath(pathname) {
  if (pathname === '/' || pathname === '/SHIROI') return '/SHIROI.html';
  if (pathname === '/gallery') return '/gallery.html';
  return pathname;
}

function fileFromUrl(url) {
  const { pathname } = new URL(url, `http://${host}:${preferredPort}`);
  const routed = routePath(decodeURIComponent(pathname));
  const relative = routed.split('/').filter(Boolean).join(sep);
  return resolve(root, relative);
}

function createAppServer() {
  return createServer(async (req, res) => {
    try {
      const file = fileFromUrl(req.url || '/');

      if (!file.startsWith(root)) {
        res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
        res.end('Forbidden');
        return;
      }

      const body = await readFile(file);
      const contentType = types[extname(file).toLowerCase()] || 'application/octet-stream';
      res.writeHead(200, { 'content-type': contentType });
      res.end(body);
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Not found');
    }
  });
}

function listen(port, attemptsLeft = 20) {
  const server = createAppServer();

  server.once('error', (error) => {
    if (error.code === 'EADDRINUSE' && attemptsLeft > 0) {
      server.close();
      listen(port + 1, attemptsLeft - 1);
      return;
    }

    throw error;
  });

  server.listen(port, host, () => {
    console.log(`Local preview: http://${host}:${port}/SHIROI.html`);
    console.log(`Gallery:       http://${host}:${port}/gallery`);
  });
}

listen(preferredPort);
