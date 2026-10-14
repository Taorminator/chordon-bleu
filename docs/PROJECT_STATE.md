# CHORDON BLEU — verified project state

Last checked: 2026-10-14. This is a snapshot, not a live CI dashboard.

## Identity and scope
- Independent repository: `Taorminator/chordon-bleu`.
- Playable browser prototype: root `index.html`; deploy through GitHub Pages.
- FM-XY and the separate OP-1 firmware experiment must remain independent. This repository does not depend on FM-XY.
- The real FM1 firmware is **NOT APPROVED FOR INSTALLATION**.

## Verified GitHub snapshot
- `main`: `bb813f034f50f81cdb39c9e69670f1fb538c9e7c`.
- CHORDON BLEU checks: [successful run 38475458626](https://github.com/Taorminator/chordon-bleu/actions/runs/38475458626), on `bb813f0`.
- Browser Pages publishing: [successful run 38475458599](https://github.com/Taorminator/chordon-bleu/actions/runs/38475458599), on `bb813f0`.
- Native Felucca proof: [successful run 38436737789](https://github.com/Taorminator/chordon-bleu/actions/runs/38436737789), on older `52b6064` — **not the current main commit**.
- A pipeline fix to place baseline upstream host regression *before* the CHORDON overlay was prepared on `ci/native-pre-overlay-baseline` at `0fbee09d`: [successful native run 38563077339](https://github.com/Taorminator/chordon-bleu/actions/runs/38563077339). This is a **separate branch**, not yet merged into `main`.

## Important distinctions
- Cross-compilation and a successful experimental native image build do **not** prove real FM1 behavior.
- The browser's 240×240 Screen Lab is a concept simulator, **not** a firmware-derived WASM emulator.
- Native and browser feature parity is incomplete, especially recipes and persistence.
- CI status must always be checked against its exact commit. Do not equate a green branch build with a green `main` build.

## Immediate next actions
1. Review/merge `ci/native-pre-overlay-baseline` after confirming the diff and branch policy; re-run native CI on the resulting `main` commit.
2. Improve one limited native behavior with a regression test only after green baseline checks.
3. Establish hardware test access and a verified backup/recovery method before any flash or installation proposal.
4. Keep [FM1 acceptance gates](FM1_ACCEPTANCE.md) up to date; treat earlier status claims in [FM1_PORT.md](FM1_PORT.md) as historical when they conflict with dated evidence above.

See [architecture](ARCHITECTURE.md) and [decision log](DECISIONS.md).
