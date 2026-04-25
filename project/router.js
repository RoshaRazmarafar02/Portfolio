// Simple client-side router + Projects dropdown rendering.
(function () {
  const routes = ['home', 'projects', 'research', 'education'];
  const outlet = document.getElementById('outlet');

  // Project entries — placeholders the user will fill later.
  const PROJECTS = [
    {
      title: 'Real-Time Air Pollution Monitoring via WSN Simulation',
      year: '2024',
      tags: ['Distributed Systems', 'Simulation', 'Networks'],
      summary: [
        'End-to-end real-time air pollution monitoring system built on a large-scale wireless sensor network simulation.',
        'Distributed sensor nodes are organized via hierarchical clustering using the LEACH protocol for efficient aggregation and transmission. A multi-layer architecture integrates simulation, data processing, a centralized database, and a web dashboard for live monitoring.',
      ],
      meta: {
        Role: 'Sole engineer',
        Stack: 'OMNET++ · Python · Web',
        Domain: 'WSN · IoT · Env. sensing',
        Status: 'Shipped',
        Scope: 'Architecture → implementation',
      },
    },
    {
      title: 'Centralized Cybersecurity Attack Platform (CCAP)',
      year: '2023',
      tags: ['Security', 'Systems', 'Network'],
      summary: [
        'Sandboxed platform for simulating cybersecurity attacks — including Remote Code Execution and network-level adversarial behaviors.',
        'Integrates ASP.NET MVC with Windows Services and ARP-based scanning to model, execute and analyze adversarial scenarios in a controlled lab environment.',
      ],
      meta: {
        Role: 'Designer · Engineer',
        Stack: 'C# · ASP.NET MVC · Windows Services',
        Domain: 'Offensive security · systems',
        Status: 'Research prototype',
      },
    },
    {
      title: 'MathWorks Minidrone Competition',
      year: '2024',
      tags: ['Control', 'MATLAB', 'Robotics'],
      summary: [
        '1st place finish in the 2024 edition after placing 4th in 2023. Model-based design of a line-following controller implemented on Parrot Minidrone hardware.',
        'Simulink-based perception → control → actuation pipeline with real-time constraints.',
      ],
      meta: {
        Role: 'Team lead',
        Stack: 'MATLAB · Simulink · Parrot SDK',
        Domain: 'Control · real-time',
        Result: '1st place · 2024',
      },
    },
    {
      title: 'Project placeholder',
      year: '—',
      tags: ['To add'],
      summary: [
        'Reserved slot — a new project entry will live here. The dropdown structure is ready; content will be filled in later.',
      ],
      meta: {
        Role: '—',
        Stack: '—',
        Status: 'To be added',
      },
    },
  ];

  function renderProjects(container) {
    container.innerHTML = '';
    PROJECTS.forEach((p, i) => {
      const row = document.createElement('div');
      row.className = 'proj-row';
      row.innerHTML = `
        <div class="proj-head">
          <div class="proj-num">${String(i + 1).padStart(2, '0')}</div>
          <div class="proj-title">${p.title}</div>
          <div class="proj-tags">
            ${p.tags.map(t => `<span class="proj-tag">${t}</span>`).join('')}
          </div>
          <div class="proj-year">${p.year}</div>
          <div class="proj-caret">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3 V13 M3 8 H13" stroke="currentColor" stroke-width="1"/>
            </svg>
          </div>
        </div>
        <div class="proj-body-wrap">
          <div class="proj-body">
            <div class="proj-body-inner">
              <div class="proj-copy">
                ${p.summary.map(s => `<p>${s}</p>`).join('')}
              </div>
              <div class="proj-meta-grid">
                <dl>
                  ${Object.entries(p.meta).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}
                </dl>
              </div>
              <div class="proj-figure">
                <div class="stripe-bg"></div>
                <div class="placeholder-label">fig / diagram — to be added</div>
              </div>
            </div>
          </div>
        </div>
      `;
      row.querySelector('.proj-head').addEventListener('click', () => {
        row.classList.toggle('open');
      });
      container.appendChild(row);
    });
  }

  function setActive(route) {
    document.querySelectorAll('.nav-link').forEach(a => {
      a.classList.toggle('active', a.dataset.route === route);
    });
  }

  function mount(route) {
    if (!routes.includes(route)) route = 'home';
    const tpl = document.getElementById('tpl-' + route);
    if (!tpl) return;
    outlet.innerHTML = '';
    outlet.appendChild(tpl.content.cloneNode(true));
    setActive(route);

    // Post-mount wiring
    if (route === 'home') {
      // Re-run hero anim script by reloading it (simple + reliable)
      const s = document.createElement('script');
      s.src = 'hero-anim.js?_=' + Date.now();
      document.body.appendChild(s);
      // Cloud
      setTimeout(() => {
        window.__renderCloud && window.__renderCloud('skill-cloud', 42);
        window.__renderCloudFlow && window.__renderCloudFlow('cloud-flow-canvas');
      }, 80);
    }
    if (route === 'projects') {
      renderProjects(document.getElementById('proj-list'));
    }

    // Scroll to top gently
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });

    // Persist
    try { localStorage.setItem('portfolio-route', route); } catch (_) {}
  }

  function currentRouteFromHash() {
    const h = (location.hash || '').replace('#', '').trim();
    return routes.includes(h) ? h : null;
  }

  // Intercept clicks on [data-route]
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-route]');
    if (!a) return;
    e.preventDefault();
    const r = a.dataset.route;
    location.hash = '#' + r;
  });

  window.addEventListener('hashchange', () => {
    const r = currentRouteFromHash() || 'home';
    mount(r);
  });

  // Initial
  const initial = currentRouteFromHash() || (function () {
    try { return localStorage.getItem('portfolio-route'); } catch (_) { return null; }
  })() || 'home';
  if (!location.hash) location.hash = '#' + initial;
  else mount(initial);
})();
