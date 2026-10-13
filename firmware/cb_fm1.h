/* SPDX-License-Identifier: GPL-3.0-only
 * CHORDON BLEU native FM-1 portable application layer.
 * Independent of Felucca HAL; bind to its panel, audio, LCD and storage.
 */
#ifndef CB_FM1_H
#define CB_FM1_H
#include <stdint.h>
#include "../core/chordon_harmony.h"

typedef enum { CB_VIEW_HOME, CB_VIEW_RECIPE, CB_VIEW_CHORD, CB_VIEW_ARP } CbView;
typedef enum { CB_RECIPE_CLASSIC, CB_RECIPE_GHIBLI } CbRecipe;
typedef enum { CB_FEEL_WARM, CB_FEEL_CRISPY, CB_FEEL_CHEESY } CbFeel;
typedef enum { CB_MOTION_HOLD, CB_MOTION_PULSE, CB_MOTION_ARP } CbMotion;
typedef enum { CB_B_PLAY, CB_B_FLIP, CB_B_SAVE, CB_B_HOME, CB_B_RECIPE,
               CB_B_CHORD, CB_B_ARP, CB_B_SELECT, CB_B_KEEP_ALL, CB_B_UNDO } CbButton;

typedef struct {
 CbLoop loop;
 CbLoop undo;
 uint8_t undo_valid;
 uint8_t selected, active, playing, all_four;
 uint8_t recipe, feel, motion, view;
 uint8_t bpm, gate, arp_rate, arp_dir, arp_order;
 uint8_t pattern_index, saved_count;
 uint16_t clock16, arp_clock;
 uint8_t arp_pos;
} CbFM1;

typedef struct {
 void *user;
 /* Draw on a native 240x240 display using Felucca LCD drawing functions. */
 void (*rect)(void*,int,int,int,int,uint16_t);
 void (*line)(void*,int,int,int,int,uint16_t);
 void (*text)(void*,int,int,const char*,uint16_t,uint8_t);
} CbFM1Graphics;

typedef struct {
 void *user;
 /* Nonblocking note scheduler integration; MIDI pitches plus duration in ms. */
 void (*notes)(void*,const uint8_t*,uint8_t,uint16_t,uint8_t);
 /* Called on explicit SAVE. Persist a versioned snapshot outside the audio ISR. */
 void (*save)(void*,const CbFM1*);
 /* Stop any sustained notes on transport STOP. */
 void (*panic)(void*);
} CbFM1Host;

void cb_fm1_init(CbFM1 *m, uint32_t seed);
void cb_fm1_button(CbFM1 *m, CbButton button, const CbFM1Host *host);
void cb_fm1_knob(CbFM1 *m, uint8_t knob, int8_t turn);
void cb_fm1_tick(CbFM1 *m, uint16_t elapsed_ms, const CbFM1Host *host);
void cb_fm1_draw(const CbFM1 *m, const CbFM1Graphics *g);
uint8_t cb_fm1_chord_notes(const CbChord *c, uint8_t *notes); /* up to four notes */
#endif