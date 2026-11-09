import { SOUND_CATALOG, soundById } from './minimal-sounds.mjs';
import { Session, STORAGE_KEY, TEMPO } from './minimal-session.mjs';
import { label, alternatives } from './minimal-harmony.mjs';
import { Piano } from './minimal-audio.mjs';

const $ = id => document.getElementById(id);
let saved;
try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { /* First visit or unavailable storage. */ }
const session = new Session(saved), piano = new Piano();
piano.setSound?.(session.soundId);
const pads = [...document.querySelectorAll('[data-slot]')];
const seconds = 60 / TEMPO * 2;
let playing = false, launching = false, sounding = -1, token = 0;
let interval, frame, auditionTimer, statusTimer;
let nextTime = 0, nextSlot = 0, visualQueue = [], dialAngle = 0;

function feedback(message, error = false) {
  $('feedback').textContent = message;
  $('feedback').classList.toggle('error', error);
}
function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(session.snapshot())); }
  catch { feedback('Speichern ist hier nicht möglich. Deine Akkorde bleiben für diese Sitzung.'); }
}
function render(status) {
  const names = session.names();
  const sound=soundById(session.soundId),preset=$('preset');
  $('preset-name').textContent=sound.name;
  if(preset){
    preset.setAttribute('aria-valuemax',SOUND_CATALOG.length-1);
    preset.setAttribute('aria-valuenow',SOUND_CATALOG.findIndex(s=>s.id===sound.id));
    preset.setAttribute('aria-valuetext',sound.name+(sound.bank?' · '+sound.bank:''));
    preset.style.setProperty('--preset-turn',`${SOUND_CATALOG.findIndex(s=>s.id===sound.id)*22}deg`);
  }
  $('chord-name').textContent = names[session.selected];
  $('slot-indicator').textContent = `0${session.selected + 1} / 04`;
  if (status) $('status').textContent = status;
  else $('status').textContent = playing ? 'LOOP' : 'BEREIT';
  for (let i = 0; i < pads.length; i++) {
    pads[i].querySelector('.pad-name').textContent = names[i];
    pads[i].classList.toggle('selected', i === session.selected);
    pads[i].classList.toggle('sounding', i === sounding);
    pads[i].setAttribute('aria-pressed', String(i === session.selected));
    pads[i].setAttribute('aria-label', `Akkord ${i + 1}: ${names[i]}${playing ? ' auswählen' : ' spielen'}${i === sounding ? ', gerade hörbar' : ''}`);
  }
  $('undo').disabled = session.history.length === 0;
  $('play').setAttribute('aria-pressed', String(playing || launching));
  $('play').setAttribute('aria-label', playing || launching ? 'Loop stoppen' : 'Loop starten');
  $('play-label').textContent = playing || launching ? 'STOP' : 'PLAY';
  $('play-icon').setAttribute('d', playing || launching ? 'M8 8H24V24H8Z' : 'M10 6L26 16 10 26Z');
  const deck = session.deck || { position: 0, chords: alternatives(session.steps, session.selected) };
  $('variation').setAttribute('aria-valuemax', deck.chords.length - 1);
  $('variation').setAttribute('aria-valuenow', deck.position);
  $('variation').setAttribute('aria-valuetext', names[session.selected]);
  $('variation').style.setProperty('--turn', `${dialAngle}deg`);
}
function stop(message) {
  token++; launching = false; playing = false; sounding = -1;
  clearInterval(interval); cancelAnimationFrame(frame); clearTimeout(auditionTimer); clearTimeout(statusTimer);
  visualQueue = []; piano.silence(); render();
  if (message) feedback(message);
}
async function withAudio(action) {
  const request = ++token;
  try {
    // ready() starts/resumes audio synchronously before its first await.
    await piano.ready();
    if(await piano.prepareSound?.()===false)return;
    if (request !== token || document.hidden) return;
    action();
  } catch (error) {
    if (request !== token) return;
    stop(); render('TON PAUSIERT'); feedback(error.message || 'Ton konnte nicht starten. Bitte erneut tippen.', true);
  }
}
function audition(status = 'SPIELEN') {
  void withAudio(() => {
    piano.silence();
    sounding = session.selected;
    piano.chord(session.voices()[session.selected], piano.context.currentTime + .01, 1.1, session.selected);
    render(status);
    clearTimeout(auditionTimer);
    auditionTimer = setTimeout(() => { sounding = -1; render(); }, 2050);
  });
}
function select(index) {
  if (!session.select(index)) return;
  clearTimeout(statusTimer);
  if (playing || launching) render();
  else audition();
}
function vary(direction) {
  clearTimeout(statusTimer);
  session.vary(direction); dialAngle += direction * 22;
  render('VORSCHLAG');
  feedback(playing ? 'Die Änderung erklingt beim nächsten Einsatz.' : `${label(session.steps[session.selected])} · passt zu deinen anderen Akkorden.`);
  persist();
  if (!playing && !launching) audition('VORSCHLAG');
}
function chooseSound(direction) {
  if(direction!==1 && direction!==-1)return;
  const index=SOUND_CATALOG.findIndex(s=>s.id===session.soundId);
  session.soundId=SOUND_CATALOG[(index+direction+SOUND_CATALOG.length)%SOUND_CATALOG.length].id;
  piano.setSound(session.soundId);render('SOUND');persist();
  feedback(soundById(session.soundId).name);
  if(launching){stop();togglePlay();}
  else if(playing)void withAudio(()=>render('LOOP'));
  else audition('SOUND');
}
window.addEventListener('fm1-preset',event=>chooseSound(event.detail));
function undo() {
  if (!session.undo()) return;
  feedback('Letzte Änderung zurückgenommen.'); persist(); render('ZURÜCK');
  if (!playing && !launching) audition('ZURÜCK');
  render('ZURÜCK');
  clearTimeout(statusTimer); statusTimer = setTimeout(() => render(), 1100);
}
function schedule() {
  const now = piano.context.currentTime;
  // Discard an overdue sequence after a stalled/background tab; never burst old notes.
  if (nextTime < now - .15) { stop('Loop pausiert. Mit Play geht’s weiter.'); return; }
  while (nextTime < now + .08) {
    piano.chord(session.voices()[nextSlot], nextTime, seconds * .88, nextSlot);
    visualQueue.push({ at: nextTime, slot: nextSlot });
    nextTime += seconds; nextSlot = (nextSlot + 1) % 4;
  }
}
function drawPlayback() {
  if (!playing) return;
  let changed = false;
  while (visualQueue.length && visualQueue[0].at <= piano.context.currentTime) {
    sounding = visualQueue.shift().slot; changed = true;
  }
  if (changed) render();
  frame = requestAnimationFrame(drawPlayback);
}
function togglePlay() {
  if (playing || launching) { stop('Deine Folge bleibt hier.'); return; }
  launching = true; render();
  void withAudio(() => {
    launching = false; playing = true; piano.silence(); clearTimeout(auditionTimer); clearTimeout(statusTimer);
    sounding = -1; nextSlot = 0; nextTime = piano.context.currentTime + .035; visualQueue = [];
    feedback('Deine Folge läuft. Du kannst jeden Akkord weiter verändern.');
    render(); schedule();
    interval = setInterval(schedule, 25); frame = requestAnimationFrame(drawPlayback);
  });
}

