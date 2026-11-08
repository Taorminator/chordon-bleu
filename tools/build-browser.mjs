import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(root, 'dist');
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist);
for (const name of ['index.html','classic.html','minimal.css','core','vendor','assets','install','LICENSE']) cpSync(path.join(root,name),path.join(dist,name),{recursive:true});
console.log('Browser instrument and Classic built in dist/.');
