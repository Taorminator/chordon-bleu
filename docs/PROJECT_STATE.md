# CHORDON BLEU — verified project state

## Browser bassline integration — 2026-10-16

- Draft PR #21: [connect generated bassline to browser demo](https://github.com/Taorminator/chordon-bleu/pull/21), based on `main` `8822eb67eb698ecf40ada882f342c35e51abea33`.
- Adds CHORDS/BASS editing focus. Bass FLIP generates a phrase from the current chord progression; chord FLIP keeps the bass rhythm and resolves ROOT/FIFTH roles against the changed chords.
- Bass events are scheduled in the shared two-bar browser loop, using the existing dedicated bass synthesis path. Saved loops and MIDI export include the track; MIDI bass events use channel 2. Share links disclose and carry the track when present; old links remain valid.
- Host harnesses use a marked browser startup boundary. CI must be checked on the exact latest PR head before merge.
- Browser listening, bass UI visual review, MIDI own-export re-import, and FM1 hardware behavior are not verified. The browser work does not modify native firmware or FM-XY. This PR is not firmware approval.


## Browser idea-link increment — 2026-10-16

- Branch `feat/share-idea-links`, based on `main` `ee8f18b9ff498abbbbbe039c3af24791d65ce945`; baseline CHORDON checks passed in [run 38719693406](https://github.com/Taorminator/chordon-bleu/actions/runs/38719693406).
- Added LINK TEILEN in both browser views, with complete settings disclosure before native sharing or clipboard access. Versioned fragment links restore the four-chord setup without autoplay or replacing favorites. No native firmware changes.
- Local recipe/DX7 bundle checks and all 17 Node regression files passed. New coverage verifies round trips, frozen snapshots, bounds, independent locks, preset-catalog parity, preserved favorites, no autoplay, disclosure, clipboard/native-share failure paths and modal keyboard/focus behavior.
- Actual iPhone share-sheet, clipboard and visual/accessibility behavior remain unverified. See [share-link specification](SHARE_LINKS.md) and D-011 for limitations.

Last checked: 2026-10-14. This is a snapshot, not a live CI dashboard.

## Identity and scope
- Independent repository: `Taorminator/chordon-bleu`.
- Playable browser prototype: root `index.html`; deploy through GitHub Pages.
- FM-XY and the separate OP-1 firmware experiment must remain independent. This repository does not depend on FM-XY.
- The real FM1 firmware is **NOT APPROVED FOR INSTALLATION**.

## Verified GitHub snapshot
- `main` at review: `7d8c28cf2430c9c5ed1626f324143f1c06470722` (project-memory merge; browser/native source unchanged from `bb813f0`).
- CHORDON BLEU checks: [successful run 38475458626](https://github.com/Taorminator/chordon-bleu/actions/runs/38475458626), on `bb813f0`.
- Browser Pages publishing: [successful run 38475458599](https://github.com/Taorminator/chordon-bleu/actions/runs/38475458599), on `bb813f0`.
- Native Felucca proof: [successful run 38436737789](https://github.com/Taorminator/chordon-bleu/actions/runs/38436737789), on older `52b6064` — **not the current main commit**.
- A pipeline fix to place baseline upstream host regression *before* the CHORDON overlay was prepared on `ci/native-pre-overlay-baseline` at `0fbee09d`: [successful native run 38563077339](https://github.com/Taorminator/chordon-bleu/actions/runs/38563077339). This is a **separate branch**, not yet merged into `main`.
- The follow-up `fix/native-upstream-zero-bpm-guard` at `c566cad1ed8c533aa26a5a5b7f5cce75bdd5e6c2` includes that pipeline fix and guards the pinned Felucca delay calculation against BPM 0 with a 120 BPM fallback. Nonzero BPM values retain their original calculation; the patch aborts unless exactly one expected upstream expression exists.
- Native verification: [successful run 38571385615](https://github.com/Taorminator/chordon-bleu/actions/runs/38571385615), on `c566cad1`: pi32v2 module compilation, unmodified Felucca reference build, guarded host baseline, experimental CHORDON build, and post-integration host regression passed. The unmodified reference binary is built before the guard. Host logs explicitly skip the Emscripten browser emulator and optional unavailable editor capabilities; these are not hardware checks.
- [PR #10](https://github.com/Taorminator/chordon-bleu/pull/10) incorporates the existing `main` documentation without changing browser or FM-XY source. CHORDON BLEU checks passed in [run 38580447879](https://github.com/Taorminator/chordon-bleu/actions/runs/38580447879) on `586fae10797c2826e5bac9fe89ce4c4c920efafc`: JavaScript regressions, C99 harmony core, portable application simulation, ASan/UBSan snapshot fault injection and voice stress, and publication-safety checks. Later documentation-only commits still require their own PR checks; neither run above verifies a merged `main` commit.

## Important distinctions
- Cross-compilation and a successful experimental native image build do **not** prove real FM1 behavior.
- The browser's 240×240 Screen Lab is a concept simulator, **not** a firmware-derived WASM emulator.
- Native and browser feature parity is incomplete, especially recipes and persistence.
- CI status must always be checked against its exact commit. Do not equate a green branch build with a green `main` build.

## Immediate next actions
1. Review the consolidated `fix/native-upstream-zero-bpm-guard` PR (including pre-overlay host baseline), require green CHORDON checks, then consider merge. Re-run native CI on the resulting `main` commit; branch-only results must not be reported as merged-main verification.
2. Improve one limited native behavior with a regression test only after green baseline checks.
3. Establish hardware test access and a verified backup/recovery method before any flash or installation proposal.
4. Keep [FM1 acceptance gates](FM1_ACCEPTANCE.md) up to date; treat earlier status claims in [FM1_PORT.md](FM1_PORT.md) as historical when they conflict with dated evidence above.

See [architecture](ARCHITECTURE.md) and [decision log](DECISIONS.md).

## Browser MIDI export increment — 2026-10-15
- Based on `main` `c244dfc30e24e815b7169d8d2e81ea6eefc8d1ea`, whose CHORDON checks passed in [run 38680100080](https://github.com/Taorminator/chordon-bleu/actions/runs/38680100080).
- Branch `feat/browser-midi-export`: one-cycle MIDI download in browser and FM1 concept views, with tempo, bass, voice leading and HOLD/PULSE/ARP timing; see README and D-008. No native firmware changes.
- Local validation: recipe bundle, all 11 Node regression files including MIDI decoding, C harmony and device host tests passed. Storage and voice ASan/UBSan checks passed with leak detection disabled: this container cannot run LeakSanitizer under its process restrictions. Full leak-enabled CI remains the authoritative check.
- Download handler tested with substituted browser I/O (Blob, link click and cleanup). A real browser/iPhone download was not verified: Chromium installation failed because the browser archive download was invalid.

### Saved-loop follow-up — 2026-10-15
- Reconciled the MIDI changes with `main` `1c92b1407909af22056d83e462a474ccc98cf0bb` (integrated DX7 presets retained), green CHORDON run [38683881757](https://github.com/Taorminator/chordon-bleu/actions/runs/38683881757).
- Each favorite now offers direct snapshot MIDI export and × deletion, with stored tempo/motion shown. Export/delete do not modify the live loop or its playback.
- Regression coverage includes a saved 76 BPM ARP against a different playing loop, stored gate/rate, byte-level MIDI decoding, deletion persistence calls, empty state and focus. Real iPhone/browser download remains unverified locally.

### MIDI-first import follow-up — 2026-10-15
- Removed the redundant JSON export/import UI. MIDI file-picker import adds to the same saved list; existing local favorites are retained.
- Own exports now preserve app-specific four-chord and motion metadata for re-import. Foreign two-bar files support bounded chord interpretation, with limitations and error feedback documented in README.
- `tests/midi-import.test.mjs` covers all supported chord-quality/mode round trips, type 0/1 foreign chord recognition, invalid/unsupported files, full-list handling and unchanged live playback. Real browser/iPhone file-picker/download remains unverified locally.
