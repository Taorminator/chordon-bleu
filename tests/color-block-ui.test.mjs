import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
function fragment(a,b){
 const i=html.indexOf(a),j=html.indexOf(b,i+a.length);
 assert.ok(i>=0&&j>i,'Missing UI block '+a);
 return html.slice(i,j);
}
const main=fragment('<main class="content" id="main">','</main>');
const chords=fragment('<section class="chord-workspace"','</section>');
const harmony=fragment('<section class="harmony-station"','</section>');
const perform=fragment('<section class="performance-station"','</section>');
const season=fragment('<section class="section season-station"','</section>');
const css=fragment('/* CHORDON BLEU / COLOR KITCHEN 2026','</style>');

assert.ok(chords.indexOf('id="play"')<chords.indexOf('class="stage"'),
 'PLAY/FLIP/SAVE should precede the actual chords');
assert.ok(harmony.indexOf('id="key"')>=0&&harmony.indexOf('id="key"')<harmony.indexOf('id="recipechoices"'),
 'Root/scale selector belongs first in Harmony');
assert.equal((main.match(/id="key"/g)||[]).length,1);
assert.doesNotMatch(main,/class="topbar"/);
assert.match(perform,/<select id="sound"/);
assert.doesNotMatch(perform,/id="audioreset"/);
assert.match(html,/id="audionudge"/,'Safari error recovery stays available');
assert.ok(['id="lift"','id="rush"','id="cb-delay"'].every(x=>season.includes(x)));
assert.ok(main.indexOf('class="section playpanel"')<main.indexOf('class="editor"'),
 'PICK and SHAPE must remain paired');
