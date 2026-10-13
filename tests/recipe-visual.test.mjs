import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const code=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].at(-1)?.[1]
  ?.replace(/\nsetup\(\);[\s\S]*$/,'');
assert.ok(code,'Missing CHORDON BLEU browser script');
new vm.Script(code,{filename:'CHORDON browser UI'});
const context=vm.createContext({Math,Date,console,setTimeout,clearTimeout});
vm.runInContext(code,context);
const exec=js=>vm.runInContext(js,context);

// Spy on the real drawing functions: no duplicate illustration or synthetic pixels.
const operations=[];
const canvas={
 beginPath(){},closePath(){},moveTo(){},lineTo(){},bezierCurveTo(){},quadraticCurveTo(){},roundRect(){},
 stroke(){operations.push(['stroke',this.strokeStyle]);},
 fill(){operations.push(['fill',this.fillStyle]);},
 fillRect(x,y,w,h){operations.push(['rect',this.fillStyle,x,y,w,h]);},
 ellipse(x,y,rx,ry){operations.push(['ellipse',this.fillStyle,x,y,rx,ry]);},
 fillText(label){operations.push(['text',String(label)]);},
};
context.canvas=canvas;
function paint(feel,spice=40){
 operations.length=0;
 exec("state.recipeId='classic';state.feel="+JSON.stringify(feel)+";state.wonder="+spice+";fm1DrawRecipe(canvas);");
 return operations.map(o=>[...o]);
}
const warm=paint('warm');
assert.ok(warm.some(x=>x[0]==='ellipse'&&x[2]===120&&x[3]===112&&x[4]===88),
 'Recipe must render an actual serving plate');
assert.ok(warm.some(x=>x[0]==='fill'&&x[1]==='#e4b777'),
 'Recipe must show a golden breaded cutlet');
assert.ok(!warm.some(x=>x[0]==='fill'&&x[1]==='#ffe17a'),
 'Warm FEEL should not show melting cheese outside the cutlet');
const crispy=paint('crispy');
assert.ok(crispy.some(x=>x[0]==='stroke'&&x[1]==='#8f4b25'),
 'CRISPY FEEL should add toasted detail');
const cheesy=paint('cheesy');
assert.ok(cheesy.some(x=>x[0]==='fill'&&x[1]==='#ffe17a'),
 'CHEESY FEEL must visibly extrude cheese');
assert.ok(cheesy.some(x=>x[0]==='text'&&x[1].includes('CHEESY')),
 'CHEESY state must be discoverable in screen caption');
assert.equal(exec("fm1CheeseFlow('warm',100,0)"),0,'No cheese should flow in warm mode');
assert.ok(exec("fm1CheeseFlow('cheesy',100,0)")>exec("fm1CheeseFlow('cheesy',0,0)"),
 'More SPICE should result in more melted cheese');
assert.match(html,/prefers-reduced-motion: reduce/,'Honor OS reduced motion');
assert.match(html,/fm1ScheduleCheese\(\);/,'Animated view should schedule while active');
assert.match(html,/if\(fm1CheeseTimer\|\|fm1Screen!=='recipes'\|\|state\.feel!=='cheesy'/,
 'Do not schedule animation outside CHEESY screen');
assert.ok(!html.includes('Hand drawn abstract warm/cold bowl'),'Outdated bowl illustration is not allowed');
console.log('PASS: plated Cordon Bleu, CHEESY/SPICE feedback, reduced-motion and gated animation.');
