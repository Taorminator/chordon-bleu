import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
function extract(start,end){
 const i=html.indexOf(start),j=html.indexOf(end,i+start.length);
 assert.ok(i>=0&&j>i,'Missing source boundary: '+start);
 return html.slice(i,j);
}

// Exercise the actual controller used by the browser, without a fake rewrite of its math.
const qualityNames=['maj','min','maj7','m7','dom7','m9','maj9','add9','sus2','sus4','six','m6','dim','halfDim'];
const edits=[];
const state={steps:Array.from({length:4},()=>({manualRoot:null,manualQuality:null,root:0,quality:'maj'})),selected:0,flipMode:'keep'};
const knobs={state,fm1Screen:'chord',FM1_QUALITIES:qualityNames,
 changeEditor:(which,value)=>{edits.push([which,value]);const key=which==='root'?'manualRoot':'manualQuality';state.steps[state.selected][key]=value==='auto'?null:(which==='root'?Number(value):value);},
 render(){},drawFM1(){},setFlipMode(){},setArp(){}};
vm.createContext(knobs);
vm.runInContext(extract('function fm1Knob(knob,dir){','function setupFM1(){'),knobs);
vm.runInContext('fm1Knob(1,1)',knobs);
assert.deepEqual(edits.at(-1),['quality','maj'],'AUTO +1 should select Major');
vm.runInContext('fm1Knob(1,-1)',knobs);
assert.deepEqual(edits.at(-1),['quality','auto'],'Major -1 should return AUTO');
vm.runInContext('fm1Knob(1,-1)',knobs);
assert.deepEqual(edits.at(-1),['quality','halfDim'],'AUTO -1 should wrap to the last quality');
vm.runInContext('fm1Knob(0,1)',knobs);
assert.deepEqual(edits.at(-1),['root','0'],'AUTO ROOT +1 should select C');
vm.runInContext('fm1Knob(2,1)',knobs);
assert.equal(state.selected,1,'K3 should select next chord');
vm.runInContext('fm1Knob(2,-1)',knobs);
assert.equal(state.selected,0,'K3 should select previous chord');

// A chord key must play a saved progression slot unmodified, or transpose the
// current quality for chromatic keys; these two gestures must never shuffle notes.
const keyContext={
 chord:(root,quality)=>({root,quality,manualRoot:null,manualQuality:null}),
 mod:n=>(n%12+12)%12
};
vm.createContext(keyContext);
vm.runInContext(extract(' function fm1KeyboardChord(midi,pad,steps,selected){',' // FM-XY\'s mechanical deck'),keyContext);
const steps=[{root:9,quality:'min',manualRoot:null,manualQuality:null},
 {root:5,quality:'maj7',manualRoot:5,manualQuality:'maj7'},
 {root:0,quality:'add9',manualRoot:null,manualQuality:null},
 {root:7,quality:'dom7',manualRoot:null,manualQuality:null}];
assert.strictEqual(keyContext.fm1KeyboardChord(70,1,steps,0),steps[1],'Pad 2 plays exact saved harmony object');
assert.strictEqual(keyContext.fm1KeyboardChord(60,0,steps,2),steps[0],'Pad 1 unaffected by selected chord');
const transposed=keyContext.fm1KeyboardChord(67,undefined,steps,2);
assert.equal(transposed.root,7);
assert.equal(transposed.quality,'add9');
assert.equal(transposed.manualRoot,null);
assert.equal(steps[2].root,0,'Playing must not mutate the progression');

// Verify octave adjustment acts on all voices AND the bass, not just key notes.
const notes=[];
const voiceContext={
 state:{steps,selected:0,motion:'hold',holdLift:false,holdRush:false},
 voiceNotes:()=>[60,64,67],tone:(midi)=>notes.push(midi)
};
vm.createContext(voiceContext);
vm.runInContext(extract('function playVoicing(c,time,duration,variant=state.motion,explicitNotes=null,octaveShift=0){','async function audition(c){'),voiceContext);
vm.runInContext("playVoicing({root:0,quality:'maj'},0,0.6,'hold',[60,64,67],1)",voiceContext);
assert.deepEqual(notes,[72,76,79,48],'OCT +1 transposes each note and the root bass');

assert.match(html,/if\(activePerformanceKeys\.has\(key\)\|\|activePerformanceKeys\.size>=3\)return/,'Constrain accidental touch pileup');
assert.match(html,/key\.addEventListener\('blur',\(\)=>releasePhysicalKey\(key\)\)/,'Keyboard focus-loss must release highlight');
assert.match(html,/state\.current=scheduledIndex;[^\n]+renderStage\(\);drawFM1\(\)/,'Active chord must update the FM1 display');
console.log('PASS: chord pads, keyboard transposition, auto knob wrap, octave voicing and gesture bounds.');
