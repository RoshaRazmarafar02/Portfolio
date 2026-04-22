// Hero node-graph animation
// Smooth Brownian wander inside a soft circular boundary, fading trails,
// warm copper + complementary teal + silver palette.
(function () {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });

  let W = 0, H = 0, DPR = Math.min(window.devicePixelRatio || 1, 2);
  let trailCanvas, trailCtx;

  // Palette: warm copper + complementary teal + silver.
  // Copper ~22° hue, teal ~195° (split-complement, close to true complement but cooler).
  const PALETTE = [
    { r: 200, g: 115, b: 69 },   // copper
    { r: 228, g: 166, b: 121 },  // rose gold
    { r: 183, g: 110, b: 82 },   // deep copper
    { r: 72,  g: 166, b: 180 },  // teal (complement)
    { r: 120, g: 198, b: 205 },  // pale teal
    { r: 216, g: 220, b: 224 },  // silver
    { r: 200, g: 205, b: 210 },  // cool silver
  ];

  const NODE_COUNT = 110;
  const CONNECT_RADIUS = 180;
  const MAX_EDGES_PER_NODE = 3;

  let CLUSTER_CX = 0, CLUSTER_CY = 0, CLUSTER_R = 0;

  const nodes = [];

  function resize() {
    const rect = canvas.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    if (!trailCanvas) {
      trailCanvas = document.createElement('canvas');
      trailCtx = trailCanvas.getContext('2d');
    }
    trailCanvas.width = canvas.width;
    trailCanvas.height = canvas.height;
    trailCtx.setTransform(DPR, 0, 0, DPR, 0, 0);

    CLUSTER_CX = W * (W > 900 ? 0.68 : 0.5);
    CLUSTER_CY = H * 0.5;
    CLUSTER_R = Math.min(W, H) * (W > 900 ? 0.28 : 0.34);
  }

  function seedNodes() {
    nodes.length = 0;
    for (let i = 0; i < NODE_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = CLUSTER_R * Math.pow(Math.random(), 0.55);
      const x = CLUSTER_CX + Math.cos(angle) * r;
      const y = CLUSTER_CY + Math.sin(angle) * r;
      const color = PALETTE[i % PALETTE.length];
      nodes.push({
        x, y,
        // remembered position for trail (updated each frame)
        px: x, py: y,
        vx: 0, vy: 0,
        // target acceleration — low-pass filtered toward random noise
        tax: 0, tay: 0,
        ax: 0, ay: 0,
        size: 1.1 + Math.random() * 1.3,
        color,
        twinkle: Math.random() * Math.PI * 2,
        noiseSeed: Math.random() * 1000,
      });
    }
  }

  function step(dt, t) {
    // Retarget the acceleration-noise at a low rate so motion stays smooth;
    // per-frame we lerp the actual acceleration toward that target (low-pass).
    for (const n of nodes) {
      // Retarget with probability proportional to dt * rate.
      // rate ~1.2 Hz -> direction changes are gradual.
      if (Math.random() < dt * 1.4) {
        n.tax = (Math.random() - 0.5) * 0.9;
        n.tay = (Math.random() - 0.5) * 0.9;
      }
      // Low-pass toward target — this is what kills sharp angles.
      const lp = 1 - Math.exp(-dt * 3.5); // smoothing factor
      n.ax += (n.tax - n.ax) * lp;
      n.ay += (n.tay - n.ay) * lp;

      // Integrate velocity (scaled for frame-rate independence).
      n.vx += n.ax * dt * 18;
      n.vy += n.ay * dt * 18;

      // Damping — viscous medium. Keeps speeds bounded and smooth.
      const damp = Math.exp(-dt * 1.8);
      n.vx *= damp;
      n.vy *= damp;

      // Soft circular containment — nodes may exit slightly; a gentle
      // inward pull grows quadratically outside the boundary.
      const px = n.x - CLUSTER_CX;
      const py = n.y - CLUSTER_CY;
      const d = Math.hypot(px, py);
      if (d > CLUSTER_R) {
        const over = (d - CLUSTER_R) / CLUSTER_R; // normalized excess
        // Softer, smaller pull — and it doesn't ramp as hard, so nodes
        // can wander further beyond the boundary before snapping back.
        const pull = (0.12 + over * 0.9) * dt * 14;
        n.vx -= (px / d) * pull;
        n.vy -= (py / d) * pull;
      }

      // Track prev, then integrate
      n.px = n.x; n.py = n.y;
      n.x += n.vx * dt * 18;
      n.y += n.vy * dt * 18;

      n.twinkle += dt * 1.2;
    }
  }

  function drawFrame(dt, t) {
    // Fade trail faster than before — higher alpha on destination-out.
    trailCtx.save();
    trailCtx.globalCompositeOperation = 'destination-out';
    // Target fade: trail should reach ~0% at 1.5s.
    // With per-frame destination-out alpha a at ~60fps (dt ~1/60),
    // remaining = (1-a)^(1.5/dt). For 1.5s -> 1% visible: a ~ 0.048.
    const fadeAlpha = 1 - Math.pow(0.01, dt / 1.5);
    trailCtx.fillStyle = `rgba(0, 0, 0, ${fadeAlpha})`;
    trailCtx.fillRect(0, 0, W, H);
    trailCtx.restore();

    // Trail segments — prev → current, actual traversed path (smooth because
    // velocity is smooth, so consecutive segments share tangent direction).
    for (const n of nodes) {
      const dx = n.x - n.px, dy = n.y - n.py;
      const speed = Math.hypot(dx, dy);
      if (speed < 0.02) continue;
      const c = n.color;
      trailCtx.strokeStyle = `rgba(${c.r}, ${c.g}, ${c.b}, 0.32)`;
      trailCtx.lineWidth = 0.8;
      trailCtx.lineCap = 'round';
      trailCtx.beginPath();
      trailCtx.moveTo(n.px, n.py);
      trailCtx.lineTo(n.x, n.y);
      trailCtx.stroke();
    }

    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(trailCanvas, 0, 0, W, H);

    // Edges
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      const neigh = [];
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d = Math.hypot(dx, dy);
        if (d < CONNECT_RADIUS) neigh.push({ b, d });
      }
      neigh.sort((p, q) => p.d - q.d);
      const take = neigh.slice(0, MAX_EDGES_PER_NODE);
      for (const { b, d } of take) {
        if (b.x + b.y < a.x + a.y) continue;
        const alpha = (1 - d / CONNECT_RADIUS) * 0.13;
        const mix = {
          r: (a.color.r + b.color.r) / 2,
          g: (a.color.g + b.color.g) / 2,
          bl: (a.color.b + b.color.b) / 2,
        };
        ctx.strokeStyle = `rgba(${mix.r}, ${mix.g}, ${mix.bl}, ${alpha})`;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    // Nodes — subtle smooth glow
    for (const n of nodes) {
      const tw = 0.78 + 0.22 * Math.sin(n.twinkle);
      const c = n.color;

      // Soft halo
      const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.size * 9);
      grd.addColorStop(0, `rgba(${c.r}, ${c.g}, ${c.b}, ${0.28 * tw})`);
      grd.addColorStop(0.45, `rgba(${c.r}, ${c.g}, ${c.b}, ${0.08 * tw})`);
      grd.addColorStop(1, `rgba(${c.r}, ${c.g}, ${c.b}, 0)`);
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.size * 9, 0, Math.PI * 2);
      ctx.fill();

      // Core
      ctx.fillStyle = `rgba(${c.r}, ${c.g}, ${c.b}, ${0.85 * tw + 0.1})`;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    step(dt, now / 1000);
    drawFrame(dt, now / 1000);
    requestAnimationFrame(loop);
  }

  const ro = new ResizeObserver(() => {
    resize();
    seedNodes();
    if (trailCtx) trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
  });
  ro.observe(canvas);

  resize();
  seedNodes();
  requestAnimationFrame(loop);
})();
