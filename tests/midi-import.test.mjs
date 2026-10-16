import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
let source=html.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/\n\/\/ BROWSER_STARTUP[\s\S]*$/,'');
const c=vm.createContext({console,Math,Date,Uint8Array,TextEncoder,TextDecoder,setTimeout,clearTimeout});
vm.runInContext(source,c);const run=s=>vm.runInContext(s,c);
run("renderSaved=()=>{};store=()=>{};toast=msg=>globalThis.lastToast=msg;state.play=true;state.tempo=126;state.motion='pulse';state.steps=[0,5,9,7].map(root=>({root,quality:'maj',manualRoot:null,manualQuality:null}));");
// Round-trip every supported quality and mode, including a sparse random ARP.
for(const quality of run('Object.keys(Q)'))for(const motion of ['hold','pulse','arp']){
 c.quality=quality;c.motion=motion;
 const before=run('JSON.stringify(state)');
 const result=run("readMidiLoop(buildLoopMidi({tempo:76,motion,arp:{rate:4,gate:25,direction:'random',order:'outside'},slice:{rate:8,hits:4,gate:40},steps:[2,5,9,7].map(root=>({root,quality})),selected:0,holdLift:false}))");
 assert.equal(result.tempo,76);assert.equal(result.motion,motion);assert.equal(result.arp.gate,25);assert.equal(result.recognized,false);
 assert.ok(result.steps.every(n=>n.quality===quality&&n.manualRoot===n.root&&n.manualQuality===quality));assert.equal(run('JSON.stringify(state)'),before);
}
const vlq=n=>{const a=[n&127];while(n>>>=7)a.unshift((n&127)|128);return a;};
const track=events=>{let prev=0;const b=[];for(const [tick,data] of events.sort((a,b)=>a[0]-b[0])){b.push(...vlq(tick-prev),...data);prev=tick;}const n=b.length;return [77,84,114,107,n>>>24,(n>>>16)&255,(n>>>8)&255,n&255,...b];};
const make=(extras=[],format=0)=>{
 const events=[];for(const [slot,notes] of [[60,64,67],[65,69,72],[57,60,64],[55,59,62]].entries()){
  for(const n of notes){events.push([slot*960,[144,n,90]],[slot*960+900,[128,n,0]]);}
 }
 events.push(...extras,[3840,[255,47,0]]);
 const meta=[[0,[255,81,3,7,161,32]],[0,[255,88,4,4,2,24,8]]];
 return new Uint8Array([77,84,104,100,0,0,0,6,0,format,0,format===1?2:1,1,224,...(format===1?[...track([...meta,[3840,[255,47,0]]]),...track(events)]:track([...meta,...events]))]);
};
for(const format of [0,1]){
 const result=c.readMidiLoop(make([],format));assert.equal(result.tempo,120);assert.equal(result.motion,'hold');assert.equal(result.recognized,true);
 assert.deepEqual(Array.from(result.steps,s=>[s.root,s.quality]),[[0,'maj'],[5,'maj'],[9,'min'],[7,'maj']]);
}
assert.throws(()=>c.readMidiLoop(make([[0,[176,64,127]]])),/Sustain/);
assert.throws(()=>c.readMidiLoop(make([[1920,[255,81,3,9,39,192]]])),/Tempowechsel/);
assert.throws(()=>c.readMidiLoop(make([[4000,[144,60,90]],[4100,[128,60,0]],[4200,[255,47,0]]])),/Spurende|4 Akkordplätzen/);
for(const length of [0,4,10,25,60])assert.throws(()=>c.readMidiLoop(make().subarray(0,length)));
assert.throws(()=>c.readMidiLoop(new Uint8Array(1048577)),/1 MB/);
// Real import flow adds a favorite, never starts/loads/replaces the live loop.
const before=run('JSON.stringify({tempo:state.tempo,steps:state.steps,motion:state.motion,play:state.play})');
await c.importMidiFile({size:make().length,arrayBuffer:async()=>make().buffer});
assert.equal(run('state.saved.length'),1);assert.equal(run('state.saved[0].tempo'),120);
assert.equal(run('JSON.stringify({tempo:state.tempo,steps:state.steps,motion:state.motion,play:state.play})'),before);
assert.match(c.lastToast,/Akkorddeutung/);
await c.importMidiFile({size:3,arrayBuffer:async()=>new Uint8Array(3).buffer});assert.equal(run('state.saved.length'),1);assert.match(c.lastToast,/MIDI-Import/);
run('state.saved=Array(16).fill(state.saved[0])');let read=false;
await c.importMidiFile({size:50,arrayBuffer:async()=>{read=true;return make().buffer;}});assert.equal(read,false);assert.match(c.lastToast,/voll/);
assert.doesNotMatch(html,/id="export"|accept="application\/json/);assert.match(html,/id="midi-import"/);
console.log('PASS MIDI import: all-quality/mode round trips; foreign type 0/1 chord recognition, tempo, rejected malformed/unsupported input, bounded storage, preserved live playback.');
