import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {banks,DEFAULT_PRESET,presetById} from '../assets/dx7/aquanode-presets.js';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert.equal(banks.length,5);
const ids=new Set();
for(const bank of banks){
 const raw=readFileSync(new URL('../assets/dx7/aquanode/'+bank.file,import.meta.url));
 assert.equal(createHash('sha256').update(raw).digest('hex'),bank.sha256);
 assert.deepEqual(Buffer.from(bank.data,'base64'),raw);
 for(const entry of bank.presets){
  assert.ok(!ids.has(entry.id));ids.add(entry.id);
  assert.ok(raw.subarray(6+entry.slot*128,6+(entry.slot+1)*128).every(b=>b<128));
  const patch=presetById(entry.id);assert.equal(patch.name.trim(),entry.name);
  assert.equal(patch.ops.length,6);assert.ok(patch.algorithm>=0&&patch.algorithm<32);
 }
}
assert.equal(ids.size,153);assert.equal(presetById(DEFAULT_PRESET).name.trim(),'DX Fast 1');
for(const id of ['presets-3:30','aquazone:28','missing:0','aquazone:32'])assert.equal(presetById(id),null);

// Render the real processor with every selectable voice: no NaN/Inf, bounded output,
// and audible default. This checks DSP integration, not subjective sound quality.
let Processor;
const dsp={sampleRate:48000,AudioWorkletProcessor:class{constructor(){this.port={};}},registerProcessor(name,P){Processor=P;},console};
vm.createContext(dsp);vm.runInContext(readFileSync(new URL('../vendor/opendx7/dx7-processor.js',import.meta.url),'utf8'),dsp);
let defaultPeak=0;
for(const id of ids){
 const p=new Processor();p.port.onmessage({data:{type:'patch',patch:presetById(id)}});
 p.port.onmessage({data:{type:'noteOn',note:60,velocity:90}});
 for(let i=0;i<40;i++){const data=new Float32Array(128);p.process([],[[data]],{});
  assert.ok(data.every(n=>Number.isFinite(n)&&Math.abs(n)<=1),'Invalid DSP: '+id);
  if(id===DEFAULT_PRESET)defaultPeak=Math.max(defaultPeak,...data.map(Math.abs));
 }
 p.port.onmessage({data:{type:'panic'}});
 const silent=new Float32Array(128);p.process([],[[silent]],{});assert.ok(silent.every(n=>n===0));
}
assert.ok(defaultPeak>0.0001,'Default preset must produce audio');

// Exercise the actual async selection/engine lifecycle. Defer module loading to
// force rapid sound changes, reset/retry, and context replacement.
const source=html.slice(html.indexOf('let dx7Patch=null'),html.indexOf('function scheduleDX7Voice'));
const catalog=await import('../assets/dx7/aquanode-presets.js');
const status={textContent:''};let moduleResolve,moduleLoads=0;const nodes=[];
class Worklet{constructor(context){this.context=context;this.messages=[];this.port={postMessage:m=>this.messages.push(m)};nodes.push(this);}connect(){}disconnect(){this.disconnected=true;}}
const makeCtx=()=>({state:'running',audioWorklet:{addModule(){moduleLoads++;return new Promise(r=>{moduleResolve=r;});}}});
const env={state:{sound:3,dx7Preset:DEFAULT_PRESET,play:true},ctx:makeCtx(),master:{},window:{AudioWorkletNode:Worklet},console,setTimeout,clearTimeout,Uint8Array,
 $:id=>id==='dx7status'?status:null,localStorage:{getItem(){return null;}},sessionSave(){},renderMeta(){},audition(){throw Error('Must not audition during playback');},testLibrary:catalog};
vm.createContext(env);
vm.runInContext(source.replace("import('./assets/dx7/aquanode-presets.js')",'Promise.resolve(testLibrary)'),env);
const run=s=>vm.runInContext(s,env);
await run('Promise.all([ensureDX7Patch(),ensureDX7Patch()])');
const first=run('ensureDX7Engine()');await Promise.resolve();
const select=run("selectDX7Preset('aquazone:2')");await new Promise(r=>setImmediate(r));
moduleResolve();await Promise.all([first,select]);
assert.equal(nodes.length,1,'Stale load must not create another node');
assert.equal(nodes[0].messages.find(m=>m.type==='patch').patch.name.trim(),'DX Fast 2');
assert.equal(moduleLoads,1,'Register processor only once per context');
await run("selectDX7Preset('aquazone:3')");assert.ok(nodes[0].disconnected);
assert.ok(nodes[0].messages.some(m=>m.type==='panic'));assert.equal(nodes.length,2);
assert.equal(moduleLoads,1);
// Missing/filtered persisted IDs fall back safely, never exposing malformed slots.
await run("selectDX7Preset('presets-3:30')");assert.equal(env.state.dx7Preset,DEFAULT_PRESET);
run('resetDX7Engine()');env.ctx=makeCtx();
const beforeReset=nodes.length,stale=run('ensureDX7Engine()');await new Promise(r=>setImmediate(r));
const resolveOld=moduleResolve;
run('resetDX7Engine()');env.ctx=makeCtx();
const fresh=run('ensureDX7Engine()');await new Promise(r=>setImmediate(r));
resolveOld();moduleResolve();await Promise.all([stale,fresh]);
assert.equal(nodes.length,beforeReset+1,'Audio reset must discard the old context load');
assert.equal(nodes.at(-1).context,env.ctx);
run('resetDX7Engine()');env.ctx={state:'running'};
assert.equal(await run('ensureDX7Engine()'),false);assert.match(status.textContent,/Preview/);

// Preset identity travels with saved/exported ideas and sessions; old sessions
// without a preset remain readable by the existing migration path.
let inline=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].at(-1)[1].replace(/\nsetup\(\);[\s\S]*$/,'');
const stored=new Map(),full={console,Math,Date,setTimeout,clearTimeout,localStorage:{getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v)}};
vm.createContext(full);vm.runInContext(inline,full);
const call=s=>vm.runInContext(s,full);
call("render=()=>{};renderMeta=()=>{};renderSaved=()=>{};toast=()=>{};audition=()=>{};startProgression();state.sound=3;state.dx7Preset='presets-4:5';saveIdea();sessionSave()");
assert.equal(JSON.parse(stored.get('chordon-bleu.recipes.v1'))[0].dx7Preset,'presets-4:5');
call("state.dx7Preset='aquazone:1';loadIdea(state.saved[0].id)");assert.equal(call('state.dx7Preset'),'presets-4:5');
call("state.dx7Preset='aquazone:1';sessionLoad()");assert.equal(call('state.dx7Preset'),'presets-4:5');
const old=JSON.parse(stored.get('chordon-bleu.session.v1'));delete old.dx7Preset;stored.set('chordon-bleu.session.v1',JSON.stringify(old));assert.equal(call('sessionLoad()'),true);
const pages=readFileSync(new URL('../.github/workflows/pages.yml',import.meta.url),'utf8');
assert.match(pages,/cp -R vendor _site\/vendor/);assert.match(pages,/aquanode-presets\.js/);
console.log('PASS 153 local DX7 presets, DSP/panic, async switching, fallback, persistence and deployment');
