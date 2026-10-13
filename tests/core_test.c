#include "../core/chordon_harmony.h"
#include <assert.h>
#include <stdio.h>
#include <string.h>
int main(void){
  CbLoop l; int variations=0;
  for(int mode=0;mode<2;mode++)for(int key=0;key<12;key++)for(int wonder=0;wonder<=100;wonder+=10){
    cb_init(&l,key,mode,0x1234+key+mode*100);
    l.wonder=wonder;
    for(int i=0;i<4;i++)assert(cb_pitch_classes(&l.steps[i])!=0);
    for(int t=0;t<200;t++){
      assert(cb_valid(&l));
      CbChord frozen=l.steps[0];l.steps[0].lock_root=1;l.steps[0].lock_type=1;
      l.steps[1].lock_root=1;uint8_t lockroot=l.steps[1].root;
      l.steps[2].lock_type=1;uint8_t locktype=l.steps[2].quality;
      CbLoop snapshot=l;
      if(cb_mutate(&l))variations++;
      assert(l.steps[0].root==frozen.root&&l.steps[0].quality==frozen.quality);
      assert(l.steps[1].root==lockroot&&l.steps[2].quality==locktype);
      assert(l.random!=0&&cb_valid(&l));
      for(int k=0;k<4;k++)assert(cb_pitch_classes(&l.steps[k])!=0);
      l=snapshot;
    }
  }
  cb_init(&l,9,1,741);for(int i=0;i<4;i++)l.steps[i].lock_root=l.steps[i].lock_type=1;
  assert(cb_mutate(&l)==0);assert(cb_complete(&l)==0);
  cb_init(&l,0,0,741);l.steps[0].root=3;l.steps[0].quality=CB_M7;l.steps[0].lock_root=l.steps[0].lock_type=1;
  CbChord c=l.steps[0];assert(cb_complete(&l));assert(memcmp(&c,&l.steps[0],sizeof(c))==0);
  CbLoop one,two;cb_init(&one,9,1,54321);cb_init(&two,9,1,54321);
  for(int i=0;i<100;i++){assert(cb_mutate(&one)==cb_mutate(&two));assert(memcmp(&one,&two,sizeof(one))==0);}
  printf("PASS: %d deterministic harmony mutation runs with lock and pitch-class invariants\n",variations);
  return 0;
}
