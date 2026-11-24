const colors = [
  { name: 'Sunflower', ink: '#ffdc53', edge: '#473714' },
  { name: 'Pink', ink: '#ed5da1', edge: '#4e1738' },
  { name: 'Chalk', ink: '#fffdf2', edge: '#312e2b' },
  { name: 'Graphite', ink: '#22283f', edge: '#f5ead5' },
];

const coordinateMax = 1023;
const maxStrokes = 50;
const maxStrokePoints = 240;
const maxSharedPoints = 600;
const maxSharedBytes = maxStrokes * 2 + maxSharedPoints * 3;

// Pack each point into three bytes, with a color and point count per stroke.
function encodeInk(strokes) {
  const minimum = strokes.reduce((sum, stroke) => sum + Math.min(2, stroke.points.length), 0);
  const total = strokes.reduce((sum, stroke) => sum + stroke.points.length, 0);
  const extraRatio = total > maxSharedPoints ? (maxSharedPoints - minimum) / (total - minimum) : 1;
  const bytes = [];

  for (const { color, points } of strokes) {
    const keep = Math.min(2, points.length);
    const count = keep + Math.floor((points.length - keep) * extraRatio);
    bytes.push(color, count);
    for (let i = 0; i < count; i++) {
      const source = count === 1 ? 0 : Math.round(i * (points.length - 1) / (count - 1));
      const [x, y] = points[source];
      const point = (x << 10) | y;
      bytes.push(point >> 16, (point >> 8) & 255, point & 255);
    }
  }

  return btoa(String.fromCharCode(...bytes));
}

function decodeInk(encoded) {
  if (typeof encoded !== 'string' || encoded.length > 4 * Math.ceil(maxSharedBytes / 3)) return null;
  let bytes;
  try { bytes = atob(encoded); } catch { return null; }
  if (bytes.length > maxSharedBytes) return null;

  const strokes = [];
  let pointCount = 0;
  let offset = 0;
  while (offset < bytes.length) {
    if (strokes.length >= maxStrokes || offset + 2 > bytes.length) return null;
    const color = bytes.charCodeAt(offset++);
    const count = bytes.charCodeAt(offset++);
    pointCount += count;
    if (color >= colors.length || count < 1 || count > maxStrokePoints || pointCount > maxSharedPoints
        || offset + count * 3 > bytes.length) return null;

    const points = [];
    for (let i = 0; i < count; i++) {
      const high = bytes.charCodeAt(offset++);
      if (high > 15) return null;
      const point = (high << 16) | (bytes.charCodeAt(offset++) << 8) | bytes.charCodeAt(offset++);
      points.push([point >> 10, point & coordinateMax]);
    }
    strokes.push({ color, points });
  }
  return strokes;
}

