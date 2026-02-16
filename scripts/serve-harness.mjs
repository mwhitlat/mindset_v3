import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { watch } from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 4173);

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const sseClients = new Set();
let reloadTimer = null;

function scheduleReloadBroadcast() {
  if (reloadTimer) clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => {
    for (const res of sseClients) {
      res.write('event: reload\ndata: changed\n\n');
    }
  }, 120);
}

function setupWatchers() {
  const watchRoots = [
    projectRoot,
    path.join(projectRoot, 'tests'),
    path.join(projectRoot, 'scripts')
  ];

  for (const root of watchRoots) {
    try {
      watch(root, { recursive: true }, (eventType, filename) => {
        if (!filename) return;
        if (filename.includes('.git/')) return;
        if (filename.includes('node_modules/')) return;
        scheduleReloadBroadcast();
      });
    } catch {
      // Ignore watcher failures on unsupported platforms for recursive mode.
    }
  }
}

const server = createServer(async (req, res) => {
  try {
    const reqUrl = new URL(req.url || '/', `http://${req.headers.host}`);

    if (reqUrl.pathname === '/__events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
      });
      res.write('\n');
      sseClients.add(res);
      req.on('close', () => {
        sseClients.delete(res);
      });
      return;
    }

    const relativePath = reqUrl.pathname === '/' ? '/tests/harness/harness.html' : reqUrl.pathname;
    const filePath = path.normalize(path.join(projectRoot, relativePath));

    if (!filePath.startsWith(projectRoot)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mime = mimeTypes[ext] || 'application/octet-stream';
    const content = await readFile(filePath);

    res.writeHead(200, { 'Content-Type': mime });
    res.end(content);
  } catch (error) {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(port, () => {
  const harnessUrl = `http://127.0.0.1:${port}/tests/harness/harness.html`;
  console.log(`Harness server running on port ${port}`);
  console.log(`Open: ${harnessUrl}`);
  console.log('Live reload: enabled');
});

setupWatchers();
