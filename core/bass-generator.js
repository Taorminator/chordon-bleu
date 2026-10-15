// CHORDON BLEU bounded, seeded bass phrase generator. GPL-3.0-only.
import {BASS_VERSION,LOOP_BEATS,validBassTrack,resolveBassTrack} from './bass-track.js';

export const MAX_BASS_CANDIDATES=16;
export const BASS_REGISTER=Object.freeze({min:28,max:47});
const MOTIFS=[
 [[0],[0,2],[0,3]],
 [[0,2],[0,1,3],[0,2,3]],
 [[0,1,3],[0,2,3],[0,1,2,3]]
];
const FEELS={warm:{gate:.84,accent:.72},crispy:{gate:.42,accent:.86},cheesy:{gate:.66,accent:.8}};
const emptyTrack=seed=>({version:BASS_VERSION,loopBeats:LOOP_BEATS,enabled:true,
 sound:'legacy-bass',seed,events:[]});
const signature=notes=>JSON.stringify(notes.map(n=>[n.time,n.note]));

// A saved phrase is already explicit data: neither PLAY nor export calls this.
// On a subsequent FLIP, pass the previous result's seed as the next input seed.
// Returns null if the bounded search finds no different pitch/rhythm phrase.
export function generateBassTrack({steps,qualityDefinitions,seed,spice=38,feel='warm',previous=null}={}){
 if(!Number.isInteger(seed)||seed<1||seed>0xffffffff||!Number.isInteger(spice)||spice<0||spice>100||
    !Object.hasOwn(FEELS,feel)||previous!==null&&!validBassTrack(previous))
  throw new RangeError('Invalid bass-generation settings');
 // Reuse the model's real chord validation, including unknown qualities.
 resolveBassTrack(emptyTrack(seed),steps,92,qualityDefinitions);
 const previousSignature=previous?signature(resolveBassTrack({...previous,enabled:true},steps,92,qualityDefinitions)):null;
 let random=seed;
 const next=()=>{random^=random<<13;random^=random>>>17;random^=random<<5;return random>>>=0;};
 const pick=items=>items[next()%items.length];
 const bank=MOTIFS[spice<25?0:spice<70?1:2],palette=FEELS[feel];
 let best=null,bestScore=Infinity;
 for(let trial=0;trial<MAX_BASS_CANDIDATES;trial++){
  const shared=pick(bank),track=emptyTrack(seed);
  let lastPitch=36+steps[0].root;
  for(let slot=0;slot<4;slot++){
   // Repeat a recognizable motif; at higher SPICE only the final slot may vary.
   const motif=spice>=70&&slot===3&&next()%2?pick(bank):shared;
   const fifth=qualityDefinitions[steps[slot].quality].notes.some(n=>((n%12)+12)%12===7);
   for(let i=0;i<motif.length;i++){
    const at=slot*2+motif[i]*.5;
    const role=i>0&&fifth&&next()%100<(feel==='cheesy'?65:30+Math.floor(spice*.3))?'fifth':'root';
    const root=36+steps[slot].root,interval=role==='fifth'?7:0;
    const octaves=[-1,0,1].filter(o=>root+interval+12*o>=BASS_REGISTER.min&&root+interval+12*o<=BASS_REGISTER.max);
    // Prefer small melodic motion; seeded jitter allows alternate valid registers.
    const choices=octaves.map(o=>({o,cost:Math.abs(root+interval+12*o-lastPitch)*4+(next()%13)}));
    choices.sort((a,b)=>a.cost-b.cost);const octave=choices[0].o;
    lastPitch=root+interval+12*octave;
    const gap=i+1<motif.length?(motif[i+1]-motif[i])*.5:2-motif[i]*.5;
    track.events.push({at,role,octave,velocity:i===0?palette.accent:.46+(next()%15)/100,
     duration:{beats:gap*palette.gate,minSeconds:.025,maxSeconds:null}});
   }
  }
  const notes=resolveBassTrack(track,steps,92,qualityDefinitions);
  if(previousSignature!==null&&signature(notes)===previousSignature)continue;
  let score=0;
  for(let i=0;i<notes.length;i++){
   const jump=Math.abs(notes[(i+1)%notes.length].note-notes[i].note);
   score+=jump+(jump>7?(jump-7)*3:0); // Include the last-to-first seam.
  }
  if(score<bestScore){bestScore=score;best=track;}
 }
 // Every call has a fixed candidate budget. Store the final RNG state even when
 // an earlier candidate wins, so the next FLIP does not repeat part of the search.
 if(best){best.seed=random;best.enabled=previous?.enabled??true;}
 return best;
}
