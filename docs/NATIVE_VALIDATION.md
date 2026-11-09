# Native validation and hardware handoff

The four-chord application runs on the pinned Felucca 1.5.6 hardware/audio base
`9f6a8858afd71b4faed9dfea3a5f94d3ecfdf002`. The native emulator compiles this
application, real Felucca DSP, note scheduler, LCD drawing, calibrated panel
mapping, LEDs and A/B storage into WASM. It is separate from the Web Audio design
prototype. Neither browser execution nor a target build establishes hardware safety.

## Controls

| Physical control | Action |
| --- | --- |
| First four white keys, F/G/A/B | Select a chord and audition it while stopped |
| KNOB 1 | Change the selected chord; preview while stopped |
| EDIT | Undo the last chord change; preview while stopped |
| PRESETS, lower-left knob | Choose a sound from the existing 159-position catalogue |
| PLAY/STOP | Loop four chords / release all scheduled notes |
| MASTER | Felucca's original volume control |
| OCT- and OCT+ held | Upstream update/recovery gesture, unchanged |

Other controls remain inactive and unlit. Only the four chord keys, current
selection, playing transport and available Undo are illuminated. The native
chord proposals currently cycle through a diatonic palette with one-step Undo;
the design prototype has a different ranking/history implementation.

## Sounds

The 153 Aquanode DX7 voices use the original 128-byte patches from the existing
CC0 SYX bundle, in exactly the browser's order. Felucca FM6 unpacks and sanitises
these into its integer Dexed-derived synthesis core. The six named local slots
are retained as native adaptations, not sample-identical Web Audio reproductions:

| Sound | Native implementation / difference |
| --- | --- |
| WARM | Two triangle oscillators, matching approximate cutoff/envelope/detune; browser second oscillator is sine |
| GLASS | Two sine oscillators; browser second oscillator is triangle |
| DUSK | Two saw oscillators; browser second oscillator is triangle |
| DX7 EP | Felucca's second FM6 factory voice, replacing the browser's FM preview |
| GRAND | Bundled native piano sample with translated amplitude envelope |
| 90s HOUSE | Same bundled piano with a shorter translated envelope; browser adds separate synthetic layers |

These adaptations need listening approval. No browser patch or sound definition
was removed or overwritten. `node tools/build-native-sounds.mjs --check` verifies
that generated native DX7 data and ordering match the source catalogue.

## Saving

Snapshot version 2 adds the sound index and reads version 1 with DX7 EP as its
default. Only stopped, idle changes are saved, once after two seconds; boot and
loop playback do not trigger application writes. Playback never starts on restore.

`CB_ENABLE_PERSISTENCE` defaults to **0** on real hardware: saves remain RAM ONLY.
The emulator defines it to 1 for simulated NOR. Do not change the hardware gate
until flash/recovery and address-map qualification have passed on the exact unit.

The persistent adapter uses Felucca's original `OBJ_AUTOSAVE` A/B sectors at
`0xE5000` and `0xE6000`, only when both are erased or contain complete CRC-checked
CHORDON snapshots with no unrelated bytes outside the record. Existing Felucca
projects/banks or other unknown data block writes and remain intact. A torn
partial payload may also block later writes conservatively: the previous
committed copy still restores, and no automatic destructive repair is attempted.
This is not a migration tool, backup, or claim of unused space on other firmware.

## Reproduce software validation

Use a separate pristine checkout at the pinned Felucca commit. With Node,
Python/Pillow/fonttools and Emscripten 4.0.19 available:

```sh
node tools/build-native-sounds.mjs --check
python3 firmware/felucca-overlay/apply.py /path/to/Felucca
python3 tools/build-native-emulator.py /path/to/Felucca /tmp/chordon-native-emu
node tests/native-emulator.test.mjs /tmp/chordon-native-emu/felucca.wasm
```

Serve the generated directory through a local HTTP server to play the emulator.
HTTPS uses AudioWorklet; HTTP local previews or browsers without it use the same
WASM processor through a ScriptProcessor compatibility callback (higher latency).
The preview does not request MIDI permission automatically.
The native emulator CI also saves this browser-only directory as an artifact.
Its WASM is **not** an FM1 firmware image and cannot flash a device.
The private prototype site can serve it under `/native/` without replacing the
original browser design prototype.

Automated coverage includes silent startup and unused keys, real DSP output,
LCD/LED and calibrated physical control dispatch, selected-only changes, Undo,
159 sound positions, stop/release, deterministic output, idle save/reload with
sound, occupied-sector byte preservation and all 129 cut positions across a
96-byte payload and 32-byte outer commit. These cuts model programming failures;
real flash erase timing, hardware interrupts and electrical power loss remain
unverified. Existing portable snapshot tests cover its internal commit/CRC.

The existing native workflow still builds the unmodified reference, runs its
regressions, applies CHORDON, cross-compiles the target and reruns upstream
regressions. Felucca's build checks image-slot size, RAM headroom >=4 KiB,
pool headroom >=8 KiB, entry address, RAM code and ROM references. Exact successful
commit/run results must be checked separately; adding this workflow is not a pass.

## Local results on 2026-11-09

The current source passes the complete native WASM application tests, all 129
simulated NOR cut points and all 96 internal-snapshot cut points. The project CI
commands pass locally through portable-controller tests. Address/undefined
behaviour sanitizer store and voice tests pass with LeakSanitizer disabled:
this executor prevents LeakSanitizer from reading `/proc` under its tracing
sandbox. CI retains `detect_leaks=1`; local results do not substitute for it.

The local JieLi target build passes: application 404272 bytes, RAM data/BSS
52932 of 73728 bytes, pool 324924 of 368640 bytes. RAM text has 916 instructions
with no calls; register-access audit passes. These are software/target results,
not measurements of physical CPU utilisation or audio latency. Device image and
package remain confined to the disposable build directory.

## Physical acceptance still required

No `.bin` or `.fwsc` is published. The install manifest remains non-flashable.
Before an installation can be called safe, record on the exact FM1:

- Device/bootloader identity and a complete verified backup; existing DX747 or
  other firmware/data must be recoverable.
- Recovery route verified for that device, with matching known-good stock image.
- Physical panel/encoder direction, LCD and unused-LED behaviour.
- Audio output, conservative volume, no stuck notes, no audible glitches, and
  worst-case four-note FM6 performance/latency plus long-run stability.
- Real flash/address-map ownership, power-loss behaviour and persistence before
  enabling the hardware persistence gate.

Host/WASM tests cannot complete these checks. Hardware qualification and explicit
release approval are the remaining boundary; no software result bypasses it.
