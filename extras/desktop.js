const catKey = 'ko-os-cat-restored';
const catTimeout = 8500;
const istanbulTime = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Istanbul',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export function initDesktopExtras() {
  const recycle = document.querySelector('[data-recycle]');
  const cat = document.querySelector('[data-cat]');
  const saver = document.querySelector('#screensaver');
  if (recycle && cat) initCat(recycle, cat);
  if (saver) initScreensaver(saver);
}

function initCat(recycle, cat) {
  recycle.innerHTML = `
    <div class="recycle-file">
      <span class="recycle-file-icon" aria-hidden="true"> &gt;_</span>
      <div><h2>cat.exe</h2><p>Found sleeping in the Recycle Bin.</p></div>
    </div>
    <button class="btn" type="button">Restore cat.exe</button>
    <p class="recycle-message" role="status"></p>`;
  cat.innerHTML = `
    <button type="button" aria-label="Pet the taskbar cat" title="Pet the taskbar cat">
      <canvas width="24" height="15" aria-hidden="true"></canvas>
    </button>`;

  const action = recycle.querySelector('button');
  const description = recycle.querySelector('.recycle-file p');
  const message = recycle.querySelector('[role="status"]');
  const pet = cat.querySelector('button');
  const sprite = cat.querySelector('canvas').getContext('2d');
  let restored = false;
  let sleepTimer;
  let lastWindow;

  try { restored = localStorage.getItem(catKey) === '1'; } catch {}

  function wake(petted = false) {
    if (!restored) return;
    clearTimeout(sleepTimer);
    drawCat(sprite, false, petted);
    sleepTimer = setTimeout(() => drawCat(sprite, true), catTimeout);
  }

  function showCat() {
    cat.hidden = !restored;
    action.textContent = restored ? 'Put cat.exe back' : 'Restore cat.exe';
    description.textContent = restored ? 'Now keeping an eye on the taskbar.' : 'Found sleeping in the Recycle Bin.';
    if (restored) wake();
    else clearTimeout(sleepTimer);
  }

  action.addEventListener('click', () => {
    restored = !restored;
    try { localStorage.setItem(catKey, restored ? '1' : '0'); } catch {}
    showCat();
    message.textContent = restored ? 'cat.exe restored to the taskbar.' : 'cat.exe is back in the Recycle Bin.';
  });
  pet.addEventListener('click', () => wake(true));

  const desktop = document.querySelector('#desk');
  if (desktop) {
    lastWindow = desktop.querySelector('.win.active');
    const observer = new MutationObserver(() => {
      const active = desktop.querySelector('.win.active');
      if (active && active !== lastWindow) wake();
      lastWindow = active;
    });
    desktop.querySelectorAll('.win').forEach(win => {
      observer.observe(win, { attributes: true, attributeFilter: ['class', 'data-state'] });
    });
  }

  showCat();
}

function drawCat(ctx, sleeping, petted = false) {
  if (!ctx) return;
  const rows = [
    '....d...d',
    '...dtd.dtd',
    '...dtodotd',
    '...dooooood',
    '..dooooooood',
    '..dooooooood',
    '..doyoyoood......ddd',
    '...dyyyyoddddd..dood',
    '....ddddooooood..dd',
    '....doooooooooood.d',
    '....dooooooooooood',
    '...doyoooyooooood',
    '...dddddddddddddd',
  ];
  const colors = { d: '#312338', o: '#eea34f', y: '#ffcf81', t: '#db7780' };
  ctx.clearRect(0, 0, 24, 15);
  rows.forEach((row, y) => [...row].forEach((pixel, x) => {
    if (pixel in colors) block(ctx, colors[pixel], x, y + 1, 1, 1);
  }));
  const eye = '#382947';
  block(ctx, eye, sleeping ? 3 : 4, 6, sleeping ? 2 : 1, 1);
  block(ctx, eye, 8, 6, sleeping ? 2 : 1, 1);
  block(ctx, '#b65065', 6, 7, 1, 1);
  if (sleeping) {
    block(ctx, '#3a4c77', 15, 2, 4, 1);
    block(ctx, '#3a4c77', 17, 3, 1, 1);
    block(ctx, '#3a4c77', 16, 4, 1, 1);
    block(ctx, '#3a4c77', 15, 5, 4, 1);
  } else if (petted) {
    block(ctx, '#9c3f67', 14, 2, 2, 2);
    block(ctx, '#9c3f67', 17, 2, 2, 2);
    block(ctx, '#d96983', 15, 3, 3, 2);
    block(ctx, '#d96983', 16, 5, 1, 1);
  }
}

