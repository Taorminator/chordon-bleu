# Minimal browser instrument — 2026-11-08

## Scope and interaction

One stable surface with four chords, a variation dial (including −/+ tap targets), Play/Stop and Undo. No menus or tracks enter the primary flow. Focus-friendly is the design intent; individual usability needs testing with the user.

- Touch/click a pad to select and audition while stopped. During looping it selects the editing target without interrupting the playing chord.
- Turn/drag/scroll the dial, use focused arrows or −/+ to change only the selected slot. The deck is fixed until selecting another slot or undoing, so reversing direction returns to the previous proposal. All proposals use the current C-major/A-minor palette and evaluate both neighbours, including the loop seam. This is a bounded musical heuristic, not a guarantee that every combination sounds preferable.
- White outline means selection. Yellow fill plus a dot means sounding. The large chord name follows the selection consistently.
- Play always starts at slot 1, 84 BPM, two beats per slot. Changes enter at the slot's next scheduled onset. The lookahead is 80 ms; a note already queued inside that window retains its prior chord for that onset.
- Undo restores the exact previous chords and editing selection (32 changes). Stop retains chords, releases sources and removes scheduled playback and highlights.
- Backgrounding, page exit and audio interruption pause playback; no automatic restart. Rapid start/stop is protected against late asynchronous audio startup.
- Persist only four validated chord definitions under `chordon-bleu.minimal.v1`. No automatic audio, restored undo stack or overwrite of existing Classic favorites.

## Reuse and limits

`core/minimal-harmony.mjs` adapts the existing Q vocabulary, movement/common-tone scoring and voiceNotes algorithm. `core/minimal-audio.mjs` isolates the existing two-operator FM-preview E-piano, with source ownership, finite release and disconnect cleanup. This is not the six-operator DX7 backend. No assets require a third-party network request at runtime.

Manual root/quality editing, key/tempo/sound selection, bass, ARP, MIDI and recipe browsing are deferred in this surface. The old app and its tests remain in `classic.html`, with original asset paths and storage. Root `#idea=` and `?view=fm1` links route to Classic. The firmware, Felucca overlay and hardware acceptance requirements are unchanged.

## Verification

Baseline: `main` at `d1c1c7e208b34b57a4f42de738f49159e877e09b`, successful CHORDON checks run 39025043285. All baseline Node regressions, recipe/preset checks and overlay preflight also passed locally before implementation.

Current branch checks:

- `node --test tests/minimal.test.mjs`: seven behavioral tests covering isolated slot mutations, both dial directions, undo, diatonic/bounded voicings, validated persistence, audio graph release/cleanup, asynchronous Play/Stop cancellation, loop timing and background/stall pauses. Legacy idea/device link routing is also verified. Audio and application host tests use controlled Web Audio/DOM substitutes; they are not listening tests.
- Existing Classic Node regressions continue against `classic.html`; browser artifact verification checks the minimal dependency graph and Classic assets separately.
- Browser UI review in cloud Chromium: chord audition starts, selection/alternative/undo, running loop with independently selected editing slot, stop, and local restoration after reload. No app-origin errors observed. The Web Audio start path succeeds; physical audio output/listening and real iPhone Safari behavior are not verified here.
- Responsive review uses the real app in a 390 px viewport iframe; no separate mobile UI.
- C99 harmony (52,800 mutation cases) and device simulation (256 scenarios) passed locally. Store and voice ASan/UBSan passed with leak detection disabled: this container blocks LeakSanitizer under ptrace. Leak-enabled GitHub CI is required for that coverage. No new Felucca target build, measured FM1 latency, physical flash, recovery or hardware test is claimed.

Build: `node tools/build-browser.mjs`; validate `node tests/pages-artifact.test.mjs dist`. GitHub Pages packages this same output and checks the deployed entrypoint and every minimal module after publication. A private preview can be published before the GitHub PR is merged; GitHub remains the development source of truth.

## FM1 physical browser surface

The default surface now uses the existing FM1 panel topology: four left knobs, 240×240 LCD, four right knobs, the unchanged printed 2×6 function labels, OCT buttons and 27 chromatic keys. K1 is the variation encoder; EDIT is Undo; PLAY/STOP is transport; the first four white keys play/select slots. Unused controls are disabled and dark. K2–K4 are physically represented, deliberately without extra features. The on-screen pads remain touch shortcuts. Narrow screens horizontally scroll the full device rather than rearrange the physical controls. This is a browser simulation using the existing sound engine, not a CPU/firmware emulator.

## Existing sounds restored on PRESETS — 2026-11-08

User correction: simplification must preserve the established sounds. PRESETS (lower-left encoder) selects the six original programs WARM, GLASS, DUSK, DX7 EP (local two-operator preview), GRAND and 90s HOUSE, followed by all 153 bundled Aquanode presets on the existing six-operator OpenDX7 worklet. The original sound parameter definitions are retained and tested against Classic; no new sound palette is invented. The sound name remains on the LCD and the ID is saved separately from chord history. K1 still varies chords; changing sounds never changes harmony and chord Undo never resets the instrument.

The left printed controls are MASTER / SELECT above PRESETS / ALGORITHM. Position is grounded in pinned Felucca's photo-coordinate table in `tools/gen_panel_diagram.py` at `9f6a8858afd71b4faed9dfea3a5f94d3ecfdf002`. Unused knobs remain dark. PRESETS supports drag, wheel and focused arrow keys, including cancellation on interrupted drags.

Sound loading is guarded against stale async selections and occurs before note emission. Changing programs and stopping playback cancel queued DX7 note timers and panic the worklet. Worklet modules are registered once per audio context. Unsupported/insecure browsers give an explicit error for DX7 voices rather than silently changing their timbre; local synth programs remain usable. The published HTTPS preview is required for AudioWorklet. The local HTTP preview cannot exercise the worklet in cloud Chromium; its selection/error path and local synth switching were reviewed there. The original DSP regression exercises all 153 actual patches; new controlled lifecycle tests verify load races and cancellation.

Product direction: a fun, inviting chord instrument in the spirit of the user's HiChord/Telepathic Orchid references. Sound first, few decisions, immediate exploration, easy undo. Minimalism should preserve musical personality and established useful sounds.
