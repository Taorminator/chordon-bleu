import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const start=html.indexOf('function bassNoteName(');
const end=html.indexOf('function flipBassline()',start);
assert.ok(start>=0&&end>start,'Bass note renderer exists');
const source=html.slice(start,end);

class Node{
 constructor(tag='div'){this.tagName=tag;this.children=[];this.attributes={};this.className='';this.textContent='';}
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(...nodes){this.children=[...nodes];}
 setAttribute(name,value){this.attributes[name]=String(value);}
}
const notes=new Node('div');
const state={
 tempo:120,
 steps:[{root:0},{root:7},{root:9},{root:5}],
 bassTrack:{enabled:true},
};
const bassApi={resolveBassTrack:()=>[
 {slot:0,note:36,time:0},
 {slot:0,note:43,time:.25},
 {slot:1,note:45,time:1},
 {slot:2,note:41,time:2},
]};
const sandbox={
 state,bassApi,Q:{},NAMES:['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'],
 mod:n=>(n%12+12)%12,rootName:n=>['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'][((n%12)+12)%12],document:{createElement:tag=>new Node(tag)},$:id=>id==='bass-notes'?notes:null,
};
vm.createContext(sandbox);
vm.runInContext(source,sandbox);
vm.runInContext('renderBassStage()',sandbox);
assert.equal(notes.children.length,4,'The loop has one visual group per chord');
assert.equal(notes.children[0].children[0].textContent,'01 · C');
const firstPitches=notes.children[0].children[1];
assert.equal(firstPitches.children.length,2,'Each bass event is shown');
assert.equal(firstPitches.children[0].children[0].textContent,'C2');
assert.equal(firstPitches.children[0].children[1].textContent,'1');
assert.equal(firstPitches.children[1].children[0].textContent,'G2');
assert.equal(firstPitches.children[1].children[1].textContent,'1&');
assert.equal(notes.children[1].children[1].children[0].children[1].textContent,'3');
assert.equal(firstPitches.children[0].attributes['aria-label'],'C2, Schlag 1');
console.log('PASS bass display: actual note names, octaves, chord groups, beat positions and accessible labels.');
