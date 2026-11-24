const monitorAction = '[data-desktop-action="monitor"]';
const xrayAction = '[data-desktop-action="xray"]';

export function initDisplayModes({ desk, bar }) {
  const scene = document.createElement('dialog');
  scene.className = 'ko-crt-scene';
  scene.id = 'ko-crt-preview';
  scene.setAttribute('aria-label', 'KO/OS monitor');
  scene.innerHTML = `
    <div class="ko-crt">
      <div class="ko-crt-case">
        <div class="ko-crt-top" aria-hidden="true">
          <span class="ko-crt-sticker">KO/OS</span><span class="ko-crt-vents"></span>
        </div>
        <div class="ko-crt-rim">
          <button class="ko-crt-glass" type="button" aria-label="Return to the desktop"></button>
        </div>
        <div class="ko-crt-controls">
          <div class="ko-crt-colors" role="group" aria-label="Monitor color">
            <button type="button" data-phosphor="color" aria-pressed="true">Color</button>
            <button type="button" data-phosphor="amber" aria-pressed="false">Amber</button>
          </div>
          <button type="button" class="ko-crt-return"><i aria-hidden="true"></i> Desktop</button>
        </div>
      </div>
      <div class="ko-crt-foot" aria-hidden="true"></div>
      <div class="ko-crt-diskette" aria-hidden="true"><span></span></div>
    </div>`;
  document.body.append(scene);

  const glass = scene.querySelector('.ko-crt-glass');
  const desktopButton = scene.querySelector('.ko-crt-return');
  const colorButtons = [...scene.querySelectorAll('[data-phosphor]')];
  const { body } = document;
  let launcher = null;

  document.querySelectorAll(monitorAction).forEach(button => {
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-controls', scene.id);
  });

  function isXray() {
    return desk.classList.contains('ko-xray');
  }

  function setXray(enabled) {
    desk.classList.toggle('ko-xray', enabled);
    document.querySelectorAll(xrayAction).forEach(button => {
      button.setAttribute('aria-pressed', String(isXray()));
    });
  }

  function isAmber() {
    return body.classList.contains('ko-phosphor-amber');
  }

  function setAmber(enabled) {
    body.classList.toggle('ko-phosphor-amber', enabled);
    const selected = isAmber() ? 'amber' : 'color';
    colorButtons.forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.phosphor === selected));
    });
  }

  function fitDesktopInMonitor() {
    if (!scene.open) return;
    const screen = glass.getBoundingClientRect();
    const deskHeight = desk.offsetHeight;
    const barHeight = bar.offsetHeight;
    const height = deskHeight + barHeight;
    const width = desk.offsetWidth;
    if (!width || !height || !screen.width || !screen.height) return;

    const scale = Math.min(screen.width / width, screen.height / height);
    const left = screen.left + (screen.width - width * scale) / 2;
    const top = screen.top + (screen.height - height * scale) / 2;

    const coordinates = {
      'screen-x': screen.left,
      'screen-y': screen.top,
      'screen-width': screen.width,
      'screen-height': screen.height,
      'preview-x': left,
      'preview-y': top,
      'preview-bar-y': top + deskHeight * scale,
      'initial-bar-y': height - barHeight,
    };
    for (const [name, value] of Object.entries(coordinates)) {
      body.style.setProperty(`--ko-crt-${name}`, `${value}px`);
    }
    body.style.setProperty('--ko-crt-scale', scale);
  }

  function openMonitor(trigger) {
    if (scene.open) return;
    launcher = trigger;
    scene.showModal();
    body.classList.add('ko-monitor-open');
    fitDesktopInMonitor();
    glass.focus({ preventScroll: true });
  }

  function leaveMonitor() {
    body.classList.remove('ko-monitor-open');
    if (scene.open) scene.close();
    const restoreFocus = launcher?.getClientRects().length ? launcher : bar.querySelector(monitorAction);
    restoreFocus?.focus({ preventScroll: true });
    launcher = null;
  }

  glass.addEventListener('click', leaveMonitor);
  desktopButton.addEventListener('click', leaveMonitor);
  scene.addEventListener('cancel', event => {
    event.preventDefault();
    leaveMonitor();
  });
  for (const button of colorButtons) {
    button.addEventListener('click', () => setAmber(button.dataset.phosphor === 'amber'));
  }

  const observer = new ResizeObserver(fitDesktopInMonitor);
  observer.observe(glass);
  observer.observe(desk);
  observer.observe(bar);
  scene.addEventListener('scroll', fitDesktopInMonitor);
  window.addEventListener('resize', fitDesktopInMonitor);

  document.addEventListener('click', event => {
    const monitor = event.target.closest(monitorAction);
    if (monitor) {
      openMonitor(monitor);
      return;
    }
    if (event.target.closest(xrayAction)) setXray(!isXray());
  });
  setXray(isXray());
  return { isXray, setXray, isAmber, setAmber };
}
