import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pages } from '../site.config.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

async function file(path) {
  return readFile(join(dist, path), 'utf8');
}

test('every content page has a complete, single-main clean route and a legacy link', async () => {
  for (const page of pages) {
    const route = page.slug === 'index' ? 'index.html' : `${page.slug}/index.html`;
    const html = await file(route);
    assert.equal((html.match(/<main\b/g) ?? []).length, 1, route);
    assert.equal((html.match(/<\/main>/g) ?? []).length, 1, route);
    assert.match(html, new RegExp(`<body data-page="${page.slug}"`), route);
    assert.ok(html.includes(page.title), route);
    assert.match(html, /src="\/assets\/js\/app\.js"/, route);
    assert.match(html, /href="\/assets\/styles\/main\.css"/, route);
    if (page.slug !== 'index') {
      assert.match(await file(`${page.slug}.html`), new RegExp(`url=/${page.slug}/`));
    }
  }
  assert.match(await file('activities.html'), /url=\/#activities/);
  assert.match(await file('activities/index.html'), /url=\/#activities/);
});

test('generated local links and referenced assets resolve', async () => {
  for (const page of pages) {
    const route = page.slug === 'index' ? '/' : `/${page.slug}/`;
    const html = await file(page.slug === 'index' ? 'index.html' : `${page.slug}/index.html`);
    const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
    for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
      const link = match[1];
      if (/^(?:https?:|mailto:|tel:|data:)/i.test(link)) continue;
      const url = new URL(link, `http://localhost${route}`);
      if (url.pathname === route && url.hash) {
        assert.ok(ids.has(decodeURIComponent(url.hash.slice(1))), `${route} missing ${link}`);
      }
      const target = url.pathname.endsWith('/') ? `${url.pathname}index.html` : url.pathname;
      const info = await stat(join(dist, decodeURIComponent(target)));
      assert.ok(info.isFile(), `${route} -> ${link}`);
    }
  }
});
