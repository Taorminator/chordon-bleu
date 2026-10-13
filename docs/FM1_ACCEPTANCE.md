# FM1 acceptance gates

Status: PRE-RELEASE / NOT INSTALLABLE. A successful compiler run is necessary but NOT sufficient.

| Gate | Pass criteria | Status as of 2026-10-13 |
| --- | --- | --- |
| Browser prototype | Playback, SAVE/UNDO, RECIPES, FLIP, ARP, mobile UI | Automated tests pass |
| Portable C | ASan/UBSan, fuzz, locks, no hanging notes, bounded drawing | Automated host tests pass |
| JieLi target | CHORDON modules compile on pi32v2 | Pass |
| Felucca integration | Full native image links with CHORDON hardware adapters | Experimental build compiled |
| Baseline Felucca regression | Pinned Felucca suite passes unmodified | Pending latest full result |
| Integrated regressions | Hardware-relevant tests pass after integration; changed UI has new golden tests | Pending |
| Performance | Confirm audio CPU/RAM limits and SPI LCD draw budget on real FM1 | Not measured |
| Hardware operation | Verify keys, encoders, 4 chord pads, ARP, audio, USB/MIDI and 60-min soak | Not tested |
| Durable SAVE | Physical flash partition mapped, A/B commit protection, power-cut recovery and power-cycle | Simulation only |
| Recovery and updater | Verified backup, USB/OTA/bootguard, rescue and rollback | Not tested |
| Release | SHA256, versioned package, upstream/third-party license notices, user's informed validation | Locked |

## Sequential development rule

1. Resolve failed CI tests using the job logs and narrow fixes; rerun full current commit.
2. Improve physical chord pads and correct note release / voice budget; add regression tests.
3. Integrate SAVE with actual safe NOR storage discovered from the upstream layout; test interrupted writes.
4. Achieve deterministic parity of native FLIP/FEEL/RECIPES with browser behavior.
5. Port live recording and effects and tune 240x240 layouts / drawing cost.
6. Run upstream, native, firmware-to-WASM, MIDI/USB and physical soak tests.
7. Enable install only with verified image, recovery and explicit release approval.

Do NOT enable downloads or Web MIDI flashing based merely on a successful CI compile.
FM-XY remains an independent tool and repo.

## Boot and recovery policy (Melodee 1.3.2 incident)

Required before FM1 flash authorization: leave the bootloader's 360 MHz clock untouched; audit watchdog/CPU1/cache setup and boot-loop fallback on physical hardware; do not add any automatic PLL retune. Keep the bootloader and recovery USB path intact. Prepare a known-good verified stock V15 rollback and full-flash backup, test ROM UBOOT restoration on a dedicated test device, and confirm FLASH + startup + user-data recovery independently. The standalone source guard is not proof of hardware safety.

See [BOOT_RECOVERY_SAFETY.md](BOOT_RECOVERY_SAFETY.md) for the Melodee postmortem, recovery commands, risk matrix and physical acceptance checklist.
