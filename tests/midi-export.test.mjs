import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {legacyBassTrack,resolveBassTrack} from '../core/bass-track.js';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const extract=(a,b)=>html.slice(html.indexOf(a),html.indexOf(b,html.indexOf(a)));
const state={tempo:120,motion:'hold',selected:0,holdLift:false,arp:{rate:8,gate:74,direction:'up',order:'pitch'},slice:{rate:8,gate:40,hits:4},steps:[0,5,9,7].map(root=>({root,quality:'maj'}))};
const sandbox={state,Uint8Array,TextEncoder,Math,bassApi:{resolveBassTrack},clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),mod:n=>(n%12+12)%12,tone(){throw Error('Export must not start audio');}};
vm.createContext(sandbox);
vm.runInContext(extract('const Q={','const QUALITY_IDS='),sandbox);
vm.runInContext(extract('function noteToMidi(c){','// iPhone Safari'),sandbox);
vm.runInContext(extract('function arpBaseNotes(','async function audition(c){'),sandbox);
vm.runInContext(extract('function buildLoopMidi(source=state){','function exportLoopMidi(){'),sandbox);
// Independent SMF decoder: checks actual bytes, lengths, deltas and note balance.
function parse(bytes){
 const b=Buffer.from(bytes);assert.equal(b.toString('ascii',0,4),'MThd');assert.equal(b.readUInt32BE(4),6);
 assert.equal(b.readUInt16BE(8),0);assert.equal(b.readUInt16BE(10),1);assert.equal(b.readUInt16BE(12),960);
 assert.equal(b.toString('ascii',14,18),'MTrk');assert.equal(b.readUInt32BE(18),b.length-22);
 let pos=22,tick=0;const events=[],active=new Set();
 const vlq=()=>{let n=0,v,count=0;do{assert.ok(pos<b.length);v=b[pos++];n=n*128+(v&127);assert.ok(++count<=4);}while(v&128);return n;};
 while(pos<b.length){tick+=vlq();const status=b[pos++];
  if(status===255){const type=b[pos++],length=vlq(),data=b.subarray(pos,pos+length);pos+=length;events.push({tick,type,data});if(type===47){assert.equal(length,0);assert.equal(pos,b.length);}continue;}
  assert.ok([128,144].includes(status&240));const pitch=b[pos++],velocity=b[pos++];assert.ok(pitch<128&&velocity<128);
  const key=(status&15)+':'+pitch,on=(status&240)===144;
  if(on){assert.ok(velocity>0);assert.ok(!active.has(key),`No overlapping same-channel note-ons: ${key} at tick ${tick}`);active.add(key);}else{assert.ok(active.has(key),'Every note-off has a note-on');active.delete(key);}
  events.push({tick,status,pitch,velocity,on});
 }
 assert.equal(active.size,0);assert.equal(events.at(-1).type,47);assert.equal(events.at(-1).tick,7680);return events;
}
for(const tempo of [48,92,120,160])for(const mode of ['hold','pulse','arp']){
 state.tempo=tempo;state.motion=mode;const before=JSON.stringify(state);
 const events=parse(sandbox.buildLoopMidi());assert.equal(JSON.stringify(state),before);
 const tempoEvent=events.find(e=>e.type===81);assert.equal(tempoEvent.data.readUIntBE(0,3),Math.round(60000000/tempo));
 const ons=events.filter(e=>e.on);assert.ok(ons.some(e=>(e.status&15)===1));
 for(const tick of [0,1920,3840,5760])assert.ok(ons.some(e=>e.tick===tick),'Each slot starts on its expected beat');
 if(mode==='hold'){assert.equal(ons.length,16);assert.equal(ons[0].pitch,55);assert.ok(ons.some(e=>e.tick===Math.round(.016/(60/tempo)*960)&&e.pitch===60),'Retain chord strum');}
 if(mode==='pulse')assert.equal(ons.length,52);
 if(mode==='arp'){assert.equal(ons.length,20);assert.ok(ons.some(e=>e.tick===542),'Retain swung arp timing');}
}
for(const direction of ['up','down','updown','random'])for(const rate of [4,8,16,32]){
 state.motion='arp';state.arp.direction=direction;state.arp.rate=rate;parse(sandbox.buildLoopMidi());
}
assert.match(html,/id="midi-export"[^>]*aria-label=/);assert.match(html,/id="hw-midi-export"[^>]*aria-label=/);
assert.match(html,/\$\('midi-export'\)\.addEventListener\('click',exportLoopMidi\)/);
assert.match(html,/\$\('hw-midi-export'\)\.addEventListener\('click',exportLoopMidi\)/);
console.log('PASS MIDI: SMF structure, tempo, 2 bars, playback voicings/bass/strum/swing, HOLD/PULSE/ARP, balanced gates, unchanged state.');

