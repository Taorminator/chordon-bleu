// CHORDON BLEU - validates JSON recipe modules and embeds them into the offline iPhone app.
// No runtime network requests. One playable index.html stays sufficient.
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const files=readdirSync(join(root,'recipes')).filter(f=>f.endsWith('.json')).sort();
const qualities=new Set(['maj','min','maj7','m7','dom7','m9','maj9','add9','sus2','sus4','six','m6','dim','halfDim']);
const catalog=[];
for(const name of files){
 const r=JSON.parse(readFileSync(join(root,'recipes',name),'utf8'));
 if(!/^[a-z0-9-]+$/.test(r.id)||!Array.isArray(r.templates)||r.templates.length===0||!Array.isArray(r.palette)||r.palette.length===0)throw Error('Invalid recipe '+name);
 if(catalog.some(a=>a.id===r.id))throw Error('Duplicate recipe '+r.id);
 for(const t of r.templates){
  if(!Number.isInteger(t.minSpice)||t.minSpice<0||t.minSpice>100||!Array.isArray(t.chords)||t.chords.length!==4)throw Error('Bad template '+name);
  for(const [n,q] of t.chords)if(!Number.isInteger(n)||n<0||n>11||!qualities.has(q))throw Error('Bad chord '+name);
 }
 for(const p of r.palette)if(!Number.isInteger(p.semi)||p.semi<0||p.semi>11||!qualities.has(p.quality)||!Number.isFinite(p.weight)||p.weight<0||!Number.isInteger(p.minSpice)||p.minSpice<0||p.minSpice>100)throw Error('Bad palette '+name);
 catalog.push(r);
}
const target=join(root,'index.html'),s=readFileSync(target,'utf8');
const a='// RECIPE_CATALOG_BEGIN',b='// RECIPE_CATALOG_END';
const i=s.indexOf(a),j=s.indexOf(b);
if(i<0||j<i)throw Error('Catalog markers missing');
const insert=a+'\nconst RECIPE_CATALOG = '+JSON.stringify(catalog).replace(/</g,'\\u003c')+';\n'+b;
const next=s.slice(0,i)+insert+s.slice(j+b.length);
if(process.argv.includes('--check')){
 if(s!==next)throw Error('Recipe bundle outdated: run node tools/build-recipes.mjs');
 console.log('PASS embedded recipe catalog '+catalog.map(x=>x.id).join(', '));
}else{
 writeFileSync(target,next);console.log('Built offline browser with '+catalog.length+' recipe(s)');
}
