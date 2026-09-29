import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { pages } from '../site.config.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, 'dist');
if (resolve(output) !== resolve(root, 'dist') || relative(root, output) !== 'dist' || !resolve(output).startsWith(root + sep)) {
  throw new Error('Refusing to remove an output directory outside the site workspace');
}
const template = await readFile(join(root, 'src/layouts/base.html'), 'utf8');

for (const token of ['title', 'page', 'content', 'styles']) {
  const marker = `{{${token}}}`;
  if (template.split(marker).length !== 2) throw new Error(`Layout must contain ${marker} exactly once`);
}

function render(page, content) {
  return template
    .replace('{{title}}', page.title)
    .replace('{{page}}', page.slug)
    .replace('{{styles}}', page.stylesheet ? `<link rel="stylesheet" href="${page.stylesheet}">` : '')
    .replace('{{content}}', content);
}

function redirect(destination) {
  return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="refresh" content="0; url=${destination}"><link rel="canonical" href="${destination}"><title>Thailand Run Sheet</title></head><body><p>This page moved to <a href="${destination}">${destination}</a>.</p></body></html>\n`;
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const page of pages) {
  const content = await readFile(join(root, 'src/pages', `${page.slug}.html`), 'utf8');
  if (/<\/?main\b/i.test(content)) throw new Error(`Fragment ${page.slug} must not include <main>`);
  const directory = page.slug === 'index' ? output : join(output, page.slug);
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, 'index.html'), render(page, content));
  if (page.slug !== 'index') await writeFile(join(output, `${page.slug}.html`), redirect(`/${page.slug}/`));
}

await writeFile(join(output, 'activities.html'), redirect('/#activities'));
await mkdir(join(output, 'activities'), { recursive: true });
await writeFile(join(output, 'activities/index.html'), redirect('/#activities'));
await cp(join(root, 'src/assets'), join(output, 'assets'), { recursive: true });
console.log(`Built ${pages.length} pages in dist/`);
