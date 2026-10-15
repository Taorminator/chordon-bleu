# Second track: harmony-following bass — feature plan

Date: 2026-10-15. Fachbereich 02. Status: **proposal, no implementation**.
Audited main: `3f9eb6bef1aa05000cbc32ffb6593bfd3a865214`; CHORDON checks and Pages publishing successful.
User intent: a separately playable/editable low-register line generated from the
four-chord progression, with a simple switch mapping controls to the chosen instrument.

## Product model

Two instruments, one musical idea: CHORDS defines the harmony; BASS follows it.
Both play through the same transport/tempo/loop clock. Selecting a track changes
editing focus, never playback, mute state or synchronization. Start with four
two-beat chord slots over two bars in 4/4, matching the current project and MIDI.
No additional song structure, mixer page or full step-sequencer is required.

A segmented CHORDS / BASS switch should remain visible next to the shared controls.
Show clear active-track identity by text and shape/focus styling, not color alone.
When BASS is active, keep the chord progression visible as musical context; show a
compact bass rhythm/contour underneath rather than another dense keyboard editor.

| Control | CHORDS selected | BASS selected |
| --- | --- | --- |
| Sound | Main instrument and its preset | Independent bass sound/preset |
| FLIP | Change harmony under existing KEEP 1 / ALL 4 rules | Generate another compatible bass phrase; chords stay identical |
| SPICE | Harmonic novelty | Rhythmic/contour novelty within supported chord tones |
| FEEL | Existing harmonic color preference | A small articulation/accent palette; exact mapping needs listening review |
| HOLD / PULSE / ARP | Existing chord behavior | Bass sustain, repeated notes or chord-tone motion |
| PLAY / STOP, TEMPO | Shared | Shared |
| SAVE / saved MIDI | Whole two-track idea | Whole two-track idea |

The switch targets the existing FLIP button; it is not a separate musical FLIP
mode. Do not require selecting both tracks or introduce automatic BOTH-FLIP in V1.
The chord Root/Quality editor remains a chord editor; do not silently reinterpret
a quality lock as a bass setting. Optional per-track mute should be considered
only after the core interaction works; selecting BASS must never solo it.

## Musical contract

- Generate bass against the actual four chord root/quality pairs, including manual
  and borrowed chords, rather than assuming all notes belong to one global scale.
- Default to the current chord root at a chord arrival. Initially allow roots,
  octave displacement, rests and a supported chord fifth. Use the actual chord
  vocabulary: diminished fifths differ from perfect fifths, and a voicing may omit
  a fifth. Missing/unsupported roles fall back to the root, never an invented note.
- Begin with a small register-appropriate palette. Root/fifth is the conservative
  first increment; broader chord tones, inversions and chromatic approaches need
  separate harmony/voicing and listening tests before enabling.
- A lower register does not alone guarantee pleasantness. Score large jumps and
  low-register crowding; audition bass with the actual main timbres. Prefer a clear
  pitch center over sub-octaves that disappear on the target playback system.
- One bass note at a time. Retriggering the same note and release tails must obey
  the chosen monophony policy; MIDI note-off precedes a replacement note-on.
- End notes at harmonic boundaries unless explicitly safe under the arriving
  chord. Validate the last-to-first transition as well as internal transitions.
- SPICE changes patterns and supported pitch roles, never disables compatibility.
  No chromatic passing notes, independent bass modulation or conflicting key in V1.

Illustrative pitches, not a mandated rhythm:
C major: C–G; A minor: A–E; F major: F–C; G major: G–D.
A bass role is resolved relative to the active chord; the generator is not just a
transposed copy of the chord's top voice or a permanently held root.