assert.doesNotMatch(main,/48 \/ SLOW|160 \/ FAST|Sechs Klangprogramme|HOW IT SOUNDS/);
assert.match(css,/grid-template-areas:"chords live" "harmony season" "pick shape"/);
assert.match(css,/align-items:stretch/,'CHORDS must align vertically with PERFORM');
assert.match(css,/\.chord-workspace \.stage\{[^}]*flex:1/,'CHORDS stage fills available height');
assert.match(css,/\.app :where\(button,select,input,textarea\)\{border:0!important;outline:0!important\}/);
assert.match(css,/:focus-visible\{/,'Keyboard navigation keeps a visible focus indicator');
for(const id of ['classic','ghibli-dream','blue-hour','moonlit-kingdom','dust-and-echoes'])
 assert.ok(css.includes('.recipe-chip[data-recipe="'+id+'"]'),id+' should have its own color');
for(const id of ['#lift','#rush','#cb-delay'])
 assert.ok(css.includes('.app '+id+'{background:'),id+' needs its own gradient');
assert.match(css,/repeating-linear-gradient/,'DELAY gets repeat blue/green color bars');
assert.match(css,/\.motionbuttons button\[data-motion="arp"\]::before/,'Playful motion symbols');
assert.match(css,/\.chord-root\{/,'Clear large root name');
assert.match(css,/\.chordname\{/,'Readable quality label');
assert.ok(main.includes('id="bass-stage"')&&main.includes('id="bass-notes"'),
 'Bass pitches have a persistent panel below the chord cards');
assert.ok(main.indexOf('class="stage"')<main.indexOf('id="bass-stage"'),
 'The bass window appears directly below the regular chords');
assert.doesNotMatch(main,/focus-chords|focus-bass|track-focus/,
 'Chord and bass no longer require a mode switch');
assert.match(main,/id="bass-flip"[^>]*aria-label="Neue Bassline erzeugen, Akkorde beibehalten"/,
 'Bass regeneration is independent and clearly labeled');
assert.ok(css.includes('.bass-note{')&&css.includes('background:#dbe2ff;color:#111831'),
 'Bass notes use a light surface with dark high-contrast labels');
assert.ok(css.includes('.bass-flip{min-height:44px;')&&css.includes('background:#4657ff;color:#fff'),
 'Bass FLIP has a 44px target and high-contrast text');
function luminance(hex){
 let raw=hex.slice(1);
 if(raw.length===3)raw=raw.split('').map(part=>part+part).join('');
 const value=raw.match(/.{2}/g).map(part=>parseInt(part,16)/255).map(channel=>
  channel<=.04045?channel/12.92:((channel+.055)/1.055)**2.4);
 return .2126*value[0]+.7152*value[1]+.0722*value[2];
}
function contrast(foreground,background){
 const a=luminance(foreground),b=luminance(background);
 return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
}
assert.ok(contrast('#e8ecff','#141b30')>=4.5,'Inactive track label meets WCAG AA contrast');
assert.ok(contrast('#fff','#4657ff')>=4.5,'Active track label meets WCAG AA contrast');


class Node{
 constructor(tag='div'){
  this.tagName=tag;this.children=[];this.dataset={};this.attributes={};this.className='';
  this.style={setProperty:(k,v)=>{this.style[k]=v}};
  this.classes=new Set();
  this.classList={
   toggle:(name,on)=>{if(on===undefined)on=!this.classes.has(name);if(on)this.classes.add(name);else this.classes.delete(name);}
  };
  this.listeners={};
 }
 appendChild(n){this.children.push(n);}
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(...nodes){this.children=[...nodes];}
 setAttribute(k,v){this.attributes[k]=String(v);}
 addEventListener(name,fn){this.listeners[name]=fn;}
}
const nodes=Object.fromEntries(['steps','led','runlabel','stagebpm','status','loopindicator','heatname','selection','flipcaption'].map(id=>[id,new Node()]));
let previews=0;
const state={steps:[
 {root:2,quality:'maj9',manualRoot:null,manualQuality:null},
 {root:7,quality:'min',manualRoot:null,manualQuality:null},
 {root:0,quality:'maj7',manualRoot:0,manualQuality:null},
 {root:9,quality:'m7',manualRoot:null,manualQuality:null}
],selected:0,current:-1,play:false,rec:false,recIdx:0,loopCount:1,tempo:120,flipMode:'keep'};
const Q={
 maj9:{label:'Major 9'},min:{label:'Minor'},maj7:{label:'Major 7'},m7:{label:'Minor 7'}
};
const sandbox={
 state,Q,document:{createElement:(tag)=>new Node(tag)},$:id=>nodes[id],
 label:c=>String(c.root),rootName:n=>['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'][n],
 chordHue:()=>"#d1b2ff",chordHeat:()=>42,temperatureLabel:()=> 'WARM',
 audition(){previews++;},renderEditor(){},Math,JSON,String
};
vm.createContext(sandbox);
const renderCode=fragment('function renderStage(){','function renderEditor(){');
assert.doesNotMatch(renderCode,/createElement\('i'\)|stepart|\.style\.width=width/,
 'The old unlabeled chord stripes must not be rendered');
assert.match(renderCode,/Q\[c\.quality\]\.label\.toUpperCase\(\)/,
 'Each tile must spell the complete chord quality');
vm.runInContext(renderCode,sandbox);
vm.runInContext('renderStage()',sandbox);
assert.equal(nodes.steps.children.length,4);
const first=nodes.steps.children[0];
const face=first.children.find(x=>x.className==='chord-face');
assert.ok(face);
assert.equal(face.children[0].textContent,'D');
assert.equal(face.children[1].textContent,'MAJOR 9');
assert.equal(first.attributes['aria-pressed'],'true');
assert.equal(first.attributes['aria-label'],'Chord 1: D Major 9. Select and preview.');
assert.equal(first.children.filter(x=>x.tagName==='i').length,0);
sandbox.state.selected=2;
vm.runInContext('renderStage()',sandbox);
assert.equal(nodes.steps.children[2].attributes['aria-pressed'],'true');
assert.equal(nodes.steps.children[0].attributes['aria-pressed'],'false');
nodes.steps.children[1].listeners.click();
assert.equal(sandbox.state.selected,1,'Touching a card selects its chord');
assert.equal(previews,1,'Touching a card previews its harmony');
console.log('PASS 2026 UI: borderless color panels, all 5 recipe colors, clear playable chord names, key, focus, layout.');