export function initDesktopInk({ desk }) {
  const canvas = document.createElement('canvas');
  canvas.className = 'desktop-ink-canvas';
  canvas.setAttribute('aria-hidden', 'true');

  const tools = document.createElement('div');
  tools.className = 'desktop-ink-tools';
  tools.setAttribute('role', 'group');
  tools.setAttribute('aria-label', 'Desktop drawing tools');
  tools.hidden = true;
  tools.innerHTML = `
    <span class="desktop-ink-label">Desktop Ink</span>
    <div class="desktop-ink-swatches" role="group" aria-label="Pen color"></div>
    <div class="desktop-ink-actions">
      <button class="btn" type="button" data-ink-undo>Undo</button>
      <button class="btn" type="button" data-ink-clear>Clear</button>
      <button class="btn" type="button" data-ink-done>Done</button>
    </div>
    <p class="desktop-ink-message" role="status"></p>`;
  desk.append(canvas, tools);

  const context = canvas.getContext('2d');
  const swatches = tools.querySelector('.desktop-ink-swatches');
  const undo = tools.querySelector('[data-ink-undo]');
  const clear = tools.querySelector('[data-ink-clear]');
  const done = tools.querySelector('[data-ink-done]');
  const message = tools.querySelector('.desktop-ink-message');
  let strokes = [];
  let cleared = null;
  let color = 0;
  let active = false;
  let pointerId = null;
  let frame = null;

  for (const [index, pen] of colors.entries()) {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.style.setProperty('--pen-ink', pen.ink);
    swatch.setAttribute('aria-label', pen.name);
    swatch.setAttribute('aria-pressed', String(index === color));
    swatch.title = pen.name;
    swatch.addEventListener('click', () => {
      color = index;
      for (const [other, button] of [...swatches.children].entries()) {
        button.setAttribute('aria-pressed', String(other === color));
      }
    });
    swatches.append(swatch);
  }

  function render() {
    frame = null;
    const width = desk.clientWidth;
    const height = desk.clientHeight;
    if (!context || width === 0 || height === 0) return;
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    const pixelsWide = Math.round(width * scale);
    const pixelsHigh = Math.round(height * scale);
    if (canvas.width !== pixelsWide) canvas.width = pixelsWide;
    if (canvas.height !== pixelsHigh) canvas.height = pixelsHigh;
    context.setTransform(pixelsWide / width, 0, 0, pixelsHigh / height, 0, 0);
    context.clearRect(0, 0, width, height);
    context.lineCap = 'round';
    context.lineJoin = 'round';

    for (const { color: pen, points } of strokes) {
      if (points.length === 0) continue;
      const [x, y] = points[0];
      const startX = x * width / coordinateMax;
      const startY = y * height / coordinateMax;
      context.beginPath();
      context.moveTo(startX, startY);
      if (points.length === 1) context.lineTo(startX + 0.01, startY);
      for (let i = 1; i < points.length; i++) {
        context.lineTo(points[i][0] * width / coordinateMax, points[i][1] * height / coordinateMax);
      }
      context.lineWidth = 6;
      context.strokeStyle = colors[pen].edge;
      context.stroke();
      context.lineWidth = 3.5;
      context.strokeStyle = colors[pen].ink;
      context.stroke();
    }
  }

  function scheduleRender() {
    if (frame === null) frame = requestAnimationFrame(render);
  }

  function updateControls() {
    undo.disabled = strokes.length === 0 && cleared === null;
    clear.disabled = strokes.length === 0;
  }

  function quantize(value, size) {
    return Math.round(Math.min(1, Math.max(0, value / size)) * coordinateMax);
  }

  function appendPoint(event) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = quantize(event.clientX - rect.left, rect.width);
    const y = quantize(event.clientY - rect.top, rect.height);
    const stroke = strokes.at(-1);
    const last = stroke.points.at(-1);
    if (last && Math.abs(last[0] - x) + Math.abs(last[1] - y) < 2) return;
    if (stroke.points.length >= maxStrokePoints) {
      stroke.points = stroke.points.filter((_, index) => index % 2 === 0);
    }
    stroke.points.push([x, y]);
    scheduleRender();
  }

  function endStroke(event) {
    if (pointerId === null || (event && event.pointerId !== pointerId)) return;
    if (event?.type === 'pointerup') appendPoint(event);
    const released = pointerId;
    pointerId = null;
    if (canvas.hasPointerCapture(released)) canvas.releasePointerCapture(released);
    if (strokes.at(-1)?.points.length === 0) strokes.pop();
    updateControls();
  }

  function setActive(value, { returnFocus = false } = {}) {
    if (active === value) return;
    active = value;
    canvas.classList.toggle('is-drawing', active);
    tools.hidden = !active;
    for (const trigger of document.querySelectorAll('[data-desktop-action="ink"]')) {
      trigger.setAttribute('aria-pressed', String(active));
    }
    if (active) {
      message.textContent = 'Draw with a mouse, pen, or touch.';
      done.focus();
    } else {
      endStroke();
      if (returnFocus) document.querySelector('#desktopbtn')?.focus();
    }
    updateControls();
  }

  canvas.addEventListener('pointerdown', event => {
    if (!active || event.button !== 0 || pointerId !== null) return;
    if (strokes.length >= maxStrokes) {
      message.textContent = 'Drawing is full. Undo or clear ink to add more.';
      return;
    }
    event.preventDefault();
    pointerId = event.pointerId;
    canvas.setPointerCapture(pointerId);
    strokes.push({ color, points: [] });
    appendPoint(event);
    updateControls();
  });
  canvas.addEventListener('pointermove', event => {
    if (event.pointerId === pointerId) appendPoint(event);
  });
  canvas.addEventListener('pointerup', endStroke);
  canvas.addEventListener('pointercancel', endStroke);
  canvas.addEventListener('lostpointercapture', endStroke);

  undo.addEventListener('click', () => {
    endStroke();
    if (strokes.length) strokes.pop();
    else if (cleared) { strokes = cleared; cleared = null; }
    message.textContent = 'Drawing change undone.';
    updateControls();
    scheduleRender();
  });
  clear.addEventListener('click', () => {
    endStroke();
    cleared = strokes;
    strokes = [];
    message.textContent = 'Drawing cleared. You can undo this.';
    updateControls();
    scheduleRender();
  });
  done.addEventListener('click', () => setActive(false, { returnFocus: true }));

  document.addEventListener('click', event => {
    if (event.target.closest('[data-desktop-action="ink"]')) setActive(!active, { returnFocus: true });
  });
  document.addEventListener('keydown', event => {
    if (active && !event.defaultPrevented && event.key === 'Escape'
        && !document.querySelector('dialog[open]')) {
      setActive(false, { returnFocus: true });
    }
  });

  if ('ResizeObserver' in window) new ResizeObserver(scheduleRender).observe(desk);
  window.addEventListener('resize', scheduleRender);
  updateControls();
  scheduleRender();

  return {
    getState() {
      return encodeInk(strokes.filter(stroke => stroke.points.length));
    },
    restoreState(encoded) {
      const restored = decodeInk(encoded);
      if (!restored) return false;
      setActive(false);
      strokes = restored;
      cleared = null;
      updateControls();
      scheduleRender();
      return true;
    },
    setActive,
  };
}
