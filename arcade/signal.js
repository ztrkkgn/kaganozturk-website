const routes = [
  { action: 'left', label: 'DATA', name: 'Route to Data', keys: ['ArrowLeft', 'a'], x: 64, color: '#65e6cb' },
  { action: 'center', label: 'SYNC', name: 'Route to Sync', keys: ['ArrowDown', 's'], x: 160, color: '#c5a7ff' },
  { action: 'right', label: 'PWR', name: 'Route to Power', keys: ['ArrowRight', 'd'], x: 256, color: '#ffd071' },
];

const goal = 15;
const errorLimit = 3;

export const signal = {
  id: 'signal',
  name: 'Signal Sort',
  instructions: 'Match each falling packet to its output before it arrives. Route 15 packets before 3 errors.',
  controls: routes.map(({ action, label, name, keys }) => ({ action, label, name, keys })),
  create(canvas) {
    const ctx = canvas.getContext('2d');
    let score, errors, selected, packet, age, feedback, status;

    function reset() {
      score = 0;
      errors = 0;
      selected = 1;
      packet = Math.floor(Math.random() * routes.length);
      age = 0;
      feedback = null;
      status = 'playing';
    }

    function input(action) {
      if (status !== 'playing') return;
      const route = routes.findIndex((item) => item.action === action);
      if (route !== -1) selected = route;
    }

    function travelTime() {
      return 1950 - score * 65;
    }

    function step(elapsedMs) {
      if (status !== 'playing') return { score, status };
      age += elapsedMs;
      while (age >= travelTime() && status === 'playing') {
        age -= travelTime();
        const success = selected === packet;
        if (success) score++;
        else errors++;
        feedback = { success, route: selected };

        if (score === goal) status = 'won';
        if (errors === errorLimit) status = 'lost';
        packet = (packet + 1 + Math.floor(Math.random() * (routes.length - 1))) % routes.length;
      }
      return { score, status };
    }

    function rect(x, y, w, h, color) {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
    }

    function text(value, x, y, color, align = 'left') {
      ctx.fillStyle = color;
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = align;
      ctx.textBaseline = 'middle';
      ctx.fillText(value, x, y);
    }

    function glyph(route, x, y) {
      const color = routes[route].color;
      if (route === 0) {
        rect(x + 3, y, 6, 12, color);
        rect(x, y + 3, 12, 6, color);
        rect(x + 2, y + 2, 8, 8, color);
      } else if (route === 1) {
        rect(x + 5, y, 2, 4, color);
        rect(x + 3, y + 4, 6, 4, color);
        rect(x, y + 8, 12, 4, color);
      } else {
        rect(x, y, 12, 12, color);
        rect(x + 3, y + 3, 6, 6, '#122328');
      }
    }

    function drawRoute(route, color) {
      const x = routes[route].x;
      rect(Math.min(160, x), 161, Math.abs(160 - x) + 3, 3, color);
      rect(x, 161, 3, 19, color);
    }

    function draw() {
      rect(0, 0, 320, 240, '#0c1519');
      rect(10, 10, 300, 220, '#2d4650');
      rect(12, 12, 296, 216, '#14252b');
      rect(19, 18, 282, 22, '#0c1519');
      text('INCOMING', 27, 29, '#c0d4d9');
      text('ERRORS', 246, 29, '#c0d4d9', 'right');
      for (let i = 0; i < errorLimit; i++) {
        rect(253 + i * 14, 25, 9, 8, i < errors ? '#ff7968' : '#324950');
      }

      rect(139, 48, 42, 105, '#0c1519');
      rect(139, 48, 2, 105, '#36555f');
      rect(179, 48, 2, 105, '#36555f');
      for (let y = 51; y < 151; y += 12) {
        rect(144, y, 4, 1, '#36555f');
        rect(172, y, 4, 1, '#36555f');
      }

      const showFeedback = feedback && (age < 450 || status !== 'playing');
      if (showFeedback) {
        text(feedback.success ? 'ROUTED' : 'MISROUTED', 76, 141, feedback.success ? '#65e6cb' : '#ff7968', 'center');
      }

      let selectedColor = routes[selected].color;
      if (showFeedback && feedback.route === selected && !feedback.success) selectedColor = '#ff7968';
      rect(160, 151, 3, 13, selectedColor);
      routes.forEach((route, index) => drawRoute(index, '#36555f'));
      drawRoute(selected, selectedColor);

      if (status === 'playing') {
        const y = 49 + Math.floor(age / travelTime() * 80);
        rect(149, y, 22, 22, routes[packet].color);
        rect(151, y + 2, 18, 18, '#122328');
        glyph(packet, 154, y + 5);
      }

      routes.forEach((route, index) => {
        const active = index === selected;
        rect(route.x - 41, 178, 84, 35, active ? selectedColor : '#48636b');
        rect(route.x - 39, 180, 80, 31, active ? '#28434a' : '#0c1519');
        glyph(index, route.x - 30, 190);
        text(route.label, route.x - 11, 196, active ? '#ffffff' : '#c0d4d9');
      });

      if (status !== 'playing') {
        rect(76, 81, 168, 42, '#0c1519');
        text(status === 'won' ? 'LINK STABLE' : 'LINK LOST', 160, 102, status === 'won' ? '#65e6cb' : '#ff7968', 'center');
      }
    }

    reset();
    return { reset, input, step, draw };
  },
};
