# Harmony contract — coherent exploration, not a scale cage

Date: 2026-10-15. Fachbereich 02 / Music Engine.
Status: **design requirement and researched implementation plan; not implemented**.
Code audit base: `63100795eb0a2b6c2e9038e99544e56ce37f84c7`.

## 1. Product promise and limits

AUTO should propose coherent, immediately playable four-chord loops, including
surprising roots and changes of tonal color. Dissonance is allowed as expressive
color or directed tension, not as an accidental by-product of unchecked randomness.
This is a Western tonal/modal pop, electronic and jazz-informed product default,
not a universal law of music or a guarantee that every listener likes every result.

Root movement, a change of chord quality, temporary tonicization and modulation
are different things. A new root does not by itself mean a new key. A foreign
note is not by itself a mistake. Sharing a scale is not by itself sufficient to
guarantee a convincing progression or a cleanly voiced sound.

Evaluate three distinct layers: simultaneous sonority, directed chord transition,
and whole-loop coherence. A good result must also survive actual voicing, sound
selection and note-release overlap. See sources S1–S8; specific engineering rules,
search limits and defaults below are our design decisions, not published findings.

## 2. Evidence translated into product rules

| Basis | Product consequence | Boundary |
| --- | --- | --- |
| Chords have root, quality and concrete constituent tones (S1) | Derive full pitch-class masks; distinguish a diatonic root from a diatonic chord | Never classify by root alone |
| Tendency tones and functional dissonance depend on context (S2) | Reward directed resolution when a dominant function is claimed | Do not require every seventh, suspension or jazz color to resolve classically |
| Smooth voice leading links changing harmonies (S3) | Preserve common tones where useful; minimize avoidable leaps in identifiable voices | Not the sum of independent nearest-note distances that can map several voices to one target |
| Applied dominants temporarily emphasize another chord (S4) | Permit a chromatic dominant with an identified target | A dominant-seventh quality alone does not prove dominant function |
| Parallel-mode borrowing need not change the key (S5) | Allow curated borrowed-chord routes without changing the home tonic | Do not label every foreign chord a modulation |
| Modulation establishes a new tonal center (S6) | Require contextual evidence for a new center, and evaluate the loop's return | A four-slot loop can be tonally ambiguous; do not overclaim its analysis |
| Pop/rock has its own cyclic schemas (S7) | Support modal/plagal loops as well as functional cadences | Classical parallel-fifth prohibitions are not universal hard rules here |
| Timbre and listening experience affect consonance (S8) | Keep acoustical roughness separate from harmonic function; audition actual sounds | A pitch-class score cannot certify that every FM patch sounds pleasant |

## 3. Non-negotiable constraints and user intent

- Root and quality remain independently manual or AUTO for each slot.
- KEEP 1 preserves the entire selected chord, even if both fields are AUTO.
  Other manual fields remain unchanged. Both-manual chords are not rewritten.
- Existing ALL 4 semantics explicitly reset manual fields and request changes in
  every slot. They do not authorize an incoherent emergency replacement.
- Invalid pitch/quality, out-of-range output and exceeded voice/event capacity
  are rejected independently of any musical score.
- If constraints admit no coherent alternative, retain the previous valid loop
  and report no change. Do not break locks, inject a random root or retry forever.
- Manual choices can intentionally exceed the AUTO vocabulary. Respect them;
  explain unsupported combinations and improve the remaining AUTO slots. With
  all slots fixed, there is no honest guarantee of automatic harmonic coherence.
- Repeated chords, pedal tones, ambiguous centers and modal vamps are legitimate.
  Variety is a preference, never a requirement to replace a good chord with a bad one.

## 4. Harmonic vocabulary and explanations

Start with explicit tables in all twelve transpositions:

| Collection | Triads in degree order | Seventh chords in degree order |
| --- | --- | --- |
| Major | maj, min, min, maj, maj, min, dim | maj7, m7, m7, maj7, 7, m7, m7b5 |
| Natural minor | min, dim, maj, min, min, maj, maj | m7, m7b5, maj7, m7, m7, maj7, 7 |

Natural minor is a baseline, not all of minor-key practice. The raised leading
tone enables V or V7 resolving to i (E7 → Am in A minor); tag this as a contextual
minor dominant rather than pretending G-sharp belongs to natural A minor.
Check extensions as complete note sets: a scale-member root with an added 9th
or 6th can still introduce a foreign pitch. Permit that only through a supported
color/route and suitable voicing, not an accidental scale-membership bonus.

Candidate routes, enabled incrementally:

1. Diatonic functional or curated cyclic/modal schema.
2. Applied dominant with a concrete following major/minor target.
3. Curated parallel-mode borrowing, with entry and exit context.
4. Curated common-tone/chromatic voice-leading transformation with bounded motion.
5. Pivot/direct modulation route with a supported new center and return strategy.

