// Exercise the compiled application, DSP, LCD, LEDs and physical dispatch together.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const bytes=readFileSync(process.argv[2]);
async function boot(){
 const {instance}=await WebAssembly.instantiate(bytes,{});const e=instance.exports;
 e._initialize();e.web_nor_erase();e.web_boot();
 const d={e,peak:0,hash:0};
 d.render=ms=>{for(let k=0,n=Math.round(ms*44.1);k<n;k+=128){const m=Math.min(128,n-k);e.web_render(m);for(const p of [e.web_out_l(),e.web_out_r()])for(const v of new Float32Array(e.memory.buffer,p,m)){assert.ok(Number.isFinite(v));assert.ok(Math.abs(v)<=1);d.peak=Math.max(d.peak,Math.abs(v));d.hash=(Math.imul(d.hash,31)+Math.round(v*8388608))|0;}}};
 d.tap=b=>{e.web_buttons(1<<b);d.render(30);e.web_buttons(0);d.render(30);};
 d.key=k=>{e.web_keys(1<<k);d.render(30);e.web_keys(0);d.render(30);};
 d.enc=(r,n)=>{e.web_enc(r,n);d.render(60);};
 d.render(600);return d;
}
const d=await boot(),{e}=d;
assert.equal(d.peak,0,'boot is silent');assert.equal(e.cb_web_playing(),0);
assert.equal(e.web_dim_keys(),0x55,'only four white chord keys dim');
assert.equal(e.web_lit_keys(),1);assert.equal(e.web_lit_buttons(),0);
const original=Array.from({length:4},(_,i)=>e.cb_web_chord(i));
for(const k of [1,3,5,7,26])d.key(k);
assert.equal(d.peak,0,'unused keys must be silent, including the stock keyboard path');
d.key(4);assert.equal(e.cb_web_selected(),2);assert.ok(d.peak>0.001,'audition must reach the real audio renderer');
d.enc(3,1);assert.notEqual(e.cb_web_chord(2),original[2]);
assert.deepEqual([0,1,3].map(i=>e.cb_web_chord(i)),[0,1,3].map(i=>original[i]));
assert.ok(e.web_lit_buttons()&(1<<4),'Undo is available');d.tap(4);assert.equal(e.cb_web_chord(2),original[2]);
for(const role of [0,1,4,5,6])d.enc(role,3);
assert.deepEqual(Array.from({length:4},(_,i)=>e.cb_web_chord(i)),original);
d.enc(2,1);assert.equal(e.cb_web_sound(),4);d.enc(2,-1);assert.equal(e.cb_web_sound(),3);
d.tap(10);assert.equal(e.cb_web_playing(),1);d.render(3200);
assert.ok(e.web_lit_buttons()&(1<<10));d.tap(10);assert.equal(e.cb_web_playing(),0);
d.render(5000);d.peak=0;d.render(500);assert.ok(d.peak<0.0001,'stop releases all notes and tails');
// Walk every sound, exercising FM6 parameter publication and engine cross-fades.
const audible=[];
for(let id=0;id<159;id++){
 const now=e.cb_web_sound();let delta=(id-now+159)%159;
 while(delta){const n=Math.min(16,delta);d.enc(2,n);delta-=n;}
 assert.equal(e.cb_web_sound(),id);d.render(80);d.peak=0;d.key(0);d.render(300);
 if(d.peak>0.00001)audible.push(id);
}
assert.equal(audible.length,159,`inaudible sound slots: ${Array.from({length:159},(_,i)=>i).filter(i=>!audible.includes(i))}`);
// Separate boots produce the same audio and state for the same gesture sequence.
const a=await boot(),b=await boot();
for(const x of [a,b]){x.key(2);x.enc(3,1);x.tap(10);x.render(3200);x.tap(10);x.render(100);}
assert.equal(a.hash,b.hash);assert.equal(a.e.cb_web_chord(1),b.e.cb_web_chord(1));
console.log('PASS native WASM: silent boot/unused keys, four-pad LEDs, selection, variation, Undo, all 159 sounds, transport/tails and deterministic audio');
// Persistent selection/sound/loop round-trip through the real A/B storage layer.
const flashOf=x=>new Uint8Array(x.e.memory.buffer,x.e.web_nor(),x.e.web_nor_size());
const s=await boot();s.key(6);s.enc(3,1);s.enc(2,4);s.render(2500);
assert.equal(s.e.cb_web_disk_status(),1);
const snapshot=flashOf(s).slice(),savedChord=s.e.cb_web_chord(3),savedSound=s.e.cb_web_sound();
const restart=await boot();flashOf(restart).set(snapshot);restart.e.cb_web_restore();
assert.equal(restart.e.cb_web_selected(),3);assert.equal(restart.e.cb_web_chord(3),savedChord);assert.equal(restart.e.cb_web_sound(),savedSound);assert.equal(restart.e.cb_web_playing(),0);
// An occupied or ambiguous sector is read-only, with byte-for-byte preservation.
for(const offset of [0xE5000,0xE6000,0xE5100,0xE5FFF]){
 const occupied=await boot(),nor=flashOf(occupied);nor[offset]=0x42;const before=nor.slice();
 occupied.key(2);occupied.e.cb_web_save();assert.equal(occupied.e.cb_web_disk_status(),-1);assert.deepEqual(nor,before);
}
// Cut every programmed byte (96-byte body + 32-byte outer commit). Reload
// from a fresh instance, so no RAM state can mask a broken on-flash record.
for(let cut=0;cut<=128;cut++){
 const x=await boot();flashOf(x).set(snapshot);x.e.cb_web_restore();x.enc(3,1);
 const changed=x.e.cb_web_chord(3);x.e.cb_web_flash_cut(cut);x.e.cb_web_save();
 const y=await boot();flashOf(y).set(flashOf(x));y.e.cb_web_restore();
 assert.equal(y.e.cb_web_chord(3),cut<128?savedChord:changed,`torn write at byte ${cut}`);
}
console.log('PASS simulated NOR: idle save/reload includes sound, foreign-sector preservation and every one of 129 transaction cut points');
