import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
// Exercise the actual browser harmony and ARP functions, without running setup() or Web Audio.
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
let src=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(src,'Missing inline script');
src=src.replace(/\nsetup\(\);\s*$/,'');
new vm.Script(src);
const cx=vm.createContext({console,Math,Date,setTimeout,clearTimeout});
vm.runInContext(src,cx);
vm.runInContext('render=()=>{};toast=()=>{};state.play=false;',cx);
const run=code=>vm.runInContext(code,cx);
let checks=0;
for(const spice of [0,15,36,60,80,100])for(const feel of ['warm','crispy','cheesy'])for(const key of [0,5,9]){
 run(`state.key=${key};state.mode='major';state.wonder=${spice};state.feel='${feel}';state.flipMode='keep';state.selected=2;startProgression();state.steps[0].manualRoot=state.steps[0].root`);
 for(let i=0;i<10;i++){
  const kept=run('JSON.stringify(state.steps[2])'),fixed=run('state.steps[0].root');
  assert.equal(run('harmonicVariation()'),true);
  assert.equal(run('JSON.stringify(state.steps[2])'),kept,'KEEP 1 changed protected chord');
  assert.equal(run('state.steps[0].root'),fixed,'manual ROOT changed');
  checks++;
 }
 run("state.flipMode='all'");
 for(let i=0;i<10;i++){
  const previous=JSON.parse(JSON.stringify(run('state.steps.map(c=>[c.root,c.quality])')));
  assert.equal(run('harmonicVariation()'),true);
  const next=JSON.parse(JSON.stringify(run('state.steps.map(c=>[c.root,c.quality])')));
  assert.ok(previous.every((c,j)=>c[0]!==next[j][0]||c[1]!==next[j][1]),'ALL 4 unchanged slot');
  assert.ok(run('state.steps.every(c=>c.manualRoot===null&&c.manualQuality===null)'),'ALL 4 left pins');
  checks++;
 }
}
run("state.arp={rate:32,gate:25,direction:'updown',order:'fifth'}");
assert.equal(run("arpBaseNotes([60,64,67,72],{root:0})[0]"),67);
assert.equal(run("arpNote([10,20,30],3)"),20);
run('globalThis.calls=[];tone=(...a)=>calls.push(a);state.holdLift=false;state.holdRush=false');
run("playVoicing({root:0,quality:'maj7'},0,2,'arp',[60,64,67,71])");
const hits=Array.from(run('calls')).filter(c=>c[5]===true);
assert.equal(hits.length,16,'RATE not applied');
assert.ok(hits[0][2]<.04,'GATE not applied');
run("state.feel='warm'");const warm=run("feelScore({root:0,quality:'m9'},0,null)");
run("state.feel='crispy'");const crispy=run("feelScore({root:0,quality:'sus2'},0,null)");
run("state.feel='cheesy'");const cheesy=run("feelScore({root:0,quality:'dom7'},0,null)");
assert.ok(warm>1.5&&crispy>1.5&&cheesy>1.5,'FEEL did not change candidate scores');
console.log('PASS',checks,'KEEP1/ALL4 mutations; FEEL and ARP');
