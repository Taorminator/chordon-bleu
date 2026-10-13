/* CHORDON BLEU portable musical core - no allocation, libc, audio or hardware dependency.
 * SPDX-License-Identifier: GPL-3.0-only
 * Designed to integrate into Felucca, not yet connected to its HAL.
 */
#ifndef CHORDON_HARMONY_H
#define CHORDON_HARMONY_H
#include <stdint.h>
#define CB_STEPS 4
#define CB_QUALITIES 14

typedef enum {
  CB_MAJOR, CB_MINOR, CB_MAJ7, CB_M7, CB_DOM7, CB_M9, CB_MAJ9,
  CB_ADD9, CB_SUS2, CB_SUS4, CB_SIX, CB_M6, CB_DIM, CB_HALF_DIM
} CbQuality;

typedef struct {
  uint8_t root;       /* chromatic pitch class 0..11 */
  uint8_t quality;    /* CbQuality */
  uint8_t lock_root;  /* nonzero: don't mutate root */
  uint8_t lock_type;  /* nonzero: don't mutate quality */
} CbChord;

typedef struct {
  uint8_t key;        /* tonic 0..11 */
  uint8_t minor;      /* 0 major, 1 minor */
  uint8_t wonder;     /* 0..100 */
  uint32_t random;    /* caller supplies nonzero seed for reproducibility */
  CbChord steps[CB_STEPS];
} CbLoop;

void cb_init(CbLoop *loop, uint8_t key, uint8_t minor, uint32_t seed);
void cb_new(CbLoop *loop);          /* fresh, diatonic 4-chord start */
int cb_mutate(CbLoop *loop);        /* return 1 if progression changed */
int cb_complete(CbLoop *loop);      /* vary unlocked parts to support locked chords */
uint16_t cb_pitch_classes(const CbChord *chord); /* 12 pitch-class bits */
int cb_valid(const CbLoop *loop);
#endif
