const handshake = [
  ['ATDT 555-0199', 'Dialling the board…'],
  ['RING', 'Waiting for an answer…'],
  ['CARRIER DETECTED', 'Negotiating the modem speed…'],
  ['CONNECT 56000', 'Opening the archive…'],
];

export function initDialup(root) {
  root.innerHTML = `
    <div class="dialup-line">
      <span class="dialup-line-light" aria-hidden="true"></span>
      <p data-dialup-status role="status">Line idle</p>
    </div>
    <section class="dialup-connection" data-dialup-connection aria-labelledby="dialup-connection-heading">
      <h2 id="dialup-connection-heading">56K modem</h2>
      <p>Connect to a fictional bulletin board archived in 1999.</p>
      <div class="dialup-terminal" data-dialup-terminal hidden>
        <code data-dialup-command aria-hidden="true"></code>
        <progress data-dialup-progress aria-label="Modem handshake progress" max="4" value="0"></progress>
      </div>
      <button class="btn" type="button" data-dialup-connect>Connect</button>
      <button class="btn" type="button" data-dialup-cancel hidden>Cancel</button>
    </section>
    <section class="dialup-board" data-dialup-board aria-labelledby="dialup-board-heading" hidden>
      <div class="dialup-board-heading">
        <h2 id="dialup-board-heading" tabindex="-1">Ferry Line BBS</h2>
        <p>23 Nov 1999 · 3 messages</p>
      </div>
      <details class="dialup-post">
        <summary><span>Connection test</span><span class="dialup-byline">ferryside</span></summary>
        <p>It took four tries to upload this. If you see four copies, please read the third one. That one cost the least.</p>
      </details>
      <details class="dialup-post">
        <summary><span>Please log off at 18:00</span><span class="dialup-byline">sysop</span></summary>
        <p>The board will be down at 18:00. My mum needs the phone line to call my aunt. We should be back by 18:05, unless my aunt has news.</p>
      </details>
      <details class="dialup-post">
        <summary><span>Found at the ferry terminal</span><span class="dialup-byline">bitkeeper</span></summary>
        <p>A blue diskette turned up on the pier. The label says it belongs to a courier. The disk is still readable.</p>
        <details class="dialup-disk">
          <summary>Inspect A:\\COURIER.TXT</summary>
          <p>Courier wanted. Collect three amber capsules and make it back to the cyan dock.</p>
          <button class="btn" type="button" data-open="arcade">Open Arcade</button>
        </details>
      </details>
      <button class="btn dialup-disconnect" type="button" data-dialup-disconnect>Disconnect</button>
    </section>`;

  const win = root.closest('.win');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const status = root.querySelector('[data-dialup-status]');
  const terminal = root.querySelector('[data-dialup-terminal]');
  const command = root.querySelector('[data-dialup-command]');
  const progress = root.querySelector('[data-dialup-progress]');
  const connection = root.querySelector('[data-dialup-connection]');
  const board = root.querySelector('[data-dialup-board]');
  const boardTitle = root.querySelector('#dialup-board-heading');
  const connect = root.querySelector('[data-dialup-connect]');
  const cancel = root.querySelector('[data-dialup-cancel]');
  const disconnect = root.querySelector('[data-dialup-disconnect]');
  let timer;

  function reset(returnFocus) {
    window.clearTimeout(timer);
    root.dataset.dialupState = 'idle';
    status.textContent = 'Line idle';
    progress.value = 0;
    command.textContent = '';
    terminal.hidden = true;
    board.hidden = true;
    connection.hidden = false;
    cancel.hidden = true;
    connect.hidden = false;
    board.querySelectorAll('details[open]').forEach((item) => { item.open = false; });
    if (returnFocus) connect.focus();
  }

  function showBoard() {
    root.dataset.dialupState = 'online';
    connection.hidden = true;
    board.hidden = false;
    status.textContent = 'Connected · 56,000 bps';
    if (!win || (win.dataset.state === 'open' && win.classList.contains('active'))) {
      boardTitle.focus();
    }
  }

  function dial(step) {
    if (step === handshake.length) {
      showBoard();
      return;
    }
    command.textContent = handshake[step][0];
    status.textContent = handshake[step][1];
    progress.value = step + 1;
    timer = window.setTimeout(() => dial(step + 1), 350);
  }

  connect.addEventListener('click', () => {
    if (reducedMotion.matches) {
      showBoard();
      return;
    }
    root.dataset.dialupState = 'calling';
    terminal.hidden = false;
    connect.hidden = true;
    cancel.hidden = false;
    cancel.focus();
    dial(0);
  });
  cancel.addEventListener('click', () => reset(true));
  disconnect.addEventListener('click', () => reset(true));

  if (win) {
    new MutationObserver(() => {
      if (win.dataset.state === 'closed') reset(false);
    }).observe(win, { attributes: true, attributeFilter: ['data-state'] });
  }
}
