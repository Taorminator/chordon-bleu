/* CHORDON BLEU harmonic suggestion engine, host-buildable C99. GPL-3.0-only. */
#include "chordon_harmony.h"
#include <string.h>
typedef struct { uint8_t n; int8_t steps[5]; } Shape;
static const Shape shapes[CB_QUALITIES]={
  {3,{0,4,7}}, {3,{0,3,7}}, {4,{0,4,7,11}}, {4,{0,3,7,10}},
  {4,{0,4,7,10}}, {4,{0,3,10,14}}, {4,{0,4,11,14}},
  {4,{0,4,7,14}}, {3,{0,2,7}}, {3,{0,5,7}},
  {4,{0,4,7,9}}, {4,{0,3,7,9}}, {3,{0,3,6}}, {4,{0,3,6,10}}
};
static const uint8_t scales[2][7]={{0,2,4,5,7,9,11},{0,2,3,5,7,8,10}};
static const uint8_t major_triads[7]={CB_MAJOR,CB_MINOR,CB_MINOR,CB_MAJOR,CB_MAJOR,CB_MINOR,CB_DIM};
static const uint8_t minor_triads[7]={CB_MINOR,CB_DIM,CB_MAJOR,CB_MINOR,CB_MINOR,CB_MAJOR,CB_MAJOR};
static const uint8_t progressions[8][4]={{0,5,3,4},{0,4,5,3},{5,3,0,4},{1,4,0,5},
  {0,2,3,4},{5,1,4,0},{0,3,4,0},{0,3,3,4}};
static const uint8_t mprogressions[8][4]={{0,5,2,6},{0,3,5,4},{0,6,5,4},{0,2,6,5},
  {5,6,0,4},{0,3,4,0},{0,5,3,4},{0,5,6,4}};