These are alternative explanations, not a requirement that all five apply.
Initially disable unimplemented routes; a chromatic note does not earn acceptance
merely because a large soft score happens to offset its penalty. Avoid a universal
12-by-12 root-compatibility blacklist: quality, voicing, style and direction matter.
Represent accepted explanations with small reason codes for tests/debugging:
`DIATONIC_SCHEMA`, `MODAL_SCHEMA`, `APPLIED_DOMINANT`, `BORROWED_PARALLEL`,
`COMMON_TONE_ROUTE`, `PIVOT_ROUTE`, `MANUAL_OVERRIDE`, `NO_COHERENT_ALTERNATIVE`.
These are proposed semantics, not a new menu or existing C API.

## 5. Tension, voicing and the loop seam

For functional dominant resolution, inspect characteristic tones as well as roots:
G7 → C can move B → C and F → E; E7 → Am can move G-sharp → A and D → C.
The root moving up a fourth is supporting evidence, not sufficient proof.
Use target-aware tendency rules only for routes that claim this function.
Modal dominant-seventh chords, sustained sus chords and maj7 tonic colors may
remain stable in their style; they must not inherit a universal resolution debt.

Keep a separate, conservative voicing cost for register, close dissonant spacing,
voice crossing and excessive jumps. Inspect actual MIDI intervals, not just
interval classes. Root-position Cmaj7 and a wide Cmaj7 can have the same mask
but different texture. Close low-register clusters receive a soft penalty under
an auditioned register policy; no supposedly scientific universal MIDI cutoff.

Under the existing native ceiling, total simultaneous voices remain at most four,
including bass, sustained previous notes and release tails. Ninth chords may omit
the fifth; preserve defining third/seventh and the intended extension when possible.
Do not silently add a fifth bass voice to copy the browser. Sus chords must retain
their defining suspended tone. If voice limits prevent the requested identity,
use a documented supported voicing or decline, rather than silently relabel it.

Optimize the cyclic sequence 1 → 2 → 3 → 4 → 1, not only its first three edges.
Check active release tails/MELT/overdub against the arriving chord as a separate
performance condition. Directed harmonic tension and simultaneous acoustic clashes
are not the same measurement. Arpeggiator notes come from accepted voicings; any
future passing tones need timing and resolution rules of their own.

## 6. Bounded generation architecture (proposed)

1. Read home key, style/recipe, SPICE, FEEL and immutable manual constraints.
2. Generate/tag candidates from supported routes; validate full chord masks.
3. Search bounded whole-loop alternatives, maintaining route/target context.
4. Reject paths with unmet hard constraints or no supported coherent explanation.
5. Select cyclic voicings within the voice ceiling; check transition obligations.
6. Rank accepted paths by tonal/schema support, directed resolution, voice motion,
   color/FEEL, repetition and requested novelty. Use bounded seeded variation only
   among accepted alternatives. Revalidate the selected complete result.
7. Commit atomically with undo, or return unchanged with a reason.

FEEL selects color preferences **inside** the accepted harmonic space; it must not
rewrite chord qualities after validation. SPICE increases supported route variety,
novelty and permissible tension; it never weakens validity or turns off context.
Low SPICE should retain recognizable material; high SPICE may explore explained
borrowing/tonicization, not random unrelated notes. Automatic modulation should be
enabled only once its context/return tests and listening review exist.

Provisional implementation caps, to be measured before adoption: at most 12
shortlisted candidates per slot, beam width 8, four slots, at most 8 voicings per
chord and a fixed retry/work budget. Scan the finite 12-root/native-quality catalog
to build shortlists, preserving forced/manual and required resolution candidates.
If pruning prevents a coherent solution, return no change; do not relax constraints.
The browser's width-55, allocation-heavy search is not the native implementation plan.

Use C99, integer scores, 12-bit masks in uint16_t, fixed buffers, no heap and no
blocking audio-ISR work. Keep harmonic RNG separate from performance RNG so arp
play time cannot alter the next FLIP. Route metadata/temporary contexts need an
explicit versioning decision before changing stored structs. These are proposed
limits, not measured FM1 CPU/RAM/latency guarantees or installation approval.

## 7. Reference cases and acceptance tests to add

Examples below are original design fixtures. They identify a plausible explanation,
not a claim that one progression is objectively best. German B means H; Bb means B.

