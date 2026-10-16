import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const siteRoot = path.resolve(process.argv[2] || repositoryRoot);
const htmlPath = path.join(siteRoot, 'index.html');
assert.ok(existsSync(htmlPath), `Missing deployed entrypoint: ${htmlPath}`);

const html = readFileSync(htmlPath, 'utf8');
assert.ok(
  html.includes('<script type="module" src="./core/browser-bass-bootstrap.js">'),
  'The browser entrypoint must load the bassline bootstrap module.'
);

const modulePaths = [
  'core/browser-bass-bootstrap.js',
  'core/bass-track.js',
  'core/bass-generator.js'
];
for (const relativePath of modulePaths) {
  const filePath = path.join(siteRoot, relativePath);
  assert.ok(existsSync(filePath), `Missing browser module: ${relativePath}`);
}
const bootstrap = readFileSync(path.join(siteRoot, modulePaths[0]), 'utf8');
assert.ok(bootstrap.includes('./bass-track.js'), 'Bassline bootstrap is missing its track dependency.');
assert.ok(bootstrap.includes('./bass-generator.js'), 'Bassline bootstrap is missing its generator dependency.');
assert.ok(html.includes('chordon-bass-ready'), 'The browser UI does not wait for the bassline bootstrap event.');

console.log('Packaged browser entrypoint and bassline modules are present.');
