const SIZE = 16;
const ERASE = -1;
const STORAGE_KEY = 'ko-os.desktop-icon';
const palette = [
  ['Ink', '#14110b'],
  ['Paper', '#fffdf2'],
  ['Silver', '#cbc6b9'],
  ['Teal', '#0e6f6f'],
  ['Sky', '#4f7bd6'],
  ['Indigo', '#2a1f6b'],
  ['Amber', '#ffb000'],
  ['Red', '#d6492f'],
  ['Green', '#1fa34a']
];
const directions = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1]
};

function loadIcon() {
  try {
    const pixels = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(pixels) && pixels.length === SIZE * SIZE &&
        pixels.every(pixel => Number.isInteger(pixel) && pixel >= ERASE && pixel < palette.length)) {
      return pixels;
    }
  } catch {
    // The editor also works in browsers with storage blocked.
  }
  return null;
}

export function initIconMaker(root, desktopIcon) {
  const document = root.ownerDocument;
  const saved = loadIcon();
  const pixels = saved ?? Array(SIZE * SIZE).fill(ERASE);
  let tool = 0;
  let cursor = [0, 0];
  let drawingPointer = null;
  let lastPoint = null;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function button(label, className, action) {
    const node = element('button', className, label);
    node.type = 'button';
    node.addEventListener('click', action);
    return node;
  }

  const board = element('div', 'iconmaker-board');
  const canvas = element('canvas', 'iconmaker-canvas', 'A 16 by 16 pixel drawing board.');
  canvas.width = canvas.height = SIZE;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'application');
  canvas.setAttribute('aria-label', '16 by 16 icon canvas');
  canvas.setAttribute('aria-describedby', 'iconmaker-help iconmaker-position');
  const cursorMark = element('div', 'iconmaker-cursor');
  cursorMark.setAttribute('aria-hidden', 'true');
  board.append(canvas, cursorMark, element('div', 'iconmaker-grid'));
  const context = canvas.getContext('2d');
  if (!context) {
    root.replaceChildren(element('p', '', 'This browser could not open the icon canvas.'));
    return;
  }

  const help = element('p', 'iconmaker-help', 'Choose a color and draw. Use arrow keys to move and Space to paint.');
  help.id = 'iconmaker-help';
  const position = element('p', 'iconmaker-position');
  position.id = 'iconmaker-position';
  position.setAttribute('role', 'status');
  const status = element('p', 'iconmaker-status');
  status.setAttribute('role', 'status');

  const tools = element('div', 'iconmaker-tools');
  tools.setAttribute('role', 'group');
  tools.setAttribute('aria-label', 'Colors and eraser');
  const swatches = palette.map(([name, color], index) => {
    const swatch = button('', 'iconmaker-swatch', () => selectTool(index));
    swatch.style.setProperty('--swatch', color);
    swatch.setAttribute('aria-label', name);
    swatch.title = name;
    return swatch;
  });
  const eraser = button('Erase', 'btn iconmaker-erase', () => selectTool(ERASE));
  tools.append(...swatches, eraser);

  const actions = element('div', 'iconmaker-actions');
  const clear = button('Clear', 'btn', () => {
    pixels.fill(ERASE);
    context.clearRect(0, 0, SIZE, SIZE);
    moveCursor(...cursor);
    updateActions();
    status.textContent = 'Canvas cleared.';
  });
  const place = button('Place on desktop', 'btn def', () => {
    showOnDesktop();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pixels));
    } catch {
      // The icon can still be placed for the current page.
    }
    status.textContent = 'Your icon is on the KO/OS desktop.';
  });
  const download = button('Download PNG', 'btn', () => {
    const link = element('a', '');
    link.href = canvas.toDataURL('image/png');
    link.download = 'ko-os-icon.png';
    root.append(link);
    link.click();
    link.remove();
    status.textContent = 'PNG export started.';
  });
  actions.append(place, download, clear);

  root.classList.add('iconmaker');
  root.replaceChildren(
    element('h2', '', 'Draw a desktop icon'),
    help,
    tools,
    board,
    position,
    actions,
    status
  );

  function showOnDesktop() {
    const image = element('img', 'iconmaker-desktop-image');
    image.src = canvas.toDataURL('image/png');
    image.alt = '';
    desktopIcon.querySelector('.g').replaceChildren(image);
    desktopIcon.hidden = false;
  }

  function drawPixel(x, y, color) {
    context.clearRect(x, y, 1, 1);
    if (color !== ERASE) {
      context.fillStyle = palette[color][1];
      context.fillRect(x, y, 1, 1);
    }
  }

  function updateActions() {
    const empty = pixels.every(pixel => pixel === ERASE);
    clear.disabled = place.disabled = download.disabled = empty;
  }

  function moveCursor(x, y) {
    cursor = [x, y];
    cursorMark.style.left = `${x / SIZE * 100}%`;
    cursorMark.style.top = `${y / SIZE * 100}%`;
    const pixel = pixels[y * SIZE + x];
    const color = pixel === ERASE ? 'Empty' : palette[pixel][0];
    const selected = tool === ERASE ? 'Eraser' : palette[tool][0];
    position.textContent = `Column ${x + 1}, row ${y + 1} · ${color} · ${selected} selected`;
  }

  function selectTool(index) {
    tool = index;
    swatches.forEach((swatch, index) => swatch.setAttribute('aria-pressed', String(index === tool)));
    eraser.setAttribute('aria-pressed', String(tool === ERASE));
    moveCursor(...cursor);
  }

  function paintPixel(x, y) {
    const offset = y * SIZE + x;
    if (pixels[offset] === tool) return;
    pixels[offset] = tool;
    drawPixel(x, y, tool);
  }

  function paintPointer(event) {
    const bounds = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - bounds.left) / bounds.width * SIZE);
    const y = Math.floor((event.clientY - bounds.top) / bounds.height * SIZE);
    if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) {
      lastPoint = null;
      return;
    }

    const [fromX, fromY] = lastPoint ?? [x, y];
    const dx = x - fromX;
    const dy = y - fromY;
    const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
    for (let step = 0; step <= steps; step += 1) {
      paintPixel(Math.round(fromX + dx * step / steps), Math.round(fromY + dy * step / steps));
    }
    lastPoint = [x, y];
    moveCursor(x, y);
    updateActions();
  }

  canvas.addEventListener('pointerdown', event => {
    if (event.button !== 0 || drawingPointer !== null) return;
    event.preventDefault();
    canvas.focus({ preventScroll: true });
    drawingPointer = event.pointerId;
    canvas.setPointerCapture(drawingPointer);
    paintPointer(event);
  });
  canvas.addEventListener('pointermove', event => {
    if (event.pointerId === drawingPointer) paintPointer(event);
  });
  function finishStroke(event) {
    if (event.pointerId !== drawingPointer) return;
    drawingPointer = null;
    lastPoint = null;
  }
  canvas.addEventListener('pointerup', finishStroke);
  canvas.addEventListener('pointercancel', finishStroke);
  canvas.addEventListener('lostpointercapture', finishStroke);
  canvas.addEventListener('keydown', event => {
    const direction = directions[event.key];
    if (direction) {
      event.preventDefault();
      const [x, y] = cursor.map((coordinate, index) => Math.max(0, Math.min(SIZE - 1, coordinate + direction[index])));
      moveCursor(x, y);
    } else if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      paintPixel(...cursor);
      moveCursor(...cursor);
      updateActions();
    }
  });

  pixels.forEach((color, index) => drawPixel(index % SIZE, Math.floor(index / SIZE), color));
  selectTool(tool);
  updateActions();
  if (saved?.some(pixel => pixel !== ERASE)) showOnDesktop();
}
