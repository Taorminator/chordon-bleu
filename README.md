# CHORDON BLEU

**A pocket-sized harmony kitchen.**

**By Middle Age Engineering (MID Engineering).**

*Cook up something beautiful.*

A tiny, independent musical idea machine for discovering four-chord loops with no music-theory training and minimal setup. This source tree has its **own Git history, CI workflow, design identity and roadmap**. It does not require FM-XY or any other custom firmware.

## Live browser demo

**[▶ Open the CHORDON BLEU demo](https://taorminator.github.io/chordon-bleu/)** — runs directly in your browser, including iPhone Safari. Tap **PLAY** to start the audio; no installation or account is required.

Build and play four-chord loops, explore variations with **FLIP**, **FEEL** and **SPICE**, set each chord's **ROOT** and **TYPE** independently to manual or AUTO, and try the arpeggiator and recipe palettes. Save favorites locally in your browser and download them as MIDI or import a compatible MIDI into the same list.

**Demo status — 2026-10-15:** a playable Web Audio prototype for exploring the instrument's music and interaction design. The FM1 Screen Lab is a 240 × 240 concept simulator. Browser behavior and sounds do not establish native FM1 feature parity or hardware readiness; **FM1 firmware is not approved for installation**.

**Next on the documented roadmap:** consolidate the native CI baseline and verify the resulting `main` commit, improve one bounded native behavior with regression coverage, then establish physical hardware and backup/recovery testing. Native/browser recipe parity, durable flash SAVE and measured device performance remain open work. See [verified project state](docs/PROJECT_STATE.md) and [FM1 acceptance gates](docs/FM1_ACCEPTANCE.md) for details and release requirements.

## Play

The Web Audio prototype is a single standalone [`index.html`](index.html). Use the hosted demo above, or upload a ZIP of this project to a static HTTPS host (for instance Netlify Drop). No external scripts, login or server is needed for the synthesizer itself.

- PLAY: repeat a four-chord loop.
- FLIP / KEEP 1: keep your selected chord unchanged, then re-harmonize the other slots.
- FLIP / ALL 4: change all four chords and clear manual root/type locks; UNDO restores the previous loop.
- FEEL: select WARM, CRISPY or CHEESY harmonic suggestions.
- SPICE: adjust how surprising suggested chords may be.
- ROOT and TYPE: freely chosen or AUTO, independently, for each chord.
- ARP: direct RATE, GATE, DIRECTION and ORDER controls (four FM1 hardware knobs planned).
- SAVE: store favorites in the browser; each row has MIDI download and × delete actions.
- MIDI: download the current four-chord loop as a `.mid` file for a DAW (also available in FM1 device view).

## MIDI download and import

Tap **↓ MIDI** next to the chord cards to download the current loop, including a progression entered with REC. Each saved favorite has its own **↓ MIDI** button: export it directly using its stored tempo, notes and HOLD/PULSE/ARP settings without loading it or interrupting playback. Its **×** button deletes just that favorite from browser storage; the current playing loop remains unchanged. The file contains two bars in 4/4, the current tempo, voice-led chord notes and bass on separate MIDI channels (1 and 2), plus the current HOLD, PULSE or ARP rhythm, gates and swing. It is a standard format-0 MIDI file at 960 PPQ and requires no Web MIDI permission, server or active audio.

This exports one cycle of the current loop, not a recording of your complete live session, keyboard solos or earlier FLIPs. Random ARP makes a new random pass at export time. Notes and velocities are included; browser sounds, audio effect tails and automation are not. The redundant JSON export/import controls have been removed; existing browser favorites remain intact. CHORDON MIDI exports additionally contain validated app-specific metadata so re-import can restore chord identities and HOLD/PULSE/ARP settings even for sparse or random ARPs. Other MIDI software can ignore these standard sequencer-specific metadata events.

Use **↑ MIDI IMPORTIEREN** below the favorites list. Own CHORDON exports restore tempo, chord identities and motion settings. Foreign standard MIDI type 0/1 files are accepted as four two-beat chord slots in two bars of 4/4, at 48–160 BPM, with one tempo and no sustain-pedal events. Their pitch-class sets are matched against supported chord qualities, preferring the bass as root when several matches exist: this is a possible harmonic interpretation, not unique music-theory analysis. Recognized foreign loops use HOLD; arbitrary performance rhythm, solos, drums and longer arrangements are not recreated. Incompatible files report a reason and do not replace existing ideas. Imports add one favorite without changing live playback. The 16-idea limit is checked before import; no existing favorite is evicted.

## RECIPES · CHORDON BLEU 0.5

Choose **CLASSIC** or **GHIBLI DREAM** directly above the loop. A recipe changes the *musical generation rules*, not just a sound preset. FLIP searches the current recipe palette; the four chord slots, FEEL, SPICE, ROOT/TYPE and SAVE keep working as before. Saved loops and the current session retain their recipe. GHIBLI DREAM is an independent musical homage, not an official collaboration or a reproduction of original film melodies. Read [RECIPES documentation](docs/RECIPES.md).

The recipes are standalone JSON modules in `recipes/`, bundled into offline `index.html` using `node tools/build-recipes.mjs`. Future musical worlds can be added without cluttering the playing surface. The portable C firmware core does not yet implement this recipe system; that remains a future native port.

## Files

- `index.html` - complete browser instrument (single-file app)
- `recipes/ghibli-dream.json` - modular harmonic-world data
- `tools/build-recipes.mjs` - validates and embeds recipe modules for iPhone/HTTPS offline play
- `core/chordon_harmony.c`, `.h` - independent C99 harmony research core
- `tests/` - Node, portable C, and optional Playwright browser/stress tests
- `docs/` - identity, FM1 roadmap, hardware knob mapping, design previews
- `.github/workflows/ci.yml` - independent repository checks

## Test

```sh
node tests/harmony.test.mjs
cc -std=c99 -Wall -Wextra -Werror -pedantic core/chordon_harmony.c tests/core_test.c -o /tmp/chordon-harmony-test
/tmp/chordon-harmony-test
python3 tests/browser_test.py  # optional: Python Playwright and Chromium
python3 tests/stress_test.py   # optional: Python Playwright and Chromium
```

## Interactive FM1 Screen Lab — v0.6

Open **FM1 SCREEN LAB** near the bottom of the browser instrument. It renders an actual **240 × 240 Canvas** with four original design states: **HOME** (four chromatic chord objects and a miniature saucepan), **RECIPES** (a plated Cordon Bleu that releases cheese when FEEL is CHEESY), **CHORD** (orbital tone geometry), **ARP** (note orbit). These are an original homage to playful instrument design, not a copy of Felucca or OP-1 screens.

The virtual **KNOB 1–4** controls are wired to the same sound-state as the app; HOME gives SPICE/FEEL/MOTION/BPM, ARP gives RATE/GATE/DIRECTION/ORDER. PLAY/FLIP/SAVE are wired too. This is a visual **concept simulator**, not WASM-compiled FM1 firmware.

## Native controller prototype and install page

- `firmware/cb_fm1.h/.c`: portable native FM1 UI/controller/event scheduling model. No heap, no blocking operations in audio callbacks; screen output through RGB565 drawing callbacks for adapting to Felucca's LCD graphics.
- `tests/device_test.c`: exercises 256 hardware-like device scenarios, bound checks for native 240×240 operations, musical controls, four simultaneous voices at most, and note/ARP scheduling.
- `install/index.html`: dedicated future web-installer landing page. **Installation disabled until a verified hardware build**. No dangerous flashing and no fake firmware binaries.
- `firmware/PORTING.md`: exact technical blockers and Felucca integration roadmap.

Run all standalone checks: `node tests/harmony.test.mjs && node tests/recipes.test.mjs && node tools/build-recipes.mjs --check`, then `cc -std=c99 -O2 -Wall -Wextra -Werror -pedantic core/chordon_harmony.c firmware/cb_fm1.c tests/device_test.c -o /tmp/chordon-device && /tmp/chordon-device`.

These C modules are a **portability bridge only**. They are not linked to Felucca HAL, native sound engines, persistent flash or update loader. Native Ghibli FEEL variants are not yet parity-matched to browser, and live REC/punch-in still require porting.

## Real M-VAVE FM1

This is **not installable FM1 firmware yet**. The browser sound engine and portable C core are separate and have not reached identical musical behavior. A future independent native port can build on the tested hardware/audio infrastructure in [Felucca](https://github.com/hugelton/Felucca), retaining its GPL-3.0-only and third-party license notices. See [hardware roadmap](docs/FM1_PORT.md). Do not flash the HTML or C test binary.

## GitHub

This is the dedicated repository `Taorminator/chordon-bleu`, with its **own** `main` branch. No FM-XY dependency is needed. The [live demo](https://taorminator.github.io/chordon-bleu/) is deployed by the repository's [GitHub Pages workflow](.github/workflows/pages.yml). The ZIP can also be uploaded directly to Netlify Drop for iPhone testing.

## License and acknowledgement

CHORDON BLEU code in this package is distributed under the included GPL-3.0 license. Its standalone C research module evolved from our earlier ELSEWHERE harmony prototype; this is provenance, not a runtime dependency. The product is independently made by Middle Age Engineering and is not endorsed by Teenage Engineering, M-VAVE or the authors of Felucca. Third-party source will only be incorporated with documented attribution and compliance.