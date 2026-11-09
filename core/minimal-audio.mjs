import { SOUNDS, soundById, presetById, DEFAULT_SOUND } from './minimal-sounds.mjs';
/* Classic sound programs and bundled six-operator DX7 backend. GPL-3.0-only. */
export class Piano {
  constructor(environment = globalThis) {
    this.environment = environment;
    this.context = null;
    this.master = null;
    this.voices = new Set();
    this.soundId=DEFAULT_SOUND; this.dxNode=null; this.dxReady=null; this.dxLoading=null; this.dxTimers=new Set(); this.moduleContext=null; this.dxOwners=new Map(); this.dxGate=0;
    this.onInterrupt = () => {};
  }
  async ready() {
    const env = this.environment;
    try {
      if (env.navigator?.audioSession) env.navigator.audioSession.type = 'playback';
    } catch { /* Optional Safari API. */ }
    if (!this.context || this.context.state === 'closed') {
      const Context = env.AudioContext || env.webkitAudioContext;
      if (!Context) throw new Error('Dieser Browser unterstützt Web Audio nicht.');
      const ctx = this.context = new Context();
      this.master = ctx.createGain();
      this.master.gain.value = .7;
      this.master.connect(ctx.destination);
      ctx.onstatechange = () => {
        if (ctx.state === 'suspended' || ctx.state === 'interrupted' || ctx.state === 'closed') this.onInterrupt();
      };
      // Initiated synchronously in the originating touch/click for iOS Safari.
      const unlock = ctx.createOscillator(), quiet = ctx.createGain();
      quiet.gain.value = .000001;
      unlock.connect(quiet); quiet.connect(ctx.destination);
      unlock.onended = () => { unlock.disconnect(); quiet.disconnect(); };
      unlock.start(); unlock.stop(ctx.currentTime + .03);
    }
    const ctx = this.context;
    if (ctx.state !== 'running') {
      let timer;
      try {
        await Promise.race([ctx.resume(), new Promise((_, reject) => {
          timer = this.environment.setTimeout(() => reject(new Error('Ton konnte nicht starten. Bitte erneut tippen.')), 1500);
        })]);
      } finally { this.environment.clearTimeout(timer); }
    }
    if (ctx.state !== 'running') throw new Error('Ton ist pausiert. Bitte erneut tippen.');
  }
  setSound(id) {
    const next=soundById(id).id;
    if(next===this.soundId)return;
    this.silence(); this.soundId=next; this.dxReady=null;
  }
  async prepareSound() {
    const sound=soundById(this.soundId), ctx=this.context;
    if(!sound.patch)return true;
    const id=this.soundId;
    if(this.dxReady===id && this.dxNode?.context===ctx)return true;
    if(!ctx.audioWorklet || !this.environment.AudioWorkletNode)throw new Error('Dieser Browser unterstützt die DX7-Engine nicht. Bitte einen lokalen Klang wählen.');
    if(this.moduleContext!==ctx){
      this.moduleContext=ctx;
      this.dxLoading=ctx.audioWorklet.addModule(new URL('../vendor/opendx7/dx7-processor.js',import.meta.url).href);
      this.dxLoading.catch(()=>{if(this.moduleContext===ctx)this.moduleContext=null;});
    }
    await this.dxLoading;
    if(id!==this.soundId || ctx!==this.context)return false;
    if(!this.dxNode || this.dxNode.context!==ctx){
      this.dxNode?.disconnect();
      this.dxNode=new this.environment.AudioWorkletNode(ctx,'dx7-processor',{outputChannelCount:[2]});
      this.dxNode.connect(this.master);
    }
    this.dxNode.port.postMessage({type:'panic'});
    this.dxNode.port.postMessage({type:'patch',patch:presetById(sound.patch)});
    this.dxReady=id;return true;
  }
  chord(notes, at, duration, slot) {
    const sound=soundById(this.soundId);
    if(sound.patch){
      if(this.dxReady!==this.soundId)return;
      const node=this.dxNode, id=this.soundId;
      const queue=(when,action)=>{
        const timer=this.environment.setTimeout(()=>{
          this.dxTimers.delete(timer);
          if(this.soundId===id && this.dxNode===node)action();
        },Math.max(0,(when-this.context.currentTime)*1000));
        this.dxTimers.add(timer);
      };
      const owner=++this.dxGate;
      for(const note of notes){
        queue(at,()=>{
          if(this.dxOwners.has(note))node.port.postMessage({type:'noteOff',note});
          this.dxOwners.set(note,owner);
          node.port.postMessage({type:'noteOn',note,velocity:81});
        });
        queue(at+duration,()=>{
          if(this.dxOwners.get(note)!==owner)return;
          this.dxOwners.delete(note);node.port.postMessage({type:'noteOff',note});
        });
      }
      return;
    }
    for (const note of notes) this.tone(note, at, duration, slot);
  }
  tone(midi, at, duration, slot) {
    const ctx = this.context, sources = [], nodes = [];
    const sound=SOUNDS[soundById(this.soundId).program],kind=sound.kind;
    const frequency = 440 * 2 ** ((midi - 69) / 12);
    const envelope = ctx.createGain(), filter = ctx.createBiquadFilter();
    nodes.push(envelope, filter);
    filter.type = 'lowpass'; filter.frequency.value = sound.cut; filter.Q.value = .45;
    envelope.connect(filter); filter.connect(this.master);
    const level = (kind==='house'?.080:kind==='grand'?.11:kind==='fm'?.108:.105)*.72, bodyEnd = at + Math.max(sound.a+sound.dec, duration), end = bodyEnd + sound.rel;
    envelope.gain.setValueAtTime(.0001, at);
    envelope.gain.exponentialRampToValueAtTime(level, at + Math.max(.005,sound.a));
    envelope.gain.exponentialRampToValueAtTime(level * sound.sus, at + sound.a+sound.dec);
    envelope.gain.setValueAtTime(level * sound.sus, bodyEnd);
    envelope.gain.exponentialRampToValueAtTime(.0001, end);
    const voice = (hz, volume, detune = 0, type = 'sine') => {
      const osc = ctx.createOscillator(), mix = ctx.createGain();
      osc.type = type; osc.frequency.setValueAtTime(hz, at); osc.detune.value = detune;
      mix.gain.value = volume; osc.connect(mix); mix.connect(envelope);
      nodes.push(mix); sources.push(osc);
      return osc;
    };
    if(kind==='fm'){
    const carrier = voice(frequency, .92);
    const modulator = ctx.createOscillator(), index = ctx.createGain();
    modulator.frequency.setValueAtTime(frequency * 3, at);
    index.gain.setValueAtTime(frequency * 2.2, at);
    index.gain.exponentialRampToValueAtTime(Math.max(1, frequency * .035), at + .42);
    modulator.connect(index); index.connect(carrier.frequency);
    sources.push(modulator); nodes.push(index);
    voice(frequency * 2, .16, 3);
    }else if(kind==='grand'){
      voice(frequency,.85);voice(frequency*2.005,.30,0,'triangle');voice(frequency*3.012,.16);voice(frequency*4.026,.10);voice(frequency*5.065,.045,0,'triangle');
    }else if(kind==='house'){
      voice(frequency,.66,0,'sawtooth');voice(frequency*2,.31,4,'triangle');voice(frequency*3,.15);
    }else{voice(frequency,1,0,sound.wave);voice(frequency,.22,sound.detune,sound.second);}
    if(kind==='grand'||kind==='house'){
      const hammer=ctx.createOscillator(),snap=ctx.createGain();
      hammer.type='triangle';hammer.frequency.setValueAtTime(frequency*4.5,at);hammer.frequency.exponentialRampToValueAtTime(frequency*2.3,at+.022);
      snap.gain.setValueAtTime((kind==='grand'?.034:.020)*.72,at);snap.gain.exponentialRampToValueAtTime(.0001,at+.035);
      hammer.connect(snap);snap.connect(filter);hammer.shortEnd=at+.042;sources.push(hammer);nodes.push(snap);
    }
    const entry = { slot, sources, nodes, envelope };
    this.voices.add(entry);
    let remaining = sources.length;
    for (const osc of sources) {
      osc.onended = () => {
        osc.disconnect();
        if (--remaining === 0) { for (const node of nodes) node.disconnect(); this.voices.delete(entry); }
      };
      osc.start(at); osc.stop(osc.shortEnd || end + .02);
    }
  }
  silence(slot) {
    for(const timer of this.dxTimers)this.environment.clearTimeout(timer);this.dxTimers.clear();this.dxOwners.clear();
    this.dxNode?.port.postMessage({type:'panic'});
    if (!this.context) return;
    const now = this.context.currentTime;
    for (const entry of this.voices) {
      if (slot !== undefined && entry.slot !== slot) continue;
      entry.envelope.gain.cancelScheduledValues(now);
      entry.envelope.gain.setTargetAtTime(.0001, now, .008);
      for (const osc of entry.sources) { try { osc.stop(now + .04); } catch { /* Already ended. */ } }
    }
  }
}
