# Native FM1 port: honest integration status

**Status (2026-10-13):** portable C instrument controller, step/ARP scheduler and native 240x240 RGB565 renderer exist, and are tested on the host. **The JieLi binary, Felucca HAL integration, real USB installer and physical FM1 tests do not yet exist.** Do not flash any files from this repository.

## What was built

- `cb_fm1.h/.c`: four UI screens with a device-agnostic RGB565 draw callback API (no offscreen 115 KB framebuffer), model/controls, ARP step scheduling, a Ghibli-inspired recipe and four-chord FLIP.
- `../core/chordon_harmony.c`: portable seeded harmonic mutation with ROOT and TYPE locks.
- `../tests/device_test.c`: bounded 240x240 draw operation checks, state, locks, 4 knobs, real note event scheduling, SAVE callback.
- `../index.html` browser demo: actual Web Audio engine plus a 240x240 screen lab sharing state. **This is not Felucca WebAssembly**, and is not proof that a device can run the C program.

## Felucca baseline (read before patching)

- Upstream: [`hugelton/Felucca`](https://github.com/hugelton/Felucca) (GPL-3.0-only), reference 1.5.6 commit `9f6a8858afd71b4faed9dfea3a5f94d3ecfdf002`.
- Existing hardware calibration / input mapping in `firmware/src/panel.c` and `firmware/src/ui_input.c`.
- Synth engine and 8-voice arbiter in `firmware/src/voice.c` / `firmware/src/chord.c`.
- Audio scheduling in `firmware/src/seq.c` / `firmware/src/audio.c`.
- Screen LCD drawing in `firmware/src/lcd.c`, `firmware/src/gfx.c`, and related render modules.
- Flash/project storage in `firmware/src/project.c` / `firmware/src/storage.c`.
- Build expects the JieLi pi32v2 toolchain plus JieLi AC79 SDK assets, per upstream `BUILDING.md`. Neither is bundled here.

## Suggested hardware mapping (first iteration, subject to real-device validation)

| Physical FM1 control | Home | Chord | Recipes | ARP |
|---|---|---|---|---|
| `KNOB 1` | SPICE | ROOT/AUTO | recipe | RATE |
| `KNOB 2` | FEEL | TYPE/AUTO | FEEL | GATE |
| `KNOB 3` | MOTION | chord slot | SPICE | DIRECTION |
| `KNOB 4` | BPM | KEEP1/ALL4 | SOUND | ORDER |
| `HOME` | home screen | home | home | home |
| `SEL` (Felucca `B_SCL`) | edit selected chord | current | chord | chord |
| `ARP` | ARP view | ARP | ARP | ARP |
| `GLO` | RECIPES | RECIPES | RECIPES | RECIPES |
| `SEQ` | FLIP | FLIP | FLIP | FLIP |
| `SAVE` | SAVE | SAVE | SAVE | SAVE |
| `PLAY` | toggle | toggle | toggle | toggle |
| `SELECT` | choose chord | choose chord | choose chord | choose chord |
| `REC` | 4-chord capture (**browser only**, native pending) | | | |

## Physical FM1 button contract

See [docs/FM1-BUTTONS.md](../docs/FM1-BUTTONS.md) for the verified **6-column / 2-row panel**: top FX, SEL, ENV, LFO, EDIT, GLO; bottom HOME, SAVE, ARP, SEQ, PLAY / STOP, REC. To the left are OCT− / OCT+. Felucca calls printed SEL `B_SCL` (distinct from rotary EN_SELECT). Browser controls are now drawn in that exact order.

ENV cycles FEEL and LFO cycles MOTION in the browser and portable native controller. FX sound bank selection, REC capture and OCT− / OCT+ transpose have not yet been ported into the native adapter; they must **not** be mapped to unrelated actions. The native SAVE callback remains RAM-only.

## Required remaining work before firmware

1. Pin upstream Felucca to a known commit in a **separate vendor branch or folder inside the CHORDON BLEU repo**, without modifying or depending on FM-XY. Preserve upstream git history and all GPL notices.
2. Build the unmodified upstream image using its JieLi toolchain and SDK and run upstream `tests/run_tests.sh`. Maintain stable rollback/backup.
3. Connect native `cb_fm1_button()` and `cb_fm1_knob()` to existing Felucca's **calibrated** input paths. Avoid breaking bootloader/update and USB/MIDI service.
4. Adapt callbacks to existing Felucca synth's note-on/note-off handling (the current C callbacks report notes + duration; the host must schedule their release). Keep 4 voices active, obey total 8-voice budget, avoid allocations or blocking operations in the audio ISR.
5. Bind graphics callbacks to device LCD drawing functions, test 240x240 contrast and CPU. Cache draw regions as practical. Avoid full-frame C framebuffer in device RAM.
6. Add versioned flash persistence and robust power-off/restore. A SAVE callback currently exists, **but is not wired to physical flash**.
7. Bring recipe bias, FEEL and harmonic scorer into exact parity with browser version. The native implementation currently provides only a smaller, testable subset. Native REC and some punch-in effects are **not implemented**.
8. Build the actual firmware (native ELF/BIN, Felucca's loader/package scripts producing `.fwsc`); run upstream host regression, firmware-WASM emulator, clock/CPU/RAM tests, and genuine hardware long-run including USB device stability, OTA, backup/recovery.
9. Only after those pass: publish matching SHA256 and provenance, build an installer around verified upstream Web MIDI updater and enable INSTALL in `/install/`.

**Never claim that passing host C tests establishes hardware compatibility.**