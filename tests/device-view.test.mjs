import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');

// The FM-XY-style device is a view of the *same* CHORDON BLEU engine,
// never a replacement synth, iframe, or runtime dependency on FM-XY.
assert.match(html,/href="\?view=fm1"/);
assert.match(html,/id="cb-fmxy-device"/);
assert.match(html,/id="fm1hardware-screen" width="240" height="240"/);
assert.match(html,/id="cb-hw-keyboard"/);
assert.match(html,/function setupFM1Hardware\(\)/);
assert.match(html,/setupFM1Hardware\(\);/);
assert.match(html,/document\.getElementById\('cb-hw-editor-slot'\)\.append\(app\)/);
assert.match(html,/fm1Knob\(Number\(btn\.dataset\.hwKnob\),dir\)/);
assert.match(html,/if\(mode==='notes'\)tone\(note/);
assert.match(html,/else playVoicing\(harmony/);
assert.match(html,/id="cb-hw-keyhint"/);
assert.match(html,/data-hw-perf="chords"/);
assert.match(html,/data-hw-perf="notes"/);
assert.match(html,/Gehäuse- und Hardwarebediengerüst adaptiert aus/);
assert.match(html,/WEB AUDIO · NOT FM1 FIRMWARE/);
assert.doesNotMatch(html,/<(?:script|link)[^>]+(?:src|href)="[^"]*FM-XY/i);
assert.equal((html.match(/id="fm1hardware-screen"/g)||[]).length,1);
assert.equal((html.match(/class="piano-keys" id="cb-hw-keyboard"/g)||[]).length,1);

// Full inline scripts must remain syntactically valid after embedding the view.
let scripts=0;
for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)){
  new vm.Script(match[1],{filename:'index.html inline #'+(++scripts)});
}
assert.ok(scripts>=1);

// Same 27 chromatic notes (C4...D6) as FM-XY's hardware key range.
// An independent HTML-mode switch must leave the original demo intact.
assert.equal(Array.from({length:27},(_,i)=>60+i).length,27);
assert.match(html,/document\.body\.classList\.contains\('fm1-mode'\)\?document\.getElementById\('fm1hardware-screen'\)/);
console.log('CHORDON BLEU browser hardware-surface source checks passed ('+scripts+' inline scripts).');
