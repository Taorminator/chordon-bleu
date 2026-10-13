# CHORDON BLEU

**A pocket-sized harmony kitchen.**

**By Middle Age Engineering (MID Engineering).**

*Cook up something beautiful.*

A tiny, independent musical idea machine for discovering four-chord loops with no music-theory training and minimal setup. This source tree has its **own Git history, CI workflow, design identity and roadmap**. It does not require FM-XY or any other custom firmware.

## Play

The fully playable Web Audio prototype is a single standalone [`index.html`](index.html). Upload a ZIP of this project to a static HTTPS host (for instance Netlify Drop), open it directly in iPhone Safari, then tap PLAY. No external scripts, login or server is needed for the synthesizer itself.

- PLAY: repeat a four-chord loop.
- FLIP / KEEP 1: keep your selected chord unchanged, then re-harmonize the other slots.
- FLIP / ALL 4: change all four chords and clear manual root/type locks; UNDO restores the previous loop.
- FEEL: select WARM, CRISPY or CHEESY harmonic suggestions.
- SPICE: adjust how surprising suggested chords may be.
- ROOT and TYPE: freely chosen or AUTO, independently, for each chord.
- ARP: direct RATE, GATE, DIRECTION and ORDER controls (four FM1 hardware knobs planned).
- SAVE: store favorites in the browser; JSON export and import protect your ideas.

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

## The 240 × 240 FM1 Screen Lab

The playable [browser demo](index.html) now includes an expandable **FM1 SCREEN LAB**: four playful 240 × 240 display concepts (**LOOP**, **RECIPE**, **CHORD**, **ARP**) with four virtual knobs and direct PLAY / FLIP / SAVE controls. These screens render from the *same browser music state*. No Felucca skin or OP-1 artwork is copied.

There is an [FM1 installation status page](install/index.html), **deliberately non-flashable** until a real and safely tested `.fwsc` build exists.

New portable, native-ready C application sources live at `firmware/cb_fm1.c` and `firmware/cb_fm1.h`. They implement the small state machine, recipe selection, chord controls, RGB565 240 × 240 drawing operations, a nonblocking note event scheduler and four-encoder mapping, using callback hooks that a future Felucca hardware integration can implement. `tests/device_test.c` exercises this layer on a desktop C compiler.

**Status separation:** Browser audio/demo ✅ · native C99 host simulation ✅ · Felucca HAL adapter / JieLi firmware build ❌ · real FM1 flashing/hardware tests ❌. The portable C source is **not** a flashable FM1 firmware image and does not yet replicate all JS FEEL/recipe behaviors exactly.

## Test

```sh
node tests/harmony.test.mjs
cc -std=c99 -Wall -Wextra -Werror -pedantic core/chordon_harmony.c tests/core_test.c -o /tmp/chordon-harmony-test
/tmp/chordon-harmony-test
python3 tests/browser_test.py  # optional: Python Playwright and Chromium
python3 tests/stress_test.py   # optional: Python Playwright and Chromium
cc -std=c99 -O2 -Wall -Wextra -Werror -pedantic core/chordon_harmony.c firmware/cb_fm1.c tests/device_test.c -o /tmp/chordon-device-test
/tmp/chordon-device-test
```

## Real M-VAVE FM1

This is **not installable FM1 firmware yet**. The browser sound engine and portable C core are separate and have not reached identical musical behavior. A future independent native port can build on the tested hardware/audio infrastructure in [Felucca](https://github.com/hugelton/Felucca), retaining its GPL-3.0-only and third-party license notices. See [hardware roadmap](docs/FM1_PORT.md). Do not flash the HTML or C test binary.

## GitHub

This is the dedicated repository `Taorminator/chordon-bleu`, with its **own** `main` branch. No FM-XY dependency is needed. Publish through Pages with `main` / `/(root)` if desired. The zip can also be uploaded directly to Netlify Drop for iPhone testing.

## License and acknowledgement

CHORDON BLEU code in this package is distributed under the included GPL-3.0 license. Its standalone C research module evolved from our earlier ELSEWHERE harmony prototype; this is provenance, not a runtime dependency. The product is independently made by Middle Age Engineering and is not endorsed by Teenage Engineering, M-VAVE or the authors of Felucca. Third-party source will only be incorporated with documented attribution and compliance.