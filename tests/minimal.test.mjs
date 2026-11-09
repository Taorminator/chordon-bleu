import { SOUND_CATALOG, soundById } from '../core/minimal-sounds.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { Session, STORAGE_KEY, TEMPO } from '../core/minimal-session.mjs';
import { label, alternatives } from '../core/minimal-harmony.mjs';
import { Piano } from '../core/minimal-audio.mjs';

test('one slot changes, neighbours stay fixed, both directions and undo are exact', () => {
  for (let slot = 0; slot < 4; slot++) {
    const s = new Session(), start = s.snapshot();
    s.select(slot); s.vary(1);
    assert.notEqual(label(s.steps[slot]), label(start.steps[slot]));
    s.steps.forEach((c, i) => { if (i !== slot) assert.deepEqual(c, start.steps[i]); });
    s.vary(-1); assert.deepEqual(s.snapshot(), start);
    s.vary(-1); assert.notDeepEqual(s.snapshot(), start);
    s.select((slot + 1) % 4); s.vary(1);
    assert.equal(s.undo(), true); assert.equal(s.selected, (slot + 1) % 4);
    assert.equal(s.undo(), true); assert.equal(s.selected, slot); assert.deepEqual(s.snapshot(), start);
  }
});
test('all proposals remain diatonic and playable, across selections and the loop seam', () => {
  const s = new Session(), scale = new Set([0,2,4,5,7,9,11]);
  for (let n = 0; n < 160; n++) {
    s.select(n % 4);
    const deck = alternatives(s.steps, s.selected);
    assert.equal(new Set(deck.map(label)).size, deck.length);
    s.vary(1);
    for (const notes of s.voices()) {
      assert.ok(notes.length >= 3 && notes.length <= 4);
      assert.ok(notes.every(note => Number.isInteger(note) && note >= 49 && note <= 82 && scale.has(note % 12)));
    }
  }
  assert.equal(s.history.length, 32);
  for (let n = 0; n < 32; n++) assert.ok(s.undo());
  assert.equal(s.undo(), false);
});
test('local restore is bounded, immutable and never restores a transport or legacy favorites', () => {
  const s = new Session(); s.vary(1);
  const saved = s.snapshot(), restored = new Session(saved);
  assert.deepEqual(restored.snapshot(), saved);
  assert.equal(restored.selected, 0); assert.deepEqual(restored.history, []);
  saved.steps[0].root = 11; assert.notDeepEqual(restored.snapshot(), saved);
  for (const bad of [null, {}, {version:1,steps:[]}, {version:1,steps:[{root:0,quality:'__proto__'},...s.steps.slice(1)]}, {version:1,steps:[{root:NaN,quality:'maj7'},...s.steps.slice(1)]}, {version:99,steps:s.steps}]) {
    assert.deepEqual(new Session(bad).names(), new Session().names());
  }
  assert.notEqual(STORAGE_KEY, 'chordon-bleu.session.v1');
  assert.equal(TEMPO, 84);
});

function fakeAudio() {
  const sources = [], nodes = [];
  const param = () => ({ value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {}, setTargetAtTime() {} });
  const node = () => {
    const value = { disconnected: false, connect() {}, disconnect() { this.disconnected = true; }, gain:param(),frequency:param(),detune:param(),Q:param() };
    nodes.push(value); return value;
  };
  class AudioContext {
    constructor() { this.state='running'; this.currentTime=0; this.destination=node(); }
    createGain() { return node(); }
    createBiquadFilter() { return node(); }
    createOscillator() { const value = Object.assign(node(), { start(at) { this.at=at; }, stop(at) { this.end=at; } }); sources.push(value); return value; }
    async resume() { this.state = 'running'; }
  }
  return { environment: {AudioContext,navigator:{audioSession:{}},setTimeout,clearTimeout}, sources, nodes };
}
test('FM audio starts on gesture, finite release, panic cancels scheduled notes and disconnects nodes', async () => {
  const f = fakeAudio(), piano = new Piano(f.environment);
  assert.equal(piano.context, null);
  await piano.ready();
  assert.equal(f.environment.navigator.audioSession.type, 'playback');
  piano.chord([60,64,67,71], 4, 1.2, 0);
  assert.equal(piano.voices.size, 4);
  assert.ok(f.sources.slice(1).every(osc => osc.at === 4 && Number.isFinite(osc.end) && osc.end > 5.2));
  piano.silence();
  assert.ok(f.sources.slice(1).every(osc => osc.end === .04));
  for (const osc of f.sources) osc.onended();
  assert.equal(piano.voices.size, 0);
  assert.ok(f.nodes.slice(2).every(node => node.disconnected));
  let interrupts=0; piano.onInterrupt=()=>interrupts++;
  piano.context.state='suspended'; piano.context.onstatechange(); assert.equal(interrupts,1);
});

