(function () {
  const mount = document.getElementById("rl-lab");
  if (!mount) return;

  mount.innerHTML = `
    <div class="rl-shell">
      <div class="rl-panel">
        <div class="rl-topbar">
          <div>
            <div class="rl-kicker">gridworld://cat-agent</div>
            <h3>Cat vs. Mouse</h3>
          </div>
          <div class="rl-status">
            <span class="rl-dot"></span>
            idle
          </div>
        </div>

        <canvas id="rl-canvas" width="560" height="560"></canvas>

        <div class="rl-controls">
            <button data-action="train-fast">Train</button>
            <button data-action="demo">Run Policy</button>
            <button data-action="step">One Step</button>
            <button data-action="reset">Reset</button>        
        </div>
      </div>

      <div class="rl-side">
        <div class="rl-stat">
          <span>episode</span>
          <strong id="rl-episode">000</strong>
        </div>
        <div class="rl-stat">
          <span>steps</span>
          <strong id="rl-steps">00</strong>
        </div>
        <div class="rl-stat">
          <span>epsilon</span>
          <strong id="rl-epsilon">0.40</strong>
        </div>
        <div class="rl-note">
          Hit <b>Train Fast</b> to run 100 episodes instantly,
          then <b>Show Result</b> to watch the learned policy.
        </div>
        <div class="rl-stat">
            <span>success</span>
            <strong id="rl-success">0%</strong>
        </div>
        <div class="rl-stat">
            <span>avg reward</span>
            <strong id="rl-avg-reward">0.0</strong>
        </div>
        <div class="rl-stat">
            <span>policy</span>
            <strong id="rl-policy">raw</strong>
        </div>
      </div>
    </div>
  `;

  const canvas = document.getElementById("rl-canvas");
  const ctx = canvas.getContext("2d");

  const grid = 8;
  const cell = canvas.width / grid;

  const cat   = { x: 1, y: 6 };
  const mouse = { x: 6, y: 1 };
  const walls = [
    { x: 3, y: 2 },
    { x: 3, y: 3 },
    { x: 3, y: 4 },
    { x: 4, y: 4 },
    { x: 5, y: 4 },
  ];

  const actions = [
    { name: "up",    dx:  0, dy: -1 },
    { name: "down",  dx:  0, dy:  1 },
    { name: "left",  dx: -1, dy:  0 },
    { name: "right", dx:  1, dy:  0 },
  ];

  const q = {};

  let episode  = 0;
  let steps    = 0;
  let epsilon  = 0.4;
  const alpha  = 0.25;
  const gamma  = 0.9;
  let running  = false;
  let timer    = null;
  let winFlash  = 0;
  let showPath  = false;
  let successes = 0;
  let episodeReward = 0;
  let winRewards = [];

  // ── helpers ──────────────────────────────────────────────────────────────

  function stateKey(pos) { return `${pos.x},${pos.y}`; }

  function getQ(state) {
    if (!q[state]) q[state] = [0, 0, 0, 0];
    return q[state];
  }

  function isWall(x, y)    { return walls.some(w => w.x === x && w.y === y); }
  function isOutside(x, y) { return x < 0 || x >= grid || y < 0 || y >= grid; }

  function hasPath(sx, sy, ex, ey) {
    const visited = new Set();
    const queue = [{ x: sx, y: sy }];
    visited.add(`${sx},${sy}`);
    while (queue.length) {
      const { x, y } = queue.shift();
      if (x === ex && y === ey) return true;
      for (const { dx, dy } of actions) {
        const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
        if (!isOutside(nx, ny) && !isWall(nx, ny) && !visited.has(k)) {
          visited.add(k); queue.push({ x: nx, y: ny });
        }
      }
    }
    return false;
  }

  function randomizeWalls() {
    const safe = new Set(['1,6','6,1','0,6','2,6','1,7','1,5','5,1','6,0','6,2','7,1']);
    walls.length = 0;
    const target = 4 + Math.floor(Math.random() * 4); // 4–7 walls
    let attempts = 0;
    while (walls.length < target && attempts < 300) {
      attempts++;
      const x = Math.floor(Math.random() * grid);
      const y = Math.floor(Math.random() * grid);
      if (safe.has(`${x},${y}`) || isWall(x, y)) continue;
      walls.push({ x, y });
      if (!hasPath(1, 6, 6, 1)) walls.pop(); // revert if it blocks the path
    }
  }

  function resetCat() { cat.x = 1; cat.y = 6; steps = 0; }

  function chooseAction(state) {
    if (Math.random() < epsilon) return Math.floor(Math.random() * actions.length);
    return chooseBestAction(state);
  }

  function chooseBestAction(state) {
    const values = getQ(state);
    let best = 0;
    for (let i = 1; i < values.length; i++) {
      if (values[i] > values[best]) best = i;
    }
    return best;
  }

  function takeAction(actionIndex) {
    const action = actions[actionIndex];
    const nx = cat.x + action.dx;
    const ny = cat.y + action.dy;

    if (isOutside(nx, ny) || isWall(nx, ny)) {
      return { next: { x: cat.x, y: cat.y }, reward: -0.5, done: false };
    }

    cat.x = nx;
    cat.y = ny;

    const reachedMouse = cat.x === mouse.x && cat.y === mouse.y;
    if (reachedMouse) winFlash = 10;
    return {
      next:   { x: cat.x, y: cat.y },
      reward: reachedMouse ? 10 : -0.1,
      done:   reachedMouse,
    };
  }

  // ── learning ──────────────────────────────────────────────────────────────

  function LearningStep(shouldDraw = true) {
    const state       = stateKey(cat);
    const actionIndex = chooseAction(state);
    const result      = takeAction(actionIndex);
    const nextState   = stateKey(result.next);

    const currentQ = getQ(state);
    const nextQ    = getQ(nextState);
    const oldValue = currentQ[actionIndex];
    const bestNext = Math.max(...nextQ);

    currentQ[actionIndex] = oldValue + alpha * (result.reward + gamma * bestNext - oldValue);
    episodeReward += result.reward;
    steps++;

    if (result.done || steps >= 80) {
      if (result.done) {
        successes++;
        winRewards.push(episodeReward);
        if (winRewards.length > 20) winRewards.shift();
      }
      episodeReward = 0;
      episode++;
      epsilon = Math.max(0.05, epsilon * 0.985);
      resetCat();
    }

    updateState();
    if (shouldDraw) draw();
  }

  function trainFast(episodesTarget = 25) {
    if (running) return;
    const target = episode + episodesTarget;
    while (episode < target) {
      LearningStep(false);
    }
    epsilon = 0.0;
    showPath = true;
    resetCat();
    updateState();
    draw();
  }

  function demoPolicy() {
    if (running) return;
    running = true;
    epsilon = 0.0;
    resetCat();
    updateState();
    draw();

    timer = setInterval(() => {
      const state       = stateKey(cat);
      const actionIndex = chooseBestAction(state);
      const result      = takeAction(actionIndex);
      steps++;

      if (result.done) {
        updateState();
        draw();
        clearInterval(timer);
        running = false;
        return;
      }

      // Bail if stuck (shouldn't happen with a trained policy, but safety net)
      if (steps > 120) {
        clearInterval(timer);
        running = false;
      }

      updateState();
      draw();
    }, 180);
  }

  // ── rendering ─────────────────────────────────────────────────────────────

  function updateState() {
    const successRate = episode > 0 ? (successes / episode) * 100 : 0;
    const avgReward   = winRewards.length > 0
      ? winRewards.reduce((a, b) => a + b, 0) / winRewards.length
      : 0;

    document.getElementById("rl-episode").textContent     = episode.toString().padStart(3, "0");
    document.getElementById("rl-steps").textContent       = steps.toString().padStart(2, "0");
    document.getElementById("rl-epsilon").textContent     = epsilon.toFixed(2);
    document.getElementById("rl-success").textContent     = `${successRate.toFixed(0)}%`;
    document.getElementById("rl-avg-reward").textContent  = winRewards.length > 0 ? avgReward.toFixed(1) : "—";
    document.getElementById("rl-policy").textContent      = episode >= 80 && successRate > 60 ? "learned" : "exploring";
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = "rgba(16,16,19,0.72)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines
    for (let y = 0; y < grid; y++) {
      for (let x = 0; x < grid; x++) {
        ctx.strokeStyle = "rgba(234,231,225,0.08)";
        ctx.lineWidth = 1;
        ctx.strokeRect(x * cell, y * cell, cell, cell);
      }
    }

    // Q-value glow — cells the agent has learned value for
    ctx.fillStyle = "rgba(25,229,223,0.06)";
    for (let key in q) {
      const [x, y] = key.split(',').map(Number);
      const maxVal = Math.max(...q[key]);
      if (maxVal > 0) ctx.fillRect(x * cell, y * cell, cell, cell);
    }

    // Path hint — greedy policy trace from cat start to mouse
    drawPathHint();

    // Walls
    walls.forEach(w => {
      ctx.fillStyle = "rgba(234,231,225,0.14)";
      ctx.fillRect(w.x * cell + 8, w.y * cell + 8, cell - 16, cell - 16);
    });

    // Win flash on mouse cell
    if (winFlash > 0) {
      ctx.fillStyle = "rgba(25,229,223,0.22)";
      ctx.fillRect(mouse.x * cell, mouse.y * cell, cell, cell);
      winFlash--;
    }

    drawToken(mouse.x, mouse.y, "🐭", "rgba(25,229,223,0.18)");
    drawToken(cat.x,   cat.y,   "🐈", "rgba(235,71,210,0.20)");
  }

  function drawToken(x, y, emoji, glow) {
    const cx = x * cell + cell / 2;
    const cy = y * cell + cell / 2;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cell * 0.7);
    grad.addColorStop(0, glow);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, cell * 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = `${cell * 0.48}px system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(emoji, cx, cy);
  }

  function drawPathHint() {
    if (!showPath || Object.keys(q).length === 0) return;

    const visited = new Set();
    let x = 1, y = 6; // cat's reset position
    const path = [];

    for (let i = 0; i < grid * grid; i++) {
      const key = `${x},${y}`;
      if (visited.has(key)) break;
      visited.add(key);
      if (x === mouse.x && y === mouse.y) break;

      const best = chooseBestAction(key);
      const { dx, dy } = actions[best];
      const nx = x + dx;
      const ny = y + dy;
      if (isOutside(nx, ny) || isWall(nx, ny)) break;

      path.push({ x, y, dx, dy });
      x = nx;
      y = ny;
    }

    ctx.save();
    ctx.strokeStyle = "rgba(25,229,223,0.45)";
    ctx.fillStyle   = "rgba(25,229,223,0.45)";
    ctx.lineWidth   = 1.5;
    ctx.lineCap     = "round";

    path.forEach(({ x, y, dx, dy }) => {
      const cx  = x * cell + cell / 2;
      const cy  = y * cell + cell / 2;
      const sx  = cx - dx * cell * 0.18;
      const sy  = cy - dy * cell * 0.18;
      const ex  = cx + dx * cell * 0.28;
      const ey  = cy + dy * cell * 0.28;
      const ang = Math.atan2(dy, dx);
      const h   = 7;

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - h * Math.cos(ang - Math.PI / 5), ey - h * Math.sin(ang - Math.PI / 5));
      ctx.lineTo(ex - h * Math.cos(ang + Math.PI / 5), ey - h * Math.sin(ang + Math.PI / 5));
      ctx.closePath();
      ctx.fill();
    });

    ctx.restore();
  }

  // ── controls ──────────────────────────────────────────────────────────────

  mount.querySelector('[data-action="train-fast"]').addEventListener("click", () => {
    clearInterval(timer);
    running = false;
    trainFast(25);
  });

  mount.querySelector('[data-action="demo"]').addEventListener("click", () => {
    clearInterval(timer);
    running = false;
    demoPolicy();
  });

  mount.querySelector('[data-action="reset"]').addEventListener("click", () => {
    clearInterval(timer);
    running       = false;
    for (const key in q) delete q[key];
    randomizeWalls();
    episode       = 0;
    epsilon       = 0.4;
    winFlash      = 0;
    showPath      = false;
    successes     = 0;
    episodeReward = 0;
    winRewards    = [];
    resetCat();
    updateState();
    draw();
  });

  mount.querySelector('[data-action="step"]').addEventListener("click", () => {
    if (running) return;
    LearningStep(true);
  });

  // ── init ──────────────────────────────────────────────────────────────────

  draw();
})();
