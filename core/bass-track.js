// CHORDON BLEU bass-track event model. GPL-3.0-only.
// Pure note intent only: no audio, UI, random state or persistence side effects.
export const BASS_VERSION=1;
export const LOOP_BEATS=8;
export const MAX_BASS_EVENTS=16;
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const tempoOK=n=>finite(n)&&n>=48&&n<=160;
const mod12=n=>((n%12)+12)%12;

export function validBassTrack(track){
 if(!track||track.version!==BASS_VERSION||track.loopBeats!==LOOP_BEATS||
    typeof track.enabled!=='boolean'||track.sound!=='legacy-bass'||
    !Number.isInteger(track.seed)||track.seed<1||track.seed>0xffffffff||
    !Array.isArray(track.events)||track.events.length>MAX_BASS_EVENTS)return false;
 let previous=-1;
 for(const e of track.events){
  if(!e||!finite(e.at)||e.at<0||e.at>=LOOP_BEATS||!Number.isInteger(e.at*2)||e.at<=previous||
     !['root','fifth'].includes(e.role)||!Number.isInteger(e.octave)||Math.abs(e.octave)>1||
     !finite(e.velocity)||e.velocity<=0||e.velocity>1||!e.duration)return false;
  const d=e.duration;
  if(!finite(d.beats)||d.beats<=0||d.beats>2||
     !finite(d.minSeconds)||d.minSeconds<0||d.minSeconds>.5||
     !(d.maxSeconds===null||(finite(d.maxSeconds)&&d.maxSeconds>0&&d.maxSeconds<=2))||
     (d.maxSeconds!==null&&d.maxSeconds<d.minSeconds))return false;
  previous=e.at;
 }
 return true;
}

// Build a descriptor for the implicit root bass emitted by current playVoicing().
// Durations retain beat timing plus second-based floors/caps when tempo changes.
// Caller decides when to persist/migrate; this function never modifies a project.
export function legacyBassTrack(source){
 if(!source||!tempoOK(source.tempo)||!['hold','pulse','slice','arp'].includes(source.motion))
  throw new RangeError('Unsupported legacy bass settings');
 const mode=source.motion==='slice'?'pulse':source.motion;
 let duration,velocity;
 if(mode==='hold'){duration={beats:1.82*.49,minSeconds:.2,maxSeconds:null};velocity=.58;}
 else if(mode==='arp'){duration={beats:1.82,minSeconds:0,maxSeconds:.34};velocity=.53;}
 else{
  const slice=source.slice??{hits:4,rate:8,gate:40};
  if(![2,4,8].includes(slice.hits)||![4,8,16,32].includes(slice.rate)||
     !finite(slice.gate)||slice.gate<10||slice.gate>95)
   throw new RangeError('Unsupported legacy PULSE settings');
  duration={beats:4/slice.rate*slice.gate/100,minSeconds:.025,maxSeconds:null};velocity=.42;
 }
 return {version:BASS_VERSION,loopBeats:LOOP_BEATS,enabled:true,sound:'legacy-bass',seed:1,
  events:[0,2,4,6].map(at=>({at,role:'root',octave:0,velocity,duration:{...duration}}))};
}

// qualityDefinitions uses the existing browser Q shape: {quality: {notes: [...]}}.
// No duplicate chord table: use the same definitions as the main instrument.
export function resolveBassTrack(track,steps,tempo,qualityDefinitions){
 if(!validBassTrack(track)||!tempoOK(tempo)||!Array.isArray(steps)||steps.length!==4)
  throw new RangeError('Invalid bass track or progression');
 const masks=Array.from(steps,c=>{
  const shape=c&&qualityDefinitions&&Object.hasOwn(qualityDefinitions,c.quality)?qualityDefinitions[c.quality]:null;
  if(!c||!Number.isInteger(c.root)||c.root<0||c.root>11||!shape||!Array.isArray(shape.notes)||
     !shape.notes.length||shape.notes.length>8||Array.from(shape.notes).some(n=>!Number.isInteger(n)))
   throw new RangeError('Invalid chord definition');
  const tones=new Set(shape.notes.map(mod12));
  if(!tones.has(0))throw new RangeError('Chord definition needs a root');
  return tones;
 });
 if(!track.enabled)return [];
 const beat=60/tempo;
 return track.events.map((e,i)=>{
  const slot=Math.floor(e.at/2),d=e.duration;
  // V1 FIFTH means an actual perfect fifth. Missing/altered fifths use ROOT.
  const interval=e.role==='fifth'&&masks[slot].has(7)?7:0;
  const next=track.events[i+1]?.at??LOOP_BEATS;
  const duration=Math.min(Math.max(d.beats*beat,d.minSeconds),d.maxSeconds??Infinity,
   (Math.min(next,(slot+1)*2)-e.at)*beat);
  return {track:'bass',slot,note:36+steps[slot].root+interval+e.octave*12,
   time:e.at*beat,duration,velocity:e.velocity};
 });
}