The researched harmony contract remains in [PR #11](https://github.com/Taorminator/chordon-bleu/pull/11),
currently a proposal outside main. Do not claim its planned validator already runs.

## Bass FLIP versus chord FLIP

Store a bass phrase as bounded rhythmic events plus harmonic roles. A role such
as ROOT or FIFTH is distinct from a rendered absolute MIDI note. Resolve roles
against the accepted chord progression and register policy before scheduling.
Provisional V1 grid: 16 eighth-note positions over the two-bar loop, four positions
per chord slot, with rests, gate and velocity. This is not a 16-sixteenth-note bar
or a promise of a user-facing grid editor.

BASS FLIP changes the phrase/contour but leaves all chord objects, locks, sound
and tempo untouched. Repeated PLAY or MIDI download must not invent a new phrase.
Use a separate seeded bass RNG; unrelated ARP activity must not change its result.

CHORDS FLIP retains bass rhythm/relative roles where supported, then re-resolves
pitches against the new chords. Repair unsupported roles deterministically, using
the root as the simplest safe fallback. Publish chord+bass updates together at a
defined musical boundary; do not leave the previous chord's bass under the new one.
If the combined result cannot pass constraints, keep the last valid idea unchanged.
Manual chord edits, key changes, recipe changes, undo and loading require the same
synchronization policy. Undo restores the complete two-track idea, not half of it.

## Current-code consequences

At the audited commit, `playVoicing()` emits an implicit root bass in HOLD,
PULSE and ARP. That emitter must become the explicit BASS scheduler: never add a
second bass on top. Its removal must not change chord-note timing or break existing
saved projects. Audio `tone()` currently treats bass as a generic oscillator voice
and bypasses the DX7 main instrument; an independent bass sound needs a real
track-aware sound path, not merely another UI sound selection.

Use one generated note-event representation for playback and MIDI so bass rhythm,
gate and notes do not diverge. Keep an explicit track identity beyond the existing
bass boolean when the sound path becomes independent. For the browser, independent
DX7 patches require separate processor instances and track-level lifecycle/panic;
register the processor once per shared AudioContext. Benchmark before defaulting
to two expensive DX7 instances; a lightweight bass synth is a sensible V1 default.

## Save, compatibility and MIDI

Version the two-track snapshot with bass events/roles, seed, sound, enabled state
and articulation. Keep active editing focus separate from musical project data.
Old favorites/sessions must migrate to an explicit bass phrase equivalent to their
previous automatic bass behavior; do not unexpectedly add notes, change sound or
lose their current HOLD/PULSE/ARP groove.

Keep current MIDI channels 1 (chords) and 2 (bass) for compatibility. Format 0 can
already carry both channels; physically separate SMF tracks are an optional export
choice, not a requirement for adding an instrument. Export the resolved stored
phrase, tempo and both instruments' note timing. Patch identity can be in the
versioned application snapshot; MIDI notes alone do not reproduce a DX7 sound.

The current own-file snapshot is CHORDONBLEU1 and does not store a separate bass
phrase. Add a new explicit schema and retain the existing reader. Own-file round
trips must restore both tracks; old own-files retain their old interpretation.
Foreign MIDI import currently merges note pitch classes and chooses chord roots
partly from the lowest note. An independent bass can mislead that heuristic.
Do not silently assume channel 2 is always bass in foreign files: preserve the
existing conservative import unless a separate, explicit channel-role policy is
designed and tested. Unsupported imports need clear feedback.

## Browser versus FM1

Browser prototype first, portable deterministic bass generation second, native
audio integration only after resource evidence. A successful web test does not
prove native feasibility. Fixed event buffers, integer timing/roles, bounded
generation, no heap or search in audio ISR are requirements for portable logic.

The native application's current four-voice ceiling is shared, not per track.
A possible allocation is three chord voices plus one monophonic bass, but chord
identity, release overlap and CPU cost must be verified; ninth/seventh qualities
cannot be silently simplified just to fit. Do not adopt the browser's polyphony
or promise two native DX7 instances. Native storage and MIDI support remain
separate, unapproved work; no firmware image or hardware release follows here.

## Suggested independently verifiable increments

1. Introduce a versioned two-track event model and deterministic legacy migration;
   preserve existing audible/exported behavior. No new generation or extra UI yet.
2. Build/test a pure bounded bass generator against real chords, with root/fifth
   patterns, phrase determinism, role repair and loop seam checks.
3. Add CHORDS/BASS editing focus and scoped FLIP/sound controls; replace the implicit
   bass, share transport and commit harmonic updates atomically.
4. Save/undo/own-MIDI round-trip both tracks; preserve legacy and foreign imports.
5. Listening/accessibility review, browser performance measurements, then separately
   evaluate portable C and native four-voice integration.

Acceptance: chord immutability under bass FLIP; deterministic bass under replay
and export; compatible pitch roles for every supported quality/transposition;
safe boundary note release including 4→1; no duplicate implicit bass; simultaneous
transport; independent sounds; no orphan nodes/stuck notes after stop/switch/reset;
atomic chord+bass edits and undo; bounded note/event counts; old favorite/MIDI
compatibility and new two-track round trips. Audition sparse, busy, borrowed and
manual chord sequences at extreme supported tempos. No aesthetic/hardware
guarantee can be inferred from pitch-class property tests alone.
