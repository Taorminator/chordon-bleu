# CHORDON BLEU — architecture map

This is a high-level map of the existing repository, not a claim of completed hardware integration.

## Separate layers

| Layer | Location | Purpose | Verification scope |
| --- | --- | --- | --- |
| Web instrument | `index.html`, `recipes/`, `tools/build-recipes.mjs` | Browser audio, four-chord interactions, recipes, UI and screen concept | Node/browser-related CI |
| Portable harmony | `core/chordon_harmony.c/.h` | C99 harmony logic for native reuse | Host tests, cross-compiler |
| Bass event model | `core/bass-track.js` | Bounded relative-role model and legacy bass note-intent conversion; not connected to playback/storage yet | Host JS comparisons with the browser emitter; not native C/hardware |
| Bass phrase generator | `core/bass-generator.js` | Seeded chord-relative patterns with bounded search; not connected to app controls yet | Host JS harmonic/register/phrase invariants; not listening or hardware proof |
| FM1 controller model | `firmware/cb_fm1.c/.h` | Bounded controls, note event scheduling, 240×240 draw callbacks | Native host/device tests |
| Voice and storage prototypes | `firmware/cb_voice.c`, `firmware/cb_store.c` | Experimental native voice and persistence interfaces | Host/native tests; **not real flash proof** |
| Felucca overlay | `firmware/felucca-overlay/` | Experimental insertion of CHORDON application into pinned upstream Felucca | Native GitHub workflow; not field release |
| Release guard | `install/`, `docs/FM1_ACCEPTANCE.md` | Keep installer disabled until safety gates are met | Manual release decision and physical tests |

## CI boundaries
- `.github/workflows/ci.yml`: repository-level CHORDON checks.
- `.github/workflows/pages.yml`: independent web demo deployment.
- `.github/workflows/felucca-baseline.yml`: diagnostic pinned upstream Felucca reference, JieLi cross-compile and experimental integration. Binary output remains confined to CI.
- A green host test does not certify hardware timing, LCD performance, flash persistence or recovery.

## Design and performance contracts
- Four accessible chord slots; root and quality can each be independently manual or AUTO.
- Minimal first-contact UX; fast PLAY/FLIP/SAVE, musical discovery over menu depth.
- Bounded native resources, predictable scheduling, no blocking in realtime audio callbacks.
- 240×240 readability and hardware input mapping require physical validation.
- Browser implementation is allowed to differ from embedded implementation and must never be mistaken for a device validation rig.

Detailed specifications: [identity](IDENTITY.md), [port roadmap](FM1_PORT.md), [button mapping](FM1-BUTTONS.md), [knobs](FM1-KNOBS.md), [acceptance](FM1_ACCEPTANCE.md).

Second-track work: [bass plan](BASS_TRACK_PLAN.md), [first model increment](BASS_TRACK_MODEL.md), [generator](BASS_GENERATOR.md).
