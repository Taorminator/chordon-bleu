# CHORDON BLEU — independent FM1 firmware path

**Status: browser prototype only. There is no flashable FM1 firmware.**

## Architecture

CHORDON BLEU and FM-XY are separate instruments. Neither requires the other's source or firmware. The FM1 port may share a third-party foundation, **Felucca**, without depending on FM-XY.

Reference upstream: [hugelton/Felucca](https://github.com/hugelton/Felucca) by Hügelton Instruments / Leo Kuroshita, GPL-3.0-only. Upstream commit checked 2026-10-13: `9f6a8858afd71b4faed9dfea3a5f94d3ecfdf002`. Required JieLi pi32v2 toolchain, AC79 SDK, plus native integration tests are documented in [BUILDING.md](https://github.com/hugelton/Felucca/blob/main/BUILDING.md).

## Keep the musical toy tiny

- PLAY, FLIP and SAVE always immediately accessible.
- A single recipe choice and 4-chord loop; no track mixer, sampler or nested production workflow.
- ROOT and TYPE individually set to AUTO or a fixed choice; KEEP 1 vs ALL 4.
- SPICE controls harmonic surprise; FEEL controls WARM / CRISPY / CHEESY.
- ARP has 4 hardware knobs: RATE, GATE, DIRECTION, ORDER (see FM1-KNOBS.md).
- Color-temperature visuals must be paired with legible chord names and a readable 240x240 layout.

## Port strategy

1. Fork Felucca **in this project's own development lineage**, preserving its history, copyright, GPL and third-party notices. Do not clone FM-XY as a base.
2. Build upstream and execute baseline host tests before editing.
3. Port the harmonization model with deterministic shared JS/C test vectors. The C99 core included here is currently a separate prototype and **does not yet support RECIPES, FEEL or ARP**.
4. Compile recipe JSON into constant C lookup tables to avoid runtime parsing, allocations and filesystem dependencies.
5. Map physical FM1 keys/encoders using Felucca `panel.c`, `ui_input.c`, `seq.c`, `chord.c` and audio infrastructure.
6. Implement versioned recipe and saved-loop storage with migration tests.
7. Test CPU/RAM/flash, voice count, audio latency, contrast, controls, reboot, backup and recovery on a physical FM1 before producing an installable `.fwsc`.

**Never flash the browser HTML or the C host-test binary.** No installer until hardware verification.
