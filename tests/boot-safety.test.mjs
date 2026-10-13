import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';

const fromRoot = path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const mainPin='9f6a8858afd71b4faed9dfea3a5f94d3ecfdf002';
const manifest=JSON.parse(fromRoot('install/release-manifest.json'));
assert.equal(manifest.project,'chordon-bleu');
assert.equal(manifest.firmwareStatus,'development');
assert.equal(manifest.flashable,false);
assert.equal(manifest.firmwarePackage,null);
assert.equal(manifest.firmwareSha256,null);
assert.equal(manifest.firmwareVersion,null);

const installer=fromRoot('install/index.html');
assert.match(installer,/NOT INSTALLABLE YET/);
assert.doesNotMatch(installer,/\bnavigator\.requestMIDIAccess\s*\(/);
assert.doesNotMatch(installer,/\brequestDevice\s*\(/);
assert.doesNotMatch(installer,/\.fwsc\b.*\b(download|fetch)\b/i);

const overlay=fromRoot('firmware/felucca-overlay/apply.py');
const platform=fromRoot('firmware/felucca-overlay/chordon_platform.c');
const build=fromRoot('.github/workflows/felucca-baseline.yml');
assert.ok(overlay.includes('PIN = "'+mainPin+'"'),'Felucca revision must remain pinned');
assert.ok(build.includes('ref: '+mainPin),'Native build must use the same pinned Felucca revision');
assert.match(overlay,/if source\.count\(old\) != 1/,'Patching must reject changed upstream anchors');
assert.match(overlay,/if ch\.exists\(\):/,'Repeated overlay must be rejected');
assert.equal((overlay.match(/patch\(main,/g)||[]).length,7,
 'Changing target startup integration requires explicit safety review');
assert.match(platform,/SAVE is RAM ONLY/);
assert.match(platform,/cbh_ram_save=\*m/,'SAVE must not silently write flash');

// Deliberately narrow static checks: disallow adding low-level clock/CPU and
// watchdog manipulation to CHORDON-owned native source. This is not an
// executable-image audit and does not validate upstream Felucca hardware.
const dangerous=[
 /\b(?:PLL2?_CON1|FCLK_|fm1_clock_set|MELODEE_SYS_CLK)\w*/i,
 /\b(?:PREF_OC_|CPU_CORE_NUM|fm1_wdt_disarm|sys_clock_update)\w*/i,
 /\b(?:0x0?119a4|0x0?119ac|0x0?1000c)\b/i
];
function auditText(file,source){
 const matches=dangerous.filter(re=>re.test(source));
 assert.equal(matches.length,0,
  file+' adds forbidden direct SYS PLL/CPU/watchdog access; require a separate hardware safety review');
}
for(const dir of ['core','firmware']){
 const walk=(relative)=>{
  for(const entry of readdirSync(new URL('../'+relative+'/',import.meta.url),{withFileTypes:true})){
   const path=join(relative,entry.name).replaceAll('\\','/');
   if(entry.isDirectory()){walk(path);continue;}
   if(!/\.(c|h|py)$/.test(entry.name))continue;
   auditText(path,fromRoot(path));
  }
 };
 walk(dir);
}
for(const [description,example] of [
 ['PLL helper','fm1_clock_set(240);'],
 ['PLL register','FCLK_PLL2_CON1 = 0x119AC;'],
 ['boot overclock option','MELODEE_SYS_CLK=320'],
 ['watchdog bypass','fm1_wdt_disarm();'],
]){
 assert.throws(()=>auditText(description,example),/forbidden/,'Safety test must reject '+description);
}

assert.doesNotMatch(build,/\b(?:upload-artifact|gh release|create-release|publish-release)\b/i);
assert.match(build,/Experimental proof of integration - NOT authorized for device flashing/);
assert.match(fromRoot('docs/BOOT_RECOVERY_SAFETY.md'),/WL82 UBOOT1\.00/);
assert.match(fromRoot('docs/BOOT_RECOVERY_SAFETY.md'),/0x93000/);
assert.match(fromRoot('docs/BOOT_RECOVERY_SAFETY.md'),/--info/);
assert.match(fromRoot('docs/BOOT_RECOVERY_SAFETY.md'),/--check/);
assert.match(fromRoot('docs/BOOT_RECOVERY_SAFETY.md'),/--write/);
console.log('PASS: boot clock, adapter, no-flash and documented ROM recovery source guards.');
