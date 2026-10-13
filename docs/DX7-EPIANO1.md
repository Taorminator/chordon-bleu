# DX7 E.PIANO 1 in CHORDON BLEU (Browser)

The Yamaha DX7 factory preset **E.PIANO 1** is voice **11 (index 10)** in **ROM1A**, algorithm **5** (zero-based value 4). The original FM1 factory preset **PIANO 1** is reported byte-identical to this voice in the FM1 factory-preset provenance analysis.

Sources:
- https://yamahablackboxes.com/collection/yamaha-dx7-synthesizer/patches/
- https://github.com/KingParamount/fm1-factory-presets/blob/main/docs/protocol-and-provenance.md
- https://github.com/asb2m10/dexed

## Browser

1. Choose `DX7 EP · PREVIEW` as the instrument.
2. Choose **ORIGINAL E.PIANO 1 LADEN (.SYX)**.
3. Import **your own** full Yamaha DX7 32-voice `ROM1A.syx` or recovered FM1 factory bank 1 (4104 bytes).
4. The voice is validated (SysEx header, length, checksum, algorithm and name). The selected patch parameters are cached locally in the browser. The Yamaha bank is **not** bundled or uploaded anywhere.
5. A local, six-operator FM AudioWorklet renders it using the MIT-licensed [OpenDX7](https://github.com/keithadler/opendx7) engine, whose own documentation compares output with Dexed/msfa.

The Yamaha original preset parameters are used **only after import**. The built-in `DX7 EP` is a deliberately labeled **two-operator approximation** until then. Some older Safari/WebKit builds may not support loading the six-operator AudioWorklet: in that case the approximation remains audible.

The original hardware's DAC / analog output chain and exact performance controls are not emulated; matching patch parameters and using a DX7-calibrated engine is substantially closer than the built-in approximation, but not a guarantee of bit-identical hardware sound.

## Third-party notices

`vendor/opendx7/dx7-processor.js` and `vendor/opendx7/dx7-patch.js` are copied from Keith Adler's OpenDX7 (MIT, © 2026 Keith Adler). The required license text is at `vendor/opendx7/LICENSE`. No Yamaha ROM patch data is distributed in CHORDON BLEU.
