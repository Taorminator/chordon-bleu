/* SPDX-License-Identifier: GPL-3.0-only
 * Use Felucca's tested A/B NOR transaction, but never claim occupied sectors.
 * Real-device writes remain OFF until the hardware qualification gates pass.
 * The same adapter's writes are enabled in the simulated NOR only.
 */
#ifndef CB_ENABLE_PERSISTENCE
#define CB_ENABLE_PERSISTENCE 0
#endif
static int cbh_disk_status; /* 0 RAM only, 1 persistent, -1 occupied, -2 I/O failure */
#if CB_ENABLE_PERSISTENCE
static int cbh_disk_owned(unsigned copy){
    uint8_t buf[64];
    const uint32_t base=st_sector(OBJ_AUTOSAVE,copy);
    unsigned empty=1;
    for(unsigned at=0;at<ST_SECTOR;at+=sizeof buf){
        if(st_read(base+at,buf,sizeof buf))return 0;
        for(unsigned i=0;i<sizeof buf;i++)if(buf[i]!=255u)empty=0;
    }
    if(empty)return 1;
    /* A full, CRC-checked CHORDON payload proves ownership even if the
       outer commit header was torn. A partial/foreign payload is read-only. */
    uint8_t payload[CB_STORE_LEN];CbFM1 m;
    if(st_read(base+ST_PAYLOAD_OFF,payload,sizeof payload))return 0;
    if(!cb_store_decode(payload,&m,0))return 0;
    /* No unrelated bytes outside the header and our payload may be erased. */
    for(unsigned at=0;at<ST_SECTOR;at+=sizeof buf){
        if(st_read(base+at,buf,sizeof buf))return 0;
        for(unsigned i=0;i<sizeof buf;i++){
            unsigned p=at+i;
            if(p>=sizeof(st_hdr_t)&&!(p>=ST_PAYLOAD_OFF&&p<ST_PAYLOAD_OFF+CB_STORE_LEN)&&buf[i]!=255u)return 0;
        }
    }
    return 1;
}
static void cbh_disk_restore(CbFM1 *m){
    uint8_t payload[CB_STORE_LEN];CbFM1 restored;
    cbh_disk_status=cbh_disk_owned(0)&&cbh_disk_owned(1)?1:-1;
    if(st_load(OBJ_AUTOSAVE,payload,sizeof payload)==(int)sizeof payload&&cb_store_decode(payload,&restored,0))*m=restored;
}
static void cbh_disk_save(const CbFM1 *m){
    uint8_t payload[CB_STORE_LEN];st_hdr_t h;
    if(!cbh_disk_owned(0)||!cbh_disk_owned(1)){cbh_disk_status=-1;return;}
    int current=st_current(OBJ_AUTOSAVE,&h);
    cb_store_encode(payload,m,current<0?1u:h.seq+1u);
    cbh_disk_status=st_save(OBJ_AUTOSAVE,payload,sizeof payload)?-2:1;
}
#else
static void cbh_disk_restore(CbFM1 *m){(void)m;cbh_disk_status=0;}
static void cbh_disk_save(const CbFM1 *m){(void)m;cbh_disk_status=0;}
#endif
