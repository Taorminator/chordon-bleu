# FM1 Workbench follow-up plan

Date: 2026-10-16. Status: **planned; not implemented or hardware-verified**.
Scope: CHORDON BLEU only. User approved this documentation PR; no firmware installation,
runtime changes, code adoption or FM-XY changes are authorized by this plan.

## Evidence and boundaries

Entry point: [Reddit announcement](https://www.reddit.com/r/MVaveFM1/comments/1x7dvrr/the_mvave_fm1workbench_is_back_online/).
Its title was resolved, but the post body/comments could not be fully retrieved.
Technical evidence comes from the public Workbench source, not unseen comments.

Upstream snapshot reviewed:
[e35315b7ea814b99387840a4fc66754f6a7f59d5](https://github.com/thegiantsnail/fm1-workbench-public/tree/e35315b7ea814b99387840a4fc66754f6a7f59d5).

- [FINDINGS.md](https://github.com/thegiantsnail/fm1-workbench-public/blob/e35315b7ea814b99387840a4fc66754f6a7f59d5/FINDINGS.md): measured patch-transfer stalls, explicit note-off/sustain requirements and transpose-related hanging notes.
- [test_web_chords.py](https://github.com/thegiantsnail/fm1-workbench-public/blob/e35315b7ea814b99387840a4fc66754f6a7f59d5/test_web_chords.py): chord members could precede their pending voice change.
- [README.md](https://github.com/thegiantsnail/fm1-workbench-public/blob/e35315b7ea814b99387840a4fc66754f6a7f59d5/README.md): cross-language parity vectors, software/hardware comparisons and randomize/mutate/morph.

These are upstream reports on particular firmware versions, not CHORDON measurements.
Distinguish browser Web Audio, external MIDI to stock/FM-1+VA, and native Felucca playback.
MIDI chord/bass channels 1/2 are file conventions, not proof of two independent hardware parts.
Upstream reports default effect channel 2: verify routing before mapping external live output.

## Priorities and acceptance criteria

| Order | Task | Coordination | Acceptance |
| --- | --- | --- | --- |
| 1a | Note ownership and release audit | Music Engine + Firmware/Hardware | Explicit track/channel/sent-pitch ownership; bounded regressions for STOP, focus, transpose, sustain and sound changes |
| 1b | Sound-before-note scheduling | Music Engine + Firmware/Hardware | Every chord member and simultaneous chord/bass starts use the intended sound; no bulk patch upload in realtime callbacks |
| 2 | Shared musical test vectors | Music Engine + CI/Quality | Browser/native event parity for the supported subset; differences documented; physical audio checks separate |
| Later | Controlled sound mutation | Music Engine + UI/UX | Optional timbral variation with bounded parameters/level, reversible audition and preserved harmony/track isolation |

First implementation scope: **1a only**, after checking the exact baseline commit and CI.
Audit existing ownership before adding a manager. Add a minimal failing regression for any
confirmed defect; do not begin a broad synth rewrite.

### 1a — note lifecycle

Track the pitch actually emitted, not a pitch recomputed after transpose changes.
Test overlapping identical pitches across tracks, repeated note-ons, rapid PLAY/STOP,
ARP, sustain and held notes during sound changes. Distinguish release tails from stuck notes.
Changing editing focus must not stop the other track.

For external targets, verify explicit 0x80 note-offs and CC64=0 where needed. Do not assume
CC120/123 or note-on velocity zero works on every firmware. Native release uses its own API.

### 1b — sound and timing

Treat sound preparation and dependent notes as an ordered scheduling operation.
Test all chord members, not only the first note. Measure patch/transport latency per external
target; upstream delay values are not universal constants.
For native Felucca, verify independent part/voice contexts and the combined voice budget.

### 2 — parity and resource verification

Use deterministic fixtures containing seed, four chords, bass roles/register, tempo, gate,
HOLD/PULSE/ARP, loop seam, STOP and sound changes. Compare normalized event lists and
balanced releases. Generate fixtures outside the audio callback.

Bound voices, event queues and storage. Record real FM1 CPU/RAM and deadline behavior
before finalizing budgets. Then record physical audio and inspect missing/wrong notes,
onset timing, clipping and lingering voices. Record firmware version, commit, configuration
and measurement method. Software parity does not prove acoustic identity or hardware safety.

## Deferred and excluded

Sound mutation is a separate timbral proposal, not a harmony validator or a replacement for
[the harmony contract](HARMONY_CONTRACT.md). No new controls in this increment.
Speech, drums, Android, VST and MCP are not scheduled.
Future upstream code/preset reuse requires license and attribution review; Workbench declares GPL-3.0.

Existing [FM1 acceptance gates](FM1_ACCEPTANCE.md), backup/recovery and release approval
requirements remain unchanged. No fresh runtime tests, physical measurements or installation
approval are claimed by this planning document.

## Reconciliation with current implementation — 2026-10-17

Reviewed repository snapshot: `main` `e18d3a8505533e1767a711ae05c27da5814385c8`.
The original upstream evidence and acceptance criteria above are retained. The browser
bassline is now integrated (PR #21), Pages module packaging is corrected (PR #22), and
the latest UI shows bass notes persistently with its own BASS FLIP control. Thus the
focus-change criterion above now applies to any remaining concept/native focus paths
and future track controls; it does not request restoring the removed browser toggle.
These developments do not complete native bass parity or the Workbench follow-ups.

### Existing regression coverage and remaining gaps

Source inventory, not a new test-run result. Reuse these tests before adding fixtures.

| Planned concern | Existing coverage in reviewed main | Still required |
| --- | --- | --- |
| 1a: balanced releases and bounded voices | `tests/voice_test.c`: gate expiry, timestamp wrap, duplicate-pitch groups, group replacement, STOP and 100,000 groups with balanced on/off; `tests/device_test.c`: bounded events and STOP panic callback | Actual browser/native track/channel/sent-pitch ownership under same-pitch chord/bass overlap, transpose, sustain, rapid restart and sound changes; a panic callback count alone does not prove released hardware voices |
| 1a: bass timing and loop seam | `tests/bass-track.test.mjs`: 1,728 legacy playback comparisons, quality/role repair, bounded monophony, tempo changes and seam; `tests/bass-generator.test.mjs`: seeded generation, chord-tone/register constraints and repeat FLIPs | Cross-track release ownership during transport and parameter transitions; current tests compare note intent, not physical note-off delivery |
| 1b: sound preparation | `tests/dx7-presets.test.mjs`: preset DSP/panic, asynchronous engine load/switch/reset, stale context rejection and fallback | Ordered sound preparation before **every** chord member and simultaneous chord/bass start, including delayed load/change; native part contexts and combined budget; external target-specific transport latency |
| 2: musical event fixtures | `tests/midi-export.test.mjs`: independent byte-level MIDI decoder, tempo, HOLD/PULSE/ARP, strum/swing, balanced gates and separate bass channel/model; `tests/performance.test.mjs`: octave shift includes chord and bass; `tests/core_test.c` and `tests/device_test.c`: separate C invariants | One shared deterministic fixture corpus driving browser and native normalized event lists, including loop seam, STOP and sound changes. Separate JS/C tests do not establish cross-language parity |
| Browser integration guard | `tests/pages-artifact.test.mjs`: entrypoint/bootstrap dependencies; `tests/bass-stage.test.mjs`: resolved note labels/octaves/beats; `tests/color-block-ui.test.mjs`: bass panel/control and contrast assertions | Real deployed-browser startup/audio and accessible mobile review; packaging/DOM stubs do not prove listening quality |
| Persistence and native baseline | `tests/store_test.c`: interrupted-write simulation, CRC/version and sequence wrap; `tests/overlay_preflight.test.py`: source-pin refusal; native workflow: FX/SLICER zero-BPM guards and host regression before/after overlay | Physical flash/restore, actual FM1 resources and recovery; broad timebase/clock cases and MIDI parser fixtures from PR #17 remain separate backlog items |

### Compatibility with independent ecosystem research (PR #17)

Compared against [PR #17](https://github.com/Taorminator/chordon-bleu/pull/17), head
`56eb7b15d2d56074dd228575402758c69beb8e91`, still an independent draft at this review.
Its research derives from the firmware ecosystem and reverse-engineering sources;
this document derives from the pinned Workbench source above. Neither replaces the other.

- Both prioritize reliable note ownership/release, bounded chord/bass behavior and exact-commit pre-/post-overlay checks before more FM1 features.
- PR #17 additionally prioritizes timebase/zero-BPM coverage, offline MIDI parser validation, persistence, partition/resource evidence and recovery. Existing FX/SLICER workflow guards are partial progress, not completion of that wider timebase backlog.
- Workbench adds the specific sound-before-all-notes ordering requirement and shared musical event vectors. Keep 1a, then 1b, then 2; any failing baseline safety regression is a prerequisite blocker. Sound mutation stays later.
- PR #17's historical PR numbers/next steps are not treated as current merge instructions. Its contents and branch are unchanged by this reconciliation.
- Physical audio verification remains separate from software checks. Preserve source provenance, licensing review, actual-unit flash-layout evidence, backup/restore and explicit release gates. No firmware, installer, hardware intervention or FM-XY changes are authorized here.
