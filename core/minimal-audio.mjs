/* The existing browser FM-preview E-piano, isolated from Classic's tracks/effects.
 * Two-operator synthesis; this is not the six-operator DX7 backend. GPL-3.0-only. */
export class Piano {
  constructor(environment = globalThis) {
    this.environment = environment;
    this.context = null;
    this.master = null;
    this.voices = new Set();
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
  chord(notes, at, duration, slot) {
    for (const note of notes) this.tone(note, at, duration, slot);
  }
  tone(midi, at, duration, slot) {
    const ctx = this.context, sources = [], nodes = [];
    const frequency = 440 * 2 ** ((midi - 69) / 12);
    const envelope = ctx.createGain(), filter = ctx.createBiquadFilter();
    nodes.push(envelope, filter);
    filter.type = 'lowpass'; filter.frequency.value = 4900; filter.Q.value = .45;
    envelope.connect(filter); filter.connect(this.master);
    const level = .108 * .72, bodyEnd = at + Math.max(.426, duration), end = bodyEnd + .95;
    envelope.gain.setValueAtTime(.0001, at);
    envelope.gain.exponentialRampToValueAtTime(level, at + .006);
    envelope.gain.exponentialRampToValueAtTime(level * .26, at + .426);
    envelope.gain.setValueAtTime(level * .26, bodyEnd);
    envelope.gain.exponentialRampToValueAtTime(.0001, end);
    const voice = (hz, volume, detune = 0) => {
      const osc = ctx.createOscillator(), mix = ctx.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(hz, at); osc.detune.value = detune;
      mix.gain.value = volume; osc.connect(mix); mix.connect(envelope);
      nodes.push(mix); sources.push(osc);
      return osc;
    };
    const carrier = voice(frequency, .92);
    const modulator = ctx.createOscillator(), index = ctx.createGain();
    modulator.frequency.setValueAtTime(frequency * 3, at);
    index.gain.setValueAtTime(frequency * 2.2, at);
    index.gain.exponentialRampToValueAtTime(Math.max(1, frequency * .035), at + .42);
    modulator.connect(index); index.connect(carrier.frequency);
    sources.push(modulator); nodes.push(index);
    voice(frequency * 2, .16, 3);
    const entry = { slot, sources, nodes, envelope };
    this.voices.add(entry);
    let remaining = sources.length;
    for (const osc of sources) {
      osc.onended = () => {
        osc.disconnect();
        if (--remaining === 0) { for (const node of nodes) node.disconnect(); this.voices.delete(entry); }
      };
      osc.start(at); osc.stop(end + .02);
    }
  }
  silence(slot) {
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