const tones = {
  Day: {
    sky: ['#275a88', '#3f83a8', '#66aabc', '#9fc9cd', '#d7dfcd'],
    cloud: '#cce6de', celestial: '#fff0a8', hills: '#719aaa', bank: '#4d7188',
    houses: ['#3b627c', '#486b80', '#54778a'], shore: '#264b64', lamps: '#afcdd1',
    water: '#326d91', deep: '#244c73', waves: ['#84baca', '#538fab', '#3c779b'],
    bridge: '#365972', bridgeLights: '#adccd4', glow: '#d5d7b8',
  },
  Sunset: {
    sky: ['#33264d', '#5a3c66', '#9b607e', '#d78b81', '#ffbd80'],
    cloud: '#f5a28b', celestial: '#ffdf9e', hills: '#866781', bank: '#604b65',
    houses: ['#51445f', '#594860', '#6f5368'], shore: '#42344f', lamps: '#f0ad76',
    water: '#68597c', deep: '#3e4267', waves: ['#c8878e', '#875d7f', '#665476'],
    bridge: '#58435f', bridgeLights: '#f7b183', glow: '#d6867e',
  },
  Night: {
    sky: ['#0b1128', '#111c37', '#17263d', '#243348', '#3a4959'],
    cloud: '#3d4d61', celestial: '#f5deb4', hills: '#334558', bank: '#26364c',
    houses: ['#26334a', '#2d3c52', '#36455a'], shore: '#1e2a40', lamps: '#efaf6d',
    water: '#294259', deep: '#15263d', waves: ['#718d9d', '#49687c', '#334e66'],
    bridge: '#435970', bridgeLights: '#f4ae75', glow: '#b88d75',
  },
};

const sceneWidth = 320;
const sceneHeight = 180;
const shoreY = 111;

function block(ctx, color, x, y, width, height) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), width, height);
}

function pixelLine(ctx, color, x, y, endX, endY) {
  const dx = Math.abs(endX - x);
  const dy = -Math.abs(endY - y);
  const stepX = x < endX ? 1 : -1;
  const stepY = y < endY ? 1 : -1;
  let error = dx + dy;
  ctx.fillStyle = color;
  while (true) {
    ctx.fillRect(x, y, 1, 1);
    if (x === endX && y === endY) return;
    const movement = 2 * error;
    if (movement >= dy) { error += dy; x += stepX; }
    if (movement <= dx) { error += dx; y += stepY; }
  }
}

function pixelDisc(ctx, color, centerX, centerY, radius) {
  for (let y = -radius; y <= radius; y++) {
    const width = Math.floor(Math.sqrt(radius * radius - y * y));
    block(ctx, color, centerX - width, centerY + y, width * 2 + 1, 1);
  }
}

