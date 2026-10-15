import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const extract=(a,b)=>html.slice(html.indexOf(a),html.indexOf(b,html.indexOf(a)));
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.listeners={};this.attributes={};}
 appendChild(child){this.children.push(child);}
 replaceChildren(){this.children=[];}
 setAttribute(name,value){this.attributes[name]=value;}
 addEventListener(name,fn){this.listeners[name]=fn;}
 focus(){this.focused=true;}
 querySelectorAll(cls){return this.children.flatMap(row=>row.children).filter(n=>'.'+n.className===cls);}
}
const nodes={saved:new Element('div'),keep:new Element('button')};let stores=0,loaded,exported;
const one={id:'one',tempo:92,motion:'hold',steps:[{root:0}]},two={id:'two',tempo:126,motion:'arp',steps:[{root:7}]};
const state={saved:[one,two],play:true,tempo:160,steps:[{root:9}],motion:'pulse'};
const c={state,$:id=>nodes[id],document:{createElement:tag=>new Element(tag)},label:c=>'Root '+c.root,loadIdea:id=>loaded=id,exportSavedMidi:id=>exported=id,store:()=>stores++,toast(){}};
vm.createContext(c);
vm.runInContext(extract('function renderSaved(){','function sessionSave(){'),c);
vm.runInContext(extract('function deleteSavedIdea(id){','// Bounded SMF parser.'),c);
c.renderSaved();assert.equal(nodes.saved.children.length,2);
for(const row of nodes.saved.children){
 assert.equal(row.children.filter(n=>n.tag==='button').length,3);
 for(const button of row.children.filter(n=>n.tag==='button')){assert.equal(button.type,'button');assert.ok(button.attributes['aria-label']);assert.equal(button.children.length,0,'No nested buttons');}
}
const row=nodes.saved.children[1];assert.equal(row.children[1].textContent,'126 BPM · ARP');
row.children[2].listeners.click();assert.equal(exported,'two');assert.equal(loaded,undefined);
row.children[0].listeners.click();assert.equal(loaded,'two');
const live=JSON.stringify({steps:state.steps,tempo:state.tempo,play:state.play,motion:state.motion});
row.children[3].listeners.click();assert.equal(stores,1);assert.deepEqual(state.saved,[one]);
assert.equal(nodes.saved.children.length,1);assert.ok(nodes.saved.querySelectorAll('.savedbtn')[0].focused);
assert.equal(JSON.stringify({steps:state.steps,tempo:state.tempo,play:state.play,motion:state.motion}),live);
c.deleteSavedIdea('absent');assert.equal(stores,1);
c.deleteSavedIdea('one');assert.equal(stores,2);assert.equal(state.saved.length,0);
assert.equal(nodes.saved.children[0].className,'empty');assert.ok(nodes.keep.focused);
console.log('PASS saved actions: separate load/MIDI/delete buttons, correct IDs, stored deletion, preserved playback, empty state and focus.');
