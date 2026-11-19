const columns = 13;
const rows = 10;
const cell = 20;
const fieldX = 30;
const fieldY = 28;
const dock = { column: 6, row: 9 };
const capsulePositions = [
  { column: 2, row: 6 },
  { column: 10, row: 3 },
  { column: 6, row: 0 },
];

const lanes = [
  { row: 1, speed: -56, starts: [26, 134, 242], width: 21 },
  { row: 2, speed: 68, starts: [14, 135, 250], width: 13 },
  { row: 4, speed: 45, starts: [54, 173, 264], width: 23 },
  { row: 5, speed: -60, starts: [8, 106, 227], width: 15 },
  { row: 7, speed: -40, starts: [58, 159, 279], width: 23 },
  { row: 8, speed: 51, starts: [9, 120, 230], width: 15 },
];
const safeRows = [0, 3, 6, 9];
const driftWidth = 352;
const maxShields = 3;
const directions = {
  left: [-1, 0],
  right: [1, 0],
  up: [0, -1],
  down: [0, 1],
};

const centerX = (column) => fieldX + column * cell + cell / 2;
const centerY = (row) => fieldY + row * cell + cell / 2;
const sameCell = (first, second) => first.column === second.column && first.row === second.row;

export const orbit = {
  id: 'orbit',
  name: 'Orbit Courier',
  instructions: 'Dodge orbital traffic, collect all three amber capsules, and return to the cyan dock.',
  controls: [
    { action: 'up', label: '▲', name: 'Up', keys: ['ArrowUp', 'w'] },
    { action: 'left', label: '◀', name: 'Left', keys: ['ArrowLeft', 'a'] },
    { action: 'down', label: '▼', name: 'Down', keys: ['ArrowDown', 's'] },
    { action: 'right', label: '▶', name: 'Right', keys: ['ArrowRight', 'd'] },
  ],
  create(canvas) {
    const ctx = canvas.getContext('2d');
    let ship;
    let checkpoint;
    let capsules;
    let shields;
    let recovery;
    let time;
    let score;
    let status;

    function reset() {
      ship = { ...dock };
      checkpoint = ship;
      capsules = [...capsulePositions];
      shields = maxShields;
      recovery = 0;
      time = 0;
      score = 0;
      status = 'playing';
    }

    function drift(start, lane) {
      const position = start + lane.speed * time / 1000 + 16;
      return (position % driftWidth + driftWidth) % driftWidth - 16;
    }

    function checkCollision() {
      if (recovery > 0) return;
      const lane = lanes.find(({ row }) => row === ship.row);
      if (!lane || !lane.starts.some((start) =>
        Math.abs(centerX(ship.column) - drift(start, lane)) < lane.width / 2 + 5
      )) return;

      shields -= 1;
      if (shields === 0) {
        status = 'lost';
        return;
      }
      ship = checkpoint;
      recovery = 850;
    }

    function input(action) {
      if (status !== 'playing' || !Object.hasOwn(directions, action)) return;
      const [dx, dy] = directions[action];
      const column = ship.column + dx;
      const row = ship.row + dy;
      if (column < 0 || column >= columns || row < 0 || row >= rows) return;
      ship = { column, row };
      if (safeRows.includes(row)) checkpoint = ship;

      const pickup = capsules.findIndex((capsule) => sameCell(ship, capsule));
      if (pickup >= 0) {
        capsules.splice(pickup, 1);
        score += 100;
      }
      if (capsules.length === 0 && sameCell(ship, dock)) {
        score += 200;
        status = 'won';
      }
      checkCollision();
    }

    function step(elapsedMs) {
      if (status === 'playing') {
        time += elapsedMs;
        recovery = Math.max(0, recovery - elapsedMs);
        checkCollision();
      }
      return { score, status };
    }

    function rectangle(x, y, width, height, color) {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, width, height);
    }

    function draw() {
      rectangle(0, 0, 320, 240, '#111221');
      rectangle(0, 0, 320, 24, '#202542');
      ctx.font = 'bold 13px monospace';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#d4dcfc';
      ctx.fillText(`CARGO ${capsulePositions.length - capsules.length}/${capsulePositions.length}`, 12, 13);
      ctx.fillText('SHIELD', 198, 13);
      for (let index = 0; index < maxShields; index += 1) {
        rectangle(255 + 18 * index, 9, 13, 8, index < shields ? '#81ead1' : '#414969');
      }

      for (const row of safeRows) {
        const y = centerY(row);
        rectangle(fieldX - 7, y - 9, columns * cell + 14, 18, '#1c2440');
        rectangle(fieldX - 7, y - 9, columns * cell + 14, 1, '#343e63');
        for (let column = 0; column < columns; column += 1) {
          rectangle(centerX(column) - 1, y + 6, 3, 1, '#515d84');
        }
      }
      for (const lane of lanes) {
        const y = centerY(lane.row);
        for (let column = 0; column < columns; column += 1) {
          rectangle(centerX(column) - 3, y, 7, 1, '#282d48');
        }
        for (const start of lane.starts) {
          const x = Math.round(drift(start, lane) - lane.width / 2);
          const cockpit = lane.speed > 0 ? x + lane.width - 5 : x + 2;
          rectangle(x + 2, y - 5, lane.width - 4, 10, '#42468f');
          rectangle(x, y - 2, lane.width, 5, '#929afa');
          rectangle(cockpit, y - 3, 3, 7, '#e0e3ff');
        }
      }

      const dockColor = capsules.length === 0 ? '#b7fff0' : '#62cdb9';
      const dockX = centerX(dock.column);
      const dockY = centerY(dock.row);
      rectangle(dockX - 9, dockY - 8, 19, 17, dockColor);
      rectangle(dockX - 7, dockY - 6, 15, 13, '#233751');
      rectangle(dockX - 4, dockY + 5, 9, 2, dockColor);

      for (const capsule of capsules) {
        const x = centerX(capsule.column);
        const y = centerY(capsule.row);
        rectangle(x - 5, y - 5, 11, 11, '#d88f43');
        rectangle(x - 7, y - 3, 15, 7, '#ffd080');
        rectangle(x - 2, y - 3, 5, 5, '#fff1b8');
      }

      const x = centerX(ship.column);
      const y = centerY(ship.row);
      const hull = status === 'lost' ? '#ff816e' : '#e7fff9';
      const wings = recovery > 0 ? '#fff0a4' : '#64e4c9';
      rectangle(x - 2, y - 7, 5, 12, hull);
      rectangle(x - 5, y - 3, 11, 7, hull);
      rectangle(x - 7, y + 1, 15, 5, wings);
      rectangle(x - 2, y - 3, 5, 5, '#287471');
      rectangle(x - 1, y + 6, 3, 2, '#ffbc68');
    }

    reset();
    return { reset, input, step, draw };
  },
};
