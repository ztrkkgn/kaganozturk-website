export function initPrinter(root) {
  const doc = root.ownerDocument;
  const browser = doc.defaultView;
  const paper = doc.createElement('article');
  paper.id = 'receipt-paper';
  paper.className = 'printer-paper';
  paper.hidden = true;
  paper.setAttribute('aria-live', 'polite');

  const heading = doc.createElement('h2');
  heading.textContent = 'KO/OS Dot Matrix';

  const hint = doc.createElement('p');
  hint.textContent = 'Drop a text file on print.exe or use Send to… from an open text file. Arcade and Fixit can also load a receipt.';

  const print = doc.createElement('button');
  print.className = 'btn';
  print.type = 'button';
  print.textContent = 'Print receipt';
  print.hidden = true;

  root.replaceChildren(heading, hint, paper, print);

  function finishPrinting() {
    doc.body.classList.remove('ko-printing');
  }
  browser.addEventListener('afterprint', finishPrinting);
  print.addEventListener('click', () => {
    doc.body.classList.add('ko-printing');
    try {
      browser.print();
    } catch {
      finishPrinting();
    }
  });

  doc.addEventListener('click', event => {
    const source = event.target.closest('[data-receipt]');
    if (!source || source.disabled) return;
    if (source.dataset.receipt === 'arcade') {
      const arcade = source.closest('#arcade');
      const game = arcade.querySelector('.arcade-picker [aria-pressed="true"]').textContent.trim();
      const score = arcade.querySelector('.arcade-score').textContent;
      const best = arcade.querySelector('.arcade-best').textContent;
      renderReceipt('ARCADE SCORE SLIP', [
        ['Game', game],
        ['Score', score],
        ['Personal best', best],
      ], 'One more round?');
    }
    if (source.dataset.receipt === 'fixit') {
      renderReceipt('HELP DESK RECEIPT', [
        ['Ticket', source.dataset.ticket],
        ['Resolution', source.dataset.resolution],
        ['Review', source.dataset.summary],
      ], 'Ticket closed. Printer still broken.');
    }
  });

  function renderReceipt(title, rows, note) {
    const label = doc.createElement('h3');
    label.textContent = title;
    const details = doc.createElement('dl');
    for (const [key, value] of rows) {
      const term = doc.createElement('dt');
      const description = doc.createElement('dd');
      term.textContent = key;
      description.textContent = value;
      details.append(term, description);
    }
    const footer = doc.createElement('p');
    footer.textContent = note;

    revealPaper('Print receipt', label, details, footer);
  }

  function revealPaper(printLabel, ...contents) {
    paper.replaceChildren(...contents);
    paper.hidden = false;
    hint.hidden = true;
    print.textContent = printLabel;
    print.hidden = false;
  }

  function printText(name, text) {
    const title = doc.createElement('h3');
    title.textContent = name;
    const documentText = doc.createElement('pre');
    documentText.className = 'printer-text-document';
    documentText.textContent = text;
    revealPaper('Print document', title, documentText);
  }

  return { printText };
}
