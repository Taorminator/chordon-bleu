import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
let source=html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(source);
source=source.replace(/\nsetup\(\);[\s\S]*$/,'');
new vm.Script(source);
const c=vm.createContext({console,Math,Date,setTimeout,clearTimeout,localStorage:{getItem(){return null},setItem(){}}});
vm.runInContext(source,c);
vm.runInContext('render=()=>{};renderSaved=()=>{};audition=()=>{};toast=()=>{};',c);
const v=x=>vm.runInContext(x,c);
const recipe=JSON.parse(JSON.stringify(v('RECIPE_CATALOG.find(r=>r.id==='ghibli-dream')')));
assert.equal(recipe.id,'ghibli-dream');
assert.equal(v("RECIPE_CATALOG.find(r=>r.id==='blue-hour').name"),'MANHATTAN');
assert.equal(v("RECIPE_CATALOG.find(r=>r.id==='moonlit-kingdom').name"),'TOKYO');
assert.equal(v("RECIPE_CATALOG.find(r=>r.id==='dust-and-echoes').name"),'CAPRESE');
assert.equal(recipe.templates.length,8);
assert.ok(recipe.palette.length>=12);
for(const tpl of recipe.templates)assert.ok(tpl.chords.length===4);
v("state.key=0;state.mode='major';state.wonder=70;state.recipeId='classic';startProgression()");
const classic=v("candidateScore({root:5,quality:'maj9',prior:4},0,null,70)");
v("state.recipeId='ghibli-dream';startProgression()");
assert.ok(v("candidateScore({root:5,quality:'maj9',prior:4},0,null,70)")>classic+1,'Recipe must alter real harmonic generation');
let count=0;
for(const spice of [0,22,40,65,100])for(const feel of ['warm','crispy','cheesy'])for(const mode of ['major','minor']){
 v(`state.recipeId='ghibli-dream';state.key=0;state.mode='${mode}';state.wonder=${spice};state.feel='${feel}';state.flipMode='keep';startProgression();state.selected=1;`);
 const original=v('JSON.stringify(state.steps[1])');
 for(let i=0;i<16;i++){assert.equal(v('harmonicVariation()'),true);assert.equal(v('JSON.stringify(state.steps[1])'),original);assert.ok(v('state.steps.every(c=>c.root>=0&&c.root<12&&!!Q[c.quality])'));count++;}
 v("state.flipMode='all'");
 for(let i=0;i<16;i++){const old=JSON.parse(JSON.stringify(v('state.steps.map(c=>[c.root,c.quality])')));assert.equal(v('harmonicVariation()'),true);const next=JSON.parse(JSON.stringify(v('state.steps.map(c=>[c.root,c.quality])')));assert.ok(next.every((x,j)=>x[0]!==old[j][0]||x[1]!==old[j][1]));count++;}
}
v("state.recipeId='ghibli-dream';state.wonder=40;startProgression();state.saved=[];saveIdea()");
assert.equal(v('state.saved[0].recipeId'),'ghibli-dream');
v("state.recipeId='classic';loadIdea(state.saved[0].id)");
assert.equal(v('state.recipeId'),'ghibli-dream');
v("state.recipeId='classic'");assert.equal(v('activeRecipe()'),null);
console.log('PASS '+count+' recipe FLIPs, save/restore, scoring and validity');
