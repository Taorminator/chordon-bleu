# Independent FM1 development roadmap

CHORDON BLEU is a distinct project: not a rebrand, branch or submodule of FM-XY. Its own repository must be independent; no code or release pipeline is shared between the two products.

## Upstream research reference

- Potential hardware base: https://github.com/hugelton/Felucca
- Reference commit examined: `9f6a8858afd71b4faed9dfea3a5f94d3ecfdf002`, Felucca 1.5.6 on 2026-10-13.
- License: GPL-3.0-only plus third-party dependencies and SDK components.
- Relevant modules: `firmware/src/panel.c` (knobs, buttons, calibration), `chord.c` (voicings), `seq.c` (sequencer), `voice.c` and `audio.c` (sound), `project.c` (save), `web/emu/` (firmware-derived browser emulator).
- Read upstream `BUILDING.md` for Jieli pi32v2 toolchain, AC79 SDK, tests and firmware packaging.

## Stages

1. Maintain single-purpose browser app and deterministic tests in this repository.
2. Finalize FM1 button/encoder contract: PLAY, FLIP KEEP 1/ALL 4, FEEL, SPICE, SAVE, REC, chord selection. ARP mode: K1 RATE, K2 GATE, K3 DIRECTION, K4 ORDER.
3. Align portable C harmony implementation with browser root/type pinning, FLIP modes, FEEL scoring and seeded randomness; add shared golden vectors.
4. Make a **fresh** Felucca-based hardware port, with no FM-XY source or Git history. Retain upstream licenses and credits.
5. Run unchanged upstream host tests and real WASM emulator first, then integrate CHORDON BLEU screen/scheduler.
6. Keep scoring outside realtime audio IRQ, and bound CPU, RAM and voice usage conservatively.
7. Test 240 x 240 screen readability, controls, sustained audio, storage, power cycles and firmware recovery on actual hardware.
8. Only provide `.fwsc` after independently verified builds and hardware tests.

**Current state:** browser app runs; C module compiles and passes property tests; no firmware build or physical hardware integration yet.

## Native proof-of-concept status (October 2026)

- Source: `firmware/cb_fm1.c` + `.h`, separate from Felucca's HAL.
- Verified with portable C99 compiler: 256 simulations of button/encoder events, 240×240 drawing bounds, host note callbacks, SAVE callback.
- Browser: four **original** screen views linked to Web Audio playing state; this is NOT a firmware-derived emulator.
- Intended sound path: bind `CbFM1Host.notes` to tested Felucca note-on/offs with timed releases outside audio ISR.
- Intended display path: wrap Felucca LCD primitives for `CbFM1Graphics`.
- Intended controls: translate calibrated matrix inputs from Felucca `panel.c` into `CbButton` and K1–K4 steps; preserve calibrations.
- Intended persistence: wrap Felucca flash storage with a versioned CHORDON BLEU record; ensure backup/restore.
- Remaining blockers: JieLi toolchain + AC79 SDK unavailable in current runtime; original Felucca full source not yet integrated; no `.fwsc` build, native WASM, real-device audio/CPU tests, or recovery validation.

**Do not use the C99 host test binary as FM1 firmware.**