import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
function extract(a,b){const i=html.indexOf(a),j=html.indexOf(b,i+a.length);assert.ok(i>=0&&j>i,'Source '+a);return html.slice(i,j);}
const harmony=extract('<section class="harmony-station"','</section>');
const order=['id="recipechoices"','id="wonder"','id="feelchoices"','id="keepone"'].map(x=>harmony.indexOf(x));
assert.ok(order.every(x=>x>=0)&&order.every((x,i)=>i===0||x>order[i-1]),'Grouped harmony order');
const performance=extract('<section class="performance-station"','</section>');
assert.match(performance,/<select id="sound"/);
assert.match(performance,/id="audioreset"/);
assert.match(html,/\$\('audioreset'\)\.addEventListener\('click'/);
assert.match(performance,/data-motion="pulse"/);
assert.doesNotMatch(performance,/data-motion="slice"/);
assert.match(performance,/id="slicegate"/);
const programs=extract('const SOUNDS=[','function arpBaseNotes(');
for(const name of ['WARM','GLASS','DUSK','DX7 EP','GRAND','90s HOUSE'])assert.ok(programs.includes("name:'"+name+"'"),name);
const state={recipeId:'classic',play:false,key:4,mode:'major',tempo:126,sound:5,feel:'crispy',flipMode:'all',steps:[{}]};
const scene={state,RECIPE_CATALOG:[{id:'blue-hour'}],pushUndo(){},stopPlayback(){},activeRecipe(){return {name:'MANHATTAN'};},startProgression(){},render(){},startPlayback(){},audition(){},toast(){}};
vm.createContext(scene);
vm.runInContext(extract('function selectRecipe(id){','function validSlice('),scene);
vm.runInContext("selectRecipe('blue-hour')",scene);
assert.deepEqual([state.key,state.tempo,state.sound,state.feel,state.flipMode],[4,126,5,'crispy','all'],'Recipes must not change sound');
class Param{constructor(){this.value=0;}setValueAtTime(v){this.value=v;}exponentialRampToValueAtTime(v){this.value=v;}setTargetAtTime(v){this.value=v;}}
class Node{constructor(){this.connections=[];this.gain=new Param();this.frequency=new Param();this.detune=new Param();this.delayTime=new Param();this.Q=new Param();}connect(n){this.connections.push(n);return n;}start(){}stop(){}}
class SafariAudio{
 constructor(){this.state='suspended';this.currentTime=0;this.sampleRate=48000;this.destination=new Node();}
 createGain(){return new Node();}createOscillator(){return new Node();}
 createConvolver(){throw Error('Safari FX failure');}createDelay(){throw Error('Safari delay failure');}
 resume(){this.state='running';this.onstatechange?.();return Promise.resolve();}
 close(){this.state='closed';return Promise.resolve();}
}
const safari={window:{AudioContext:SafariAudio},console:{warn(){}},Math,setTimeout,ctx:null,master:null,reverb:null,chorusWet:null,delayWet:null,delayNode:null,audioWarned:false,
 state:{play:false,tempo:92,delayBeats:.75,holdRush:false,holdDelay:false},configureAudioSession(){},audioFeedback(){},stopPlayback(){}};
vm.createContext(safari);
vm.runInContext(extract('let fxReady=false;','const SOUNDS=['),safari);
assert.equal(await vm.runInContext('ensureAudio()',safari),true);
assert.equal(vm.runInContext('master.connections.includes(ctx.destination)',safari),true,'Dry audio must bypass FX');
vm.runInContext('releaseAudio()',safari);
assert.equal(await vm.runInContext('ensureAudio()',safari),true,'Manual recovery must work');
class SynthAudio extends SafariAudio{constructor(){super();this.state='running';this.oscillators=[];}createOscillator(){const n=new Node();this.oscillators.push(n);return n;}createBiquadFilter(){return new Node();}}
const ctx=new SynthAudio(),synth={ctx,master:new Node(),reverb:null,Math,state:{sound:3,holdLift:false},dx7Patch:null,scheduleDX7Voice(){return false;}};
vm.createContext(synth);vm.runInContext(programs,synth);
function voices(index){ctx.oscillators.length=0;synth.state.sound=index;vm.runInContext('tone(69,0,.4,.8,false,false)',synth);return ctx.oscillators.map(x=>x.type);}
assert.ok(voices(3).filter(x=>x==='sine').length>=3,'DX FM');
assert.ok(voices(4).includes('triangle'),'Grand');
assert.ok(voices(5).includes('sawtooth'),'House');
console.log('PASS Safari dry fallback, reset, programs, recipe isolation and grouped UI');
