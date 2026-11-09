#!/usr/bin/env python3
"""Build the CHORDON application and Felucca DSP/HAL emulator, never a device image.
Apply firmware/felucca-overlay/apply.py to the pinned checkout first.
Requires Emscripten 4.0.19 (CI pin), Pillow and fonttools.
"""
from pathlib import Path
import json, shutil, subprocess, sys
if len(sys.argv)!=3: raise SystemExit('usage: build-native-emulator.py PINNED_PATCHED_FELUCCA OUTPUT_DIR')
u=Path(sys.argv[1]).resolve();out=Path(sys.argv[2]).resolve()
pin='9f6a8858afd71b4faed9dfea3a5f94d3ecfdf002'
if subprocess.check_output(['git','-C',str(u),'rev-parse','HEAD'],text=True).strip()!=pin: raise SystemExit('Wrong upstream revision')
if not (u/'firmware/src/chordon/platform.c').is_file(): raise SystemExit('Apply the CHORDON overlay first')
s=(u/'web/emu/felucca_web.c').read_text()
def replace(old,new):
 global s
 if s.count(old)!=1: raise SystemExit(f'Unexpected emulator anchor: {old!r}')
 s=s.replace(old,new)
replace('#include "../../firmware/src/main.c"','''#define CB_ENABLE_PERSISTENCE 1
#include "../../firmware/src/chordon/core/chordon_harmony.c"
#include "../../firmware/src/chordon/firmware/cb_fm1.c"
#include "../../firmware/src/chordon/firmware/cb_voice.c"
#include "../../firmware/src/chordon/firmware/cb_store.c"
#include "../../firmware/src/chordon/platform.c"
#include "../../firmware/src/main.c"''')
replace('    draw_splash();', '    lcd_fill(0,0,240,240,0x0844u);\n    draw_text_line(16,108,208,&AF_M,"CHORDON BLEU",0xffffu,0x0844u,1);')
replace('    felucca_init();\n    master_boot();','    felucca_init();\n    chordon_init();\n    master_boot();')
replace('    autosave_boot(boot_clean);','    /* CHORDON: no Felucca project restoration. */')
replace('static uint32_t web_flash_writes;', 'static uint32_t web_flash_writes;\nstatic int32_t web_flash_budget=-1;')
replace('        nor[off + i] &= s[i];', '''    {
        if(web_flash_budget==0)return -9;
        if(web_flash_budget>0)web_flash_budget--;
        nor[off + i] &= s[i];
    }''')
replace('    autosave_poll();','    /* CHORDON owns only its application state. */')
replace('    ui_leds();\n    ui_draw();','    chordon_leds();\n    chordon_draw();')
s=s.replace('ui_input();','chordon_input();').replace('kb_boot_hold = 0;', 'kb_boot_hold = 1;').replace('    boot_leds();','    boot_leds(); fm1_led_anim_stop(); chordon_leds();')
# The emulator runs the same adapter; exports expose state only for regression tests.
s+='''\nEXPORT uint32_t cb_web_selected(void){return cbh_device.selected;}
EXPORT uint32_t cb_web_playing(void){return cbh_device.playing;}
EXPORT uint32_t cb_web_sound(void){return cbh_sound;}
EXPORT uint32_t cb_web_chord(uint32_t n){return n<4?cbh_device.loop.steps[n].root|((uint32_t)cbh_device.loop.steps[n].quality<<8):0xffffffffu;}
EXPORT uint32_t cb_web_undo(void){return cbh_device.undo_valid;}
EXPORT int32_t cb_web_disk_status(void){return cbh_disk_status;}
EXPORT void cb_web_save(void){cbh_save(0,&cbh_device);}
EXPORT void cb_web_restore(void){cbh_disk_restore(&cbh_device);cbh_sound_load(cbh_device.sound);}
EXPORT void cb_web_flash_cut(int32_t bytes){web_flash_budget=bytes;}
'''
p=u/'web/emu/chordon_web.c';p.write_text(s)
if not (u/'build/gen/felucca_tables.h').exists():
 subprocess.run([sys.executable,'-c','import sys;sys.path.insert(0,"tools");import build;build.generate()'],cwd=u,check=True)
