import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync, watch } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, extname, join, resolve, sep } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, 'dist');
const port = Number(process.argv[2] ?? process.env.PORT ?? 4317);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid port');

function build() {
  return new Promise((done, fail) => {
    const child = spawn(process.execPath, [join(root, 'scripts/build.mjs')], { cwd: root, stdio: 'inherit' });
    child.on('error', fail);
    child.on('exit', code => code === 0 ? done() : fail(new Error(`Build exited ${code}`)));
  });
}

await build();

const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon' };
createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://127.0.0.1');
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.includes('\\') || pathname.includes('\0') || pathname.split('/').includes('..')) {
      response.writeHead(400).end('Invalid path');
      return;
    }
    if (pathname !== '/' && !extname(pathname) && !pathname.endsWith('/')) {
      response.writeHead(308, { Location: pathname + '/' + url.search }).end();
      return;
    }
    const target = resolve(output, '.' + pathname, pathname.endsWith('/') ? 'index.html' : '');
    if (target !== output && !target.startsWith(output + sep)) {
      response.writeHead(400).end('Invalid path');
      return;
    }
    const info = await stat(target);
    if (!info.isFile()) throw new Error('Not a file');
    const body = await readFile(target);
    response.writeHead(200, { 'Content-Type': types[extname(target)] ?? 'application/octet-stream', 'Content-Length': body.length, 'Cache-Control': 'no-store' });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch {
    response.writeHead(404).end('Not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`Thailand Run Sheet: http://127.0.0.1:${port}/`));

let timer;
let pending = Promise.resolve();
for (const path of ['src', 'site.config.js']) {
  if (!existsSync(join(root, path))) continue;
  watch(join(root, path), { recursive: path === 'src' }, () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      pending = pending.then(build).catch(error => console.error(error));
    }, 150);
  });
}
