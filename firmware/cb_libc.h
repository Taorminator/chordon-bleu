/* SPDX-License-Identifier: GPL-3.0-only
 * Felucca's JieLi target is freestanding and supplies libc.c functions
 * with unsigned lengths. Host tests use the standard C library.
 */
#ifndef CB_LIBC_H
#define CB_LIBC_H
#if defined(CB_FREESTANDING)
void *memset(void *dst, int value, unsigned count);
void *memcpy(void *dst, const void *src, unsigned count);
int memcmp(const void *a, const void *b, unsigned count);
#else
#include <string.h>
#endif
#endif
