# Bass-track model — first implementation increment

Date: 2026-10-15. Base: `fbd8469f13268758e2f869d1f576780ce5740b79`.
Plan: [second-track plan](BASS_TRACK_PLAN.md) (merged PR #14).

`core/bass-track.js` is a pure, separately tested model. It is **not connected to
the browser UI, project storage, MIDI or native firmware yet**. No existing loop
has been migrated and current playback behavior is unchanged. The implementation
creates the prerequisite for migrating the implicit root bass, not a second
playable track or a bassline generator.

- Version 1: eight beats, at most 16 ordered eighth-note positions, enabled state,
  reserved nonzero seed and a `legacy-bass` sound identity. No extra audio node.
- Events store relative ROOT/FIFTH roles, octave, velocity and duration. FIFTH
  currently means a present perfect fifth; an absent or altered fifth uses ROOT.
  Future handling of diminished fifths is a separate musical choice.
- Chord definitions come from the caller's existing root/quality vocabulary;
  there is no second chord table or assumption of a single global scale.
- `legacyBassTrack(source)` returns four root events equivalent to the current
  HOLD/PULSE/ARP note emitter. Missing old PULSE settings use existing defaults;
  `slice` remains an accepted PULSE alias. Independent per-event duration objects
  prevent editing one slot from changing all four.
- Beat duration plus explicit second floors/caps preserves old timing after BPM
  changes. `resolveBassTrack` returns bounded note intents for one loop, clipping
  gates at the next bass onset and chord/loop boundaries.
- These are note-on/off intents. Existing synth envelope/release tails are not
  modeled or changed, and live audio monophony/voice budgets are not certified.
- Input validation fails atomically without modifying the input model/chords.
  No randomness, DOM, AudioContext, storage writes or main-track mutations.

Run `node tests/bass-track.test.mjs`. Tests compare the actual current browser
emitter with model resolution over 1,728 tempo/motion/rate/gate/root cases, check
all browser chord qualities, role fallback, octave handling, note-intent monophony,
the 4→1 seam, invalid input, immutability and JSON round-trip. This is host JS
verification, not browser listening, native C portability or FM1 hardware proof.

Next increment: bounded seeded phrase generation using this model. Then track
focus/sound integration, atomic chord+bass scheduling and versioned favorite/MIDI
migration. Preserve the shared native four-voice ceiling when designing a later
port; a separate bass track does not grant additional hardware voices.