function landscape(ctx, phase) {
  const palette = tones[phase];
  palette.sky.forEach((color, band) => block(ctx, color, 0, band * 24, sceneWidth, 24));
  const skyX = 248;
  const skyY = phase === 'Sunset' ? 78 : 34;
  const skyRadius = phase === 'Sunset' ? 17 : 11;
  if (phase === 'Night') {
    const starPoints = [[15, 21], [23, 61], [37, 38], [62, 13], [68, 44], [90, 30], [105, 59], [121, 17], [132, 43], [155, 25], [165, 58], [189, 12], [193, 44], [213, 26], [225, 55], [277, 24], [294, 16], [308, 50]];
    starPoints.forEach(([x, y], i) => block(ctx, i % 3 === 0 ? '#ffeccb' : '#8195af', x, y, i % 6 === 0 ? 2 : 1, 1));
  }
  pixelDisc(ctx, palette.celestial, skyX, skyY, skyRadius);
  if (phase === 'Night') pixelDisc(ctx, palette.sky[1], skyX + 5, skyY - 4, 10);
  for (const [x, y, width] of [[23, 40, 43], [103, 56, 32], [276, 61, 34]]) {
    block(ctx, palette.cloud, x + 7, y, width - 18, 2);
    block(ctx, palette.cloud, x, y + 2, width, 2);
    block(ctx, palette.cloud, x + 12, y + 4, width - 9, 1);
  }

  for (let x = 0; x < sceneWidth; x += 2) {
    const hill = Math.round(99 + 5 * Math.sin(x * 0.033) + 5 * Math.cos(x * 0.071));
    block(ctx, palette.hills, x, hill, 2, shoreY - hill);
  }
  for (let x = 155, i = 0; x < sceneWidth; i++) {
    const width = 5 + ((i * 7) % 9);
    const height = 6 + ((i * 11) % 14);
    const base = shoreY - height;
    block(ctx, palette.houses[i % 3], x, base, width, height);
    block(ctx, palette.bank, x + 1, base - 2, width - 2, 2);
    if (i % 2 === 0) {
      block(ctx, palette.lamps, x + 2, base + 4, 1, 2);
      block(ctx, palette.lamps, x + 2, base + 9, 1, 1);
    }
    x += width - 1;
  }

  const back = palette.shore;
  // Stylized mosque and tower silhouettes along the far bank.
  block(ctx, back, 197, 95, 29, 16);
  block(ctx, back, 201, 90, 21, 5);
  block(ctx, back, 205, 86, 13, 4);
  block(ctx, back, 209, 83, 5, 3);
  block(ctx, back, 211, 80, 1, 3);
  for (const x of [191, 230]) {
    block(ctx, back, x, 82, 2, 29);
    block(ctx, back, x - 1, 86, 4, 2);
    block(ctx, back, x, 78, 1, 4);
  }
  block(ctx, back, 268, 85, 12, 26);
  block(ctx, back, 265, 83, 18, 3);
  block(ctx, back, 268, 79, 12, 4);
  block(ctx, back, 270, 75, 8, 4);
  block(ctx, back, 272, 71, 4, 4);
  block(ctx, back, 273, 68, 2, 3);
  block(ctx, palette.lamps, 272, 89, 2, 3);
  block(ctx, palette.lamps, 277, 89, 2, 3);
  block(ctx, back, 0, shoreY - 2, sceneWidth, 3);
  block(ctx, palette.glow, 0, shoreY + 1, sceneWidth, 1);

  block(ctx, palette.water, 0, shoreY + 2, sceneWidth, sceneHeight - shoreY - 2);
  block(ctx, palette.deep, 0, 157, sceneWidth, 23);
  const bridgeEnds = [7, 150];
  const bridgeTowers = [38, 116];
  block(ctx, palette.bridge, bridgeEnds[0], 101, bridgeEnds[1] - bridgeEnds[0], 3);
  for (const x of bridgeTowers) {
    block(ctx, palette.bridge, x - 2, 63, 3, 51);
    block(ctx, palette.bridge, x + 2, 63, 2, 51);
    block(ctx, palette.bridge, x - 2, 69, 6, 2);
    block(ctx, palette.bridge, x - 2, 84, 6, 2);
  }
  pixelLine(ctx, palette.bridge, bridgeEnds[0], 100, bridgeTowers[0], 65);
  pixelLine(ctx, palette.bridge, bridgeTowers[1], 65, bridgeEnds[1], 100);
  let previousY = 65;
  for (let x = bridgeTowers[0] + 1; x <= bridgeTowers[1]; x++) {
    const position = (x - 77) / 39;
    const y = Math.round(65 + 30 * (1 - position * position));
    pixelLine(ctx, palette.bridge, x - 1, previousY, x, y);
    if (x % 7 === 0) pixelLine(ctx, palette.bridge, x, y, x, 101);
    previousY = y;
  }
  for (let x = bridgeEnds[0] + 2; x < bridgeEnds[1]; x += 7) block(ctx, palette.bridgeLights, x, 101, 2, 1);
  return palette;
}

function drawWater(ctx, palette, seconds) {
  for (let i = 0; i < 80; i++) {
    const y = shoreY + 5 + ((i * 13) % 62);
    const drift = (Math.floor(seconds * ((i % 2) ? 4 : 7)) % 38);
    const x = ((i * 47 + drift) % (sceneWidth + 22)) - 11;
    block(ctx, palette.waves[i % 3], x, y, 2 + (i * 7) % 13, 1);
  }
}

