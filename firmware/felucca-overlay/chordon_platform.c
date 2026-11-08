/* SPDX-License-Identifier: GPL-3.0-only
 * CHORDON BLEU target adapter for pinned Felucca 1.5.6.
 * This is included in the Felucca SINGLE compilation unit before main.c.
 * EXPERIMENTAL: SAVE is RAM ONLY. Never distribute as installable firmware.
 */
static CbFM1 cbh_device;
static CbVoice cbh_voices;
static CbFM1 cbh_ram_save;
static uint32_t cbh_last_ms, cbh_last_draw;
static uint8_t cbh_dirty, cbh_ram_saved;

static void cbh_on(void *u, uint8_t pitch, uint8_t velocity) {
    (void)u;trk_note_on(&trk[0], pitch, velocity);
}
static void cbh_off(void *u, uint8_t pitch) {
    (void)u;trk_note_off(&trk[0], pitch);
}
static void cbh_notes(void *u, const uint8_t *notes, uint8_t count, uint16_t gate_ms, uint8_t arp) {
    (void)u;(void)arp;
    fm1_irq_off();
    cb_voice_group(&cbh_voices, notes, count, gate_ms, fm1_ms);
    fm1_irq_on();
}
static void cbh_panic(void *u) {
    (void)u;
    fm1_irq_off();
    cb_voice_stop(&cbh_voices);
    fm1_irq_on();
}
static void cbh_save(void *u, const CbFM1 *m) {
    (void)u; cbh_ram_save=*m;cbh_ram_saved=1u;  /* NOR flash integration pending */
}
static const CbFM1Host cbh_host={0,cbh_notes,cbh_save,cbh_panic};
static void chordon_init(void) {
    CbVoiceOut v={0,cbh_on,cbh_off};
    cb_minimal_init(&cbh_device,(fm1_ms<<16)^0x43424c55u);
    cb_voice_init(&cbh_voices,v);
    cbh_last_ms=fm1_ms;cbh_last_draw=0;cbh_dirty=1;cbh_ram_saved=0;
}
/* Own input surface, using Felucca's hardware-calibrated matrix and encoders. */
static void chordon_input(void) {
    uint32_t edges=fm1_input_edges(0),now=fm1_ms;
    uint32_t keys=fm1_input_note_edges();
    uint32_t dt=now-cbh_last_ms;
    int32_t s;
    /* First four WHITE keys on F3..G5: F, G, A, B. */
    static const uint8_t white_keys[4]={0,2,4,6};
    for(uint8_t i=0;i<4u;i++)if(keys&(1u<<white_keys[i])){
        cbh_device.selected=i;
        if(!cbh_device.playing){
            uint8_t notes[4];cbh_panic(0);
            uint8_t count=cb_fm1_chord_notes(&cbh_device.loop.steps[i],notes);
            cbh_notes(0,notes,count,1100u,0);
        }
        cbh_dirty=1;
    }
    cbh_last_ms=now;
    if(dt>200u)dt=200u;
    if(edges)cbh_dirty=1;
    if(edges&(1u<<panel.btn[B_PLAY]))cb_fm1_button(&cbh_device,CB_B_PLAY,&cbh_host);
    if(edges&(1u<<panel.btn[B_EDIT]))cb_fm1_button(&cbh_device,CB_B_UNDO,&cbh_host);
    s=panel_enc(EN_K1);
    if(s){if(s>16)s=16;if(s< -16)s=-16;cbh_dirty=1;}
    while(s>0){cb_minimal_vary(&cbh_device,1);s--;}
    while(s<0){cb_minimal_vary(&cbh_device,-1);s++;}
    s=panel_enc(EN_PRESET);
    if(s){cbh_panic(0);if(s>16)s=16;if(s< -16)s=-16;cbh_dirty=1;}
    while(s>0){preset_step(1);s--;}
    while(s<0){preset_step(-1);s++;}
    (void)panel_enc(EN_SELECT);(void)panel_enc(EN_ALGO);
    for(uint32_t i=1;i<4;i++)(void)panel_enc(EN_K1+i);
    if(dt){
        uint8_t before=cbh_device.active;
        cb_fm1_tick(&cbh_device,(uint16_t)dt,&cbh_host);
        if(cbh_device.active!=before)cbh_dirty=1;
    }
    fm1_irq_off();cb_voice_tick(&cbh_voices,now);fm1_irq_on();
}
/* Only available chord pads, transport and available undo are lit. */
static void chordon_leds(void){
 uint8_t on[FM1_NCOL]={0},dim[FM1_NCOL]={0};
 static const uint8_t white_keys[4]={0,2,4,6};
 led_pos_init();
 for(unsigned i=0;i<4;i++){
  led_put(dim,14u+white_keys[i],1);
  if((cbh_device.playing&&cbh_device.active==i)||(!cbh_device.playing&&cbh_device.selected==i))led_put(on,14u+white_keys[i],1);
 }
 led_put(on,panel.btn[B_PLAY],cbh_device.playing);
 led_put(on,panel.btn[B_EDIT],cbh_device.undo_valid);
 for(unsigned i=0;i<FM1_NCOL;i++){
  fm1_led_dim[i]=dim[i];fm1_led_mid[i]=0;fm1_led_breath[i]=0;fm1_led[i]=on[i];
 }
}
/* RGB565 drawing, without a full-screen RAM buffer. */
static void cbh_rect(void *u,int x,int y,int w,int h,uint16_t color){
    (void)u;
    if(x>=0&&y>=0&&w>0&&h>0&&x+w<=240&&y+h<=240)
        lcd_fill((uint32_t)x,(uint32_t)y,(uint32_t)w,(uint32_t)h,color);
}
static void cbh_line(void *u,int x,int y,int xx,int yy,uint16_t color){
    (void)u;
    /* One LCD transfer for straight lines, not 100+ individual 1-pixel
       SPI transactions: essential on the small FM1 display. */
    if(y==yy){
        int a=x<xx?x:xx, span=x<xx?xx-x+1:x-xx+1;
        if(a>=0&&y>=0&&a+span<=240&&y<240)lcd_fill((uint32_t)a,(uint32_t)y,(uint32_t)span,1u,color);
        return;
    }
    if(x==xx){
        int a=y<yy?y:yy, span=y<yy?yy-y+1:y-yy+1;
        if(x>=0&&a>=0&&x<240&&a+span<=240)lcd_fill((uint32_t)x,(uint32_t)a,1u,(uint32_t)span,color);
        return;
    }
    int dx=xx>x?xx-x:x-xx,dy=yy>y?yy-y:y-yy;
    int sx=x<xx?1:-1,sy=y<yy?1:-1,err=dx-dy;
    for(;;){
        if(x>=0&&x<240&&y>=0&&y<240)lcd_fill((uint32_t)x,(uint32_t)y,1u,1u,color);
        if(x==xx&&y==yy)break;
        int e2=2*err;
        if(e2> -dy){err-=dy;x+=sx;}
        if(e2<dx){err+=dx;y+=sy;}
    }
}
static void cbh_text(void *u,int x,int y,const char *str,uint16_t color,uint8_t sz){
    (void)u;
    const aafont_t *f=sz>=3u?&AF_L:sz==2u?&AF_M:&AF_S;
    if(x>=0&&x<240&&y>=0&&y+f->h<=240)
        draw_text_line((uint32_t)x,(uint32_t)y,(uint32_t)(240-x),f,str,color,0x0844u,0);
}
static void chordon_draw(void){
    static const CbFM1Graphics g={0,cbh_rect,cbh_line,cbh_text};
    if(!cbh_dirty&&fm1_ms-cbh_last_draw<250u)return;
    if(fm1_ms-cbh_last_draw<50u)return; /* 20 FPS maximum */
    cbh_last_draw=fm1_ms;cbh_dirty=0;
    cb_minimal_draw(&cbh_device,&g);
    if(ui.uboot)draw_text_line(20,114,200,&AF_M,"HOLD FOR UBOOT",0xffffu,0x0844u,1);
}
