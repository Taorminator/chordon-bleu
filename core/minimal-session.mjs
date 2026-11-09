import { DEFAULT_SOUND, soundById } from './minimal-sounds.mjs';
import { Q, label, voiceNotes, alternatives } from './minimal-harmony.mjs';

export const STORAGE_KEY = 'chordon-bleu.minimal.v1';
export const TEMPO = 84;
export const MIN_TEMPO=48, MAX_TEMPO=160;
// Keep the remaining musical phase; never move a boundary before queued audio.
export function retimeBoundary(boundary,now,oldBpm,newBpm,committedAt=now){
  const anchor=Math.max(now,committedAt);
  return anchor+Math.max(0,boundary-anchor)*oldBpm/newBpm;
}
const copy = value => JSON.parse(JSON.stringify(value));
const INITIAL = [{ root: 0, quality: 'maj7' }, { root: 9, quality: 'm7' }, { root: 5, quality: 'maj7' }, { root: 7, quality: 'dom7' }];

export class Session {
  constructor(saved) {
    this.bpm=Number.isInteger(saved?.bpm)&&saved.bpm>=MIN_TEMPO&&saved.bpm<=MAX_TEMPO?saved.bpm:TEMPO;
    this.soundId = soundById(saved?.soundId||DEFAULT_SOUND).id;
    this.steps = copy(INITIAL);
    this.selected = 0;
    this.history = [];
    this.deck = null;
    if (saved?.version === 1 && Array.isArray(saved.steps) && saved.steps.length === 4 && saved.steps.every(c =>
      c && Number.isInteger(c.root) && c.root >= 0 && c.root < 12 && Object.hasOwn(Q, c.quality))) {
      this.steps = saved.steps.map(({ root, quality }) => ({ root, quality }));
    }
  }
  select(index) {
    if (!Number.isInteger(index) || index < 0 || index > 3) return false;
    if (index !== this.selected) this.deck = null;
    this.selected = index;
    return true;
  }
  vary(direction) {
    if (direction !== 1 && direction !== -1) return false;
    if (!this.deck) this.deck = { position: 0, chords: alternatives(this.steps, this.selected) };
    this.history.push({ steps: copy(this.steps), selected: this.selected });
    if (this.history.length > 32) this.history.shift();
    const d = this.deck;
    d.position = (d.position + direction + d.chords.length) % d.chords.length;
    this.steps[this.selected] = copy(d.chords[d.position]);
    return true;
  }
  undo() {
    const previous = this.history.pop();
    if (!previous) return false;
    this.steps = previous.steps;
    this.selected = previous.selected;
    this.deck = null;
    return true;
  }
  tempo(turn){
    if(!Number.isInteger(turn)||!turn)return false;
    const next=Math.max(MIN_TEMPO,Math.min(MAX_TEMPO,this.bpm+turn));
    if(next===this.bpm)return false;
    this.bpm=next;return true;
  }
  snapshot() { return { version: 1, bpm:this.bpm, soundId:this.soundId, steps: copy(this.steps) }; }
  names() { return this.steps.map(label); }
  voices() {
    let previous;
    return this.steps.map(c => (previous = voiceNotes(c, previous)));
  }
}