pads.forEach((pad, index) => pad.addEventListener('click', () => select(index)));
$('next').addEventListener('click', () => vary(1));
$('previous').addEventListener('click', () => vary(-1));
$('undo').addEventListener('click', undo);
$('play').addEventListener('click', togglePlay);
$('variation').addEventListener('keydown', event => {
  if (['ArrowRight','ArrowUp','ArrowLeft','ArrowDown'].includes(event.key)) {
    event.preventDefault(); vary(['ArrowRight','ArrowUp'].includes(event.key) ? 1 : -1);
  }
  if (['Home','End'].includes(event.key)) {
    event.preventDefault();
    const deck = session.deck || { position: 0, chords: alternatives(session.steps, session.selected) };
    const target = event.key === 'Home' ? 0 : deck.chords.length - 1;
    const direction = target > deck.position ? 1 : -1;
    for (let i = Math.abs(target - deck.position); i > 0; i--) vary(direction);
  }
});
let drag = null;
$('variation').addEventListener('pointerdown', event => {
  if (event.button !== 0) return;
  $('variation').focus(); $('variation').setPointerCapture(event.pointerId);
  drag = { x: event.clientX, y: event.clientY };
});
$('variation').addEventListener('pointermove', event => {
  if (!drag) return;
  const change = (event.clientX - drag.x) + (drag.y - event.clientY);
  if (Math.abs(change) >= 18) { vary(change > 0 ? 1 : -1); drag = { x: event.clientX, y: event.clientY }; }
});
for (const event of ['pointerup','pointercancel','lostpointercapture']) $('variation').addEventListener(event, () => { drag = null; });
let wheel = 0;
$('variation').addEventListener('wheel', event => {
  if (event.ctrlKey || event.metaKey) return;
  event.preventDefault(); wheel += event.deltaY || event.deltaX;
  if (Math.abs(wheel) > 24) { vary(wheel > 0 ? 1 : -1); wheel = 0; }
}, { passive: false });
document.addEventListener('keydown', event => {
  if (event.repeat || event.altKey || event.target.closest('input,textarea,select,[contenteditable=true]')) return;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') { event.preventDefault(); undo(); return; }
  if (event.ctrlKey || event.metaKey) return;
  if (/^[1-4]$/.test(event.key)) { event.preventDefault(); select(Number(event.key) - 1); }
  if (event.code === 'Space') { event.preventDefault(); togglePlay(); }
  if (event.target.id !== 'variation' && ['ArrowLeft','ArrowRight'].includes(event.key)) {
    event.preventDefault(); vary(event.key === 'ArrowRight' ? 1 : -1);
  }
});
piano.onInterrupt = () => stop('Ton pausiert. Tippe einen Akkord oder Play zum Fortsetzen.');
document.addEventListener('visibilitychange', () => { if (document.hidden) stop('Loop pausiert. Mit Play geht’s weiter.'); });
window.addEventListener('pagehide', () => stop());
window.addEventListener('pageshow', event => { if (event.persisted) stop(); });
render();
