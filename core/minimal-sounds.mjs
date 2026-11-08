import {banks, presetById} from '../assets/dx7/aquanode-presets.js';
export const SOUNDS=[
 {name:'WARM',kind:'classic',wave:'triangle',second:'sine',cut:1250,a:.027,dec:.45,sus:.43,rel:.65,detune:5},
 {name:'GLASS',kind:'classic',wave:'sine',second:'triangle',cut:4000,a:.008,dec:.7,sus:.22,rel:.85,detune:2},
 {name:'DUSK',kind:'classic',wave:'sawtooth',second:'triangle',cut:620,a:.09,dec:.42,sus:.42,rel:1.05,detune:3},
 {name:'DX7 EP',kind:'fm',wave:'sine',second:'sine',cut:4900,a:.006,dec:.42,sus:.26,rel:.95,detune:0},
 {name:'GRAND',kind:'grand',wave:'sine',second:'triangle',cut:10200,a:.002,dec:.35,sus:.32,rel:1.0,detune:2},
 {name:'90s HOUSE',kind:'house',wave:'sawtooth',second:'triangle',cut:4400,a:.002,dec:.19,sus:.30,rel:.30,detune:4}
];

export { presetById };
export const SOUND_CATALOG=[...SOUNDS.map((p,i)=>({id:'local:'+i,name:p.name+(i===3?' · FM Preview':''),program:i})),...banks.flatMap(b=>b.presets.map(p=>({id:'dx7:'+p.id,name:p.name,bank:b.name,patch:p.id})))];
export const DEFAULT_SOUND='local:3';
export const soundById=id=>SOUND_CATALOG.find(s=>s.id===id)||SOUND_CATALOG[3];
