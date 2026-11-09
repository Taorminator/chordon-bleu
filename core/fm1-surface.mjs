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

// SELECT controls tempo; PRESETS selects sounds. Both are relative encoders.
for(const [id,eventName] of [['preset','fm1-preset'],['tempo','fm1-tempo']]){
  const knob=document.getElementById(id);
  const turn=direction=>window.dispatchEvent(new CustomEvent(eventName,{detail:direction}));
  knob.addEventListener('keydown',event=>{
    if(['ArrowUp','ArrowRight','ArrowDown','ArrowLeft'].includes(event.key)){
      event.preventDefault();event.stopPropagation();turn(['ArrowUp','ArrowRight'].includes(event.key)?1:-1);
    }
  });
  let drag=null,scroll=0;
  knob.addEventListener('pointerdown',event=>{if(event.button!==0)return;knob.focus();knob.setPointerCapture(event.pointerId);drag={x:event.clientX,y:event.clientY};});
  knob.addEventListener('pointermove',event=>{
    if(!drag)return;const delta=event.clientX-drag.x+drag.y-event.clientY;
    if(Math.abs(delta)>=18){turn(delta>0?1:-1);drag={x:event.clientX,y:event.clientY};}
  });
  for(const event of ['pointerup','pointercancel','lostpointercapture'])knob.addEventListener(event,()=>{drag=null;});
  knob.addEventListener('wheel',event=>{
    if(event.ctrlKey||event.metaKey)return;event.preventDefault();scroll+=event.deltaY||event.deltaX;
    if(Math.abs(scroll)>24){turn(scroll>0?1:-1);scroll=0;}
  },{passive:false});
}
