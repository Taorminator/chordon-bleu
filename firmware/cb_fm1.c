/* SPDX-License-Identifier: GPL-3.0-only
 * The exact 240x240 device rendering and instrument control prototype.
 * No heap, floating point, OS calls, or hardware assumptions in this layer.
 */
#include "cb_fm1.h"
#include <string.h>

#define RGB(r,g,b) ((uint16_t)((((r)&248)<<8)|(((g)&252)<<3)|((b)>>3)))
#define C_BG RGB(9,14,32)
#define C_TEXT RGB(246,247,253)
#define C_MUT RGB(147,162,197)
#define C_DARK RGB(24,35,66)
static const uint16_t COLOR[6] = {
 RGB(70,87,255),RGB(113,100,255),RGB(166,106,227),
 RGB(214,106,162),RGB(250,128,120),RGB(255,173,83)
};
static const char* const NAMES[12]={"C","C#","D","D#","E","F","F#","G","G#","A","A#","B"};
static const char* const TYPES[CB_QUALITIES]={"MAJ","MIN","MAJ7","M7","7","M9","MAJ9","ADD9","SUS2","SUS4","6","M6","DIM","M7b5"};
static const uint8_t INTERVALS[CB_QUALITIES][4]={
 {0,4,7,255},{0,3,7,255},{0,4,7,11},{0,3,7,10},
 {0,4,7,10},{0,3,10,14},{0,4,11,14},{0,4,7,14},
 {0,2,7,255},{0,5,7,255},{0,4,7,9},{0,3,7,9},
 {0,3,6,255},{0,3,6,10}
};
static const uint8_t GHIBLI[8][4][2]={
 {{5,CB_MAJ9},{4,CB_M7},{9,CB_M9},{7,CB_SUS4}},
 {{0,CB_MAJ9},{7,CB_SUS4},{9,CB_M9},{5,CB_MAJ7}},
 {{9,CB_M9},{5,CB_MAJ7},{2,CB_M7},{7,CB_SUS4}},
 {{4,CB_M7},{5,CB_MAJ9},{0,CB_ADD9},{7,CB_SUS4}},
 {{5,CB_MAJ7},{5,CB_M6},{0,CB_MAJ9},{7,CB_SUS4}},
 {{0,CB_MAJ9},{10,CB_MAJ7},{5,CB_MAJ9},{7,CB_SUS4}},
 {{4,CB_M7},{9,CB_DOM7},{2,CB_M9},{7,CB_SUS4}},
 {{0,CB_MAJ9},{2,CB_MAJOR},{4,CB_M7},{5,CB_MAJ9}}
};
static int imod(int x,int n){x%=n;return x<0?x+n:x;}
static uint32_t rand32(CbFM1 *m){uint32_t x=m->loop.random?m->loop.random:1u;
 x^=x<<13;x^=x>>17;x^=x<<5;m->loop.random=x;return x;}
static void seed_recipe(CbFM1 *m){
 if(m->recipe==CB_RECIPE_CLASSIC){cb_new(&m->loop);return;}
 int pick=(int)(rand32(m)%8u); m->pattern_index=(uint8_t)pick;
 /* Music-theory reference palette, not transcriptions or melodies. */
 for(int i=0;i<4;i++){
  m->loop.steps[i].root=(uint8_t)((m->loop.key+GHIBLI[pick][i][0])%12);
  m->loop.steps[i].quality=GHIBLI[pick][i][1];
  m->loop.steps[i].lock_root=0;m->loop.steps[i].lock_type=0;
 }
}
void cb_fm1_init(CbFM1 *m,uint32_t seed){
 memset(m,0,sizeof(*m));cb_init(&m->loop,0,0,seed);
 m->bpm=92;m->gate=62;m->arp_rate=2;m->view=CB_VIEW_HOME;
}
static void save_undo(CbFM1 *m){m->undo=m->loop;m->undo_valid=1;}
static void mutate(CbFM1 *m){
 save_undo(m);
 if(m->all_four){
  /* ALL 4 explicitly overrides root/type locks, as in the browser. */
  CbChord old[4];memcpy(old,m->loop.steps,sizeof(old));
  for(int i=0;i<4;i++)m->loop.steps[i].lock_root=m->loop.steps[i].lock_type=0;
  if(m->recipe==CB_RECIPE_GHIBLI){seed_recipe(m);}else{cb_new(&m->loop);}
  for(int i=0;i<4;i++)if(old[i].root==m->loop.steps[i].root&&old[i].quality==m->loop.steps[i].quality)
    {CbLoop temp=m->loop;temp.steps[i].lock_root=temp.steps[i].lock_type=0;
     /* Try another musical candidate. */
     cb_mutate(&temp);if(temp.steps[i].root!=old[i].root||temp.steps[i].quality!=old[i].quality)m->loop.steps[i]=temp.steps[i];}
 }else{
  /* KEEP 1 means the actual selected chord is protected, even if AUTO. */
  CbChord keep=m->loop.steps[m->selected];
  m->loop.steps[m->selected].lock_root=1;m->loop.steps[m->selected].lock_type=1;
  cb_complete(&m->loop);
  m->loop.steps[m->selected]=keep;
  if(m->recipe==CB_RECIPE_GHIBLI){
   /* A gentle native Ghibli-like bias for available chords. */
   for(int i=0;i<4;i++)if(i!=m->selected&&!m->loop.steps[i].lock_type){
    uint8_t q=m->loop.steps[i].quality;
    if(q==CB_MAJOR)m->loop.steps[i].quality=CB_ADD9;
    else if(q==CB_MINOR)m->loop.steps[i].quality=CB_M9;
   }
  }
 }
}
/* Host emits at note boundaries. The control task should call tick every 1-10 ms.
 * Four notes maximum: avoids exceeding Felucca's shared voice ceiling.
 */
