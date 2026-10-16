import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const siteRoot = path.resolve(process.argv[2] || repositoryRoot);
const htmlPath = path.join(siteRoot, 'index.html');
assert.ok(existsSync(htmlPath), `Missing deployed entrypoint: ${htmlPath}`);

const html = readFileSync(htmlPath, 'utf8');
const moduleScriptTags = [...html.matchAll(/<script\\b[^>]*>/gi)]
  .map(([tag]) => tag)
  .filter(tag => /\\btype=["']module["']/i.test(tag))
  .map(tag => tag.match(/\\bsrc=["']([^"']+)["']/i)?.[1])
  .filter(Boolean);
assert.ok(moduleScriptTags.length > 0, 'The browser entrypoint has no module scripts.');

const visited = new Set();
function visitModule(relativePath) {
  const filePath = path.resolve(siteRoot, relativePath);
  assert.ok(filePath.startsWith(siteRoot + path.sep), `Module escaped site root: ${relativePath}`);
  assert.ok(existsSync(filePath), `Missing browser module: ${path.relative(siteRoot, filePath)}`);
  const rel = path.relative(siteRoot, filePath).split(path.sep).join('/');
  if (visited.has(rel)) return;
  visited.add(rel);

  const source = readFileSync(filePath, 'utf8');
  const imports = /\\bimport\\s+(?:[^'"]*?\\s+from\\s*)?["']([^"']+)["']/g;
  for (const [, specifier] of source.matchAll(imports)) {
    if (!specifier.startsWith('.')) continue;
    const childPath = path.posix.normalize(path.posix.join(path.posix.dirname(rel), specifier));
    visitModule(childPath);
  }
}
for (const sourcePath of moduleScriptTags) {
  if (sourcePath.startsWith('.')) visitModule(decodeURIComponent(sourcePath.split(/[?#]/, 1)[0]));
}
assert.ok(visited.has('core/browser-bass-bootstrap.js'), 'The bassline bootstrap is not included in the packaged module graph.');
assert.ok(visited.has('core/bass-track.js'), 'The bassline track module is not included in the packaged module graph.');
assert.ok(visited.has('core/bass-generator.js'), 'The bassline generator module is not included in the packaged module graph.');
assert.match(html, /chordon-bass-ready/, 'The browser UI does not wait for the bassline bootstrap event.');
console.log(`Packaged browser module graph is complete (${visited.size} modules).`);
