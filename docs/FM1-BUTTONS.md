# FM1 front panel: physical buttons are authoritative

Status: **Browser prototype updated, native partial mapping only; not hardware validated.**

The FM1 has **two horizontal rows of six physical function buttons** to the right of its 240 x 240 LCD. These are **not** twelve freely assignable labels.

| Row | Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 |
| --- | --- | --- | --- | --- | --- | --- |
| Top | FX | SEL | ENV | LFO | EDIT | GLO |
| Bottom | HOME | SAVE | ARP | SEQ | PLAY / STOP | REC |

Additionally, the two left-side hardware buttons are **OCT−** and **OCT+**. They are not REC or SOUND.

The source of truth for printed labels is the physical M-VAVE FM1 panel. In pinned Felucca, the printed **SEL** button is called `B_SCL` internally (legacy scale identifier). This is **different** from the left rotary `SELECT` encoder, which is `EN_SELECT`. Continue reading physical input edges through Felucca's **calibrated** `panel.btn[]` table; do not hardcode matrix indexes.

## CHORDON BLEU mapping

| FM1 key | Browser prototype | Native experimental adapter |
| --- | --- | --- |
| FX | Cycle demo sound | **Pending:** native sound bank picker not implemented |
| SEL (`B_SCL`) | CHORD view, manual ROOT / TYPE | CHORD view |
| ENV | Cycle FEEL: WARM / CRISPY / CHEESY | Cycle FEEL |
| LFO | Cycle MOTION: HOLD / PULSE / ARP | Cycle MOTION |
| EDIT | Toggle FLIP: KEEP 1 / ALL 4 | Toggle KEEP 1 / ALL 4 |
| GLO | RECIPES | RECIPES |
| HOME | HOME | HOME |
| SAVE | Save browser idea to local storage | **RAM-only** snapshot; no physical persistence |
| ARP | ARP view | ARP view |
| SEQ | FLIP progression | FLIP progression |
| PLAY / STOP | Play / pause loop | Play / stop loop, with Panic on stop |
| REC | Browser four-chord capture | **Pending:** no native capture yet |
| OCT− / OCT+ (left) | Keyboard audition octave offset (−2 … +2) | **Pending:** no native keyboard-octave handler yet |

Browser-only convenience controls (PLAY, FLIP, SAVE, KEEP 1, ALL 4, UNDO, and page tabs in the sidebar) are **not** actual printed panel keys. They must not replace or reorder the device's 2×6 grid.

When REC is active in the browser, chord-pad recording is handled by the browser harmony app; complete physical-key capture parity is separate future work. Do **not** use OCT− as a shortcut for UNDO, since that falsely represents a different physical key.

## Firmware implementation and safety

- Panel labels and order above are now a contract tested by `tests/fm1-panel.test.mjs`; the native controller's FEEL/MOTION cycling is exercised by `tests/device_test.c`.
- Actual `B_SCL` mapping, `B_ENV`, `B_LFO`, `B_EDIT` and transport are read through upstream Felucca's calibrated panel matrix in `firmware/felucca-overlay/chordon_platform.c`.
- An unmapped key must stay explicitly pending rather than triggering another unrelated control.
- Keep bootloader system clock, watchdog, flash, USB/MIDI initialization and recoverability unchanged. No releasable firmware may be generated from this prototype; `SAVE` is still **RAM-only** in the physical adapter.
- Before flashing: independent real FM1 hardware button presses (all 12 + OCT−/+), knob order/direction, note-off, REC, USB/MIDI, persistent storage, power-cycle and recovery must be validated.

Upstream mapping: pinned `hugelton/Felucca` `firmware/src/panel.c` at `9f6a8858afd71b4faed9dfea3a5f94d3ecfdf002`.
