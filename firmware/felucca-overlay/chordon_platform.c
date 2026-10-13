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
    cb_fm1_init(&cbh_device,(fm1_ms<<16)^0x43424c55u);
    cb_voice_init(&cbh_voices,v);
    cbh_last_ms=fm1_ms;cbh_last_draw=0;cbh_dirty=1;cbh_ram_saved=0;
}
/* Own input surface, using Felucca's hardware-calibrated matrix and encoders. */
static void chordon_input(void) {
    uint32_t edges=fm1_input_edges(0),now=fm1_ms;
    uint32_t dt=now-cbh_last_ms;
    int32_t s;
    (void)fm1_input_note_edges();
    cbh_last_ms=now;
    if(dt>200u)dt=200u;
    if(edges)cbh_dirty=1;
    if(edges&(1u<<panel.btn[B_PLAY]))cb_fm1_button(&cbh_device,CB_B_PLAY,&cbh_host);
    if(edges&(1u<<panel.btn[B_SEQ]))cb_fm1_button(&cbh_device,CB_B_FLIP,&cbh_host);
    if(edges&(1u<<panel.btn[B_SAVE]))cb_fm1_button(&cbh_device,CB_B_SAVE,&cbh_host);
    if(edges&(1u<<panel.btn[B_HOME]))cb_fm1_button(&cbh_device,CB_B_HOME,&cbh_host);
    if(edges&(1u<<panel.btn[B_GLO]))cb_fm1_button(&cbh_device,CB_B_RECIPE,&cbh_host);
    if(edges&(1u<<panel.btn[B_SCL]))cb_fm1_button(&cbh_device,CB_B_CHORD,&cbh_host);
    if(edges&(1u<<panel.btn[B_ARP]))cb_fm1_button(&cbh_device,CB_B_ARP,&cbh_host);
    if(edges&(1u<<panel.btn[B_EDIT]))cb_fm1_button(&cbh_device,CB_B_KEEP_ALL,&cbh_host);
    if(edges&(1u<<panel.btn[B_OCTDN]))cb_fm1_button(&cbh_device,CB_B_UNDO,&cbh_host);
    s=panel_enc(EN_SELECT);
    if(s)cbh_dirty=1;
    /* Limit work for an encoder jump: refuse to spend >16 iterations in UI. */
    if(s>16)s=16;if(s< -16)s=-16;
    while(s>0){cb_fm1_button(&cbh_device,CB_B_SELECT,&cbh_host);s--;}
    while(s<0){cb_fm1_button(&cbh_device,CB_B_SELECT,&cbh_host);s++;}
    for(uint32_t i=0;i<4u;i++){
        s=panel_enc(EN_K1+i);
        if(s)cbh_dirty=1;
        if(s>16)s=16;if(s< -16)s=-16;
        while(s>0){cb_fm1_knob(&cbh_device,(uint8_t)i,1);s--;}
        while(s<0){cb_fm1_knob(&cbh_device,(uint8_t)i,-1);s++;}
    }
    (void)panel_enc(EN_ALGO);(void)panel_enc(EN_PRESET);
    if(dt){
        uint8_t before=cbh_device.active;
        cb_fm1_tick(&cbh_device,(uint16_t)dt,&cbh_host);
        if(cbh_device.active!=before)cbh_dirty=1;
    }
    fm1_irq_off();cb_voice_tick(&cbh_voices,now);fm1_irq_on();
}
/* RGB565 drawing, without a full-screen RAM buffer. */
static void cbh_rect(void *u,int x,int y,int w,int h,uint16_t color){
    (void)u;
    if(x>=0&&y>=0&&w>0&&h>0&&x+w<=240&&y+h<=240)
        lcd_fill((uint32_t)x,(uint32_t)y,(uint32_t)w,(uint32_t)h,color);
}
static void cbh_line(void *u,int x,int y,int xx,int yy,uint16_t color){
    (void)u;
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
    cb_fm1_draw(&cbh_device,&g);
    if(ui.uboot)draw_text_line(20,114,200,&AF_M,"HOLD FOR UBOOT",0xffffu,0x0844u,1);
}