| Example | Expected explanation / test |
| --- | --- |
| Cmaj7 → Am7 → Dm7 → G7 → repeat | Diatonic loop; G7 → Cmaj7 seam with appropriate guide-tone motion |
| Am7 → Fmaj7 → Cmaj7 → G7 → repeat | Natural-minor palette, including G7 with F-natural; no mandatory G7 → C when used modally |
| Am → Dm → E7 → Am → repeat | Contextual raised leading tone; E7 resolves to Am |
| Cmaj7 → A7 → Dm7 → G7 → repeat | A7 is V/ii; C-sharp → D supports its target |
| C → F → Fm → C → repeat | Parallel borrowing; A → Ab → G can connect the changing quality |
| C → Am → D7 → G → repeat | Am can pivot from C to G; D7 → G suggests G, but four chords alone need not prove permanent modulation; G → C seam checked |
| Dm7 → G7 → Cmaj7 → Cmaj7 → repeat | Legitimate repeated tonic; do not force change just for diversity |
| Cmaj7 → Db7 → F-sharp minor → B-flat major | No acceptance from root validity alone; require a supported complete route/voicing explanation or reject AUTO proposal |
| Unsupported fully manual loop | Preserve exact manual choices; no false coherence claim |

Tests must include all twelve transpositions, both baseline modes, full masks,
independent root/quality locks, KEEP 1, ALL 4 and no-solution atomic fallback.
Check intended routes and guide tones separately from soft numerical scores.
Assert integer score bounds, bounded work, range/voice/event limits, deterministic
seeds, undo and rejection without partial state changes. Test 4 → 1 explicitly.
Use shared JS/C fixtures for the supported common vocabulary; browser-only chord
qualities remain explicitly outside native parity. Test arp RNG isolation and release
overlap at extremes of rate/gate before claiming performance correctness.

Listening review is a separate gate: audition low/medium/high SPICE, all FEELs,
held chords and loop seams with bright FM, piano and soft sustained sounds. Record
patch, register, tempo, release and listener observations. Unit tests certify the
declared model, not aesthetic quality; hardware timing/audio need real FM1 tests.

## 8. Audit findings and safe implementation order

At the audited commit, C `candidate_score()` rewards root-scale membership and
common tones but does not provide the route model above. `cb_complete()` performs
local sequential choices, not a whole-loop search. Native `season()` changes types
after search; ALL 4 has a last-resort root +5 replacement without final harmonic
validation. Browser `harmonicVariation()` searches whole loops but uses soft scoring,
and `voicesForLoop()` does not optimize the cyclic voicing seam. These mechanisms
are prototypes, not implementations of this contract. Existing tests mostly prove
locks/valid notes/change and do not establish the acceptance rules above.

First implementation increment: correct natural-minor VII seventh quality in
`diatonic_type()` (currently maj7 instead of dominant 7), with all-key baseline
mask fixtures. Gmaj7 in A minor is not forbidden music; it is incorrectly labeled
as the automatic diatonic baseline. Next: route-aware validation and bounded
whole-loop selection, then cyclic four-voice voicing. Add one verified increment
at a time; preserve browser/UI and unrelated native work unless explicitly scoped.

## 9. Sources and attribution

Accessed 2026-10-15. Sources are paraphrased; no score, audio or source code copied.
OMT is an authored educational primary text (CC BY-SA 4.0); its strict-style rules
are contextualized here rather than presented as universal laws. The engineering
contract, fixtures and thresholds are our own design synthesis.

- **S1:** Open Music Theory, [Triads and seventh chords](https://openmusictheory.github.io/triads.html): construction, quality and diatonic membership. Our natural-minor table explicitly uses the unraised seventh, separately from functional V in minor.
- **S2:** Open Music Theory, [Tendency tones and functional harmonic dissonances](https://openmusictheory.github.io/tendencyTonesFunctionalDissonances.html): context-dependent tendencies and strict-style resolutions.
- **S3:** Open Music Theory, [Melodic keyboard-style voice-leading](https://openmusictheory.github.io/melodicKeyboardStyle.html): smooth motion and voice-leading goals; strict parallel rules are not adopted as universal constraints.
- **S4:** Open Music Theory, [Applied chords](https://openmusictheory.github.io/appliedChords.html): temporary targets and local tendency tones.
- **S5:** Open Music Theory, [Modal mixture](https://openmusictheory.github.io/modalMixture.html): borrowing from parallel keys; distinction from minor-mode leading-tone practice.
- **S6:** Open Music Theory, [Modulation](https://openmusictheory.github.io/Modulation.html): tonicization, new centers, direct and pivot routes.
- **S7:** Open Music Theory, [Harmony in pop/rock music](https://openmusictheory.github.io/popRockHarmony.html): cyclic schemas and stylistic differences from classical syntax.
- **S8:** Harrison & Pearce (2020), [Simultaneous consonance in music perception and composition](https://pubmed.ncbi.nlm.nih.gov/31868392/), DOI 10.1037/rev0000169: composite perception model. Marjieh et al. (2024), [Timbral effects on consonance disentangle psychoacoustic mechanisms and suggest perceptual origins for musical scales](https://pmc.ncbi.nlm.nih.gov/articles/PMC11258268/): experimental timbre effects; not a validated FM1 runtime classifier.
