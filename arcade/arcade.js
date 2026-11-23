import { orbit } from './orbit.js';
import { circuit } from './circuit.js';
import { signal } from './signal.js';

const games = [orbit, circuit, signal];
const arcade = document.querySelector('#arcade');
const canvas = arcade.querySelector('canvas');
const picker = [...arcade.querySelectorAll('[data-game]')];
const instructions = arcade.querySelector('.arcade-help');
const controls = arcade.querySelector('.arcade-inputs');
const overlay = arcade.querySelector('.arcade-overlay');
const play = arcade.querySelector('.arcade-play');
const pauseButton = arcade.querySelector('.arcade-pause');
const reset = arcade.querySelector('.arcade-reset');
const printScore = arcade.querySelector('[data-receipt="arcade"]');
const stateLabel = arcade.querySelector('.arcade-state');
const scoreLabel = arcade.querySelector('.arcade-score');
const bestLabel = arcade.querySelector('.arcade-best');
const startMenu = document.querySelector('#start');
const powerScreen = document.querySelector('#off');

const roundStates = {
  ready: { label: 'Ready', button: 'Play' },
  playing: { label: 'Playing', button: 'Play' },
  paused: { label: 'Paused', button: 'Resume' },
  won: { label: 'You won!', button: 'Play again' },
  lost: { label: 'Round over', button: 'Try again' },
};

let game;
let round;
let phase;
let best;
let frameId;
let lastFrameTime;

function bestKey() {
  return 'ko-arcade-best-' + game.id;
}

function canPlay() {
  return arcade.dataset.state === 'open' && arcade.classList.contains('active') &&
    startMenu.hidden && powerScreen.hidden && !document.hidden;
}

function setPhase(next) {
  phase = next;
  const playing = next === 'playing';
  const state = roundStates[next];
  overlay.hidden = playing;
  play.textContent = state.button;
  stateLabel.textContent = state.label;
  pauseButton.disabled = !playing;
  printScore.disabled = next === 'ready';
  for (const button of controls.children) button.disabled = !playing;

  cancelAnimationFrame(frameId);
  frameId = undefined;
  lastFrameTime = undefined;
  if (playing && game.animated !== false) frameId = requestAnimationFrame(tick);
}

function update(elapsed) {
  const { score, status } = round.step(elapsed);
  round.draw();
  if (scoreLabel.textContent !== String(score)) scoreLabel.textContent = score;
  if (score > best) {
    best = score;
    bestLabel.textContent = best;
    try { localStorage.setItem(bestKey(), String(best)); } catch {}
  }
  if (phase === 'playing' && status !== 'playing') {
    const moveFocus = canvas === document.activeElement || controls.contains(document.activeElement);
    setPhase(status);
    if (moveFocus) play.focus({preventScroll: true});
  }
}

function tick(time) {
  if (!canPlay()) {
    pause();
    return;
  }
  const elapsed = lastFrameTime === undefined ? 0 : Math.min(time - lastFrameTime, 50);
  lastFrameTime = time;
  update(elapsed);
  if (phase === 'playing') frameId = requestAnimationFrame(tick);
}

function pause() {
  if (phase === 'playing') setPhase('paused');
}

function start(resetRound) {
  if (!canPlay()) return;
  if (resetRound) round.reset();
  setPhase('playing');
  update(0);
  canvas.focus({preventScroll: true});
}

function sendInput(action) {
  if (phase !== 'playing' || !canPlay()) return;
  round.input(action);
  update(0);
}

function selectGame(next) {
  if (game === next) return;
  game = next;
  round = game.create(canvas);
  round.reset();
  best = 0;
  try {
    const stored = Number(localStorage.getItem(bestKey()));
    if (Number.isSafeInteger(stored) && stored > 0) best = stored;
  } catch {}
  bestLabel.textContent = best;
  instructions.textContent = game.instructions;
  canvas.setAttribute('aria-label', game.name + ' game board');
  for (const button of picker) button.setAttribute('aria-pressed', String(button.dataset.game === game.id));

  controls.replaceChildren(...game.controls.map(control => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn';
    button.textContent = control.label;
    button.setAttribute('aria-label', control.name);
    const shortcuts = control.keys.map(key => key === ' ' ? 'Space' : key.length === 1 ? key.toUpperCase() : key);
    button.setAttribute('aria-keyshortcuts', shortcuts.join(' '));
    button.title = control.name + ' (' + shortcuts.map(key => key.replace('Arrow', '')).join(' / ') + ')';
    button.addEventListener('click', () => sendInput(control.action));
    return button;
  }));
  setPhase('ready');
  update(0);
}

for (const button of picker) {
  button.addEventListener('click', () => selectGame(games.find(entry => entry.id === button.dataset.game)));
}
play.addEventListener('click', () => start(phase !== 'paused'));
reset.addEventListener('click', () => start(true));
pauseButton.addEventListener('click', () => {
  pause();
  play.focus({preventScroll: true});
});

arcade.addEventListener('keydown', event => {
  if (phase !== 'playing' || !canPlay() || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key === 'Escape') {
    pause();
    play.focus({preventScroll: true});
    return;
  }
  if ((event.key === 'Enter' || event.key === ' ') && event.target.closest('button')) return;
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  const control = game.controls.find(entry => entry.keys.includes(key));
  if (!control) return;
  event.preventDefault();
  if (!event.repeat || control.repeat !== false) sendInput(control.action);
});

canvas.addEventListener('click', event => {
  if (phase !== 'playing' || !canPlay() || !round.pointer) return;
  const bounds = canvas.getBoundingClientRect();
  round.pointer((event.clientX - bounds.left) * canvas.width / bounds.width,
    (event.clientY - bounds.top) * canvas.height / bounds.height);
  update(0);
});

const observer = new MutationObserver(() => {
  if (!canPlay()) pause();
});
observer.observe(arcade, {attributeFilter: ['class', 'data-state']});
for (const screen of [startMenu, powerScreen]) observer.observe(screen, {attributeFilter: ['hidden']});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause();
});
window.addEventListener('blur', pause);

selectGame(games[0]);
document.querySelector('#icons [data-open="arcade"]').hidden = false;
document.querySelector('#start [data-open="arcade"]').parentElement.hidden = false;
