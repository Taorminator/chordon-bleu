# Integrated DX7 sounds (Browser)

Choose **DX7 · AQUANODE** in PERFORM, then select a named sound. The 153 selectable
presets are bundled locally in five bank groups; no preset download, upload or
third-party network request is required. `Aqua Zone · DX Fast 1` is the default.
SAVE, session restore and exported/imported ideas retain the stable preset ID.
Existing WARM/GLASS/DUSK/GRAND/90s HOUSE sounds and recipe independence remain intact.

The original Aquanode banks are CC0-1.0. See the pinned source, license, SHA-256
manifest and exclusions in [preset provenance](../assets/dx7/aquanode/README.md).
`node tools/build-dx7-presets.mjs --check` verifies the generated local bundle.
Placeholder voices and the malformed `Klick` slot are not offered in the selector.
The published site includes the catalog, parameter banks, engine and license files.

## Audio behavior and verification scope

The existing MIT-licensed [OpenDX7](https://github.com/keithadler/opendx7) AudioWorklet
renders six operators. Initial playback awaits the selected preset and engine.
Changing presets panics/disconnects old nodes, cancels pending note timers and
invalidates obsolete async loads. Each AudioContext registers the processor once.
Unsupported or failed AudioWorklet startup explicitly reports **FM-Preview**;
that two-operator fallback is not the selected Aquanode sound.

Tests render all selectable patches for finite, bounded DSP output and verify
rapid-switch lifecycle, panic, fallback and preset persistence. They do not prove
subjective sound quality, bit-identical Dexed/DX7 reproduction, or real Safari/FM1
behavior. Presets are parameter data, not samples. Native FM1 integration and its
resource/voice budgets are unchanged and require a separate port and verification.

## Optional existing E.PIANO 1 import

The previous import remains under **Eigene E.PIANO 1 laden**. Users who want the
specific Yamaha factory E.PIANO 1 can still import their own complete ROM1A or
matching FM1 bank (4104 bytes). Header/checksum and preset identity are checked.
No Yamaha ROM patch data is distributed here. A previously stored user patch is
retained and selectable as **Eigene · E.PIANO 1**. Exported ideas store only its
`user` identifier, not private patch data; another browser needs its own import.

Factory preset provenance references:
- https://yamahablackboxes.com/collection/yamaha-dx7-synthesizer/patches/
- https://github.com/keithadler/opendx7

`vendor/opendx7/dx7-processor.js` and `dx7-patch.js` retain their MIT license
(© 2026 Keith Adler); required text remains at `vendor/opendx7/LICENSE`.
Aquanode patch licensing is separate from the engine license and project GPL.
