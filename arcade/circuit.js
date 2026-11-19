const columns = 5;
const rows = 4;
const tileSize = 40;
const gridX = 60;
const gridY = 40;
const north = 1;
const east = 2;
const south = 4;
const west = 8;
const ports = [
  { bit: north, opposite: south, dx: 0, dy: -1 },
  { bit: east, opposite: west, dx: 1, dy: 0 },
  { bit: south, opposite: north, dx: 0, dy: 1 },
  { bit: west, opposite: east, dx: -1, dy: 0 },
];
const movePorts = { up: ports[0], right: ports[1], down: ports[2], left: ports[3] };
const wireShapes = [north | south, east | west, north | east, east | south, south | west, west | north];
const boards = [
  { route: [5, 6, 1, 2, 3, 8, 7, 12, 17, 18, 19, 14, 9], fuses: [3, 18] },
  { route: [10, 15, 16, 17, 12, 11, 6, 7, 2, 3, 4, 9, 8, 13, 14], fuses: [11, 4] },
  { route: [0, 5, 6, 11, 10, 15, 16, 17, 18, 13, 12, 7, 8, 3, 4], fuses: [10, 8] },
];

function tileAt(column, row) {
  if (column < 0 || column >= columns || row < 0 || row >= rows) return -1;
  return row * columns + column;
}

function neighbor(index, { dx, dy }) {
  return tileAt(index % columns + dx, Math.floor(index / columns) + dy);
}

function portBetween(from, to) {
  return ports.find((port) => neighbor(from, port) === to).bit;
}

function rotate(shape) {
  return ((shape << 1) | (shape >> 3)) & 0b1111;
}

function scramble(board, boardIndex) {
  const { route } = board;
  const tiles = Array.from({ length: columns * rows }, (_, index) => wireShapes[(index * 5 + boardIndex) % wireShapes.length]);

  route.forEach((tile, index) => {
    const entry = index === 0 ? west : portBetween(tile, route[index - 1]);
    const exit = index === route.length - 1 ? east : portBetween(tile, route[index + 1]);
    tiles[tile] = entry | exit;
  });

  return tiles.map((shape, index) => {
    const turns = (index + Math.floor(index / columns) + boardIndex + 1) % ports.length;
    for (let turn = 0; turn < turns; turn++) shape = rotate(shape);
    while (index === route[0] && (shape & west)) shape = rotate(shape);
    return shape;
  });
}

