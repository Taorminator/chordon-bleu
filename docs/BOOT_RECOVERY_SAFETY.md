# FM1 boot safety and ROM recovery policy

**Status: policy + offline guards only. This is NOT a recovery implementation, physical safety certification or permission to flash.**
Reviewed 2026-10-13 against Melodee v1.3.2 and the CHORDON BLEU main branch.

## Incident and evidence

Melodee 1.3.0 chose **320 MHz by default** and retuned the system PLL before LCD and USB initialization. Some physical FM1 units failed that early retune. A watchdog reboot repeated it, and the boot guard entered ROM **WL82 UBOOT1.00** following consecutive failures. Melodee 1.3.2 reverted to leaving the bootloader's **360 MHz** default untouched. Its 320 MHz choice is optional and adds watchdog/readback/failure fallback protection.

- Release: https://github.com/keremimo/melodee/releases/tag/v1.3.2
- Detailed release note: https://github.com/keremimo/melodee/blob/v1.3.2/docs/RELEASE_1.3.2.md
- User's reproducible soft brick report: https://github.com/keremimo/melodee/issues/35
- PLL implementation and safeguards: https://github.com/keremimo/melodee/blob/v1.3.2/firmware/hal/fm1_clock.h
- Dual-core fault analysis: https://github.com/keremimo/melodee/pull/21

**Do not conclude that every black screen has this cause.** The report and release notes identify the clock retune as this incident's failure mechanism. A successful build, host regression, USB transfer or emulation alone did not prevent it.

## CHORDON BLEU: non-negotiable boot constraints

1. **Do not retune SYS PLL, alter the bootloader-supplied system clock or modify CPU voltage/clock dividers**, including any supposed "safe" 320 MHz default. The bootloader's system-clock configuration is left intact. No `MELODEE_SYS_CLK`, direct PLL writes or copied Melodee overclock routine belongs in our initial target firmware.
2. Keep Felucca's pinned upstream initialization, loader, watchdog, USB/OTA and fault handling unchanged unless a separate hardware-validated change explicitly passes review. In particular, never hide a boot loop by modifying its recovery guard.
3. Conservative initial sound configuration: do not add a second-core or cache-RAM initialization path of our own. Establish **actual** core count, early-boot behavior, watchdog and recovery interaction on physical FM1 first. Falling back to one core must be proven safe rather than assumed.
4. Do not add flash writes during early boot or while in an audio interrupt. Currently `cbh_save` in `firmware/felucca-overlay/chordon_platform.c` stores **only in RAM**. Portable CRC32/A-B snapshots are not a hardware flash implementation.
5. Preserve update/MIDI enumeration and the original ability to enter ROM UBOOT. Do not overwrite a bootloader, chip metadata, factory/calibration data or unknown storage partitions. Determine the actual layout independently for our pinned Felucca revision.
6. Compiler, JieLi cross-build, host tests, emulator, checksum and backup checks are **necessary, not sufficient**. Real power cycling, long audio operation, USB, power cuts and recovery must be measured on representative units before shipping.
7. Do not publish a .fwsc/.bin, enable installer downloads or mark `flashable: true` before human sign-off after physical tests and a successful **full backup plus tested recovery** on a dedicated test unit. Prevent CI artifacts from accidentally becoming downloadable firmware.

The static CI guard (`tests/boot-safety.test.mjs`) protects today's adapter and release manifest against *obvious* clock/bootloader changes. It **does not verify a cross-compiled image's machine code, the upstream Felucca boot path, the actual clock registers or physical recovery**. Changing upstream pinned revision, installer/flash layout, startup code or CPU/core mode requires a separate full audit and target tests.

## Understanding the Melodee 1.3.2 Unbricker

Source: https://github.com/keremimo/melodee/blob/v1.3.2/docs/RECOVERY.md
Code: https://github.com/keremimo/melodee/blob/v1.3.2/tools/fm1_recover.py

This utility works **only when an FM1 is already enumerated by USB as ROM UBOOT**: USB VID:PID `4c4a:8057`, inquiry `WL82 / UBOOT1.00`. It does not turn a running synth into that mode; a completely undetected device may require a separately verified ROM-entry solution/dongle and careful hardware recovery. **Never format the UBOOT mass-storage device.**

The release provides standalone Windows x64, Linux x64, macOS Intel and Apple Silicon executables; install WinUSB only for the ROM device on Windows (not ordinary FM1 MIDI). Read vendor-specific OS permissions from the upstream instructions.

1. Download the matching **v1.3.2** recovery archive and a known-good compatible **.fwsc** firmware file separately; verify published hashes. For official M-VAVE V15 use unmodified `FM-1.fwsc` with SHA-256 `db1642b2b6fa5c2cccb11ffd13878068bb28601678d3644049f99dc40e7edb8a` as documented by Melodee.
2. `fm1-recover --info`: identify the ROM USB device, without loader or flash write.
3. `fm1-recover known-good.fwsc --check`: validate product/chip/layout/checksums **offline**. Stop on any mismatch.
4. `fm1-recover known-good.fwsc`: load the verified RAM helper, read a **complete 1 MiB flash backup**, persist `full-flash-before.bin`, `backup.json` and `retained-ram.bin`. A backup-only run performs no flash write.
5. Only after the backup is safely retained, `fm1-recover known-good.fwsc --write`: take a **new full backup**, restore differing application sectors, verify each and re-read the **whole flash**. Keep the report and backup even after a success.
6. Power-cycle and independently verify that the restored firmware boots, plays audio and handles controls/USB. A successful flash comparison is NOT a boot test.

Melodee's tool protects flash below `0x4000` (bootloader) and at/above `0x93000` (saved data), writing sectors only inside `[0x4000,0x93000)`. These boundaries are **specific to that recovery implementation**; never interpret them as an approved CHORDON BLEU flash-storage allocation. A stock firmware boot may still modify previously saved user data, so an external backup remains mandatory. Failure or USB unplug: preserve original backup and retry only from confirmed ROM mode.

The recovery program is independently developed by Melodee. We do **not** bundle, invoke, redistribute or silently modify it. Its host simulations include power-interruption and protected-region checks, and release executables have native smoke tests; physical end-to-end recovery is not proved for every computer and FM1 revision.

## Physical release gate: evidence to collect

- Exact FM1 hardware revision, source commit, bootloader ID, stock-firmware backup and SHA-256s; attach logs privately and never put a personal flash dump into the public repo.
- Baseline **unmodified** pinned Felucca starts correctly with the original clock and remains recoverable before the CHORDON integration is tested.
- Cold boots, warm restarts, power loss and watchdog recovery on more than one FM1, with repeat tests including audio, screen, encoders, USB/MIDI, and early-boot/second-core fault scenarios.
- Confirm actual SYS clock and whether CPU1/cache RAM is active on hardware. If introducing ANY retuning, require new dedicated hardware safety review rather than relying on these guards.
- Confirm no unexpected writes outside the independently mapped application and allocated saved-data sectors, with power-cut tests at erase/program/commit boundaries.
- Demonstrate full device backup, known-good stock rollback, bootloader/USB recovery and restored user content on test hardware, with exact recovered checksums.
- Independent sign-off before downloadable firmware, installation UI, manifest or release metadata is changed.

**Safety goal:** make the dangerous path hard to enter and recovery possible, not claim that an FM1 can never soft-brick.
