const snapshotPrefix = '#desktop=';
const snapshotVersion = 1;
const maxTokenLength = 7200;

function encodeSnapshot(state) {
  const bytes = new TextEncoder().encode(JSON.stringify({ version: snapshotVersion, state }));
  if (bytes.length > maxTokenLength * 3 / 4) return null;
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

function decodeSnapshot(hash) {
  if (!hash.startsWith(snapshotPrefix)) return null;
  const token = hash.slice(snapshotPrefix.length);
  if (token.length > maxTokenLength || !/^[A-Za-z0-9_-]+$/.test(token)) return null;

  try {
    const base64 = token.replaceAll('-', '+').replaceAll('_', '/');
    const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    const snapshot = JSON.parse(text);
    if (snapshot?.version !== snapshotVersion || !snapshot.state || typeof snapshot.state !== 'object'
        || Array.isArray(snapshot.state)) return null;
    return snapshot.state;
  } catch {
    return null;
  }
}

export function initDesktopShare({ getState, restoreState }) {
  const dialog = document.createElement('dialog');
  dialog.className = 'desktop-share-dialog';
  dialog.setAttribute('aria-labelledby', 'desktop-share-title');
  dialog.innerHTML = `
    <div class="titlebar"><span id="desktop-share-title" class="t">Save desktop</span></div>
    <div class="desktop-share-body">
      <label for="desktop-share-url">Desktop link</label>
      <input id="desktop-share-url" type="url" readonly spellcheck="false">
      <p>Anyone with this link can see the window layout, wallpaper, and ink.</p>
      <p data-share-status role="status"></p>
      <div class="desktop-share-actions">
        <button class="btn" type="button" data-share-copy>Copy link</button>
        <form method="dialog"><button class="btn" type="submit">Close</button></form>
      </div>
    </div>`;
  document.body.append(dialog);

  const input = dialog.querySelector('input');
  const copy = dialog.querySelector('[data-share-copy]');
  const close = dialog.querySelector('button[type="submit"]');
  const status = dialog.querySelector('[data-share-status]');

  function restoreFromUrl() {
    const state = decodeSnapshot(location.hash);
    if (state) restoreState(state);
  }

  document.addEventListener('click', event => {
    if (!event.target.closest('[data-desktop-action="share"]') || dialog.open) return;
    const token = encodeSnapshot(getState());
    if (token) {
      const url = new URL(location.href);
      url.search = '';
      url.hash = `${snapshotPrefix}${token}`;
      input.value = url.href;
      status.textContent = '';
    } else {
      input.value = '';
      status.textContent = 'This desktop is too large to share. Clear some ink and try again.';
    }
    input.disabled = copy.disabled = !token;
    dialog.showModal();
    if (token) { input.focus(); input.select(); }
    else close.focus();
  });

  copy.addEventListener('click', async () => {
    const url = input.value;
    try {
      await navigator.clipboard.writeText(url);
      if (dialog.open && input.value === url) status.textContent = 'Link copied.';
    } catch {
      if (!dialog.open || input.value !== url) return;
      input.focus();
      input.select();
      status.textContent = 'Copy the selected address to share your desktop.';
    }
  });
  dialog.addEventListener('close', () => document.querySelector('#desktopbtn')?.focus());
  window.addEventListener('hashchange', restoreFromUrl);
  restoreFromUrl();
}
