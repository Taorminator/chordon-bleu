# FM1 firmware ecosystem — research and port/test implications

**Research snapshot:** 2026-10-16. **Status:** reference and test plan; not a device-validation report, compatibility certificate, firmware import or release approval.

## Sources and confidence
- Community index and reverse engineering: [aroum/fm1-custom-fw](https://github.com/aroum/fm1-custom-fw) ([README](https://github.com/aroum/fm1-custom-fw/blob/main/README.md), [reverse engineering](https://github.com/aroum/fm1-custom-fw/blob/main/REVERSE_ENGINEERING.md)). Its firmware descriptions, hardware claims and URLs are **third-party claims**, not automatically verified.
- Primary projects inspected separately: [Felucca](https://github.com/hugelton/Felucca), [FoMni](https://github.com/charlesvestal/fm1-fomni), [ChoralRoot FM1](https://github.com/Quixotic7/ChoralRootFM1), [fm1-chord](https://github.com/math0ne/fm1-chord), [SLOOP](https://github.com/isod89/sloop-fm1), [FM-1-RE](https://github.com/AL-255/FM-1-RE), [MvaveFM1Unbricker](https://github.com/Quixotic7/MvaveFM1Unbricker), [FM-1 Transporter](https://github.com/kurogedelic/FM-1-transporter).
- A linked [Reddit short URL](https://www.reddit.com/r/MVaveFM1/s/upmKL45g0W) could not be resolved at review time; do **not** claim to have read its exact post or comments.
- The index claims that M-VAVE briefly published `m-vave/fm1_open` and a WASM workbench in October 2026; that repository currently returns 404. Treat mirrors, licensing and firmware provenance as **unverified**, and do not silently add them as build dependencies.

## Useful design and porting patterns (not new feature commitments)

| Reference | Relevant demonstrated/project-documented idea | CHORDON BLEU use |
| --- | --- | --- |
| [FoMni](https://github.com/charlesvestal/fm1-fomni) | White-key strumplate, black-key chord selection, rhythm with auto-bass, four knobs per page | Evaluate an optional immediate PLAY/STRUM mapping, keep manual root and quality independent; minimize menus |
| [ChoralRoot FM1](https://github.com/Quixotic7/ChoralRootFM1) | Root/voicing separation, performance bassline, looper; browser emulator of firmware | Research bass/chord note ownership and voice-leading, not wholesale import of its controls |
| [fm1-chord](https://github.com/math0ne/fm1-chord) | Diatonic one-touch chords, inversions, slash bass, chord-label feedback | Reference for root/type/voicing choice and harmonically linked second track |
| [SLOOP](https://github.com/isod89/sloop-fm1) | Live performance, clock synchronization, MIDI routing, backup/restore, sequencer output | Test transport/sustain/note-off and MIDI compatibility; do not copy its groovebox complexity or assume dual-core safe |
| [Felucca](https://github.com/hugelton/Felucca) | Existing panel, audio, project and update services | Keep the **pinned** native integration baseline, compare regressions before/after overlay |
| [AL-255/FM-1-RE](https://github.com/AL-255/FM-1-RE) | Source-backed analysis of USB-MIDI OTA framing, CPU and partition behavior; offline protocol tests | Reference when creating **offline-only** MIDI packet/parser tests, never infer safe flashing from protocol docs |
| [MvaveFM1Unbricker](https://github.com/Quixotic7/MvaveFM1Unbricker), [FM-1 Transporter](https://github.com/kurogedelic/FM-1-transporter) | Community ROM UBOOT recovery, full-flash backups, optional RP2040 USB-key route | Inform the physical recovery acceptance plan; **do not invoke** these tools or wire hardware without approval |

## Concrete test backlog (priority order)

**P0 — host/native regressions before more FM1 features**
1. Timebase: `G_BPM = 0`, min/max BPM, external-clock not yet measured, tempo switch/wrap. Specifically cover Felucca `fx.c` and `slicer.c` zero-BPM divisions plus any other tempo-derived denominators. Host UBSan/ASan should fail on undefined behavior.
2. MIDI/note ownership: every note-on has a corresponding note-off; overlapping same pitch across chord/bass tracks, track switch, ARP on/off, sustain press/release, stop/restart, live REC and voice-stealing do not leave held notes.
3. Four chord slots + bass: note range 0–127, invalid root/type rejected, deterministic seed and locked root/type, bass synchronized to the selected chord and intentionally independent rhythm, no unexpected extra voices.
4. Repeat existing Felucca baseline **before** overlay and regression **after** overlay on same pin; check the exact SHA. Keep skipped Emscripten emulator tests marked skipped, not green.

**P1 — protocol and release-gate simulations (offline first)**
5. MIDI SysEx parser/packer **fixtures**: reject bad manufacturer/product identifiers, truncated/chunk-reordered packets, length overflow, malformed 7-bit payload, checksum mismatch, wrong device/firmware identities, unexpected acknowledgments and timeout/retry failures. Validate observed packet format against pinned Felucca or captured documentation; the aroum flasher explicitly calls its own direct-write mode **experimental/non-functional**, so never reuse it as an installer.
6. Persistent SAVE mock: versioned records, CRC checks, two slots, interrupted writes, rollback and migration; no assumption that a passing mock means hardware flash is safe.
7. Target resource checks: pi32v2 cross-build, binary size, static RAM, worst-case voice allocation, LCD 240×240 draw bounds; obtain real CPU load/audio latency/SPI timing via physical tests before release.
8. Recovery/read-only preflight: verify exact firmware/build/partition metadata, backup provenance and checksums, immutable pinned source, absence of any binary artifact publication or flash command in CI.

**P2 — eventually physical acceptance (explicit user authorization required)**
9. Validate buttons/encoders, speaker/headphones, USB/TRS MIDI, clock, 60-minute audio soak, cold boots, safe-mode recovery, power-loss and verified **full flash backup + tested restore** on a dedicated FM1.
10. Measure active clock, watchdog behavior, flash layout and preserved calibration/user partitions per *actual FM1 unit*. Do not extrapolate SMK-37 calibration regions to FM1.

## Critical evidence gaps and conflicts
- The community reverse-engineering page contains **generic 4/8 MB JieLi flash-capacity guidance**, whereas FM1-focused unbricker/transporter documentation specifically describes a **1 MiB FM1 flash**. These are NOT interchangeable; device-specific reads and pinned Felucca layout win. Never hard-code generic addresses from the index for CHORDON flash writes.
- ROM `WL82 UBOOT1.00` (VID:PID 4c4a:8057) is a *possible* recovery state, **not a guarantee** that a bricked FM1 enumerates or can safely recover. The RP2040 approach is a separate hardware risk/approval decision.
- Boot PLL/CPU clock must remain as initialized by Felucca's pinned path. No new retuning, additional core startup, unreviewed bootloader patch, USB update implementation, flashing instruction or installable image.
- Different firmware families may be GPL-3.0 or other licenses and may include separately licensed assets. **Research behavior and tests first; no source or preset copying** without license/provenance review.
- A successful experimental Felucca image build and host tests are **not** completed FM1 integration/hardware certification.
- Avoid feature creep: CHORDON BLEU remains a small, playful four-chord/harmonically-linked-bass instrument, not an 8/10-track DAW.

## What to do next
1. Finish current safety PRs (#2 then #3) only after their exact-head CHORDON and native CI are green; rerun on merged `main`.
2. Introduce **one** narrow offline native test at a time (first: `G_BPM == 0` across tempo-dependent paths), re-run both CI workflows, document exact branch/commit/run.
3. Keep [FM1 acceptance gates](FM1_ACCEPTANCE.md), [architecture](ARCHITECTURE.md) and [project state](PROJECT_STATE.md) authoritative for actual verified progress.

**Release remains locked.** No firmware binary, installer enablement, flash write, hardware intervention, or edits to FM-XY/browser demo are authorized by this research.
