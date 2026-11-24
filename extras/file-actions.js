const ICON_STORAGE = 'ko-os.folder-icons';
const MAX_TEXT_BYTES = 12000;
const DRAG_DISTANCE = 7;

function isPixelIcon(url) {
  return typeof url === 'string' && url.length <= 4096 &&
    /^data:image\/png;base64,[a-z0-9+/]+=*$/i.test(url);
}

export function initFileActions({ desk, openWindow, printText, getNoteText }) {
  const doc = desk.ownerDocument;
  const browser = doc.defaultView;
  const sourceIcon = desk.querySelector('[data-custom-icon]');
  const fileReaders = new Map([
    ['about.txt', () => readParagraphs('#about .body :is(h2, p)')],
    ['approach.log', () => readParagraphs('#approach .body :is(h2, .l)')],
    ['note.txt', getNoteText],
  ]);

  function readParagraphs(selector) {
    return [...desk.querySelectorAll(selector)].map(node => node.textContent.trim()).join('\n\n');
  }

  const folders = new Map();
  for (const button of desk.querySelectorAll('[data-send-folder]')) {
    const art = button.querySelector('.g');
    folders.set(button.dataset.sendFolder, {
      button,
      art,
      original: [...art.childNodes],
      label: button.textContent.trim(),
    });
  }

  const assignments = {};
  try {
    const saved = JSON.parse(browser.localStorage.getItem(ICON_STORAGE) || '{}');
    for (const [name, folder] of folders) {
      if (isPixelIcon(saved?.[name])) {
        assignments[name] = saved[name];
        showFolderIcon(folder, saved[name]);
      }
    }
  } catch {
    // Folder icons still work for this session.
  }

  const menu = doc.createElement('div');
  menu.id = 'desktop-send-menu';
  menu.className = 'workspace-send-menu';
  menu.hidden = true;
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', 'Send to');
  const status = doc.createElement('p');
  status.className = 'workspace-file-status';
  status.setAttribute('role', 'status');
  const ghost = doc.createElement('div');
  ghost.className = 'workspace-drag-ghost';
  ghost.setAttribute('aria-hidden', 'true');
  ghost.hidden = true;
  doc.body.append(menu, status, ghost);

  let launcher = null;
  let statusTimer = null;
  let drag = null;
  let ignoreClick = null;
  let target = null;
  let printRequest = 0;

  function notify(message) {
    status.textContent = message;
    browser.clearTimeout(statusTimer);
    statusTimer = browser.setTimeout(() => { status.textContent = ''; }, 3600);
  }

  function showFolderIcon(folder, imageURL) {
    const image = doc.createElement('img');
    image.className = 'workspace-folder-image';
    image.alt = '';
    image.draggable = false;
    image.src = imageURL;
    folder.art.replaceChildren(image);
    folder.button.classList.add('workspace-custom-folder');
  }

  function saveIcons() {
    try {
      browser.localStorage.setItem(ICON_STORAGE, JSON.stringify(assignments));
    } catch {
      // The assignment remains usable for the current page.
    }
  }

  function applyIcon(folderName) {
    const folder = folders.get(folderName);
    const image = sourceIcon.querySelector('img');
    if (!image || sourceIcon.hidden || !isPixelIcon(image.getAttribute('src'))) {
      notify('Place an icon on the desktop first.');
      return;
    }
    const imageURL = image.getAttribute('src');
    assignments[folderName] = imageURL;
    showFolderIcon(folder, imageURL);
    saveIcons();
    notify(`${folder.label} icon changed.`);
  }

  function restoreIcon(folderName) {
    const folder = folders.get(folderName);
    delete assignments[folderName];
    folder.art.replaceChildren(...folder.original);
    folder.button.classList.remove('workspace-custom-folder');
    saveIcons();
    notify(`${folder.label} icon restored.`);
  }

  function showPrintPreview(name, contents) {
    if (!contents.trim()) {
      notify('The file is empty.');
      return;
    }
    printText(name, contents);
    openWindow('printer');
  }

  function printWorkspaceFile(name) {
    printRequest += 1;
    showPrintPreview(name, fileReaders.get(name)());
  }

  async function printDroppedFile(files) {
    const request = ++printRequest;
    const [file] = files;
    if (files.length !== 1 || !/\.txt$/i.test(file?.name)) {
      notify('Drop one .txt file at a time.');
      return;
    }
    if (file.size > MAX_TEXT_BYTES) {
      notify('Text files must be 12 KB or smaller.');
      return;
    }
    try {
      const contents = await file.text();
      if (printRequest === request) showPrintPreview(file.name, contents);
    } catch {
      if (printRequest === request) notify('The printer could not read that file.');
    }
  }

  function getItem(node) {
    const file = node.closest('[data-send-file]');
    if (file && fileReaders.has(file.dataset.sendFile)) return file.dataset.sendFile;
    if (node.closest('[data-custom-icon]')) return 'custom-icon';
    return null;
  }

  function getCommands(item) {
    if (fileReaders.has(item)) {
      return [{
        label: 'Send to print.exe',
        run: () => printWorkspaceFile(item),
        opensWindow: true,
      }];
    }
    if (item === 'custom-icon') {
      const commands = [...folders].map(([name, folder]) => ({
        label: `Send icon to ${folder.label}`,
        run: () => applyIcon(name),
      }));
      for (const [name, folder] of folders) {
        if (assignments[name]) commands.push({
          label: `Restore ${folder.label} icon`,
          run: () => restoreIcon(name),
        });
      }
      return commands;
    }
    if (folders.has(item) && assignments[item]) {
      return [{ label: 'Restore original icon', run: () => restoreIcon(item) }];
    }
    return [];
  }

  function closeMenu(returnFocus = false) {
    if (menu.hidden) return;
    menu.hidden = true;
    if (launcher?.hasAttribute('aria-expanded')) launcher.setAttribute('aria-expanded', 'false');
    if (returnFocus) launcher?.focus({ preventScroll: true });
    launcher = null;
  }

  function openMenu(item, trigger, point) {
    const commands = getCommands(item);
    if (!commands.length) return false;
    closeMenu();
    const buttons = commands.map(command => {
      const button = doc.createElement('button');
      button.type = 'button';
      button.setAttribute('role', 'menuitem');
      button.tabIndex = -1;
      button.textContent = command.label;
      button.addEventListener('click', () => {
        closeMenu(!command.opensWindow);
        command.run();
      });
      return button;
    });
    menu.replaceChildren(...buttons);
    menu.hidden = false;
    launcher = trigger;
    if (trigger.hasAttribute('aria-expanded')) trigger.setAttribute('aria-expanded', 'true');
    const bounds = trigger.getBoundingClientRect();
    const x = point?.x ?? bounds.left;
    const y = point?.y ?? bounds.bottom + 3;
    menu.style.left = `${Math.max(4, Math.min(x, browser.innerWidth - menu.offsetWidth - 4))}px`;
    menu.style.top = `${Math.max(4, Math.min(y, browser.innerHeight - menu.offsetHeight - 4))}px`;
    buttons[0].focus({ preventScroll: true });
    return true;
  }

  function setMenuAttributes(button) {
    button.setAttribute('aria-haspopup', 'menu');
    button.setAttribute('aria-controls', menu.id);
    button.setAttribute('aria-expanded', 'false');
  }

  for (const [name, selector] of [
    ['about.txt', '#about .body'],
    ['approach.log', '#approach .body'],
    ['custom-icon', '[data-iconmaker] .iconmaker-actions'],
  ]) {
    if (desk.querySelector(`[data-send-menu-for="${name}"]`)) continue;
    const viewer = desk.querySelector(selector);
    if (!viewer) continue;
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = 'btn workspace-file-send';
    button.dataset.sendMenuFor = name;
    button.textContent = 'Send to…';
    viewer.append(button);
  }
  desk.querySelectorAll('[data-send-menu-for]').forEach(setMenuAttributes);

  doc.addEventListener('click', event => {
    const trigger = event.target.closest('[data-send-menu-for]');
    if (trigger) {
      if (launcher === trigger) closeMenu(true);
      else openMenu(trigger.dataset.sendMenuFor, trigger);
    } else if (!menu.contains(event.target)) {
      closeMenu();
    }
  });
  desk.addEventListener('contextmenu', event => {
    const trigger = event.target.closest('[data-send-file], [data-custom-icon], [data-send-folder]');
    if (!trigger) return;
    const item = getItem(trigger) ?? trigger.dataset.sendFolder;
    const point = event.clientX || event.clientY ? { x: event.clientX, y: event.clientY } : undefined;
    if (openMenu(item, trigger, point)) event.preventDefault();
  });
  desk.addEventListener('keydown', event => {
    if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) return;
    const trigger = event.target.closest('[data-send-file], [data-custom-icon], [data-send-folder]');
    if (trigger && openMenu(getItem(trigger) ?? trigger.dataset.sendFolder, trigger)) event.preventDefault();
  });
  menu.addEventListener('keydown', event => {
    if (event.key === 'Escape' || event.key === 'Tab') {
      closeMenu(true);
      if (event.key === 'Escape') event.preventDefault();
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const buttons = Array.from(menu.children);
    const current = buttons.indexOf(doc.activeElement);
    const step = event.key === 'ArrowDown' ? 1 : -1;
    let next = (current + step + buttons.length) % buttons.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = buttons.length - 1;
    buttons[next].focus();
  });
  browser.addEventListener('resize', () => closeMenu());
  doc.addEventListener('pointerdown', event => {
    ignoreClick = null;
    if (!menu.hidden && !menu.contains(event.target) && !launcher?.contains(event.target)) closeMenu();
  }, true);
  doc.addEventListener('click', event => {
    if (!ignoreClick || event.detail === 0) return;
    const suppress = ignoreClick.source.contains(event.target) || ignoreClick.destination?.contains(event.target);
    ignoreClick = null;
    if (suppress) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  function setDropTarget(next) {
    if (target === next) return;
    target?.classList.remove('workspace-drop-target');
    target = next;
    target?.classList.add('workspace-drop-target');
  }

  function transfersFiles(event) {
    return Array.from(event.dataTransfer?.types ?? []).includes('Files');
  }

  function getPointerDestination(item, x, y) {
    const selector = item === 'custom-icon' ? '[data-send-folder]' : '[data-send-printer]';
    return doc.elementFromPoint(x, y)?.closest(selector);
  }

  function movedFarEnough(event) {
    return Math.hypot(event.clientX - drag.x, event.clientY - drag.y) >= DRAG_DISTANCE;
  }

  desk.addEventListener('pointerdown', event => {
    if (drag || event.button !== 0 || event.isPrimary === false) return;
    const source = event.target.closest('[data-send-file], [data-custom-icon]');
    if (!source || (event.pointerType === 'touch' && !event.target.closest('.g'))) return;
    const item = getItem(source);
    if (item) {
      drag = { source, item, id: event.pointerId, x: event.clientX, y: event.clientY, active: false };
    }
  });
  doc.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    if (!drag.active) {
      if (!movedFarEnough(event)) return;
      drag.active = true;
      if (event.pointerType !== 'touch') drag.source.setPointerCapture(event.pointerId);
      closeMenu();
      const art = drag.source.querySelector('.g')?.cloneNode(true);
      const label = doc.createElement('span');
      label.textContent = drag.item === 'custom-icon' ? 'My icon' : drag.item;
      ghost.replaceChildren(...(art ? [art, label] : [label]));
      ghost.hidden = false;
    }
    event.preventDefault();
    ghost.style.transform = `translate(${event.clientX + 12}px, ${event.clientY + 12}px)`;
    setDropTarget(getPointerDestination(drag.item, event.clientX, event.clientY));
  }, { passive: false });
  doc.addEventListener('pointerup', event => {
    if (!drag || drag.id !== event.pointerId) return;
    const { source, item, active } = drag;
    const moved = active || movedFarEnough(event);
    const destination = moved ? getPointerDestination(item, event.clientX, event.clientY) : null;
    clearPointerDrag();
    if (!moved) return;
    ignoreClick = { source, destination };
    if (!destination) return;
    if (item === 'custom-icon') applyIcon(destination.dataset.sendFolder);
    else printWorkspaceFile(item);
  });

  function clearPointerDrag() {
    drag = null;
    ghost.hidden = true;
    setDropTarget(null);
  }

  function cancelPointerDrag(event) {
    if (!drag || (event.pointerId !== undefined && drag.id !== event.pointerId)) return;
    if (drag.active) ignoreClick = { source: drag.source, destination: target };
    clearPointerDrag();
  }

  doc.addEventListener('pointercancel', cancelPointerDrag);
  doc.addEventListener('lostpointercapture', cancelPointerDrag);
  browser.addEventListener('blur', cancelPointerDrag);
  doc.addEventListener('keydown', event => {
    if (event.key === 'Escape') cancelPointerDrag(event);
  });
  desk.addEventListener('dragstart', event => {
    if (getItem(event.target)) event.preventDefault();
  });

  doc.addEventListener('dragover', event => {
    if (!transfersFiles(event)) return;
    const next = event.target.closest('[data-send-printer]');
    setDropTarget(next);
    if (next || desk.contains(event.target)) event.preventDefault();
    if (next) event.dataTransfer.dropEffect = 'copy';
  });
  doc.addEventListener('dragleave', event => {
    if (!event.relatedTarget || !target?.contains(event.relatedTarget)) setDropTarget(null);
  });
  doc.addEventListener('drop', event => {
    if (!transfersFiles(event)) return;
    const destination = event.target.closest('[data-send-printer]');
    setDropTarget(null);
    if (!destination) {
      if (desk.contains(event.target)) {
        event.preventDefault();
        notify('Drop your text file on print.exe.');
      }
      return;
    }
    event.preventDefault();
    void printDroppedFile(event.dataTransfer.files);
  });
}
