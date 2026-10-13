#include "../firmware/cb_fm1.h"
#include <assert.h>
#include <stdio.h>
#include <string.h>
static int draw_count=0,notes_count=0,save_count=0,panic_count=0;
static void draw_rect(void*u,int x,int y,int w,int h,uint16_t color){(void)u;(void)color;assert(x>=0&&y>=0&&w>=0&&h>=0&&x+w<=240&&y+h<=240);draw_count++;}
static void draw_line(void*u,int x,int y,int xx,int yy,uint16_t color){(void)u;(void)color;assert(x>=0&&x<240&&xx>=0&&xx<240&&y>=0&&y<240&&yy>=0&&yy<240);draw_count++;}
static void draw_text(void*u,int x,int y,const char*s,uint16_t color,uint8_t size){(void)u;(void)color;assert(x>=0&&x<240&&y>=0&&y<240&&size<=4&&strlen(s)<32);draw_count++;}
static void send_notes(void*u,const uint8_t*n,uint8_t count,uint16_t gate,uint8_t arp){(void)u;(void)arp;assert(n&&count>=1&&count<=4&&gate>0);if(arp)assert(count==1);for(unsigned i=0;i<count;i++)assert(n[i]>=36&&n[i]<100);notes_count++;}
static void panic_notes(void*u){(void)u;panic_count++;}
static void saved(void*u,const CbFM1*m){(void)u;assert(cb_valid(&m->loop));save_count++;}
int main(void){
 CbFM1 d;CbFM1Graphics g={0,draw_rect,draw_line,draw_text};CbFM1Host h={0,send_notes,saved,panic_notes};
 for(int seed=1;seed<=256;seed++){
  cb_fm1_init(&d,(uint32_t)seed);assert(cb_valid(&d.loop));
  cb_fm1_draw(&d,&g);cb_fm1_button(&d,CB_B_CHORD,&h);cb_fm1_draw(&d,&g);
  cb_fm1_button(&d,CB_B_ARP,&h);for(int j=0;j<4;j++)cb_fm1_knob(&d,j,1);cb_fm1_draw(&d,&g);
  cb_fm1_button(&d,CB_B_RECIPE,&h);cb_fm1_knob(&d,0,1);assert(d.recipe==CB_RECIPE_GHIBLI);cb_fm1_draw(&d,&g);
  cb_fm1_button(&d,CB_B_HOME,&h);cb_fm1_knob(&d,0,1);cb_fm1_knob(&d,1,1);
  CbChord keep=d.loop.steps[d.selected];cb_fm1_button(&d,CB_B_FLIP,&h);
  assert(!memcmp(&keep,&d.loop.steps[d.selected],sizeof(keep)));
  cb_fm1_button(&d,CB_B_KEEP_ALL,&h);
  CbChord prev[4];memcpy(prev,d.loop.steps,sizeof(prev));
  cb_fm1_button(&d,CB_B_FLIP,&h);
  for(int k=0;k<4;k++){
   assert(prev[k].root!=d.loop.steps[k].root||prev[k].quality!=d.loop.steps[k].quality);
   assert(!d.loop.steps[k].lock_root&&!d.loop.steps[k].lock_type);
  }
  assert(cb_valid(&d.loop));cb_fm1_button(&d,CB_B_UNDO,&h);assert(cb_valid(&d.loop));
  cb_fm1_button(&d,CB_B_SAVE,&h);cb_fm1_button(&d,CB_B_PLAY,&h);
  for(int t=0;t<18;t++)cb_fm1_tick(&d,500,&h);
  cb_fm1_button(&d,CB_B_PLAY,&h);assert(!d.playing);
 }
 /* Full regeneration + all three emotional palettes over many seeds.
  * Compare each slot's pitch/quality, never just the random generator seed. */
 for(unsigned feel=0;feel<3;feel++){
  for(unsigned seed=1;seed<=64;seed++){
   cb_fm1_init(&d,seed);d.feel=(uint8_t)feel;d.all_four=1;
   for(unsigned iteration=0;iteration<8;iteration++){
    CbChord before[4];memcpy(before,d.loop.steps,sizeof(before));
    cb_fm1_button(&d,CB_B_FLIP,&h);
    assert(cb_valid(&d.loop));
    for(int k=0;k<4;k++)
     assert(before[k].root!=d.loop.steps[k].root||before[k].quality!=d.loop.steps[k].quality);
   }
  }
 }
 assert(draw_count>8000&&notes_count>500&&save_count==256&&panic_count==256);
 printf("PASS: 256 device-state, 240x240 bounded render, event and scheduling scenarios (%d notes, %d render ops)\n",notes_count,draw_count);
 return 0;
}