#include "../firmware/cb_fm1.h"
#include <assert.h>
#include <string.h>
#include <stdio.h>
int main(void){
 CbFM1 d;cb_minimal_init(&d,1);assert(d.bpm==84&&d.motion==CB_MOTION_HOLD);
 for(unsigned slot=0;slot<4;slot++){
  d.selected=(uint8_t)slot;CbLoop before=d.loop;
  cb_minimal_vary(&d,1);assert(memcmp(&before.steps[slot],&d.loop.steps[slot],sizeof(CbChord)));
  for(unsigned i=0;i<4;i++)if(i!=slot)assert(!memcmp(&before.steps[i],&d.loop.steps[i],sizeof(CbChord)));
  cb_minimal_vary(&d,-1);assert(!memcmp(&before,&d.loop,sizeof(before)));
  for(unsigned i=0;i<100;i++){cb_minimal_vary(&d,1);assert(cb_valid(&d.loop));}
  CbLoop undo=d.undo;cb_fm1_button(&d,CB_B_UNDO,0);assert(!memcmp(&undo,&d.loop,sizeof(undo)));
 }
 cb_minimal_init(&d,1);d.playing=1;d.active=2;d.clock16=714;
 cb_minimal_tempo(&d,1);assert(d.bpm==85&&d.active==2&&d.playing);
 assert(d.clock16==((714u*(120000u/85))/(120000u/84)));
 cb_minimal_tempo(&d,32767);assert(d.bpm==160&&d.clock16<120000u/d.bpm);
 cb_minimal_tempo(&d,-32768);assert(d.bpm==48&&d.clock16<120000u/d.bpm);
 cb_fm1_tick(&d,2500,0);assert(d.active==3);
 puts("PASS minimal native chord init, isolated variations, inverse turns and undo");return 0;
}
