/* SPDX-License-Identifier: GPL-3.0-only */
#include "cb_store.h"
#include "cb_libc.h"
static void w32(uint8_t *p,uint32_t v){for(unsigned i=0;i<4;i++)p[i]=(uint8_t)(v>>(i*8u));}
static uint32_t r32(const uint8_t *p){uint32_t v=0;for(unsigned i=0;i<4;i++)v|=(uint32_t)p[i]<<(i*8u);return v;}
static uint32_t crc32(const uint8_t *p,unsigned count){
 uint32_t crc=0xffffffffu;
 for(unsigned i=0;i<count;i++){crc^=p[i];for(unsigned b=0;b<8;b++)crc=(crc>>1) ^ (0xedb88320u & (0u-(crc&1u)));}
 return ~crc;
}
void cb_store_encode(uint8_t o[CB_STORE_LEN],const CbFM1 *m,uint32_t seq){
 memset(o,0xff,CB_STORE_LEN);
 o[0]='C';o[1]='B';o[2]='L';o[3]='U';o[4]=CB_STORE_VERSION;
 w32(o+8,seq);
 o[12]=m->loop.key;o[13]=m->loop.minor;o[14]=m->loop.wonder;
 o[15]=m->selected;o[16]=m->recipe;o[17]=m->feel;o[18]=m->motion;
 o[19]=m->bpm;o[20]=m->gate;o[21]=m->arp_rate;o[22]=m->arp_dir;o[23]=m->arp_order;
 o[24]=m->all_four;o[25]=m->view;
 w32(o+28,m->loop.random);
 for(unsigned i=0;i<4;i++){
  const CbChord *c=&m->loop.steps[i];unsigned at=32+4*i;
  o[at]=c->root;o[at+1]=c->quality;o[at+2]=c->lock_root;o[at+3]=c->lock_type;
 }
 w32(o+88,crc32(o,88));
 /* Physical NOR writer programs 0..91, verifies, then commits 92..95 LAST. */
 o[92]='D';o[93]='O';o[94]='N';o[95]='E';
}
int cb_store_decode(const uint8_t in[CB_STORE_LEN],CbFM1 *out,uint32_t *seq){
 if(!in||!out||in[0]!='C'||in[1]!='B'||in[2]!='L'||in[3]!='U'||in[4]!=CB_STORE_VERSION||
    in[92]!='D'||in[93]!='O'||in[94]!='N'||in[95]!='E'||r32(in+88)!=crc32(in,88))return 0;
 CbFM1 m;cb_fm1_init(&m,1);
 m.loop.key=in[12];m.loop.minor=in[13];m.loop.wonder=in[14];
 m.selected=in[15];m.recipe=in[16];m.feel=in[17];m.motion=in[18];
 m.bpm=in[19];m.gate=in[20];m.arp_rate=in[21];m.arp_dir=in[22];m.arp_order=in[23];
 m.all_four=in[24];m.view=in[25];m.loop.random=r32(in+28);
 for(unsigned i=0;i<4;i++){
  CbChord *c=&m.loop.steps[i];unsigned at=32+4*i;
  c->root=in[at];c->quality=in[at+1];c->lock_root=in[at+2];c->lock_type=in[at+3];
 }
 if(!cb_valid(&m.loop)||m.loop.random==0||m.selected>=4||m.recipe>CB_RECIPE_GHIBLI||
   m.feel>CB_FEEL_CHEESY||m.motion>CB_MOTION_ARP||m.bpm<48||m.bpm>160||
   m.gate<15||m.gate>100||m.arp_rate>=4||m.arp_dir>=4||m.arp_order>=4||
   m.all_four>1||m.view>CB_VIEW_ARP)return 0;
 for(unsigned i=0;i<4;i++)if(m.loop.steps[i].lock_root>1||m.loop.steps[i].lock_type>1)return 0;
 m.playing=0;m.active=0;m.clock16=0;m.arp_clock=0;m.arp_pos=0;
 m.undo_valid=0;m.saved_count=0;
 *out=m;if(seq)*seq=r32(in+8);return 1;
}
int cb_store_restore(const uint8_t a[CB_STORE_LEN],const uint8_t b[CB_STORE_LEN],CbFM1 *out,uint8_t *slot,uint32_t *seq){
 CbFM1 first,second;uint32_t sa=0,sb=0;
 const int va=cb_store_decode(a,&first,&sa),vb=cb_store_decode(b,&second,&sb);
 if(!va&&!vb)return 0;
 const int pick_b=vb&&(!va||(int32_t)(sb-sa)>0);
 *out=pick_b?second:first;
 if(slot)*slot=(uint8_t)pick_b;
 if(seq)*seq=pick_b?sb:sa;
 return 1;
}
