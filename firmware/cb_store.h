/* SPDX-License-Identifier: GPL-3.0-only
 * Crash-resilient versioned CHORDON BLEU FM1 snapshot format. Pure C99.
 * The Felucca NOR flash adapter must program commit bytes LAST.
 */
#ifndef CB_STORE_H
#define CB_STORE_H
#include <stdint.h>
#include "cb_fm1.h"
#define CB_STORE_LEN 96u
#define CB_STORE_VERSION 1u
#define CB_STORE_COMMIT_OFFSET 92u
void cb_store_encode(uint8_t out[CB_STORE_LEN],const CbFM1 *device,uint32_t sequence);
int cb_store_decode(const uint8_t in[CB_STORE_LEN],CbFM1 *out,uint32_t *sequence);
int cb_store_restore(const uint8_t slot_a[CB_STORE_LEN],const uint8_t slot_b[CB_STORE_LEN],CbFM1 *out,uint8_t *slot,uint32_t *sequence);
#endif
