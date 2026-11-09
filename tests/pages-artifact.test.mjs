import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const siteRoot = path.resolve(process.argv[2] || repositoryRoot);
const read = relative => {
  const file = path.join(siteRoot, relative);
  assert.ok(existsSync(file), `Missing packaged browser file: ${relative}`);
  return readFileSync(file, 'utf8');
};
const html = read('index.html');
assert.ok(html.includes('src="./core/minimal-app.mjs"'), 'Minimal instrument must be the entrypoint.');
assert.ok(!html.includes('browser-bass-bootstrap'), 'Minimal instrument must not start the bass track.');
read('minimal.css');
read('core/fm1-surface.mjs');
assert.ok(html.includes('./core/fm1-surface.mjs'));
assert.equal((html.match(/class="encoder"/g)||[]).length,4,'Four right-side encoders');
assert.equal((html.match(/class="physical-knob unused"/g)||[]).length,5,'Five unused encoders stay dark');
const visited = new Set();
function visit(relative) {
  if (visited.has(relative)) return;
  visited.add(relative);
  const code = read(relative);
  for (const match of code.matchAll(/(?:from\s*|import\s*)['"](\.\.?\/[^'"]+)['"]/g)) {
    visit(path.posix.normalize(path.posix.join(path.posix.dirname(relative), match[1])));
  }
}
visit('core/minimal-app.mjs');
assert.ok(visited.has('core/minimal-sounds.mjs'));
assert.ok(visited.has('assets/dx7/aquanode-presets.js'));
assert.ok(visited.has('vendor/opendx7/dx7-patch.js'));
read('vendor/opendx7/dx7-processor.js');
assert.ok(html.includes('id="preset"'));
assert.match(html,/id="tempo"[^>]*role="slider"/);
assert.ok(html.includes('id="tempo-display"'));
const classic = read('classic.html');
assert.ok(classic.includes('src="./core/browser-bass-bootstrap.js"'));
assert.ok(classic.includes('chordon-bass-ready'));
for (const file of ['core/browser-bass-bootstrap.js','core/bass-track.js','core/bass-generator.js', 'assets/dx7/aquanode-presets.js','vendor/opendx7/dx7-processor.js','vendor/opendx7/dx7-patch.js']) read(file);
console.log('PASS Minimal entrypoint, recursive module graph and retained Classic dependencies.');
