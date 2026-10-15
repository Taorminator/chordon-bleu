import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {legacyBassTrack,resolveBassTrack,validBassTrack,MAX_BASS_EVENTS} from '../core/bass-track.js';

// Compare with actual current playback code, not a duplicate migration formula.
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const script=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].at(-1)[1]
 .replace(/\nsetup\(\);[\s\S]*$/,'');
const cx=vm.createContext({console,Math,Date,setTimeout,clearTimeout});
vm.runInContext(script,cx);
const Q=JSON.parse(vm.runInContext('JSON.stringify(Q)',cx));
const extract=(start,end)=>html.slice(html.indexOf(start),html.indexOf(end,html.indexOf(start)));
const env={Math,state:{},voiceNotes:()=>[60,64,67],
 arpBaseNotes:notes=>notes,arpNote:(notes,i)=>notes[i%notes.length],tone(){}};
vm.createContext(env);vm.runInContext(extract('function playVoicing(','async function audition('),env);

let cases=0;
for(const tempo of [48,92,160])for(const motion of ['hold','pulse','slice','arp'])
 for(const rate of [4,8,16,32])for(const gate of [10,40,95])for(let root=0;root<12;root++){
  const steps=Array.from({length:4},(_,i)=>({root:(root+i*3)%12,quality:'maj'}));
  const settings={tempo,motion,slice:{hits:4,rate,gate},arp:{rate:8,gate:62,direction:'up',order:'pitch'},steps,selected:0};
  const before=JSON.stringify(settings),track=legacyBassTrack(settings);
  assert.ok(validBassTrack(track));assert.equal(JSON.stringify(settings),before);
  const actual=[];
  env.settings=settings;env.emit=(note,time,duration,velocity,bass)=>{if(bass)actual.push({note,time,duration,velocity});};
  for(let i=0;i<4;i++){
   env.c=steps[i];env.at=i*60/tempo*2;env.duration=60/tempo*2*.91;env.mode=motion;
   vm.runInContext('playVoicing(c,at,duration,mode,[60,64,67],0,emit,settings)',env);
  }
  const resolved=resolveBassTrack(track,steps,tempo,Q);
  assert.equal(resolved.length,4);
  for(let i=0;i<4;i++){
   assert.equal(resolved[i].note,actual[i].note);
   for(const k of ['time','duration','velocity'])assert.ok(Math.abs(resolved[i][k]-actual[i][k])<1e-10,`${motion} ${tempo} ${k}`);
  }
  // Second-based PULSE floor and ARP cap must remain correct after changing BPM.
  const changedTempo=tempo===48?160:48;
  const a=resolveBassTrack(track,steps,changedTempo,Q),b=resolveBassTrack(legacyBassTrack({...settings,tempo:changedTempo}),steps,changedTempo,Q);
  assert.deepEqual(a,b);
  cases++;
 }

// Every actual browser quality, chromatic root and octave; actual fifth or safe
// root fallback. Frozen inputs prove no partial mutation during role repair.
for(const quality of Object.keys(Q))for(let root=0;root<12;root++)for(const octave of [-1,0,1]){
 const track=legacyBassTrack({tempo:92,motion:'hold'});
 track.events.forEach(e=>{e.role='fifth';e.octave=octave;Object.freeze(e.duration);Object.freeze(e);});
 Object.freeze(track.events);Object.freeze(track);
 const steps=Array.from({length:4},()=>Object.freeze({root,quality}));Object.freeze(steps);
 const notes=resolveBassTrack(track,steps,92,Q),pcs=new Set(Q[quality].notes.map(n=>(root+n)%12));
 for(const n of notes){assert.ok(pcs.has(n.note%12));assert.ok(n.note>=24&&n.note<=78);}
}

const base=legacyBassTrack({tempo:160,motion:'arp'}),steps=Array.from({length:4},()=>({root:0,quality:'maj'}));
base.events=Array.from({length:MAX_BASS_EVENTS},(_,i)=>({...structuredClone(base.events[0]),at:i*.5}));
const notes=resolveBassTrack(base,steps,160,Q);
for(let i=0;i<notes.length;i++){
 const n=notes[i];assert.ok(n.duration>0);
 assert.ok(n.time+n.duration<=(notes[i+1]?.time??8*60/160)+1e-12);
 assert.ok(n.time+n.duration<=(n.slot+1)*2*60/160+1e-12);
}
assert.ok(notes.at(-1).time+notes.at(-1).duration<=8*60/160,'Loop seam must release');
const snapshot=JSON.stringify(base);resolveBassTrack(base,steps,160,Q);assert.equal(JSON.stringify(base),snapshot);
assert.deepEqual(resolveBassTrack({...base,enabled:false},steps,160,Q),[]);
assert.ok(validBassTrack(JSON.parse(snapshot)),'JSON round-trip');
for(const mutate of [t=>t.version=2,t=>t.seed=0,t=>t.events.push(t.events[0]),t=>t.events[1].at=0,
 t=>t.events[0].at=NaN,t=>t.events[0].role='random',t=>t.events[0].octave=9,
 t=>t.events[0].velocity=Infinity,t=>t.events[0].duration.beats=-1,
 t=>t.events[0].duration.maxSeconds=0]){
 const broken=JSON.parse(snapshot);mutate(broken);assert.equal(validBassTrack(broken),false);
 assert.throws(()=>resolveBassTrack(broken,steps,92,Q),RangeError);
}
assert.throws(()=>resolveBassTrack(base,[...steps.slice(0,3),{root:0,quality:'missing'}],92,Q),RangeError);
assert.throws(()=>legacyBassTrack({tempo:0,motion:'hold'}),RangeError);
assert.throws(()=>legacyBassTrack({tempo:92,motion:'pulse',slice:{hits:4,rate:0,gate:40}}),RangeError);
console.log(`PASS ${cases} legacy bass/playback comparisons; all-quality role repair, bounded monophony, seam, validation and JSON model`);
