/* SPDX-License-Identifier: GPL-3.0-only
 * Four-voice note gate scheduler for Felucca track integration.
 * Invoke from one audio/control context. The HAL adapter must marshal
 * changes between interrupt domains safely.
 */
#ifndef CB_VOICE_H
#define CB_VOICE_H
#include <stdint.h>
typedef struct {void *user;void (*on)(void*,uint8_t,uint8_t);void (*off)(void*,uint8_t);} CbVoiceOut;
typedef struct {uint8_t n,note[4];uint32_t deadline;CbVoiceOut output;} CbVoice;
void cb_voice_init(CbVoice *v,CbVoiceOut io);
void cb_voice_group(CbVoice *v,const uint8_t *notes,uint8_t n,uint16_t gate_ms,uint32_t now_ms);
void cb_voice_tick(CbVoice *v,uint32_t now_ms);
void cb_voice_stop(CbVoice *v);
#endif
