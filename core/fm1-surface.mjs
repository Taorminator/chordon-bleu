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
