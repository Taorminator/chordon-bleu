/* Chord vocabulary, movement scoring and voice leading adapted from the Classic browser engine. GPL-3.0-only. */
export const Q={maj:{label:'Major',short:'',notes:[0,4,7]},min:{label:'Minor',short:'m',notes:[0,3,7]},maj7:{label:'Major 7',short:'maj7',notes:[0,4,7,11]},m7:{label:'Minor 7',short:'m7',notes:[0,3,7,10]},dom7:{label:'Dominant 7',short:'7',notes:[0,4,7,10]},m9:{label:'Minor 9',short:'m9',notes:[0,3,10,14]},maj9:{label:'Major 9',short:'maj9',notes:[0,4,11,14]},add9:{label:'Add 9',short:'add9',notes:[0,4,7,14]},sus2:{label:'Sus 2',short:'sus2',notes:[0,2,7]},sus4:{label:'Sus 4',short:'sus4',notes:[0,5,7]},six:{label:'Major 6',short:'6',notes:[0,4,7,9]},m6:{label:'Minor 6',short:'m6',notes:[0,3,7,9]},dim:{label:'Diminished',short:'dim',notes:[0,3,6]},halfDim:{label:'Minor 7 ♭5',short:'m7♭5',notes:[0,3,6,10]},m11:{"label":"Minor 11","short":"m11","notes":[0,3,10,17]},maj7sharp11:{"label":"Major 7 ♯11","short":"maj7♯11","notes":[0,4,11,18]},dom13:{"label":"Dominant 13","short":"13","notes":[0,4,10,21]},sus9:{"label":"Sus 9","short":"sus9","notes":[0,5,7,14]},mMaj7:{"label":"Minor Major 7","short":"mMaj7","notes":[0,3,7,11]},dom7b9:{"label":"Dominant 7 ♭9","short":"7♭9","notes":[0,4,10,13]}};

const NAMES=['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
const mod=n=>(n%12+12)%12;
export const label=c=>NAMES[mod(c.root)]+Q[c.quality].short;
function pcs(c){return Q[c.quality].notes.map(n=>mod(n+c.root));}
function commonTones(a,b){const A=new Set(pcs(a));return pcs(b).filter(n=>A.has(n)).length;}
function movement(a,b){const ra=mod(b.root-a.root);let score=0;const weighted={0:-1.3,1:-.6,2:.30,3:.7,4:.48,5:1.05,6:-.9,7:1.1,8:.55,9:.55,10:.45,11:-.45};score+=(weighted[ra]||0);score+=commonTones(a,b)*.46;return score;}
function roleTransition(a,b){const fifth=mod(b.root-a.root);if((a.quality==='dom7'||a.quality==='sus4')&&fifth===5)return 2.15;if(a.quality==='dom7'&&fifth===7)return -.25;return 0;}
function noteToMidi(c){return 48+c.root;}
export function voiceNotes(c,previous=null){let tones=Q[c.quality].notes.map(n=>noteToMidi(c)+n);tones=tones.map(n=>{while(n<53)n+=12;while(n>78)n-=12;return n;}).sort((a,b)=>a-b);
  if(previous){const orig=tones.slice(),poss=[];for(let shift=-1;shift<=1;shift++)for(let inv=0;inv<orig.length;inv++){let v=orig.slice();for(let j=0;j<inv;j++)v[j]+=12;v=v.map(n=>n+shift*12).sort((a,b)=>a-b);if(v[0]<49||v.at(-1)>82)continue;let dist=0;for(const n of v)dist+=Math.min(...previous.map(p=>Math.abs(p-n)));poss.push({v,dist});}poss.sort((a,b)=>a.dist-b.dist);if(poss.length)return poss[0].v;}
  return tones;
}

// A small diatonic palette in C: alternatives are scored against BOTH neighbours,
// including the last-to-first loop seam, with the Classic movement/voice-leading rules.
const PALETTE = [[0,['maj7','maj9','add9','six','maj']], [2,['m7','m9','min']], [4,['m7','min']], [5,['maj7','maj9','add9','maj']], [7,['dom7','sus4','sus9','maj']], [9,['m7','m9','min']]]
  .flatMap(([root, qualities]) => qualities.map(quality => ({root, quality})));
export function alternatives(steps, selected) {
  const origin=steps[selected], before=steps[(selected+3)%4], after=steps[(selected+1)%4];
  const score=c=>movement(before,c)+movement(c,after)+roleTransition(before,c)+roleTransition(c,after)
    +commonTones(origin,c)*.3+(origin.root===c.root?2.5:0);
  const pool=PALETTE.filter(c=>label(c)!==label(origin));
  pool.sort((a,b)=>score(b)-score(a)||a.root-b.root||a.quality.localeCompare(b.quality));
  return [{...origin}, ...pool.map(c=>({...c}))];
}
