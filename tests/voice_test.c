#include "../firmware/cb_voice.h"
#include <assert.h>
#include <stdio.h>
static unsigned active[128],held,maxheld,ons,offs;
static void on(void *u,uint8_t n,uint8_t vel){(void)u;assert(vel>0);assert(!active[n]);active[n]++;held++;ons++;if(held>maxheld)maxheld=held;}
static void off(void *u,uint8_t n){(void)u;assert(active[n]);active[n]--;held--;offs++;}
int main(void){
 CbVoice v;CbVoiceOut io={0,on,off};cb_voice_init(&v,io);
 uint8_t triad[4]={60,64,67,71};
 cb_voice_group(&v,triad,4,120,0);assert(held==4);
 cb_voice_tick(&v,119);assert(held==4);cb_voice_tick(&v,120);assert(held==0);
 cb_voice_group(&v,triad,4,300,4294967200u);cb_voice_tick(&v,50);assert(held==4);cb_voice_tick(&v,204);assert(held==0);
 uint8_t duplicate[4]={60,60,67,67};cb_voice_group(&v,duplicate,4,80,1000);assert(held==2);
 cb_voice_group(&v,triad,4,80,1050);assert(held==4);cb_voice_stop(&v);assert(held==0);
 for(uint32_t i=0;i<100000;i++){
   uint8_t group[4]={(uint8_t)(48+i%24),(uint8_t)(50+i%24),(uint8_t)(52+i%24),(uint8_t)(55+i%24)};
   cb_voice_group(&v,group,(uint8_t)(i%5), (uint16_t)(15+i%500), i*10);
   if(i%3==0)cb_voice_tick(&v,i*10+600);
   assert(held<=4);
 }
 cb_voice_stop(&v);assert(held==0&&ons==offs&&maxheld<=4);
 printf("PASS 100000 note groups; zero stuck voices, max polyphony %u, %u note pairs\n",maxheld,ons);
}