// Exercise the actual download handler with browser I/O substituted.
let downloadedBlob,clicked=false,removed=false,revoked=false,message='';
const link={click(){clicked=true;},remove(){removed=true;}};
Object.assign(sandbox,{Blob,URL:{createObjectURL(blob){downloadedBlob=blob;return 'blob:midi-test';},revokeObjectURL(url){assert.equal(url,'blob:midi-test');revoked=true;}},document:{body:{appendChild(a){assert.equal(a,link);}},createElement(tag){assert.equal(tag,'a');return link;}},setTimeout(fn,ms){assert.equal(ms,10000);fn();},toast(text){message=text;}});
vm.runInContext(extract('function exportLoopMidi(){','// Bounded SMF parser.'),sandbox);
sandbox.exportLoopMidi();
assert.equal(downloadedBlob.type,'audio/midi');parse(new Uint8Array(await downloadedBlob.arrayBuffer()));
assert.equal(link.href,'blob:midi-test');assert.match(link.download,/^chordon-bleu-160bpm-arp\.mid$/);
assert.ok(clicked&&removed&&revoked);assert.match(message,/MIDI/);
console.log('PASS MIDI download: Blob MIME, filename, click, cleanup and valid downloaded bytes.');
// Saved MIDI must use its own snapshot while a different live loop is playing.
sandbox.validArp=()=>true;sandbox.validSlice=()=>true;
const saved={id:'favorite',tempo:76,motion:'hold',steps:[2,4,9,7].map(root=>({root,quality:'m7'})),arp:{rate:4,gate:25,direction:'down',order:'outside'},slice:{hits:2,rate:4,gate:15}};
state.saved=[saved];state.play=true;state.holdLift=true;
let before=JSON.stringify(state);sandbox.exportSavedMidi('favorite');
let savedEvents=parse(new Uint8Array(await downloadedBlob.arrayBuffer()));
assert.equal(link.download,'chordon-bleu-76bpm-hold.mid');
assert.equal(savedEvents.find(e=>e.type===81).data.readUIntBE(0,3),Math.round(60000000/76));
assert.equal(savedEvents.filter(e=>e.on).length,20);assert.equal(JSON.stringify(state),before);
saved.motion='arp';before=JSON.stringify(state);sandbox.exportSavedMidi('favorite');
savedEvents=parse(new Uint8Array(await downloadedBlob.arrayBuffer()));
assert.equal(link.download,'chordon-bleu-76bpm-arp.mid');
assert.equal(savedEvents.filter(e=>e.on).length,12,'Saved ARP rate 4, not live rate 32');
const firstOn=savedEvents.find(e=>e.on&&(e.status&15)===0);
const firstOff=savedEvents.find(e=>e.on===false&&(e.status&15)===0&&e.pitch===firstOn.pitch);
assert.equal(firstOff.tick-firstOn.tick,240,'Saved ARP 25% gate');assert.equal(JSON.stringify(state),before);
console.log('PASS saved MIDI: snapshot tempo/notes/motion/rate/gate; live playback and stored favorite unchanged.');

const bassTrack=legacyBassTrack({tempo:92,motion:'hold'});
const bassSource={...state,holdLift:false,tempo:92,motion:'hold',steps:[0,5,9,7].map(root=>({root,quality:'maj'})),bassTrack};
const bassEvents=parse(sandbox.buildLoopMidi(bassSource));
const bassOns=bassEvents.filter(e=>e.on&&(e.status&15)===1);
assert.equal(bassOns.length,4,'Bassline events use their own MIDI channel');
assert.equal(bassEvents.filter(e=>e.on&&(e.status&15)===0).length,12,'Chord notes remain on channel 1');
const meta=bassEvents.find(e=>e.type===127);
const own=JSON.parse(new TextDecoder().decode(meta.data.subarray(1)).slice(13));
assert.deepEqual(own.bassTrack,bassTrack,'Own MIDI metadata preserves the bass event model');
console.log('PASS two-track MIDI: separate bass channel and bass model metadata.');