function drawFerry(ctx, x, y, seconds) {
  const charcoal = '#262944';
  const cream = '#fff0cf';
  const red = '#b65355';
  block(ctx, '#a7c4ca', x - 9, y + 16, 64, 1);
  block(ctx, '#648ca1', x - 21, y + 19, 83, 1);
  block(ctx, charcoal, x + 3, y + 13, 59, 3);
  block(ctx, charcoal, x + 8, y + 16, 49, 2);
  block(ctx, red, x, y + 10, 65, 3);
  block(ctx, cream, x + 1, y + 8, 61, 3);
  block(ctx, cream, x + 8, y + 2, 47, 7);
  block(ctx, charcoal, x + 7, y + 1, 49, 1);
  block(ctx, cream, x + 14, y - 4, 33, 5);
  block(ctx, charcoal, x + 13, y - 5, 35, 1);
  block(ctx, red, x + 23, y - 11, 6, 6);
  block(ctx, charcoal, x + 22, y - 12, 8, 2);
  block(ctx, cream, x + 38, y - 10, 1, 5);
  block(ctx, red, x + 39, y - 10, 4, 2);
  for (let i = 0; i < 8; i++) block(ctx, '#457296', x + 11 + i * 5, y + 4, 3, 3);
  for (let i = 0; i < 5; i++) block(ctx, '#537e9d', x + 16 + i * 6, y - 3, 3, 2);
  block(ctx, '#ffe594', x + 57, y + 6, 3, 2);
  for (let i = 0; i < 3; i++) {
    const rise = (Math.floor(seconds * 8) + i * 4) % 12;
    block(ctx, '#7c8394', x + 25 - rise, y - 15 - Math.floor(rise / 2), 2, 1);
  }
}

function initScreensaver(mount) {
  mount.innerHTML = `
    <dialog class="bosphorus-saver" aria-labelledby="screensaver-title">
      <div class="bosphorus-frame">
        <header class="bosphorus-titlebar">
          <h2 id="screensaver-title">bosphorus.scr</h2>
          <button class="btn" type="button">Exit</button>
        </header>
        <canvas width="${sceneWidth}" height="${sceneHeight}" role="img" aria-label="Pixel-art Istanbul skyline and a ferry on the Bosphorus"></canvas>
        <footer class="bosphorus-footer"><span>Bosphorus, Istanbul</span><span class="bosphorus-time"></span></footer>
      </div>
    </dialog>`;

  const saver = mount.querySelector('dialog');
  const closeButton = mount.querySelector('button');
  const timeLabel = mount.querySelector('.bosphorus-time');
  const view = mount.querySelector('canvas').getContext('2d');
  const backdrop = document.createElement('canvas');
  backdrop.width = sceneWidth;
  backdrop.height = sceneHeight;
  const background = backdrop.getContext('2d');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let openedAt = 0;
  let lastFrame = 0;
  let lastMinute;
  let currentPhase;
  let returnFocus;

  function render(seconds) {
    if (!background || !view) return;
    const now = Date.now();
    const minute = Math.floor(now / 60000);
    if (minute !== lastMinute) {
      const clock = istanbulTime.format(now);
      const hour = Number(clock.slice(0, 2));
      const phase = hour >= 6 && hour < 17 ? 'Day' : hour >= 17 && hour < 20 ? 'Sunset' : 'Night';
      if (phase !== currentPhase) {
        landscape(background, phase);
        currentPhase = phase;
      }
      timeLabel.textContent = `${phase} · ${clock}`;
      lastMinute = minute;
    }
    const palette = tones[currentPhase];
    view.drawImage(backdrop, 0, 0);
    drawWater(view, palette, seconds);
    const x = (150 + seconds * 19) % (sceneWidth + 86) - 65;
    const y = 129 + Math.floor(1.5 * Math.sin(seconds * 2.2));
    drawFerry(view, x, y, seconds);
  }

  function schedule(now) {
    if (!saver.open || reducedMotion.matches) return;
    if (now - lastFrame > 54) {
      render((now - openedAt) / 1000);
      lastFrame = now;
    }
    frame = requestAnimationFrame(schedule);
  }

  function openSaver(trigger) {
    if (saver.open) return;
    const start = document.querySelector('#startbtn');
    returnFocus = trigger.closest('#start') && start ? start : trigger;
    if (trigger.closest('#start') && start?.getAttribute('aria-expanded') === 'true') start.click();
    mount.hidden = false;
    saver.showModal();
    closeButton.focus();
    render(0);
    openedAt = performance.now();
    lastFrame = openedAt;
    if (!reducedMotion.matches) frame = requestAnimationFrame(schedule);
  }

  document.querySelectorAll('[data-screensaver]').forEach(trigger => {
    trigger.addEventListener('click', () => openSaver(trigger));
  });
  closeButton.addEventListener('click', () => saver.close());
  saver.addEventListener('close', () => {
    cancelAnimationFrame(frame);
    mount.hidden = true;
    returnFocus?.focus();
  });
  reducedMotion.addEventListener('change', () => {
    if (!saver.open) return;
    cancelAnimationFrame(frame);
    if (reducedMotion.matches) render(0);
    else frame = requestAnimationFrame(schedule);
  });
}
