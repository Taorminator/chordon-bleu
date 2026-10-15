# Bassline generator — second implementation increment

Date: 2026-10-15. Depends on the event model in PR #15, commit
`efd0d0b0ecfb7c7b5d4f66c93ff9dbcc658b52dd`.

`core/bass-generator.js` generates explicit relative-role bass phrases. It is
**not wired into the app yet**: there is no BASS switch or audible second-track
change in this increment. Neither saved projects nor MIDI schemas are changed.

## Contract

- Actual chord root/quality definitions come from the caller. Every two-beat chord
  arrival starts on its root. Other notes may use a present perfect fifth; unsupported
  fifths are handled by the model's root fallback. No scale-wide or chromatic guesses.
- A repeated motif gives the phrase a recognizable rhythm. SPICE 0–24 uses sparse
  motifs, 25–69 adds motion, and 70–100 permits denser motifs and a final-slot variation.
  Four to sixteen note events occupy the existing two-bar/eighth-note grid.
- Register is MIDI 28–47 (E1–B2), below the current browser loop chord-voicing floor.
  Octave choices prefer smaller motion; candidate ranking includes the 4→1 seam.
  This is a selected product range, not a universal psychoacoustic rule.
- FEEL initially selects gate/accent values: WARM longer, CRISPY shorter, CHEESY
  between them with a greater preference for fifths. These mappings need listening
  review when connected to actual instruments; no aesthetic validation is claimed.
- No global/harmony/ARP RNG. A local xorshift32 seed and a fixed budget of 16 candidates
  make calls reproducible. The returned seed is the final RNG state for the next FLIP;
  saved event data is replayed directly rather than regenerated during PLAY/export.
- With `previous`, discard candidates with the same rendered pitches/onsets. Changing
  seed, gain or gate alone does not count as a new FLIP. Return `null` if the bounded
  budget finds no different phrase; the caller must retain its previous valid track.
  Disabled state is preserved. Chords, previous events and caller settings are untouched.
- Model resolution clips note intents at subsequent notes and harmonic/loop boundaries.
  Audio envelope tails, voice allocation, independent sounds and live scheduling remain
  outside this component, as does any native C/FM1 feasibility claim.

## API sketch (not app integration)

```js
const next = generateBassTrack({
  steps, qualityDefinitions: Q, seed: bass.seed,
  spice: 38, feel: 'warm', previous: bass
});
if (next) {
  // The eventual controller validates/commits this alongside its harmonic revision.
  // Do not assign global playback state in the generator itself.
}
```

After chord changes, resolving existing relative roles against the new chords
preserves rhythm and deterministically repairs unavailable fifths. The future
controller still must commit those updates atomically at a musical boundary;
this pure component does not establish that live behavior by itself.

## Validation and next step

`node tests/bass-generator.test.mjs`: 2,160 deterministic fixtures across every
browser chord quality and root, three SPICE levels and all FEELs; low/high tempo
checks for register, chord-tone membership, arrival roots and nonoverlapping note
intents; 50 successive FLIPs; JSON persistence, disabled-state preservation,
invalid settings, role repair and independence from `Math.random`.
Existing model, MIDI export/import and saved-action tests remain separate regressions.

Next: CHORDS/BASS editing focus and a track-aware shared scheduler, replacing the
implicit bass rather than adding a duplicate. Independent sound routing, atomic
updates, undo/favorites and versioned own-MIDI round trips must be covered before
claiming a complete playable two-track feature. Hardware resource limits remain
shared and require separate native measurement/verification.
