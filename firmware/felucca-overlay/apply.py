#!/usr/bin/env python3
"""Experimental opt-in CHORDON BLEU overlay on a pinned Felucca checkout.
It does not create a releasable firmware. Install/release is DISABLED.
Usage: python3 firmware/felucca-overlay/apply.py /path/to/Felucca
"""
from pathlib import Path
import sys
import shutil

PIN = "9f6a8858afd71b4faed9dfea3a5f94d3ecfdf002"
if len(sys.argv) != 2:
    raise SystemExit("usage: apply.py FELUCCA_CHECKOUT")
repo = Path(__file__).resolve().parents[2]
upstream = Path(sys.argv[1]).resolve()
if not (upstream / "firmware/src/felucca.c").is_file():
    raise SystemExit("not a Felucca checkout")
ch = upstream / "firmware/src/chordon"
if ch.exists():
    raise SystemExit("already patched")
shutil.copytree(repo / "core", ch / "core")
(ch / "firmware").mkdir(parents=True, exist_ok=True)
for f in ("cb_fm1.c", "cb_fm1.h", "cb_libc.h", "cb_voice.c", "cb_voice.h", "cb_store.c", "cb_store.h"):
    shutil.copy2(repo / "firmware" / f, ch / "firmware" / f)
shutil.copy2(repo / "firmware/felucca-overlay/chordon_platform.c", ch / "platform.c")

def patch(path, old, new):
    p = upstream / path
    source = p.read_text()
    if source.count(old) != 1:
        raise SystemExit(f"Expected exactly one Felucca 1.5.6 anchor in {path}: {old!r}; got {source.count(old)}")
    p.write_text(source.replace(old, new))

fel = upstream / "firmware/src/felucca.c"
anchor = '#include "master.c"              /* the MASTER pot (#137: read before the audio starts) */\n#include "main.c"'
if fel.read_text().count(anchor) != 1:
    raise SystemExit("Felucca include order changed; refusing to patch")
includes = '''#include "master.c"              /* the MASTER pot (#137: read before the audio starts) */
/* CHORDON BLEU experimental application using Felucca's hardware and audio core. */
#define CB_FREESTANDING 1
#include "chordon/core/chordon_harmony.c"
#include "chordon/firmware/cb_fm1.c"
#include "chordon/firmware/cb_voice.c"
#include "chordon/firmware/cb_store.c"
#include "chordon/platform.c"
#include "main.c"'''
fel.write_text(fel.read_text().replace(anchor, includes))

main = "firmware/src/main.c"
patch(main, '    draw_splash();                                      /* ui_draw.c (1.1.5) */',
      '    lcd_fill(0, 0, 240, 240, 0x0844u);\n    draw_text_line(16, 108, 208, &AF_M, "CHORDON BLEU", 0xffffu, 0x0844u, 1);')
patch(main, "    felucca_init();\n    master_boot();",
      "    felucca_init();\n    chordon_init();\n    master_boot();")
patch(main, "    autosave_boot(boot_clean);                /* (1.2) the last session's music, under the splash */",
      "    /* Never restore or overwrite another Felucca installation's project. */")
patch(main, "        ui_input();\n        settings_poll();",
      "        chordon_input();\n        settings_poll();")
patch(main, "        autosave_poll();                              /* (1.2) the music, stopped and idle: project.c */",
      "        /* No Felucca project-autosave writes from experimental CHORDON mode. */")
patch(main, "        ui_leds();\n        ui_draw();",
      "        ui_leds();\n        chordon_draw();")
patch(main, "            ui_input();\n#if FELUCCA_OTA",
      "            chordon_input();\n#if FELUCCA_OTA")
print(f"CHORDON BLEU experimental native overlay staged: Felucca {PIN}. NOT INSTALLABLE.")
