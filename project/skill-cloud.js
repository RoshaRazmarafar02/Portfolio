// Skill cloud — organic scattered placement.
// Deterministic pseudo-random from seed so layout is stable across reloads,
// but can be re-shuffled on nav click.
(function () {
  const skills = [
    // Tier 1 (largest, most important) — computer engineering / systems identity
    { t: 'Computer Engineering', tier: 1, style: 'display' },
    { t: 'Distributed Systems', tier: 1, style: 'display' },
    { t: 'Scientific Computing', tier: 1, style: 'display' },

    // Tier 2 — major domains
    { t: 'Simulation', tier: 2, style: 'serif' },
    { t: 'Reinforcement Learning', tier: 2, style: 'display' },
    { t: 'Stochastic Processes', tier: 2, style: 'serif' },
    { t: 'Neural Networks', tier: 2, style: 'display' },
    { t: 'Diffusion Models', tier: 2, style: 'display' },
    { t: 'WSN', tier: 2, style: 'mono' },

    // Tier 3 — languages and hard skills
    { t: 'C++', tier: 3, style: 'mono' },
    { t: 'Python', tier: 3, style: 'mono' },
    { t: 'Julia', tier: 3, style: 'mono' },
    { t: 'MATLAB', tier: 3, style: 'mono' },
    { t: 'PyTorch', tier: 3, style: 'display' },
    { t: 'Monte Carlo', tier: 3, style: 'serif' },
    { t: 'OMNET++', tier: 3, style: 'mono' },
    { t: 'dynamical systems', tier: 3, style: 'serif' },
    { t: 'control theory', tier: 3, style: 'serif' },
    { t: 'Networks', tier: 3, style: 'display' },
    { t: 'Optimization', tier: 3, style: 'display' },

    // Tier 4 — supporting / smaller
    { t: 'Linux', tier: 4, style: 'mono' },
    { t: 'C', tier: 4, style: 'mono' },
    { t: 'C#', tier: 4, style: 'mono' },
    { t: 'Java', tier: 4, style: 'mono' },
    { t: 'Git', tier: 4, style: 'mono' },
    { t: 'soft matter', tier: 4, style: 'serif' },
    { t: 'active matter', tier: 4, style: 'serif' },
    { t: 'score-based', tier: 4, style: 'serif' },
    { t: 'generative', tier: 4, style: 'display' },
    { t: 'LEACH', tier: 4, style: 'mono' },
    { t: 'clustering', tier: 4, style: 'display' },
    { t: 'ASP.NET', tier: 4, style: 'mono' },
    { t: 'emergent', tier: 4, style: 'serif' },
    { t: 'stochastic', tier: 4, style: 'serif' },
    { t: 'graph theory', tier: 4, style: 'display' },
    { t: 'sensor networks', tier: 4, style: 'display' },
    { t: 'numerical methods', tier: 4, style: 'display' },
  ];

  const TIER = {
    1: { size: 56, weight: 300, color: 'ink', lh: 1 },
    2: { size: 34, weight: 300, color: 'ink', lh: 1 },
    3: { size: 20, weight: 400, color: 'mid', lh: 1 },
    4: { size: 14, weight: 400, color: 'dim', lh: 1 },
  };

  // Simple deterministic RNG
  function mulberry32(a) {
    return function () {
      let t = (a += 0x6D2B79F5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function measure(text, fontSize, fontFamily, weight) {
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    ctx.font = `${weight} ${fontSize}px ${fontFamily}`;
    const m = ctx.measureText(text);
    return { w: m.width, h: fontSize * 1.05 };
  }

  function fontFor(style) {
    if (style === 'mono') return "'JetBrains Mono', ui-monospace, monospace";
    if (style === 'serif') return "'Instrument Serif', serif";
    return "'Space Grotesk', system-ui, sans-serif";
  }

  function layout(container, seed) {
    container.innerHTML = '';
    const rect = container.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;
    const cx = W / 2;
    const cy = H / 2;

    const rand = mulberry32(seed || 42);
    // Sort by tier asc so big ones land first (near center).
    const items = [...skills].sort((a, b) => a.tier - b.tier);
    const placed = []; // {x,y,w,h}

    const PAD = 14;

    for (const item of items) {
      const cfg = TIER[item.tier];
      const ff = fontFor(item.style);
      const sz = cfg.size * (W < 760 ? 0.72 : 1);
      const { w, h } = measure(item.t, sz, ff, cfg.weight);

      // Place with rejection sampling. Larger tiers → lower radius.
      let best = null;
      const maxTries = 260;
      for (let i = 0; i < maxTries; i++) {
        // Radial scatter — bigger tier, smaller radius, but still some spread
        const tierBias = { 1: 0.12, 2: 0.32, 3: 0.55, 4: 0.78 }[item.tier];
        const rBase = Math.min(W, H) * 0.45;
        const jitter = 0.25 + rand() * 0.6;
        const radius = rBase * tierBias * jitter;
        // Slight elliptical bias (wider than tall)
        const theta = rand() * Math.PI * 2;
        const x = cx + Math.cos(theta) * radius * 1.15;
        const y = cy + Math.sin(theta) * radius * 0.85;

        const bx = x - w / 2 - PAD / 2;
        const by = y - h / 2 - PAD / 2;
        const bw = w + PAD;
        const bh = h + PAD;

        // Bounds
        if (bx < 4 || by < 4 || bx + bw > W - 4 || by + bh > H - 4) continue;

        // Collision
        let clash = false;
        for (const p of placed) {
          if (bx < p.x + p.w && bx + bw > p.x && by < p.y + p.h && by + bh > p.y) { clash = true; break; }
        }
        if (!clash) { best = { x: bx, y: by, w: bw, h: bh, cx: x, cy: y }; break; }
      }
      if (!best) continue;
      placed.push(best);

      const el = document.createElement('div');
      el.className = `cloud-item ${item.style} ${cfg.color === 'dim' ? 'dim' : cfg.color === 'mid' ? 'mid' : ''}`;
      el.style.left = best.cx + 'px';
      el.style.top = best.cy + 'px';
      el.style.fontSize = sz + 'px';
      el.style.fontWeight = cfg.weight;
      el.style.lineHeight = cfg.lh;
      el.style.animationDelay = (placed.length * 14) + 'ms';
      el.textContent = item.t;
      container.appendChild(el);
    }
  }

  window.__renderCloud = function (containerId, seed) {
    const el = document.getElementById(containerId);
    if (!el) return;
    // Wait for fonts so measurement is accurate.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => layout(el, seed));
    } else {
      layout(el, seed);
    }
    // Relayout on resize (debounced)
    let t;
    const onR = () => { clearTimeout(t); t = setTimeout(() => layout(el, seed), 180); };
    window.addEventListener('resize', onR, { passive: true });
  };
})();
