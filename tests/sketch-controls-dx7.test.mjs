import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {parseSyxBank} from '../vendor/opendx7/dx7-patch.js';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
function between(a,b){
 const i=html.indexOf(a),j=html.indexOf(b,i+a.length);
 assert.ok(i>=0&&j>i,'Missing boundaries: '+a);
 return html.slice(i,j);
}

// Arrange the browser UI according to the supplied pencil sketch.
const body=between('<main class="content" id="main">','</main>');
const chords=between('<section class="chord-workspace"','</section>');
const live=between('<aside class="live-workspace"','</aside>');
const harmony=between('<section class="harmony-station"','</section>');
const season=between('<section class="section season-station"','</section>');
assert.ok(chords.indexOf('class="stage"') < chords.indexOf('id="play"'),
  'PLAY / FLIP / SAVE must sit immediately under the chord stage');
assert.match(chords,/id="mutate"/);
assert.match(chords,/id="keep"/);
assert.match(live,/id="tempoSlider"/);
assert.match(live,/id="tempotext"/);
assert.match(live,/class="performance-station"/);
assert.ok(['id="recipechoices"','id="wonder"','id="feelchoices"','id="keepone"'].every(x=>harmony.includes(x)));
assert.ok(['id="lift"','id="rush"','id="cb-delay"'].every(x=>season.includes(x)));
assert.ok(body.indexOf('class="section playpanel"') < body.indexOf('class="editor"'),'PICK next to SHAPE');
assert.match(html,/grid-template-areas:"head head" "chords live" "harmony season" "pick shape"/);
for(const id of ['play','mutate','keep','tempoSlider','tempotext','pads','root','quality','dx7file','saved'])
 assert.equal((body.match(new RegExp('id="'+id+'"','g'))||[]).length,1,'Unique '+id);

// Slider BPM: absolute change, legacy device delta and bounds all work.
const tempoEnv={state:{tempo:92,delayBeats:.75},ctx:null,delayNode:null,
 clamp:(x,min,max)=>Math.max(min,Math.min(max,x)),renderMeta(){},sessionSave(){}};
vm.createContext(tempoEnv);
vm.runInContext(between('function setTempo(value){','function changeKey('),tempoEnv);
vm.runInContext('setTempo(112);updateTempo(8);',tempoEnv);
assert.equal(tempoEnv.state.tempo,120,'Tempo slider and device knob use one setter');
vm.runInContext('setTempo(999)',tempoEnv);
assert.equal(tempoEnv.state.tempo,160,'Tempo bounded');
vm.runInContext('setTempo(0)',tempoEnv);
assert.equal(tempoEnv.state.tempo,48,'Minimum tempo');

// Punch button must not play a second chord while the sequencer is already running.
const events={};
const button={classList:{toggle(){}},addEventListener(type,fn){(events[type]??=[]).push(fn);},setPointerCapture(){}};
let chordHits=0;
const punchEnv={$:()=>button,ctx:{currentTime:1},state:{play:true,selected:0,current:0,steps:[{root:0,quality:'maj'}],holdRush:false,holdDelay:false},chorusWet:null,delayWet:null,
 ensureAudio:()=>Promise.resolve(true),playVoicing(){chordHits++;},Math};
vm.createContext(punchEnv);
vm.runInContext(between('function holdButton(id,name){','function setup(){'),punchEnv);
vm.runInContext("holdButton('lift','holdLift')",punchEnv);
const tap=()=>events.pointerdown[0]({button:0,pointerId:1});
tap();await new Promise(resolve=>setImmediate(resolve));
assert.equal(chordHits,0,'Punch during PLAY must only modify effects');
events.pointerup[0]();
punchEnv.state.play=false;
tap();await new Promise(resolve=>setImmediate(resolve));
assert.equal(chordHits,1,'Punch while stopped may preview the selected chord');

// DX7 factory bank format: parse the standard 32 x 128-byte Yamaha payload.
const syx=new Uint8Array(4104);
syx.set([0xf0,0x43,0x00,0x09,0x20,0x00],0);
for(let op=0;op<6;op++){
 const i=6+op*17;syx[i]=99;syx[i+1]=70;syx[i+2]=50;syx[i+3]=60;
 syx[i+4]=99;syx[i+5]=70;syx[i+6]=55;syx[i+7]=0;
 syx[i+14]=85;syx[i+15]=2;
}
syx[6+110]=4; // DX7 algorithm 5 is zero-based 4 in a packed voice.
const name='E.PIANO 1 ';
for(let i=0;i<name.length;i++)syx[6+118+i]=name.charCodeAt(i);
let checksum=0;for(let i=6;i<4102;i++)checksum+=syx[i];
syx[4102]=(-checksum)&127;syx[4103]=0xf7;
const parsed=parseSyxBank(syx);
assert.equal(parsed.length,32);
assert.equal(parsed[0].name.trim(),'E.PIANO 1');
assert.equal(parsed[0].algorithm,4);
assert.equal(parsed[0].ops.length,6);
assert.match(html,/bytes\.length!==4104/,'Reject malformed banks');
assert.match(html,/checksum&127/,'Reject invalid DX7 checksums');
assert.match(html,/await import\('\.\/vendor\/opendx7\/dx7-patch\.js'\)/);
assert.match(html,/await activeCtx\.audioWorklet\.addModule\('\.\/vendor\/opendx7\/dx7-processor\.js'\)/);
assert.match(html,/scheduleDX7Voice\(midi,at,dur,vel\)/,'Imported bank must control the audio voice');
assert.match(html,/EPIANO1/,'Identify original preset');
assert.match(html,/PIANO1/,'Accept FM1 factory bank with identical parameters');

// Brighter GRAND with original synth-only source (no sample dependencies).
assert.match(html,/name:'GRAND'.*cut:10200/);
assert.match(html,/voice\('sine',freq\*4\.026/);
assert.match(html,/voice\('triangle',freq\*5\.065/);

console.log('PASS pencil layout, BPM slider, Punch replay prevention, 6-op DX7 bank parser, Grand clarity');