static uint8_t note_hits(const CbFM1 *m){
 return m->motion==CB_MOTION_ARP?(uint8_t)(2u<<m->arp_rate):
        m->motion==CB_MOTION_PULSE?2u:1u;
}
static void cb_emit(CbFM1 *m,const CbFM1Host *host,uint8_t hit){
 if(!host||!host->notes)return;
 uint8_t notes[4];const CbChord *c=&m->loop.steps[m->active];
 uint8_t n=cb_fm1_chord_notes(c,notes);if(n==0)return;
 uint8_t hits=note_hits(m);
 if(m->motion==CB_MOTION_ARP){
  uint8_t order[4]={0,1,2,3},chosen=0;
  if(m->arp_order==1){ /* root is already first in the pitch-sorted template */ }
  else if(m->arp_order==2){order[0]=0;order[1]=n-1;order[2]=1;order[3]=n>3?2:0;}
  else if(m->arp_order==3){
   uint8_t fifth=0;
   for(int i=0;i<n;i++)if((notes[i]%12)==((c->root+7)%12))fifth=(uint8_t)i;
   for(int i=0;i<n;i++)order[i]=(uint8_t)((fifth+i)%n);
  }
  uint8_t i=hit;
  if(m->arp_dir==1)i=(uint8_t)(n-1-(hit%n));
  else if(m->arp_dir==2&&n>1){uint8_t cycle=(uint8_t)(n*2-2);i=(uint8_t)(hit%cycle);if(i>=n)i=(uint8_t)(cycle-i);}
  else if(m->arp_dir==3)i=(uint8_t)(rand32(m)%n);
  chosen=notes[order[i%n]];notes[0]=chosen;n=1;
 }
 uint16_t slot_ms=(uint16_t)(120000u/m->bpm/hits);
 uint16_t gate_ms=(uint16_t)((uint32_t)slot_ms*m->gate/100u);
 if(gate_ms<12)gate_ms=12;
 host->notes(host->user,notes,n,gate_ms,m->motion==CB_MOTION_ARP);
}
void cb_fm1_button(CbFM1 *m,CbButton button,const CbFM1Host *host){
 switch(button){
 case CB_B_PLAY:m->playing=!m->playing;m->clock16=0;if(m->playing){m->active=0;cb_emit(m,host,0);}else if(host&&host->panic)host->panic(host->user);break;
 case CB_B_FLIP:mutate(m);break;
 case CB_B_SAVE:if(host&&host->save)host->save(host->user,m);m->saved_count++;break;
 case CB_B_HOME:m->view=CB_VIEW_HOME;break;
 case CB_B_RECIPE:m->view=CB_VIEW_RECIPE;break;
 case CB_B_CHORD:m->view=CB_VIEW_CHORD;break;
 case CB_B_ARP:m->view=CB_VIEW_ARP;m->motion=CB_MOTION_ARP;break;
 case CB_B_SELECT:m->selected=(uint8_t)((m->selected+1)%4);break;
 case CB_B_KEEP_ALL:m->all_four=!m->all_four;break;
 case CB_B_UNDO:if(m->undo_valid){m->loop=m->undo;m->undo_valid=0;}break;
 }
}
void cb_fm1_knob(CbFM1 *m,uint8_t knob,int8_t turn){
 int dir=turn>0?1:turn<0?-1:0;if(!dir||knob>3)return;
 if(m->view==CB_VIEW_ARP){
  if(knob==0)m->arp_rate=(uint8_t)imod(m->arp_rate+dir,4);
  if(knob==1){int g=m->gate+5*dir;m->gate=(uint8_t)(g<15?15:g>100?100:g);}
  if(knob==2)m->arp_dir=(uint8_t)imod(m->arp_dir+dir,4);
  if(knob==3)m->arp_order=(uint8_t)imod(m->arp_order+dir,4);
 }else if(m->view==CB_VIEW_RECIPE){
  if(knob==0){m->recipe=(uint8_t)imod(m->recipe+dir,2);save_undo(m);seed_recipe(m);}
  if(knob==1)m->feel=(uint8_t)imod(m->feel+dir,3);
  if(knob==2){int n=m->loop.wonder+5*dir;m->loop.wonder=(uint8_t)(n<0?0:n>100?100:n);}
 }else if(m->view==CB_VIEW_CHORD){
  CbChord *c=&m->loop.steps[m->selected];
  if(knob==0){int n=c->lock_root?c->root+1:0;n=imod(n+dir,13);c->lock_root=n>0;if(n>0)c->root=(uint8_t)(n-1);}
  if(knob==1){int n=c->lock_type?c->quality+1:0;n=imod(n+dir,CB_QUALITIES+1);c->lock_type=n>0;if(n>0)c->quality=(uint8_t)(n-1);}
  if(knob==2)m->selected=(uint8_t)imod(m->selected+dir,4);
  if(knob==3)m->all_four=!m->all_four;
 }else{
  if(knob==0){int n=m->loop.wonder+5*dir;m->loop.wonder=(uint8_t)(n<0?0:n>100?100:n);}
  if(knob==1)m->feel=(uint8_t)imod(m->feel+dir,3);
  if(knob==2)m->motion=(uint8_t)imod(m->motion+dir,3);
  if(knob==3){int n=m->bpm+4*dir;m->bpm=(uint8_t)(n<48?48:n>160?160:n);}
 }
}
uint8_t cb_fm1_chord_notes(const CbChord *c,uint8_t *notes){
 if(!c||!notes||c->quality>=CB_QUALITIES)return 0;
 uint8_t n=0;for(int i=0;i<4;i++)if(INTERVALS[c->quality][i]!=255)
  notes[n++]=(uint8_t)(48+c->root+INTERVALS[c->quality][i]);
 return n;
}
void cb_fm1_tick(CbFM1 *m,uint16_t elapsed_ms,const CbFM1Host *host){
 if(!m->playing)return;
 const uint16_t step_ms=(uint16_t)(120000u/m->bpm);
 const uint8_t hits=note_hits(m);
 uint32_t remaining=elapsed_ms;
 while(remaining){
  uint8_t next=hits;
  uint16_t next_ms=step_ms;
  for(uint8_t i=1;i<=hits;i++){
   const uint16_t at=(uint16_t)((uint32_t)step_ms*i/hits);
   if(at>m->clock16){next=i;next_ms=at;break;}
  }
  uint16_t delta=(uint16_t)(next_ms-m->clock16);
  if(remaining<delta){m->clock16=(uint16_t)(m->clock16+remaining);break;}
  remaining-=delta;
  m->clock16=next_ms;
  if(next==hits){
   m->clock16=0;m->active=(uint8_t)((m->active+1)%4);
   cb_emit(m,host,0);
  }else{cb_emit(m,host,next);}
 }
}
/* 240 x 240 RGB565 display surface. No allocation and bounded drawing. */
static void r(const CbFM1Graphics *g,int x,int y,int w,int h,uint16_t c){if(g->rect)g->rect(g->user,x,y,w,h,c);}
static void l(const CbFM1Graphics *g,int x,int y,int xx,int yy,uint16_t c){if(g->line)g->line(g->user,x,y,xx,yy,c);}
static void t(const CbFM1Graphics *g,int x,int y,const char *s,uint16_t c,uint8_t sz){if(g->text)g->text(g->user,x,y,s,c,sz);}
static uint16_t heat(const CbChord *c){
 if(c->quality==CB_DOM7||c->quality==CB_DIM)return COLOR[5];
 if(c->quality==CB_M6||c->quality==CB_M9)return COLOR[3];
 if(c->quality==CB_MAJ7||c->quality==CB_MAJ9)return COLOR[2];
 return COLOR[0];
}
void cb_fm1_draw(const CbFM1 *m,const CbFM1Graphics *g){
 if(!m||!g||!g->rect)return;
 r(g,0,0,240,240,C_BG);r(g,0,0,240,27,C_DARK);
 t(g,10,9,"CHORDON",C_TEXT,1);t(g,82,9,"BLEU",COLOR[0],1);
 char bpm[8];bpm[0]=(char)('0'+m->bpm/100);bpm[1]=(char)('0'+(m->bpm/10)%10);bpm[2]=(char)('0'+m->bpm%10);bpm[3]=' ';bpm[4]='B';bpm[5]='P';bpm[6]='M';bpm[7]=0;
 t(g,181,9,m->bpm>=100?bpm:bpm+1,C_MUT,1);
 if(m->view==CB_VIEW_HOME){
  t(g,11,38,"YOUR LITTLE LOOP",C_MUT,1);
  for(int i=0;i<4;i++){
   const CbChord *c=&m->loop.steps[i];int x=10+i*56;
   r(g,x,56,51,117,heat(c));r(g,x+5,73,38,6,C_TEXT);
   r(g,x+5,87,19+(i*5),5,C_TEXT);r(g,x+5,100,11+(i*7),5,C_TEXT);
   if(i==m->selected){l(g,x,55,x+50,55,C_TEXT);l(g,x,173,x+50,173,C_TEXT);}
   t(g,x+7,151,NAMES[c->root],C_BG,2);
  }
  l(g,10,185,230,185,C_DARK);
  t(g,10,196,"SPICE",C_MUT,1);t(g,82,196,"FEEL",C_MUT,1);t(g,159,196,"MOVE",C_MUT,1);
  if(m->loop.wonder>=70)t(g,10,210,"HOT",C_TEXT,1);else t(g,10,210,"MILD",C_TEXT,1);
  t(g,82,210,m->feel==CB_FEEL_WARM?"WARM":m->feel==CB_FEEL_CHEESY?"CHEESY":"CRISPY",C_TEXT,1);
  t(g,159,210,m->motion==CB_MOTION_ARP?"ARP":m->motion==CB_MOTION_HOLD?"HOLD":"PULSE",C_TEXT,1);
 }else if(m->view==CB_VIEW_RECIPE){
  t(g,12,40,"TODAY'S RECIPE",C_MUT,1);
  for(int i=0;i<3;i++){l(g,70+i*30,60,64+i*30,83,COLOR[i]);l(g,64+i*30,83,73+i*30,94,COLOR[i]);}
  for(int j=0;j<3;j++)l(g,48,112+j*10,192,112+j*10,COLOR[j+1]);
  r(g,13,159,214,42,m->recipe?RGB(47,57,95):COLOR[0]);
  t(g,32,174,m->recipe?"GHIBLI DREAM":"CLASSIC",C_TEXT,2);
  t(g,49,214,"K1 TO SWITCH RECIPE",C_MUT,1);
 }else if(m->view==CB_VIEW_CHORD){
  const CbChord *c=&m->loop.steps[m->selected];t(g,11,40,"CHORD",C_MUT,1);
  for(int i=0;i<12;i++){
   int x=30+(i%6)*32,y=80+(i/6)*52;
   if(i<(c->quality==CB_DIM?3:4))r(g,x,y,10,10,heat(c));
  }
  t(g,82,100,NAMES[c->root],C_TEXT,4);t(g,75,160,TYPES[c->quality],heat(c),2);
  t(g,14,200,c->lock_root?"ROOT FIXED":"ROOT AUTO",C_MUT,1);
  t(g,137,200,c->lock_type?"TYPE FIXED":"TYPE AUTO",C_MUT,1);
 }else{
  t(g,12,40,"ARP / LITTLE ORBIT",C_MUT,1);
  for(int i=0;i<4;i++){
   int x=(i==0?114:i==1?173:i==2?114:55),y=(i==0?55:i==1?114:i==2?172:114);
   r(g,x,y,13,13,COLOR[i+1]);
  }
  t(g,111,109,m->arp_dir==0?"UP":m->arp_dir==1?"DOWN":m->arp_dir==2?"UD":"RND",C_TEXT,2);
  t(g,10,198,"RATE",C_MUT,1);t(g,69,198,"GATE",C_MUT,1);t(g,130,198,"DIR",C_MUT,1);t(g,186,198,"ORDER",C_MUT,1);
  static const char *const rates[4]={"1/4","1/8","1/16","1/32"};
  t(g,10,211,rates[m->arp_rate],C_TEXT,1);
  t(g,69,211,m->gate>75?"LONG":m->gate<40?"SHORT":"MID",C_TEXT,1);
  t(g,130,211,m->arp_dir==0?"UP":m->arp_dir==1?"DN":m->arp_dir==2?"UD":"RND",C_TEXT,1);
  t(g,186,211,m->arp_order==0?"PITCH":m->arp_order==1?"ROOT":m->arp_order==2?"OUT":"FIFTH",C_TEXT,1);
 }
 r(g,0,228,240,12,C_DARK);
 t(g,34,229,"PLAY   FLIP   SAVE",C_MUT,1);
}