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
 puts("PASS minimal native chord init, isolated variations, inverse turns and undo");return 0;
}
