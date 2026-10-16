import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {generateBassTrack,MAX_BASS_CANDIDATES,BASS_REGISTER} from '../core/bass-generator.js';
import {resolveBassTrack,validBassTrack,legacyBassTrack,MAX_BASS_EVENTS} from '../core/bass-track.js';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const script=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].at(-1)[1].replace(/\n\/\/ BROWSER_STARTUP[\s\S]*$/,'');
const env=vm.createContext({console,Math,Date,setTimeout,clearTimeout});vm.runInContext(script,env);
const Q=JSON.parse(vm.runInContext('JSON.stringify(Q)',env));
for(const q of Object.values(Q)){Object.freeze(q.notes);Object.freeze(q);}Object.freeze(Q);
const pcs=(c,n)=>Q[c.quality].notes.some(v=>(c.root+v)%12===n%12);
const phrase=(track,steps)=>resolveBassTrack(track,steps,92,Q).map(n=>[n.time,n.note]);
let cases=0;
const patterns=new Set();let lowCount=0,highCount=0;
for(const quality of Object.keys(Q))for(let key=0;key<12;key++)for(const spice of [0,38,100])for(const feel of ['warm','crispy','cheesy']){
 const steps=Array.from({length:4},(_,i)=>Object.freeze({root:(key+[0,9,5,7][i])%12,quality}));Object.freeze(steps);
 const input={steps,qualityDefinitions:Q,seed:12345+key,spice,feel};
 const a=generateBassTrack(input),b=generateBassTrack(input);
 assert.ok(a&&validBassTrack(a));assert.deepEqual(a,b,'Same seed/input must reproduce the phrase');
 assert.ok(a.events.length>=4&&a.events.length<=MAX_BASS_EVENTS);
 for(const tempo of [48,160]){
  const notes=resolveBassTrack(a,steps,tempo,Q);
  for(let i=0;i<notes.length;i++){
   const n=notes[i];assert.ok(pcs(steps[n.slot],n.note));
   assert.ok(n.note>=BASS_REGISTER.min&&n.note<=BASS_REGISTER.max);
   assert.ok(n.duration>0&&n.time+n.duration<=(notes[i+1]?.time??8*60/tempo)+1e-10);
   assert.ok(n.time+n.duration<=(n.slot+1)*2*60/tempo+1e-10);
  }
  for(let slot=0;slot<4;slot++){
   const n=notes.find(n=>n.time===slot*2*60/tempo);
   assert.ok(n,'Every chord arrival must have a bass note');assert.equal(n.note%12,steps[slot].root);
  }
 }
 patterns.add(JSON.stringify(a.events.map(e=>[e.at,e.role,e.octave])));
 if(spice===0)lowCount+=a.events.length;if(spice===100)highCount+=a.events.length;
 cases++;
}
assert.ok(highCount>lowCount,'Higher SPICE must increase density over the fixture set');
assert.ok(patterns.size>30,'Generator must produce meaningful pattern diversity');
assert.equal(MAX_BASS_CANDIDATES,16);

// Multiple consecutive FLIPs use their own persisted seed, never Math.random or
// the harmony/ARP generator. Require pitch/rhythm change, not just metadata/gain.
const steps=[{root:0,quality:'maj7'},{root:9,quality:'min'},{root:5,quality:'maj'},{root:7,quality:'dom7'}];
const original=JSON.stringify(steps);let previous=legacyBassTrack({tempo:92,motion:'hold'});
for(let i=0;i<50;i++){
 const snapshot=JSON.stringify(previous),next=generateBassTrack({steps,qualityDefinitions:Q,seed:previous.seed,spice:38,previous});
 assert.ok(next);assert.notDeepEqual(phrase(next,steps),phrase(previous,steps));
 assert.equal(JSON.stringify(previous),snapshot);previous=next;
}
assert.equal(JSON.stringify(steps),original);
assert.deepEqual(generateBassTrack({steps,qualityDefinitions:Q,seed:0xffffffff}),generateBassTrack({steps,qualityDefinitions:Q,seed:0xffffffff}));
assert.deepEqual(JSON.parse(JSON.stringify(previous)),previous,'Phrase must persist without regeneration');

// A changed chord progression preserves the phrase's rhythm and repairs roles
// at resolution time. No old absolute pitch stays under an unrelated new chord.
const changed=steps.map((c,i)=>({root:(c.root+1+i)%12,quality:'dim'}));
const rhythm=previous.events.map(e=>e.at),snapshot=JSON.stringify(previous);
const repaired=resolveBassTrack(previous,changed,92,Q);
assert.ok(repaired.every((n,i)=>Math.abs(n.time-rhythm[i]*60/92)<1e-10));
assert.ok(repaired.every(n=>pcs(changed[n.slot],n.note)));
assert.equal(JSON.stringify(previous),snapshot);

// FEEL is articulation/accent, not permission for foreign tones.
const warm=generateBassTrack({steps,qualityDefinitions:Q,seed:56,feel:'warm'});
const crispy=generateBassTrack({steps,qualityDefinitions:Q,seed:56,feel:'crispy'});
assert.ok(warm.events[0].duration.beats>crispy.events[0].duration.beats);
const muted=generateBassTrack({steps,qualityDefinitions:Q,seed:previous.seed,previous:{...previous,enabled:false}});
assert.ok(muted);assert.equal(muted.enabled,false,'FLIP must preserve a disabled bass track');
const random=Math.random;
try{Math.random=()=>{throw Error('Global/performance RNG must not be used');};
 assert.deepEqual(generateBassTrack({steps,qualityDefinitions:Q,seed:56,feel:'warm'}),warm);
}finally{Math.random=random;}
for(const bad of [{seed:0},{seed:1.5},{seed:Infinity},{seed:0x100000000},{seed:1,spice:101},{seed:1,spice:NaN},{seed:1,feel:'unknown'},{seed:1,previous:{}}])
 assert.throws(()=>generateBassTrack({steps,qualityDefinitions:Q,...bad}),RangeError);
assert.throws(()=>generateBassTrack({steps:[],qualityDefinitions:Q,seed:1}),RangeError);
console.log(`PASS ${cases} seeded bass fixtures: actual chord tones, register, roots, monophony/seam, SPICE/FEEL, repeat FLIPs and role repair`);
