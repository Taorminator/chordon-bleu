import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {banks} from '../assets/dx7/aquanode-presets.js';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const source=html.match(/<script>([\s\S]*?)<\/script>/)[1].replace(/\n\/\/ BROWSER_STARTUP[\s\S]*$/,'');
class Element{
 constructor(){this.children=[];this.events={};this.textContent='';this.value='';}
 replaceChildren(){this.children=[];}
 append(...children){this.children.push(...children);}
 addEventListener(event,fn){this.events[event]=fn;}
 focus(){this.focused=true;}
 select(){this.selected=true;}
 showModal(){this.open=true;}
 close(){this.open=false;this.events.close?.();}
}
const ids=['share-summary','share-url','share-feedback','share-native','share-copy','share-close','share-dialog','share-idea','hw-share-idea','dx7preset'];
const nodes=Object.fromEntries(ids.map(id=>[id,new Element()]));
let copied,shared,clipboardFail=false,shareError,stops=0;
const navigator={clipboard:{async writeText(value){if(clipboardFail)throw Error('Denied');copied=value;}},async share(data){if(shareError)throw shareError;shared=data;}};
const window={events:{},addEventListener(event,fn){this.events[event]=fn;}};
const cx=vm.createContext({console,Math,Date,URL,TextEncoder,TextDecoder,Uint8Array,btoa,atob,setTimeout,clearTimeout,navigator,window,location:{href:'https://example.test/demo/?tracking=private#old',hash:''},document:{getElementById:id=>nodes[id],createElement:()=>new Element()}});
vm.runInContext(source,cx);const run=code=>vm.runInContext(code,cx);
cx.onStop=()=>stops++;
run("toast=msg=>globalThis.message=msg;stopPlayback=()=>onStop();render=()=>{};ensureAudio=()=>{throw Error('Sharing must never start audio');};state.steps=[{root:2,quality:'m9',manualRoot:2,manualQuality:null},{root:7,quality:'dom13',manualRoot:null,manualQuality:'dom13'},{root:0,quality:'maj7',manualRoot:null,manualQuality:null},{root:9,quality:'m7',manualRoot:9,manualQuality:'m7'}];state.motion='arp';state.arp={rate:8,gate:74,direction:'updown',order:'outside'};state.saved=[{id:'private-favorite'}];");
const idea=cx.captureShareIdea();
const url=cx.makeShareUrl(idea);assert.ok(url.length<3000);assert.equal(new URL(url).search,'');
assert.equal(JSON.stringify(cx.decodeShareIdea(new URL(url).hash)),JSON.stringify(idea));
const payload=JSON.parse(Buffer.from(new URL(url).hash.slice(6),'base64url').toString());
assert.ok(!('saved' in payload)&&!('undo' in payload)&&!('play' in payload)&&!('holdLift' in payload));
const fm1=cx.makeShareUrl(idea,'https://example.test/?view=fm1&token=private');assert.equal(new URL(fm1).search,'?view=fm1');
assert.equal(new URL(cx.makeShareUrl(idea,'https://private:secret@example.test/')).username,'');
assert.throws(()=>cx.makeShareUrl(idea,'file:///private/index.html'),/gehostete/);
run('state.steps[0].root=4;state.tempo=160');assert.equal(cx.decodeShareIdea(new URL(url).hash).steps[0].root,2,'Shared link stays frozen');
const favorites=run('JSON.stringify(state.saved)');assert.ok(cx.loadSharedIdea(new URL(url).hash));
assert.equal(stops,0);assert.equal(run('state.play'),false);assert.equal(run('JSON.stringify(state.saved)'),favorites);
assert.equal(run('state.steps[0].root'),2);assert.equal(run('state.steps[0].manualRoot'),2);
assert.equal(run('state.steps[0].manualQuality'),null);assert.equal(run('state.arp.order'),'outside');
run('state.play=true;state.holdLift=true;state.rec=true');cx.loadSharedIdea(new URL(url).hash);
assert.equal(stops,1);assert.equal(run('state.play||state.rec||state.holdLift'),false);
for(const fragment of ['#idea=???','#idea=abc','#idea='+('a'.repeat(6001))]){
 const before=run('JSON.stringify(state)');assert.equal(cx.loadSharedIdea(fragment),false);assert.equal(run('JSON.stringify(state)'),before);
}
for(const change of [{v:2},{tempo:500},{sound:99},{mode:'__proto__'},{dx7Preset:'user'},{dx7Preset:'presets-3:30'},{steps:[{}]},{arp:{...idea.arp,gate:0}}])assert.throws(()=>cx.validateShareIdea({...idea,...change}));
assert.throws(()=>cx.validateShareIdea({...idea,steps:idea.steps.map((c,i)=>i?c:{...c,quality:'toString'})}));
const safe=cx.validateShareIdea({...idea,saved:['do not share'],__proto__:{danger:true}});assert.ok(!('saved' in safe)&&!('danger' in safe));
for(const bank of banks)for(const preset of bank.presets)assert.equal(cx.sharePresetAvailable(preset.id),true);
const available=new Set(banks.flatMap(b=>b.presets.map(p=>p.id)));
for(const bank of banks)for(let slot=0;slot<32;slot++)assert.equal(cx.sharePresetAvailable(bank.id+':'+slot),available.has(bank.id+':'+slot));
run("state.sound=3;state.dx7Preset='user'");assert.throws(()=>cx.captureShareIdea(),/Eigene DX7/);
run("state.sound=3;state.dx7Preset='aquazone:1'");nodes.dx7preset.value='aquazone:1';nodes.dx7preset.selectedOptions=[{textContent:'DX Fast 1'}];
cx.setupShareIdea();cx.openShareIdea({currentTarget:nodes['share-idea']});
assert.ok(nodes['share-dialog'].open);assert.equal(copied,undefined);assert.equal(shared,undefined,'Preview must not transmit');
assert.ok(nodes['share-summary'].children.some(n=>n.textContent.includes('DX Fast 1')));
assert.ok(nodes['share-summary'].children.some(n=>n.textContent.includes('74 %')));
assert.ok(nodes['share-summary'].children.some(n=>n.textContent.includes('Root fixiert')));
const frozen=nodes['share-url'].value;run('state.tempo=150');await cx.copyShareIdea();assert.equal(copied,frozen);
await cx.nativeShareIdea();assert.equal(shared.url,frozen);
clipboardFail=true;await cx.copyShareIdea();assert.ok(nodes['share-url'].selected);assert.match(nodes['share-feedback'].textContent,/manuell/);
shareError={name:'AbortError'};nodes['share-feedback'].textContent='';await cx.nativeShareIdea();assert.equal(nodes['share-feedback'].textContent,'');
shareError={name:'NotAllowedError'};await cx.nativeShareIdea();assert.match(nodes['share-feedback'].textContent,/kopieren/);
let stopped=false;nodes['share-dialog'].events.keydown({stopPropagation(){stopped=true;}});assert.ok(stopped);
nodes['share-dialog'].close();assert.ok(nodes['share-idea'].focused);
assert.match(html,/if\(!loadSharedIdea\(location.hash\)&&!sessionLoad\(\)\)/,'Shared URL precedes saved session');
assert.match(html,/<dialog id="share-dialog"[^>]*aria-labelledby=/);
console.log('PASS share links: versioned round trip, full preview, frozen payload, no favorites/audio, strict validation, preset catalog, copy/native/fallback, modal keyboard and focus.');
