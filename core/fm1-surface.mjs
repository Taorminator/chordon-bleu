// Physical surface only: the same minimal app owns harmony, audio and history.
// Layout follows the existing FM1 shell, not a firmware-derived CPU emulator.
const keyboard = document.getElementById('fm1-keyboard');
const pads = [...document.querySelectorAll('[data-slot]')];
let white = 0;
for (let midi = 60; midi < 87; midi++) {
  const black = [1,3,6,8,10].includes(midi % 12);
  const key = document.createElement('button');
  key.type = 'button'; key.className = `physical-key ${black ? 'black' : 'white'}`;
  if (black) key.style.left = `calc(${white} * 100% / 16 - 1.8%)`;
  else { key.style.left = `calc(${white} * 100% / 16)`; white++; }
  const slot = !black && white <= 4 ? white - 1 : -1;
  if (slot < 0) { key.disabled = true; key.setAttribute('aria-label','Unbenutzte Taste'); }
  else {
    key.textContent = slot + 1;
    key.addEventListener('click', () => pads[slot].click());
    const sync = () => {
      key.classList.toggle('selected', pads[slot].classList.contains('selected'));
      key.classList.toggle('sounding', pads[slot].classList.contains('sounding'));
      key.setAttribute('aria-label', pads[slot].getAttribute('aria-label'));
      key.setAttribute('aria-pressed', pads[slot].getAttribute('aria-pressed'));
    };
    new MutationObserver(sync).observe(pads[slot], {attributes:true}); sync();
  }
  keyboard.append(key);
}

// The physical PRESETS encoder (lower left) selects sounds, independently of K1.
const preset=document.getElementById('preset');
const turn=direction=>window.dispatchEvent(new CustomEvent('fm1-preset',{detail:direction}));
preset.addEventListener('keydown',event=>{
  if(['ArrowUp','ArrowRight','ArrowDown','ArrowLeft'].includes(event.key)){
    event.preventDefault();event.stopPropagation();turn(['ArrowUp','ArrowRight'].includes(event.key)?1:-1);
  }
});
let drag=null,scroll=0;
preset.addEventListener('pointerdown',event=>{if(event.button!==0)return;preset.focus();preset.setPointerCapture(event.pointerId);drag={x:event.clientX,y:event.clientY};});
preset.addEventListener('pointermove',event=>{
  if(!drag)return;const delta=event.clientX-drag.x+drag.y-event.clientY;
  if(Math.abs(delta)>=18){turn(delta>0?1:-1);drag={x:event.clientX,y:event.clientY};}
});
for(const event of ['pointerup','pointercancel','lostpointercapture'])preset.addEventListener(event,()=>{drag=null;});
preset.addEventListener('wheel',event=>{
  if(event.ctrlKey||event.metaKey)return;event.preventDefault();scroll+=event.deltaY||event.deltaX;
  if(Math.abs(scroll)>24){turn(scroll>0?1:-1);scroll=0;}
},{passive:false});
