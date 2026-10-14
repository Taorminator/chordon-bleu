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

## Pending decisions
- Exact hardware test and recovery plan, including a recoverable FM1 unit and validated backup procedure.
- Target CPU/RAM/audio/LCD budgets based on real measurements.
- Prioritization of browser/native recipe parity versus SAVE integration after existing native reliability issues.

Update this record when decisions change; include rationale, date, and commit/issue reference.