export const circuit = {
  id: 'circuit',
  name: 'Circuit Shift',
  animated: false,
  instructions: 'Rotate tiles to carry power from IN through both fuses to OUT.',
  controls: [
    { action: 'left', label: '◀', name: 'Select tile left', keys: ['ArrowLeft', 'a'] },
    { action: 'up', label: '▲', name: 'Select tile above', keys: ['ArrowUp', 'w'] },
    { action: 'down', label: '▼', name: 'Select tile below', keys: ['ArrowDown', 's'] },
    { action: 'right', label: '▶', name: 'Select tile right', keys: ['ArrowRight', 'd'] },
    { action: 'rotate', label: 'Rotate', name: 'Rotate selected tile', keys: ['Enter', ' '] },
  ],

  create(canvas) {
    const context = canvas.getContext('2d');
    let boardIndex = 0;
    let tiles;
    let cursor;
    let turns;
    let powered;
    let poweredFuses;
    let output;
    let status;

    function tracePower() {
      const { route, fuses } = boards[boardIndex];
      let tile = route[0];
      const target = route.at(-1);
      let entry = west;
      powered = new Set();
      output = false;

      while ((tiles[tile] & entry) && !powered.has(tile)) {
        powered.add(tile);
        const exit = ports.find(({ bit }) => bit === (tiles[tile] ^ entry));
        if (tile === target && exit.bit === east) {
          output = true;
          break;
        }
        tile = neighbor(tile, exit);
        if (tile === -1) break;
        entry = exit.opposite;
      }

      poweredFuses = fuses.filter((tile) => powered.has(tile)).length;
      status = output && poweredFuses === fuses.length ? 'won' : 'playing';
    }

    function reset() {
      if (status === 'won') boardIndex = (boardIndex + 1) % boards.length;
      const board = boards[boardIndex];
      tiles = scramble(board, boardIndex);
      cursor = board.route[0];
      turns = 0;
      tracePower();
    }

    function rotateSelected() {
      tiles[cursor] = rotate(tiles[cursor]);
      turns++;
      tracePower();
    }

    function input(action) {
      if (status === 'won') return;
      if (action === 'rotate') {
        rotateSelected();
        return;
      }

      const direction = movePorts[action];
      if (!direction) return;
      const next = neighbor(cursor, direction);
      if (next !== -1) cursor = next;
    }

    function pointer(x, y) {
      if (status === 'won') return;
      const tile = tileAt(Math.floor((x - gridX) / tileSize), Math.floor((y - gridY) / tileSize));
      if (tile === -1) return;
      cursor = tile;
      rotateSelected();
    }

    function step() {
      return { score: poweredFuses + (status === 'won' ? 100 - Math.min(60, turns) : 0), status };
    }

    function rect(color, x, y, width, height) {
      context.fillStyle = color;
      context.fillRect(x, y, width, height);
    }

    function text(value, x, y, color = '#9bb1b3', align = 'left') {
      context.fillStyle = color;
      context.textAlign = align;
      context.fillText(value, x, y);
    }

    function fuse(x, y, live) {
      rect('#131a21', x - 7, y - 5, 15, 11);
      rect('#131a21', x - 5, y - 7, 11, 15);
      const color = live ? '#c8ffd3' : '#f3bd70';
      rect(color, x - 5, y - 3, 11, 7);
      rect(color, x - 3, y - 5, 7, 11);
      rect(live ? '#439e82' : '#956337', x - 2, y - 2, 5, 5);
    }

    function terminal(label, x, y, wireX, live) {
      const accent = live ? '#77e9bf' : '#71848d';
      rect(accent, wireX, y - 2, 20, 5);
      rect('#15212b', x - 9, y - 7, 19, 15);
      rect(accent, x - 6, y - 4, 13, 9);
      rect(live ? '#cbffdf' : '#30404c', x - 3, y - 2, 7, 5);
      text(label, x, y - 13, accent, 'center');
    }

    function draw() {
      const { route, fuses } = boards[boardIndex];
      rect('#111c24', 0, 0, canvas.width, canvas.height);
      for (let x = 8; x < canvas.width; x += 8) {
        for (let y = 8; y < canvas.height; y += 8) rect('#192832', x, y, 1, 1);
      }

      context.font = 'bold 12px monospace';
      text(`FUSES ${poweredFuses}/${fuses.length}`, 16, 24, poweredFuses ? '#77e9bf' : '#f3bd70');
      text(`TURNS ${String(turns).padStart(2, '0')}`, 304, 24, '#b9cacc', 'right');
      rect('#45525b', gridX - 2, gridY - 2, columns * tileSize + 4, rows * tileSize + 4);
      rect('#0e181f', gridX - 1, gridY - 1, columns * tileSize + 2, rows * tileSize + 2);

      const sourceY = gridY + Math.floor(route[0] / columns) * tileSize + tileSize / 2;
      const targetY = gridY + Math.floor(route.at(-1) / columns) * tileSize + tileSize / 2;
      terminal('IN', 36, sourceY, gridX - 20, true);
      terminal('OUT', 284, targetY, gridX + columns * tileSize, output);

      tiles.forEach((shape, index) => {
        const x = gridX + (index % columns) * tileSize;
        const y = gridY + Math.floor(index / columns) * tileSize;
        const centerX = x + tileSize / 2;
        const centerY = y + tileSize / 2;
        const live = powered.has(index);
        const trace = live ? '#77e9bf' : '#72838f';

        rect(index === cursor ? '#374651' : '#24333e', x + 1, y + 1, tileSize - 2, tileSize - 2);
        rect('#43505a', x + 2, y + 2, tileSize - 4, 1);
        rect('#1c2932', x + 2, y + tileSize - 3, tileSize - 4, 1);

        if (shape & north) rect(trace, centerX - 2, y, 5, tileSize / 2 + 1);
        if (shape & east) rect(trace, centerX, centerY - 2, tileSize / 2, 5);
        if (shape & south) rect(trace, centerX - 2, centerY, 5, tileSize / 2);
        if (shape & west) rect(trace, x, centerY - 2, tileSize / 2 + 1, 5);
        rect(trace, centerX - 3, centerY - 3, 7, 7);
        if (fuses.includes(index)) fuse(centerX, centerY, live);

        if (index === cursor) {
          context.strokeStyle = '#f3bd70';
          context.lineWidth = 1;
          context.strokeRect(x + 2.5, y + 2.5, tileSize - 5, tileSize - 5);
        }
      });

      fuse(22, 220, false);
      text('FUSE', 33, 224);
      rect('#77e9bf', 82, 218, 12, 5);
      text('LIVE', 100, 224);
      const boardLabel = status === 'won' ? 'CIRCUIT ONLINE' : `BOARD ${String(boardIndex + 1).padStart(2, '0')}`;
      text(boardLabel, 304, 224, status === 'won' ? '#77e9bf' : '#9bb1b3', 'right');
    }

    reset();
    return { reset, input, pointer, step, draw };
  },
};
