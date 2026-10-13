import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read = f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const html=read('index.html'),platform=read('firmware/felucca-overlay/chordon_platform.c');
const controller=read('firmware/cb_fm1.c'),header=read('firmware/cb_fm1.h');
const wanted=['FX','SEL','ENV','LFO','EDIT','GLO','HOME','SAVE','ARP','SEQ','PLAY_STOP','REC'];
const match=html.match(/<div class="hardware-buttons"[^>]*>([\s\S]*?)<\/div>/);
assert.ok(match,'Missing actual 12-key instrument panel');
const actual=[...match[1].matchAll(/data-hw-action="([^"]+)"/g)].map(m=>m[1]);
assert.deepEqual(actual,wanted,'Actual FM1 must have six columns and two rows in printed order');
assert.match(html,/\.cb-hardware \.hardware-buttons\{grid-template-columns:repeat\(6,minmax\(0,1fr\)\);grid-template-rows:repeat\(2,43px\)\}/);
assert.match(match[1],/data-hw-action="PLAY_STOP" aria-label="PLAY \/ STOP"/);
const octave=html.match(/<div class="octaves">([\s\S]*?)<\/div>/)?.[1]||'';
assert.deepEqual([...octave.matchAll(/data-hw-action="([^"]+)"/g)].map(x=>x[1]),['OCT_DOWN','OCT_UP']);
assert.match(html,/Number\(key\.dataset\.note\)\+12\*hwOctave/,'Octave controls must affect physical keyboard sound');

// Test the ACTUAL hardware event dispatcher extracted from inline browser script.
const begin=html.indexOf(' function runAction(name){');
const finish=html.indexOf(" for(const btn of document.querySelectorAll('[data-hw-action]'))",begin);
assert.ok(begin>0&&finish>begin,'Hardware button dispatcher not found');
const captured=[];
const context={
 state:{feel:'warm',motion:'hold',flipMode:'keep',play:false},
 hwOctave:0,drawFM1(){},syncFM1Hardware(){},
 setScreen:x=>captured.push('screen:'+x),setSound:()=>captured.push('sound'),
 setFeel:x=>captured.push('feel:'+x),setMotion:x=>captured.push('motion:'+x),
 setFlipMode:x=>captured.push('flipmode:'+x),
 harmonicVariation:()=>{captured.push('flip');return true},
 startPlayback:()=>captured.push('start'),
 togglePlayback:()=>captured.push('playstop'),
 saveIdea:()=>captured.push('save'),recToggle:()=>captured.push('rec'),
 undo:()=>captured.push('undo')
};
const cx=vm.createContext(context);
vm.runInContext(html.slice(begin,finish),cx);
const press=k=>{captured.length=0;vm.runInContext('runAction('+JSON.stringify(k)+')',cx);return captured.join('|')};
const meanings={
 FX:'sound',SEL:'screen:chord',ENV:'feel:crispy',LFO:'motion:pulse',
 EDIT:'flipmode:all',GLO:'screen:recipes',HOME:'screen:home',
 SAVE:'save',ARP:'screen:arp',SEQ:'flip|start',PLAY_STOP:'playstop',REC:'rec'
};
for(const key of wanted) assert.equal(press(key),meanings[key],'Wrong browser binding on physical '+key);
press('OCT_UP');assert.equal(vm.runInContext('hwOctave',cx),1);
press('OCT_DOWN');assert.equal(vm.runInContext('hwOctave',cx),0);

// Legacy upstream B_SCL is the printed SEL, not a SELECT encoder.
const bindings=[
 ['B_PLAY','CB_B_PLAY'],['B_SEQ','CB_B_FLIP'],['B_SAVE','CB_B_SAVE'],
 ['B_HOME','CB_B_HOME'],['B_GLO','CB_B_RECIPE'],['B_SCL','CB_B_CHORD'],
 ['B_ARP','CB_B_ARP'],['B_EDIT','CB_B_KEEP_ALL'],
 ['B_ENV','CB_B_FEEL'],['B_LFO','CB_B_MOTION']
];
for(const [physical,semantic] of bindings){
 const escaped=physical.replaceAll('_','_');
 assert.ok(new RegExp('panel\\.btn\\['+escaped+'\\]\\]\\)\\)cb_fm1_button\\(&cbh_device,'+semantic).test(platform),
  physical+' must dispatch to '+semantic+' via calibrated Felucca panel');
}
assert.match(controller,/case CB_B_FEEL:m->feel=/);
assert.match(controller,/case CB_B_MOTION:m->motion=/);
assert.match(header,/CB_B_FEEL, CB_B_MOTION/);
assert.doesNotMatch(platform,/panel\.btn\[B_OCTDN\].*CB_B_UNDO/,'OCT- is not Undo');
assert.doesNotMatch(platform,/panel\.btn\[B_FX\]/,'Native FX sound bank is not implemented');
assert.doesNotMatch(platform,/panel\.btn\[B_REC\]/,'Native REC capture is not implemented');
console.log('PASS: 12 physical FM1 labels/order, working browser bindings, octave keys and native mapping parity.');
