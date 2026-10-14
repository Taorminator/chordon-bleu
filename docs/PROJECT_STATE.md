# CHORDON BLEU — verified project state

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