function harness() {
  const elements = new Map(), timers = new Map(); let id = 0, pendingReady, clock=0;
  function element(name) {
    if (elements.has(name)) return elements.get(name);
    const classes = new Set(), listeners = {};
    const e = { name, listeners, textContent:'', disabled:false, attrs:{}, style:{setProperty(){}},
      classList:{toggle(c,on){ if(on)classes.add(c);else classes.delete(c); },contains:c=>classes.has(c)},
      setAttribute(k,v){this.attrs[k]=v;}, addEventListener(k,fn){listeners[k]=fn;},
      querySelector(k){return element(name+k);}, closest(){return null;}, focus(){}, setPointerCapture(){} };
    elements.set(name,e); return e;
  }
  const pads = Array.from({length:4},(_,i)=>element(`pad${i}`));
  const document = { hidden:false, getElementById:element,querySelectorAll:()=>pads,addEventListener:(k,fn)=>element('document').addEventListener(k,fn) };
  const notes=[];
  class FakePiano {
    constructor(){this.context={get currentTime(){return clock;}};}
    setSound(id){this.soundId=id;}
    ready(){return new Promise(resolve=>{pendingReady=resolve;});}
    chord(...args){notes.push(args);}
    silence(){notes.length=0;}
  }
  const context = vm.createContext({Session,STORAGE_KEY,TEMPO,label,alternatives,SOUND_CATALOG,soundById,Piano:FakePiano,document,
    window:{addEventListener(){}},localStorage:{getItem(){return null;},setItem(){}},console,
    setTimeout:(fn,ms)=>{timers.set(++id,{fn,ms,type:'timeout'});return id;},clearTimeout:i=>timers.delete(i),
    setInterval:(fn,ms)=>{timers.set(++id,{fn,ms,type:'interval'});return id;},clearInterval:i=>timers.delete(i),
    requestAnimationFrame:fn=>{timers.set(++id,{fn,type:'frame'});return id;},cancelAnimationFrame:i=>timers.delete(i) });
  const source = readFileSync(new URL('../core/minimal-app.mjs',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
  vm.runInContext(source,context);
  return { elements,pads,notes,timers,document, run:s=>vm.runInContext(s,context),
    resolve:async()=>{pendingReady();await new Promise(resolve=>setImmediate(resolve));}, clock:v=>{clock=v;} };
}
test('rapid Play/Stop cannot launch late; live editing preserves playing slot, stop clears every schedule', async () => {
  const h=harness(), click=id=>h.elements.get(id).listeners.click();
  assert.equal(h.notes.length,0,'no autoplay');
  click('play'); click('play'); await h.resolve();
  assert.equal(h.run('playing'),false); assert.equal(h.notes.length,0); assert.equal(h.timers.size,0);
  click('play'); await h.resolve();
  assert.equal(h.run('playing'),true); assert.equal(h.notes.length,1);
  h.clock(.05); h.run('drawPlayback()'); assert.equal(h.run('sounding'),0);
  h.pads[3].listeners.click(); click('next');
  assert.equal(h.run('session.selected'),3); assert.equal(h.run('sounding'),0);
  assert.equal(h.notes.length,1,'edits never interrupt the other playing chord');
  assert.equal(h.elements.get('undo').disabled,false);
  click('undo'); assert.equal(h.run('session.names()[3]'),'G7');
  click('play'); assert.equal(h.notes.length,0); assert.equal(h.run('visualQueue.length'),0);
  assert.equal(h.run('playing'),false);
  // A stale animation callback is harmless after stop.
  h.run('drawPlayback()'); assert.equal(h.run('sounding'),-1);
});
test('loop uses audio-clock timing; hidden or overdue pages stop without catch-up bursts', async () => {
  const h=harness(); h.elements.get('play').listeners.click(); await h.resolve();
  h.clock(1.4); h.run('schedule()');
  assert.equal(h.notes.length,2);
  assert.ok(Math.abs(h.notes[1][1]-h.notes[0][1]-60/84*2)<1e-9);
  h.clock(8); h.run('schedule()'); assert.equal(h.run('playing'),false); assert.equal(h.notes.length,0);
  h.elements.get('play').listeners.click(); await h.resolve();
  h.document.hidden=true; h.elements.get('document').listeners.visibilitychange();
  assert.equal(h.run('playing'),false); assert.equal(h.notes.length,0);
});
test('old idea and FM1 links keep their fragment/query when routed to Classic', () => {
  const html = readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const code = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  for (const [suffix, expected] of [['',null],['#idea=abc','classic.html#idea=abc'],['?view=fm1#idea=abc','classic.html?view=fm1#idea=abc'],['?view=fm1','classic.html?view=fm1']]) {
    const url=new URL('https://example.org/chordon-bleu/'+suffix); let target=null;
    const location={href:url.href,search:url.search,hash:url.hash,replace:value=>{target=value;}};
    vm.runInNewContext(code,{location,URL,URLSearchParams});
    assert.equal(target,expected?'https://example.org/chordon-bleu/'+expected:null);
  }
});
test('sound catalogue preserves all six original programs and 153 DX7 presets', async () => {
  const { SOUNDS } = await import('../core/minimal-sounds.mjs');
  const html=readFileSync(new URL('../classic.html',import.meta.url),'utf8');
  const old=vm.runInNewContext(html.slice(html.indexOf('const SOUNDS='),html.indexOf('// Local synth programs'))+';JSON.stringify(SOUNDS)');
  assert.deepEqual(SOUNDS,JSON.parse(old));
  assert.equal(SOUND_CATALOG.length,159);
  assert.equal(new Set(SOUND_CATALOG.map(s=>s.id)).size,159);
  const s=new Session();s.soundId='dx7:aquazone:1';s.vary(1);s.undo();
  assert.equal(s.soundId,'dx7:aquazone:1','chord undo must not change instrument');
  assert.equal(new Session(s.snapshot()).soundId,s.soundId);
  assert.equal(new Session({soundId:'broken'}).soundId,'local:3');
  for(let i=0;i<6;i++){
    const f=fakeAudio(),p=new Piano(f.environment);await p.ready();p.setSound('local:'+i);
    p.chord([60,64,67],.01,1.2,0);assert.equal(p.voices.size,3);
    assert.ok(f.sources.slice(1).every(osc=>Number.isFinite(osc.end)));
    p.silence();for(const osc of f.sources)osc.onended();assert.equal(p.voices.size,0);
  }
});
test('DX7 preparation discards stale preset loads; sound changes and Stop cancel queued MIDI', async () => {
  const f=fakeAudio();let load,loads=0;const messages=[],timers=new Map();let n=0;
  f.environment.AudioWorkletNode=class{constructor(context){this.context=context;this.port={postMessage:m=>messages.push(m)};}connect(){}disconnect(){}};
  f.environment.setTimeout=fn=>{timers.set(++n,fn);return n;};f.environment.clearTimeout=id=>timers.delete(id);
  const p=new Piano(f.environment);await p.ready();
  p.context.audioWorklet={addModule:()=>{loads++;return new Promise(resolve=>{load=resolve;});}};
  p.setSound('dx7:aquazone:1');const a=p.prepareSound();
  p.setSound('dx7:aquazone:2');const b=p.prepareSound();load();
  assert.equal(await a,false);assert.equal(await b,true);assert.equal(loads,1);
  assert.equal(messages.filter(m=>m.type==='patch').length,1);
  assert.equal(messages.find(m=>m.type==='patch').patch.name.trim(),'DX Fast 2');
  p.chord([60,64,67],1,1.2,0);assert.equal(timers.size,6);
  p.setSound('local:4');assert.equal(timers.size,0);assert.equal(messages.at(-1).type,'panic');
  p.setSound('dx7:aquazone:1');await p.prepareSound();assert.equal(loads,1);
  p.chord([60,64,67],1,1.2,0);p.silence();assert.equal(timers.size,0);
});
test('PRESETS changes only the instrument and persists it independently of chord history', async()=>{
  const h=harness(),before=h.run('JSON.stringify(session.steps)');
  h.run('chooseSound(1)');await h.resolve();
  assert.equal(h.run('session.soundId'),'local:4');
  assert.equal(h.run('JSON.stringify(session.steps)'),before);
  assert.equal(h.run('session.history.length'),0);
  h.run('chooseSound(-1)');await h.resolve();assert.equal(h.run('session.soundId'),'local:3');
});
test('changing PRESETS during pending Play preserves the requested loop start', async()=>{
  const h=harness();h.run('togglePlay()');h.run('chooseSound(1)');await h.resolve();
  assert.equal(h.run('playing'),true);assert.equal(h.run('launching'),false);
  assert.equal(h.run('session.soundId'),'local:4');assert.equal(h.notes.length,1);
  h.run('stop()');assert.equal(h.notes.length,0);
});
