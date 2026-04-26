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
            <button data-action="train-fast">Train Fast</button>
            <button data-action="demo">Show Result</button>
            <button data-action="reset">Reset</button>
            <button data-action="step">Step</button>
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
          The visual layer is static for now. Next step: add Q-learning updates,
          rewards, exploration, and learned movement.
        </div>
      </div>
    </div>
  `;

  const canvas = document.getElementById("rl-canvas");
  const ctx = canvas.getContext("2d");

  const grid = 8;
  const cell = canvas.width / grid;

  const cat = { x: 1, y: 6 };
  const mouse = { x: 6, y: 1 };
  const walls = [
    { x: 3, y: 2 },
    { x: 3, y: 3 },
    { x: 3, y: 4 },
    { x: 4, y: 4 },
    { x: 5, y: 4 },
  ];

  const actions = [
    {name: "up", dx: 0 , dy: -1},
    {name: "down", dx: 0, dy: 1},
    {name: "left", dx:-1, dy: 0},
    {name: "right", dx: 1, dy: 0},
  ];

  const q ={};

  let episode = 0;
  let steps = 0;
  let epsilon = 0.4;
  let alpha = 0.25;
  let gamma = 0.9;
  let running = false;
  let timer = null;

  function stateKey(pos){
    return `${pos.x},${pos.y}`;
  }

  function getQ(state){
    if (!q[state]) q[state] = [0,0,0,0];
    return q[state];
  }

  function isWall(x,y){
    return walls.some(w => w.x === x && w.y ===y);
  }

  function isOutside(x,y){
    return x<0 || x >= grid || y<0 ||y >= grid;
  }

  function resetCat(){
    cat.x = 1;
    cat.y = 6;
    steps = 0;
  }

  function chooseAction(state){
    if (Math.random() < epsilon) {
        return Math.floor(Math.random() * actions.length);
    }

    const qValues = getQ(state);
    let best = 0;
    for (let i = 1; i < qValues.length; i++) {
        if (qValues[i] > qValues[best]) best = i;
    }
    return best;
  }

  function takeAction(actionIndex){
    const action = actions[actionIndex];

    const nx = cat.x + action.dx;
    const ny = cat.y + action.dy;

    if (isOutside(nx,ny) || isWall(nx,ny)){
        return{
            next: {x: cat.x, y: cat.y},
            reward : -5,
            done : false,
        };
    }

    cat.x = nx;
    cat.y = ny;
    
    const reachedMouse = cat.x === mouse.x && cat.y === mouse.y;
    return {
        next: {x: cat.x, y: cat.y},
        reward : reachedMouse ? 10 : -1,
        done : reachedMouse,
    };
  }

  function LearningStep(){
    const state = stateKey(cat);
    const actionIndex = chooseAction(state);
    const result = takeAction(actionIndex);
    const nextState = stateKey(result.next);

    const currentQ = getQ(state);
    const nextQ = getQ(nextState);

    const oldValue = currentQ[actionIndex];
    const bestNext = Math.max(...nextQ);
    
    const target = result.reward + gamma * bestNext;
    const predictionError = target - oldValue;

    currentQ[actionIndex] = oldValue + alpha * predictionError;
    steps++;

    if (result.done || steps >=80){
        episode++;
        epsilon = Math.max(0.05, epsilon * 0.985);
        resetCat();
    }

    updateState();
    draw();
  }

  function updateState(){
    document.getElementById("rl-episode").textContent = episode.toString().padStart(3, "0");
    document.getElementById("rl-steps").textContent = steps.toString().padStart(2, "0");
    document.getElementById("rl-epsilon").textContent = epsilon.toFixed(2);
  }


  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(16,16,19,0.72)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < grid; y++) {
      for (let x = 0; x < grid; x++) {
        ctx.strokeStyle = "rgba(234,231,225,0.08)";
        ctx.lineWidth = 1;
        ctx.strokeRect(x * cell, y * cell, cell, cell);
      }
    }

    walls.forEach(w => {
      ctx.fillStyle = "rgba(234,231,225,0.14)";
      ctx.fillRect(w.x * cell + 8, w.y * cell + 8, cell - 16, cell - 16);
    });

    drawToken(mouse.x, mouse.y, "🐭", "rgba(25,229,223,0.18)");
    drawToken(cat.x, cat.y, "🐈", "rgba(235,71,210,0.20)");
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


    // ===== CONTROLS =====

    const trainBtn = mount.querySelector('[data-action="train"]');
    const pauseBtn = mount.querySelector('[data-action="pause"]');
    const resetBtn = mount.querySelector('[data-action="reset"]');

    trainBtn.addEventListener("click", () => {
    if (running) return;

    running = true;

    timer = setInterval(() => {
        LearningStep(); 
    }, 120);
    });

    pauseBtn.addEventListener("click", () => {
    running = false;
    clearInterval(timer);
    });

    resetBtn.addEventListener("click", () => {
    running = false;
    clearInterval(timer);

    for (const key in q) delete q[key];

    episode = 0;
    epsilon = 0.4;

    resetCat();
    updateState();
    draw();
    });

    ctx.fillStyle = "rgba(25,229,223,0.06)";

    for (let key in q) {
    const [x, y] = key.split(',').map(Number);
    const values = q[key];
    const maxVal = Math.max(...values);

    if (maxVal > 0) {
        ctx.fillRect(x * cell, y * cell, cell, cell);
    }
    }

  draw();
})();