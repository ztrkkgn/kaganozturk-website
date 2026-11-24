const STORAGE_KEY = 'ko-os.scratch-note';
const NOTE_LIMIT = 2400;
const COMPACT_WIDTH = 204;
const COMPACT_THRESHOLD = 240;
const WORKSPACE_GUTTER = 8;

export function initStickyNote({ desk, root }) {
  const body = root.querySelector('[data-sticky-note]');
  const doc = root.ownerDocument;
  const browser = doc.defaultView;
  const mobile = browser.matchMedia('(max-width:760px)');
  const editor = doc.createElement('textarea');
  editor.className = 'sticky-editor';
  editor.placeholder = 'Type a note…';
  editor.maxLength = NOTE_LIMIT;
  editor.setAttribute('aria-label', 'Note text');
  try {
    editor.value = (browser.localStorage.getItem(STORAGE_KEY) || '').slice(0, NOTE_LIMIT);
  } catch {
    // Keep the editor usable when local storage is unavailable.
  }

  const preview = doc.createElement('p');
  preview.className = 'sticky-preview';
  preview.hidden = true;
  const actions = doc.createElement('div');
  actions.className = 'sticky-actions';
  const toggle = doc.createElement('button');
  toggle.className = 'btn';
  toggle.type = 'button';
  const send = doc.createElement('button');
  send.className = 'btn';
  send.type = 'button';
  send.dataset.sendMenuFor = 'note.txt';
  send.textContent = 'Send to…';
  actions.append(toggle, send);
  body.replaceChildren(editor, preview, actions);

  const grip = doc.createElement('button');
  grip.className = 'sticky-grip';
  grip.type = 'button';
  grip.setAttribute('aria-label', 'Resize note with the left and right arrow keys');
  root.append(grip);

  let wideWidth = Number(root.dataset.w) || 390;
  let compact = false;
  let mobileCompact = false;
  let drag = null;

  function showPreview() {
    preview.textContent = editor.value.trim() || 'Empty note';
  }

  function renderForm(makeCompact) {
    compact = makeCompact;
    root.toggleAttribute('data-sticky-compact', compact);
    editor.hidden = compact;
    preview.hidden = !compact;
    send.hidden = compact;
    toggle.textContent = compact ? 'Expand note' : 'Shrink to sticky note';
    if (compact) showPreview();
  }

  function syncSize() {
    if (root.dataset.state !== 'open') return;
    const width = root.offsetWidth;
    if (mobile.matches) {
      renderForm(mobileCompact);
    } else if (width && !root.classList.contains('max')) {
      renderForm(width <= COMPACT_THRESHOLD);
      if (!compact && drag === null) wideWidth = width;
    } else if (root.classList.contains('max')) {
      renderForm(false);
    }
  }

  function setWidth(requestedWidth) {
    const maxWidth = Math.max(1, desk.clientWidth - WORKSPACE_GUTTER * 2);
    const width = Math.min(maxWidth, Math.max(COMPACT_WIDTH, requestedWidth));
    const left = Math.max(0, Math.min(root.offsetLeft, desk.clientWidth - width - WORKSPACE_GUTTER));
    root.style.left = `${left}px`;
    root.style.width = `${Math.round(width)}px`;
    syncSize();
  }

  function toggleSize() {
    if (mobile.matches) {
      mobileCompact = !compact;
      renderForm(mobileCompact);
      return;
    }
    root.classList.remove('max');
    setWidth(compact ? Math.max(wideWidth, COMPACT_THRESHOLD + 32) : COMPACT_WIDTH);
  }

  editor.addEventListener('input', () => {
    try {
      browser.localStorage.setItem(STORAGE_KEY, editor.value);
    } catch {
      // The current note stays in memory.
    }
  });

  toggle.addEventListener('click', toggleSize);
  grip.addEventListener('click', event => {
    if (event.detail === 0) toggleSize();
  });
  grip.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const amount = event.shiftKey ? 40 : 12;
    setWidth(root.offsetWidth + (event.key === 'ArrowRight' ? amount : -amount));
  });
  grip.addEventListener('pointerdown', event => {
    if (event.button !== 0 || drag !== null) return;
    drag = { id: event.pointerId, start: event.clientX, width: root.offsetWidth };
    grip.setPointerCapture(event.pointerId);
  });
  grip.addEventListener('pointermove', event => {
    if (drag?.id === event.pointerId) setWidth(drag.width + event.clientX - drag.start);
  });
  function endResize(event) {
    if (drag?.id !== event.pointerId) return;
    drag = null;
    syncSize();
  }
  grip.addEventListener('pointerup', endResize);
  grip.addEventListener('pointercancel', endResize);
  grip.addEventListener('lostpointercapture', endResize);

  renderForm(false);
  const resize = new browser.ResizeObserver(syncSize);
  resize.observe(root);
  mobile.addEventListener('change', syncSize);
  return { getText: () => editor.value };
}