static uint32_t rnd(CbLoop *l){
  uint32_t x=l->random?l->random:0x9e3779b9u;
  x^=x<<13;x^=x>>17;x^=x<<5;l->random=x;return x;
}
static uint8_t mod12(int n){n%=12;return (uint8_t)(n<0?n+12:n);}
static uint8_t diatonic_type(int minor,int degree,int rich){
  uint8_t q=minor?minor_triads[degree]:major_triads[degree];
  if(!rich)return q;
  if(q==CB_MAJOR)return degree==4&&!minor?CB_DOM7:CB_MAJ7;
  if(q==CB_MINOR)return CB_M7;
  return CB_HALF_DIM;
}
static CbChord diatonic(CbLoop *l,int degree,int rich){
  CbChord c={mod12(l->key+scales[l->minor][degree]),diatonic_type(l->minor,degree,rich),0,0};
  return c;
}
uint16_t cb_pitch_classes(const CbChord *c){
  uint16_t mask=0; if(!c||c->quality>=CB_QUALITIES)return 0;
  for(int i=0;i<shapes[c->quality].n;i++)mask|=(uint16_t)(1u<<mod12(c->root+shapes[c->quality].steps[i]));
  return mask;
}
static int count_bits(uint16_t m){int c=0;while(m){c+=(m&1u);m>>=1;}return c;}
static int transition(const CbChord *a,const CbChord *b){
  const int32_t root_weights[12]={-9,-4,2,5,4,8,-7,8,4,4,3,-4};
  int diff=mod12((int)b->root-(int)a->root);
  int score=root_weights[diff]+count_bits(cb_pitch_classes(a)&cb_pitch_classes(b))*4;
  if(a->quality==CB_DOM7&&diff==5)score+=19;
  return score;
}
static int scale_member(const CbLoop *l,const CbChord *c){
  for(int i=0;i<7;i++)if(mod12(l->key+scales[l->minor][i])==c->root)return i;
  return -1;
}
static int candidate_score(CbLoop *l,const CbChord *candidate,const CbChord *original,int index){
  const CbChord *prev=&l->steps[(index+3)%4],*next=&l->steps[(index+1)%4];
  int deg=scale_member(l,candidate),score=0;
  if(deg>=0){
    uint8_t tri=diatonic_type(l->minor,deg,0),seven=diatonic_type(l->minor,deg,1);
    score+=((candidate->quality==tri||candidate->quality==seven)?42:14);
    if(candidate->quality==CB_ADD9&&tri==CB_MAJOR)score+=28;
    if(candidate->quality==CB_M9&&tri==CB_MINOR)score+=29;
    if(candidate->quality==CB_SIX&&tri==CB_MAJOR)score+=29;
    if(candidate->quality==CB_SUS2||candidate->quality==CB_SUS4)score+=23;
  }else score-=23;
  if(deg<0){if(l->wonder<45)score-=100;else score-=(88-l->wonder)/2;}
  if(candidate->root==original->root)score+=(100-l->wonder)/4;
  else score-=(100-l->wonder)/5;
  if(candidate->quality==original->quality)score+=(100-l->wonder)/7;
  score+=transition(prev,candidate)*2+transition(candidate,next)*2;
  if(index==0&&candidate->root==l->key)score+=5;
  if(candidate->root==prev->root)score-=11;
  score+=(int)(rnd(l)%((unsigned)l->wonder/7+6u));
  return score;
}
static int matches(const CbChord *a,const CbChord *b){return a->root==b->root&&a->quality==b->quality;}
static int try_slot(CbLoop *l,int i,int force_change){
  CbChord old=l->steps[i],best=old;int best_score=-99999,changed=0;
  if(old.lock_root&&old.lock_type)return 0;
  for(int root=0;root<12;root++){
    if(old.lock_root&&root!=old.root)continue;
    for(int q=0;q<CB_QUALITIES;q++){
      if(old.lock_type&&q!=old.quality)continue;
      CbChord candidate={(uint8_t)root,(uint8_t)q,old.lock_root,old.lock_type};
      if(force_change&&matches(&old,&candidate))continue;
      int s=candidate_score(l,&candidate,&old,i);
      if(s>best_score){best_score=s;best=candidate;changed=1;}
    }
  }
  if(changed&&!matches(&best,&old)){l->steps[i]=best;return 1;}
  return 0;
}
int cb_valid(const CbLoop *l){
  if(!l||l->key>11||l->minor>1||l->wonder>100)return 0;
  for(int i=0;i<CB_STEPS;i++)if(l->steps[i].root>11||l->steps[i].quality>=CB_QUALITIES)return 0;
  return 1;
}
void cb_init(CbLoop *l,uint8_t key,uint8_t minor,uint32_t seed){
  memset(l,0,sizeof(*l));l->key=key%12;l->minor=minor?1:0;l->random=seed?seed:1;l->wonder=38;cb_new(l);
}
void cb_new(CbLoop *l){
  const uint8_t (*list)[4]=l->minor?mprogressions:progressions;
  int pick=(int)(rnd(l)%8);
  for(int i=0;i<CB_STEPS;i++)l->steps[i]=diatonic(l,list[pick][i],1);
}
int cb_mutate(CbLoop *l){
  if(!cb_valid(l))return 0;
  int available[4],n=0;
  for(int i=0;i<4;i++)if(!(l->steps[i].lock_root&&l->steps[i].lock_type))available[n++]=i;
  if(!n)return 0;
  int count=l->wonder<20?1:l->wonder<50?1+(int)(rnd(l)%2):l->wonder<78?2+(int)(rnd(l)%2):3+(int)(rnd(l)%2);
  if(count>n)count=n;
  for(int i=n-1;i>0;i--){int j=(int)(rnd(l)%(unsigned)(i+1));int t=available[i];available[i]=available[j];available[j]=t;}
  int changed=0;
  for(int k=0;k<count;k++)changed+=try_slot(l,available[k],1);
  return changed>0;
}
int cb_complete(CbLoop *l){
  if(!cb_valid(l))return 0;
  int changed=0;
  for(int pass=0;pass<2;pass++)for(int i=0;i<CB_STEPS;i++)
    if(!l->steps[i].lock_root||!l->steps[i].lock_type)changed+=try_slot(l,i,pass!=0);
  return changed>0;
}
