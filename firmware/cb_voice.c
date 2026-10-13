/* SPDX-License-Identifier: GPL-3.0-only */
#include "cb_voice.h"
#include "cb_libc.h"
void cb_voice_init(CbVoice *v,CbVoiceOut io){memset(v,0,sizeof(*v));v->output=io;}
void cb_voice_stop(CbVoice *v){
 for(unsigned i=0;i<v->n;i++)if(v->output.off)v->output.off(v->output.user,v->note[i]);
 v->n=0;
}
void cb_voice_group(CbVoice *v,const uint8_t *notes,uint8_t n,uint16_t gate_ms,uint32_t now){
 cb_voice_stop(v);
 if(!notes||n>4||!n||!gate_ms)return;
 for(unsigned i=0;i<n;i++){
  if(notes[i]>127)continue;
  unsigned dup=0;for(unsigned j=0;j<v->n;j++)dup+=(v->note[j]==notes[i]);
  if(dup)continue;
  v->note[v->n++]=notes[i];
  if(v->output.on)v->output.on(v->output.user,notes[i],100);
 }
 v->deadline=now+gate_ms;
}
void cb_voice_tick(CbVoice *v,uint32_t now){
 if(v->n&&(int32_t)(now-v->deadline)>=0)cb_voice_stop(v);
}
