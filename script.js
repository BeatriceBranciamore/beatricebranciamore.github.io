/* Beatrice Branciamore, portfolio
   Vanilla JavaScript, no dependencies.
   1. Page-style navigation between sections (like the Figma prototype)
   2. Skill set: "organise me" / "shuffle me" with a spring animation
   3. Business card flip
   4. Education timeline line                                              */

(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------------------------------------------------------------------
     Spring easing, matching the Figma "Smart animate" settings:
     mass 1, stiffness 200, damping 15. Turned into a CSS linear() curve.
     --------------------------------------------------------------------- */
  function springCurve(mass, stiffness, damping) {
    const w0 = Math.sqrt(stiffness / mass);
    const zeta = damping / (2 * Math.sqrt(stiffness * mass));
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    const pos = (t) =>
      1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t));
    const seconds = Math.log(1000) / (zeta * w0); // until within 0.1% of rest
    const steps = 60;
    const points = [];
    for (let i = 0; i <= steps; i++) {
      points.push(i === steps ? 1 : +pos((seconds * i) / steps).toFixed(4));
    }
    return { easing: 'linear(' + points.join(', ') + ')', duration: Math.round(seconds * 1000) };
  }

  let spring = { easing: 'cubic-bezier(0.34, 1.45, 0.64, 1)', duration: 700 };
  if (window.CSS && CSS.supports('transition-timing-function', 'linear(0, 1)')) {
    spring = springCurve(1, 200, 15);
    document.documentElement.style.setProperty('--spring', spring.easing);
    document.documentElement.style.setProperty('--spring-dur', spring.duration + 'ms');
  }

  /* ---------------------------------------------------------------------
     1. Navigation
     --------------------------------------------------------------------- */
  const views = Array.from(document.querySelectorAll('[data-view]'));
  const navLinks = Array.from(document.querySelectorAll('[data-nav]'));
  const backdrops = Array.from(document.querySelectorAll('.backdrop'));
  const viewNames = views.map((v) => v.dataset.view);
  let current = null;

  function setBackdrop(theme) {
    const on = backdrops.find((b) => b.classList.contains('is-on'));
    if (on && on.dataset.theme === theme) return;
    const off = backdrops.find((b) => b !== on);
    off.dataset.theme = theme;
    off.classList.add('is-on');
    if (on) on.classList.remove('is-on');
  }

  function show(name, moveFocus) {
    if (!viewNames.includes(name)) name = 'home';
    if (name === current) return;
    current = name;

    views.forEach((v) => {
      const active = v.dataset.view === name;
      v.hidden = !active;
      v.classList.remove('is-entering');
      if (active && moveFocus && !reduceMotion.matches) {
        void v.offsetWidth; // restart the fade
        v.classList.add('is-entering');
      }
    });

    navLinks.forEach((a) => {
      if (a.dataset.nav === name) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });

    const view = views.find((v) => v.dataset.view === name);
    document.title = view.dataset.title || document.title;

    const flipped = name === 'lets-collaborate' && card && card.dataset.flipped === 'true';
    setBackdrop(flipped ? 'lets-collaborate-back' : name);

    window.scrollTo(0, 0);
    if (moveFocus) {
      const heading = view.querySelector('[tabindex="-1"]');
      if (heading) heading.focus({ preventScroll: true });
    }
    if (name === 'education') drawEducationLine();
  }

  function fromHash() {
    return decodeURIComponent(location.hash.replace('#', '')) || 'home';
  }

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.addEventListener('hashchange', () => {
    const name = fromHash();
    // Links such as #main (skip link) are not views; leave them alone.
    if (viewNames.includes(name)) show(name, true);
  });

  /* ---------------------------------------------------------------------
     2. Skill set
     --------------------------------------------------------------------- */
  const skills = document.getElementById('skills');
  const toggle = document.querySelector('.skills-toggle');
  const status = document.getElementById('skills-status');

  if (skills && toggle) {
    const groups = Array.from(skills.querySelectorAll('.skill-group'));
    const mix = skills.querySelector('.skill-mix');
    const pills = Array.from(skills.querySelectorAll('.skill'));
    // Remember where each skill lives when organised.
    pills.forEach((p, i) => {
      p._home = p.parentElement;
      p._index = i;
    });

    function shuffled(list) {
      const a = list.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }

    function layout(mode) {
      if (mode === 'mixed') {
        const before = Array.from(mix.children);
        let order = shuffled(pills);
        // Make sure a reshuffle actually looks different.
        if (before.length && order.every((p, i) => p === before[i])) order = order.reverse();
        order.forEach((p) => mix.appendChild(p));
        groups.forEach((g) => (g.hidden = true));
        mix.hidden = false;
      } else {
        pills
          .slice()
          .sort((a, b) => a._index - b._index)
          .forEach((p) => p._home.appendChild(p));
        groups.forEach((g) => (g.hidden = false));
        mix.hidden = true;
      }
      skills.dataset.mode = mode;
      toggle.textContent = mode === 'mixed' ? 'organise me' : 'shuffle me';
    }

    // FLIP: measure, change the layout, then animate from the old positions.
    function animateTo(mode) {
      if (reduceMotion.matches) {
        layout(mode);
        return;
      }
      const first = new Map(pills.map((p) => [p, p.getBoundingClientRect()]));
      layout(mode);
      pills.forEach((p, i) => {
        const a = first.get(p);
        const b = p.getBoundingClientRect();
        const dx = a.left - b.left;
        const dy = a.top - b.top;
        if (!dx && !dy) return;
        const opts = { duration: spring.duration, easing: spring.easing, delay: Math.min(i * 6, 160), fill: 'backwards' };
        const frames = [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }];
        try {
          p.animate(frames, opts);
        } catch (e) {
          opts.easing = 'cubic-bezier(0.34, 1.45, 0.64, 1)';
          p.animate(frames, opts);
        }
      });
      if (mode === 'organised') {
        skills.querySelectorAll('.skill-label').forEach((l) =>
          l.animate([{ opacity: 0, transform: 'scale(0.85)' }, { opacity: 1, transform: 'none' }], {
            duration: 450,
            delay: 150,
            easing: 'ease-out',
            fill: 'backwards',
          })
        );
      }
    }

    toggle.addEventListener('click', () => {
      const next = skills.dataset.mode === 'mixed' ? 'organised' : 'mixed';
      animateTo(next);
      status.textContent = next === 'mixed' ? 'Skills shuffled.' : 'Skills grouped by category.';
    });

    layout('mixed'); // the Figma starting state
  }

  /* ---------------------------------------------------------------------
     3. Business card
     --------------------------------------------------------------------- */
  const card = document.getElementById('card');
  const flipBtn = document.querySelector('.flip-btn');

  if (card && flipBtn) {
    const front = card.querySelector('.card__front');
    const back = card.querySelector('.card__back');

    function setFlipped(flipped) {
      card.dataset.flipped = String(flipped);
      flipBtn.setAttribute('aria-pressed', String(flipped));
      // Only the visible side can be reached by keyboard and screen readers.
      front.inert = flipped;
      back.inert = !flipped;
      front.setAttribute('aria-hidden', String(flipped));
      back.setAttribute('aria-hidden', String(!flipped));
      if (current === 'lets-collaborate') setBackdrop(flipped ? 'lets-collaborate-back' : 'lets-collaborate');
    }

    flipBtn.addEventListener('click', () => setFlipped(card.dataset.flipped !== 'true'));
    card.addEventListener('click', (e) => {
      if (e.target.closest('a')) return; // let the links work
      setFlipped(card.dataset.flipped !== 'true');
    });

    setFlipped(false);
  }

  /* ---------------------------------------------------------------------
     4. Education line: a zig-zag joining each entry to the next
     --------------------------------------------------------------------- */
  const eduWrap = document.querySelector('.edu-wrap');
  const eduLine = eduWrap && eduWrap.querySelector('.edu-line polyline');

  function drawEducationLine() {
    if (!eduWrap || !eduLine) return;
    const svg = eduLine.ownerSVGElement;
    if (getComputedStyle(svg).display === 'none' || eduWrap.offsetParent === null) return;

    const box = eduWrap.getBoundingClientRect();
    const items = Array.from(eduWrap.querySelectorAll('.edu-item'));
    const points = items.map((item, i) => {
      const body = item.querySelector('.entry__body') || item;
      const r = body.getBoundingClientRect();
      const head = item.querySelector('.entry__org').getBoundingClientRect();
      if (i % 2 === 0) {
        // Left column: leave from the right edge of the text, two thirds down.
        return [r.right + 18 - box.left, r.top + r.height * 0.66 - box.top];
      }
      // Right column: arrive just left of the entry, level with its name.
      const x = item.querySelector('.entry__date').getBoundingClientRect().left;
      return [x - 18 - box.left, head.top + head.height / 2 - box.top];
    });
    svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    eduLine.setAttribute('points', points.map((p) => p.map(Math.round).join(',')).join(' '));
  }

  if (eduWrap && 'ResizeObserver' in window) {
    new ResizeObserver(drawEducationLine).observe(eduWrap);
  }

  /* ---------------------------------------------------------------------
     Start
     --------------------------------------------------------------------- */
  show(fromHash(), false);
})();
