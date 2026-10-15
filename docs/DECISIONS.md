# CHORDON BLEU — decision record

Decisions below consolidate existing README, project instructions and earlier documented constraints. Entries marked **pending** are not approvals.

## D-001 — Independent product and repository
**Status: Active.** CHORDON BLEU is independent of FM-XY and of the separate OP-1 effort. No shared release workflow or undocumented cross-repository edits.

## D-002 — Immediate musical discovery
**Status: Active.** An intuitive, playful pocket harmony instrument, rather than a full-featured DAW. Minimal controls and quick happy accidents are priorities.

## D-003 — Four independently steerable chord slots
**Status: Active.** Root and chord quality are separately lockable or AUTO per chord; maintain usable PLAY, FLIP, SAVE interactions and predictable note release.

## D-004 — Browser is a prototype, not hardware evidence
**Status: Active.** The web demo and 240×240 Canvas Screen Lab inform UX; no browser success should be described as verified FM1 firmware.

## D-005 — Felucca native integration is experimental
**Status: Active.** Pinned upstream Felucca with an isolated CHORDON overlay, regression before and after integration where practical; license attribution must be respected. Green CI does not by itself authorize installation.

## D-006 — Release is gated by physical safety
**Status: Locked.** No downloadable/installable FM1 image or flashing instructions presented as safe without complete integration tests, physical FM1 behavior checks, validated flash SAVE and power-cut handling, recovery/rollback, and explicit informed release approval. See [acceptance gates](FM1_ACCEPTANCE.md).

## D-007 — Short, validated increments
**Status: Active.** Resolve red CI from job logs first; after green baseline develop one small scoped native improvement, run tests again, and record exact branch/commit/run. No claim of autonomous background development without automation.

## D-008 — Explained harmonic freedom, not unchecked randomness
**Status: Active product requirement; implementation pending.** Recorded 2026-10-15
following the user's request that generated progressions stay musically connected
while permitting root changes, tonal changes and meaningful dissonance.
See [Harmony contract](HARMONY_CONTRACT.md) for sources, audited gaps and test cases.
AUTO proposals must have a supported harmonic/schema/voice-leading explanation,
including the loop seam. SPICE expands supported exploration, never bypasses
coherence; FEEL must not invalidate an accepted result through post-processing.
Preserve independent manual fields and KEEP 1. Existing ALL 4 remains an explicit
reset, but failure to find a coherent full replacement must leave the loop unchanged.
User-fixed combinations cannot be guaranteed coherent and must not be silently
rewritten. No additional menus, hardware claims or release approval follow from
this documentation. Implement in small tested increments, starting with correct
diatonic baseline masks.

## Pending decisions
- Exact hardware test and recovery plan, including a recoverable FM1 unit and validated backup procedure.
- Target CPU/RAM/audio/LCD budgets based on real measurements.
- Prioritization of browser/native recipe parity versus SAVE integration after existing native reliability issues.

Update this record when decisions change; include rationale, date, and commit/issue reference.

## D-008 — Browser MIDI loop export
**Status: Active. Date: 2026-10-15.** One-tap MIDI download exports the current four-slot progression as two bars, including tempo, voice leading, bass and HOLD/PULSE/ARP timing. The offline exporter uses the same note scheduler as playback through an optional note sink; it does not start audio or change the progression. Standard format 0, 960 PPQ, chord/bass channels 1/2. Live-session capture, audio effects and native FM1 export are outside this increment. Random ARP generates a fresh pass. Validation: `tests/midi-export.test.mjs` decodes the actual bytes and checks timing, gate balance and state preservation.

## D-009 — Saved-loop actions
**Status: Active. Date: 2026-10-15.** Each saved row has independent load, MIDI download and × delete buttons. Download uses the saved snapshot (tempo, chord voices, motion, ARP and PULSE settings) without assigning to live state or stopping audio. Missing legacy ARP/PULSE settings use existing defaults. Delete persists only the favorite-list change and moves keyboard focus to a neighboring entry or SAVE. No confirmation dialog for this explicitly requested single-item deletion. Random ARP remains a new pass; MIDI contains notes rather than synth/effect audio.

## D-010 — MIDI-first favorites and bounded import
**Status: Active. Date: 2026-10-15.** Replace redundant JSON backup controls with a native file-picker MIDI import. Own MIDI files carry a non-commercial sequencer-specific snapshot to restore four chords, tempo and motion settings. Foreign SMF type 0/1 files are interpreted as four two-beat chord slots in 4/4, 48–160 BPM; full unsupported pitch-class sets, long files, changing tempo, sustain and malformed data are rejected with feedback. Multiple valid chord readings prefer the bass root and are explicitly described as a possible interpretation; imported foreign rhythm starts in HOLD. Import appends a favorite, never alters live playback and never evicts an existing favorite from the full 16-item list. Input is bounded to 1 MB, 64 tracks and 100,000 events. Local favorite storage remains unchanged.
