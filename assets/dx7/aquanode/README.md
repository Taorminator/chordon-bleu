# Aquanode DX7 presets — bundled browser sounds

Source: [Aquanode Soundscapes / Dexed Presets](https://github.com/aquanodemusic/aquanode-soundscapes/tree/f0e59287c9991038f688c5e7457db77117638124/dexed/Dexed%20Presets).
Author: [Aquanode](https://github.com/aquanodemusic), https://aquanode.bandcamp.com.
Pinned upstream commit: `f0e59287c9991038f688c5e7457db77117638124`.
Retrieved 2026-10-15. License: CC0-1.0; original license included in `LICENSE`.

| Local original | Upstream filename |
| --- | --- |
| aquazone.syx | Aquanode Aquazone Dexed Presets.syx |
| presets-1.syx | Aquanode Presets 1.syx |
| presets-2.syx | Aquanode Presets 2.syx |
| presets-3.syx | Aquanode Presets 3.syx |
| presets-4.syx | Aquanode Presets 4.syx |

These five files are unmodified, 4104-byte source banks. Only the author's own
Aquanode banks are included, not the separate Infinite Cycles remakes, MIDI or FL projects.
`tools/build-dx7-presets.mjs` checks bank headers/checksums, records SHA-256 hashes
and creates the local `../aquanode-presets.js` module. No runtime access to GitHub
or external preset services is needed. Six placeholder voices named `Default`
and the malformed voice at zero-based slot 30 (`Klick`) of `presets-3.syx` are
excluded from the selector. That voice contains non-7-bit parameter bytes in the
upstream original; it is retained only in the source bank for provenance and is
not playable through the library. There are **153 selectable presets**.

IDs are bank plus original zero-based slot, e.g. `aquazone:1` (`DX Fast 1`, default).
Names remain the author's names. Banks may contain similar or duplicate sounds.
The generator doesn't normalize or revoice the patch data. Run:

```
node tools/build-dx7-presets.mjs
node tools/build-dx7-presets.mjs --check
node tests/dx7-presets.test.mjs
```

The browser's existing OpenDX7 AudioWorklet renders these parameter patches.
No Yamaha ROM parameters are bundled. Browser rendering is not a claim of exact
Dexed/hardware equivalence or native FM1 support. Unsupported AudioWorklet
browsers explicitly show the existing FM-preview fallback, not the selected preset.
