#include "../firmware/cb_store.h"
#include <assert.h>
#include <string.h>
#include <stdio.h>
static uint8_t a[CB_STORE_LEN],b[CB_STORE_LEN],newrec[CB_STORE_LEN];
static void program_copy(uint8_t *slot,const uint8_t *in,unsigned cut){
 memset(slot,0xff,CB_STORE_LEN);
 for(unsigned i=0;i<cut&&i<CB_STORE_LEN;i++)slot[i]&=in[i];
}
int main(void){
 CbFM1 m,r;uint8_t selected;uint32_t seq;
 cb_fm1_init(&m,0x42);m.recipe=CB_RECIPE_GHIBLI;m.loop.wonder=91;m.arp_dir=2;
 m.selected=3;m.bpm=145;m.loop.steps[2].lock_root=1;
 cb_store_encode(a,&m,0xfffffffeu);
 assert(cb_store_decode(a,&r,&seq)&&seq==0xfffffffeu);
 assert(r.selected==3&&r.recipe==CB_RECIPE_GHIBLI&&r.arp_dir==2);
 assert(!r.playing);
 cb_fm1_knob(&m,0,1);cb_store_encode(newrec,&m,0xffffffffu);
 for(unsigned cut=0;cut<CB_STORE_LEN;cut++){
  program_copy(b,newrec,cut);
  assert(cb_store_restore(a,b,&r,&selected,&seq));
  assert(selected==0&&seq==0xfffffffeu);
 }
 program_copy(b,newrec,CB_STORE_LEN);
 assert(cb_store_restore(a,b,&r,&selected,&seq)&&selected==1&&seq==0xffffffffu);
 cb_store_encode(a,&m,0u);
 assert(cb_store_restore(a,b,&r,&selected,&seq)&&selected==0&&seq==0u);
 a[40]^=1u;assert(cb_store_restore(a,b,&r,&selected,&seq)&&selected==1);
 b[4]=2;assert(!cb_store_restore(a,b,&r,&selected,&seq));
 cb_store_encode(b,&m,7u); b[32]=255;
 assert(!cb_store_decode(b,&r,0));
 printf("PASS 96 single-byte power cuts, CRC/version, wraparound, state/voice reset\n");
 return 0;
}