out.mkdir(parents=True,exist_ok=True)
subprocess.run(['emcc','-O2','-ffp-contract=off','-std=gnu99','-w','-DFELUCCA_VERSION="CHORDON BLEU"','-Ibuild/gen','-Ifirmware/src','--no-entry','-sSTANDALONE_WASM','-sSTACK_SIZE=1048576','-sINITIAL_MEMORY=33554432','-sFILESYSTEM=0','-o',str(out/'felucca.wasm'),str(p)],cwd=u,check=True)
html=(u/'web/emu/index.html').read_text().replace('<title>Felucca</title>','<title>CHORDON BLEU · native emulator</title>')
html=html.replace('@VERSION@','CHORDON BLEU').replace('@PREVIEW@',' · native preview')
html=html.replace('<nav><a href="../installer/">Install</a><a href="../editor/">Editor</a><a href="https://github.com/hugelton/Felucca">Source</a></nav>','<nav><a href="https://github.com/Taorminator/chordon-bleu">CHORDON source</a> · Native emulator, no device installer.</nav>')
html=html.replace('Felucca, the multi-engine synth firmware for the FM-1, running in your browser: the same code the instrument runs.','CHORDON BLEU: the native four-chord application and Felucca DSP running in a simulated FM1.')
html=html.replace('<main>','<main><p>First four white keys: chords · K1: variation · EDIT: Undo · PRESETS: sound · PLAY: loop. Native preview; hardware verification pending.</p>')
html=html.replace('const [wasm] = await Promise.all([','const canWorklet=!!ac.audioWorklet;\n    const [wasm, fallback] = await Promise.all([')
html=html.replace('ac.audioWorklet.addModule("worklet.js")','canWorklet ? ac.audioWorklet.addModule("worklet.js") : import("./worklet.js")')
html=html.replace('node = new AudioWorkletNode(ac, "felucca", { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2] });','node = canWorklet ? new AudioWorkletNode(ac, "felucca", { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2] }) : fallback.createFallback(ac);')
html=html.replace('    midiOn();','    /* No automatic MIDI permission request in this minimal preview. */')
a=html.index('<p class="keys">');b=html.index('</p>',a)+4
html=html[:a]+'<p class="keys">Four white keys · K1 changes one chord · EDIT undoes · PRESETS chooses the sound · PLAY loops. Drag or scroll a knob to turn it.</p>'+html[b:]
# A separate namespace must never load another firmware emulator's saved sectors.
html=html.replace('felucca-flash','chordon-native-flash').replace('felucca-emu','chordon-native-emu')
(out/'index.html').write_text(html)
worklet=(u/'web/emu/worklet.js').read_text()
# Same processor, DSP and device clock on HTTP previews / older Web Audio hosts.
# Only the audio transport changes; no JS synth and no browser security flags.
worklet=worklet.replace('if (typeof registerProcessor === "function") {', 'const ProcessorBase=typeof AudioWorkletProcessor === "function" ? AudioWorkletProcessor : class {};')
worklet=worklet.replace('class Felucca extends AudioWorkletProcessor {','export class Felucca extends ProcessorBase {')
worklet=worklet.replace('constructor() {\n      super();','constructor(port) {\n      super();\n      if(port)this.port=port;')
worklet=worklet.replace('currentTime - this.lastFrame','ex.web_now_ms()/1000 - this.lastFrame').replace('this.lastFrame = currentTime;', 'this.lastFrame = ex.web_now_ms()/1000;')
worklet=worklet.replace('  registerProcessor("felucca", Felucca);\n}', 'if(typeof registerProcessor === "function")registerProcessor("felucca", Felucca);')
worklet+='''
// Compatibility callback for HTTP previews. HTTPS uses AudioWorklet.
export function createFallback(context){
  const node=context.createScriptProcessor(1024,0,2);
  const processor=new Felucca({postMessage:m=>queueMicrotask(()=>node.port.onmessage?.({data:m}))});
  node.port={onmessage:null,postMessage:m=>processor.onMessage(m)};
  node.onaudioprocess=event=>processor.process([],[[event.outputBuffer.getChannelData(0),event.outputBuffer.getChannelData(1)]]);
  return node;
}
'''
(out/'worklet.js').write_text(worklet)
shutil.copytree(u/'web/emu/fonts',out/'fonts',dirs_exist_ok=True)
root=Path(__file__).resolve().parents[1]
commit=subprocess.check_output(['git','-C',str(root),'rev-parse','HEAD'],text=True).strip()
shutil.copy2(root/'LICENSE',out/'COPYING')
shutil.copy2(root/'docs/NATIVE_VALIDATION.md',out/'VALIDATION.md')
(out/'SOURCE.json').write_text(json.dumps({'project':'CHORDON BLEU','source':'https://github.com/Taorminator/chordon-bleu/tree/'+commit,'chordon_commit':commit,'upstream':pin,'emscripten':'4.0.19','flashable':False},indent=2)+'\n')
print(f'Native emulator built: {out}; {(out/"felucca.wasm").stat().st_size} bytes WASM. No device firmware.')
