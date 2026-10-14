/* ==========================================================================
   Réalisations
   - Données : data/realisations.js (29 photos clients : src, title, text, w, h)
   - Galerie maçonnerie (vraies proportions), filtres déduits des titres,
     transitions FLIP entre filtres, révélation des photos au défilement
   - Visionneuse plein écran façon Photos (principes Apple) :
       · ouverture/fermeture en continuité depuis la vignette (FLIP)
       · glisser horizontal suivi 1:1, projection d'élan, ressort, rubber-band
       · tirer vers le haut/bas pour fermer (l'image suit le doigt, le fond s'efface)
       · tout est interruptible : on peut rattraper une image en vol
       · clavier : ← → Origine Fin Échap ; focus piégé ; retour du focus
   ========================================================================== */
(() => {
  'use strict';

  const { $, $$, esc } = PB;
  const RM = PB.reduce; // mouvement réduit : pas de ressorts, états instantanés

  /* ---------------- Classement ---------------- */
  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const tagsOf = (title) => {
    const t = norm(title);
    const tags = [/terrasse/.test(t) ? 'terrasse' : 'interieur'];
    if (/hongrie/.test(t)) tags.push('hongrie');
    if (/baton rompu/.test(t)) tags.push('baton');
    if (/exotique/.test(t)) tags.push('exotique');
    if (/vieilli/.test(t)) tags.push('vieilli');
    return tags;
  };
  const FILTERS = [
    { key: 'tous', label: 'Tout voir' },
    { key: 'interieur', label: 'Intérieur' },
    { key: 'terrasse', label: 'Terrasse' },
    { key: 'hongrie', label: 'Point de Hongrie' },
    { key: 'baton', label: 'Bâton rompu' },
    { key: 'exotique', label: 'Bois exotique' },
    { key: 'vieilli', label: 'Vieilli à l’ancienne' },
  ];
  /** Titres saisis en capitales (nom de produit) → casse de phrase, sans dimensions ni prix. */
  const cleanTitle = (t) => {
    const letters = t.replace(/[^A-Za-zÀ-ÿ]/g, '');
    const upper = letters.replace(/[^A-ZÀ-Þ]/g, '').length;
    if (!letters.length || upper / letters.length < 0.7) return t;
    let s = t.split(/\s[–-]\s/)[0].replace(/\s+\d+\s*x.*$/i, '').toLowerCase();
    s = s.replace(/\bipe\b/g, 'ipé');
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  /* ---------------- État ---------------- */
  let DATA = [];
  let list = []; // indices DATA visibles, dans l'ordre
  let current = 'tous';
  let grid, items = [], pos = [];
  let pill, chipsBox;

  PB.ready(async () => {
    const cta = $('[data-cta]');
    if (cta) cta.innerHTML = PB.ctaBandHTML({
      title: 'Votre projet sera <em>la prochaine réalisation.</em>',
      text: 'Devis gratuit et étude personnalisée de votre projet, en showroom ou à distance.',
      img: 'assets/img/realisations/salon-baton-rompu.webp',
    });

    grid = $('[data-grid]');
    if (!grid) return;
    try {
      await PB.load('realisations');
    } catch (e) {
      grid.innerHTML = '<p class="r-empty muted">Les réalisations n’ont pas pu être chargées.</p>';
      return;
    }
    DATA = (window.PB_REALISATIONS || []).map((r, i) => ({ ...r, i, title: cleanTitle(r.title), tags: tagsOf(r.title) }));

    renderGrid();
    renderFilters();
    const q = PB.qs('f');
    applyFilter(FILTERS.some((f) => f.key === q) ? q : 'tous', { animate: false });
    grid.setAttribute('aria-busy', 'false');
    observeReveal();
    LB.init();

    let rt;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { layout(false); movePill(false); }, 120); });
    // les polices / images peuvent modifier la hauteur des légendes
    document.fonts && document.fonts.ready.then(() => layout(false));
  });

  /* ---------------- Rendu ---------------- */
  const pad2 = (n) => String(n).padStart(2, '0');

  function renderGrid() {
    grid.innerHTML = DATA.map((r) => `<figure class="r-item" data-i="${r.i}">
        <button class="r-item__btn" type="button" aria-haspopup="dialog" aria-label="Agrandir : ${esc(r.title)}">
          <span class="r-item__media" style="aspect-ratio:${r.w} / ${r.h}">
            <img src="${esc(r.src)}" alt="${esc(r.title)}" width="${r.w}" height="${r.h}" loading="lazy" decoding="async" draggable="false">
            <span class="r-item__zoom" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></span>
          </span>
        </button>
        <figcaption><span>${pad2(r.i + 1)}</span><b>${esc(r.title)}</b></figcaption>
      </figure>`).join('');
    items = $$('.r-item', grid);
    items.forEach((el, i) => {
      el.querySelector('.r-item__btn').addEventListener('click', (e) => {
        const at = list.indexOf(i);
        if (at > -1) LB.open(at, e.currentTarget);
      });
    });
  }

  function renderFilters() {
    chipsBox = $('[data-filters]');
    const count = (k) => (k === 'tous' ? DATA.length : DATA.filter((r) => r.tags.includes(k)).length);
    chipsBox.innerHTML = '<span class="r-chip__pill" aria-hidden="true"></span>' + FILTERS
      .map((f) => ({ ...f, n: count(f.key) }))
      .filter((f) => f.n > 0)
      .map((f) => `<button class="r-chip" type="button" data-f="${f.key}" aria-pressed="false">${esc(f.label)}<sup>${f.n}</sup></button>`)
      .join('');
    pill = $('.r-chip__pill', chipsBox);
    chipsBox.addEventListener('click', (e) => {
      const b = e.target.closest('[data-f]');
      if (b && b.dataset.f !== current) applyFilter(b.dataset.f, { animate: true });
    });
  }

  function movePill(animate) {
    const b = $(`[data-f="${current}"]`, chipsBox);
    if (!b || !pill) return;
    const to = { x: b.offsetLeft, y: b.offsetTop, width: b.offsetWidth, height: b.offsetHeight };
    if (animate && PB.motion) gsap.to(pill, { ...to, duration: 0.6, ease: 'expo.out', overwrite: true });
    else if (window.gsap) gsap.set(pill, to);
    else Object.assign(pill.style, { transform: `translate(${to.x}px,${to.y}px)`, width: `${to.width}px`, height: `${to.height}px` });
    // garde le filtre actif visible dans la barre défilante (mobile)
    const left = b.offsetLeft - chipsBox.clientWidth / 2 + b.offsetWidth / 2;
    chipsBox.scrollTo({ left, behavior: animate && !RM ? 'smooth' : 'auto' });
  }

  /* ---------------- Maçonnerie ---------------- */
  function metrics() {
    const W = grid.clientWidth;
    const cols = W >= 1040 ? 3 : W >= 560 ? 2 : 1;
    const gap = W >= 560 ? 24 : 16;
    const rowGap = W >= 560 ? 36 : 28;
    return { cols, gap, rowGap, colW: (W - gap * (cols - 1)) / cols };
  }

  /** Calcule les positions des éléments visibles ; renvoie {i: {x,y}}. */
  function computePositions() {
    const { cols, gap, rowGap, colW } = metrics();
    items.forEach((el) => { el.style.width = `${colW}px`; });
    const heights = list.map((i) => items[i].offsetHeight); // une seule lecture groupée
    const colH = new Array(cols).fill(0);
    const next = {};
    list.forEach((i, k) => {
      const c = colH.indexOf(Math.min(...colH));
      next[i] = { x: c * (colW + gap), y: colH[c], col: c };
      colH[c] += heights[k] + rowGap;
    });
    grid.style.height = `${Math.max(0, Math.max(...colH) - rowGap)}px`;
    return next;
  }

  const place = (el, p) => {
    if (window.gsap) gsap.set(el, { x: p.x, y: p.y });
    else el.style.transform = `translate(${p.x}px,${p.y}px)`;
  };

  function layout(animate) {
    const next = computePositions();
    list.forEach((i) => {
      const el = items[i];
      el.style.setProperty('--d', `${(next[i].col || 0) * 0.08}s`);
      if (animate && PB.motion) gsap.to(el, { x: next[i].x, y: next[i].y, duration: 0.9, ease: 'expo.out', overwrite: 'auto' });
      else place(el, next[i]);
      pos[i] = next[i];
    });
  }

  function applyFilter(key, { animate }) {
    current = key;
    const before = new Set(list);
    list = DATA.filter((r) => key === 'tous' || r.tags.includes(key)).map((r) => r.i);
    const now = new Set(list);

    $$('[data-f]', chipsBox).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.f === key)));
    movePill(animate);

    // éléments qui sortent
    DATA.forEach((r) => {
      if (now.has(r.i)) return;
      const el = items[r.i];
      el.setAttribute('aria-hidden', 'true');
      el.querySelector('button').tabIndex = -1;
      if (animate && PB.motion && before.has(r.i)) {
        gsap.to(el, { opacity: 0, scale: 0.94, duration: 0.3, ease: 'power2.out', overwrite: 'auto', onComplete: () => el.classList.add('is-gone') });
      } else {
        el.classList.add('is-gone');
        if (window.gsap) gsap.set(el, { opacity: 0 });
      }
    });
    // éléments qui restent ou entrent
    list.forEach((i) => {
      const el = items[i];
      el.classList.remove('is-gone');
      el.removeAttribute('aria-hidden');
      el.querySelector('button').removeAttribute('tabindex');
    });
    const next = computePositions();
    list.forEach((i, k) => {
      const el = items[i];
      el.style.setProperty('--d', `${(next[i].col || 0) * 0.08}s`);
      if (animate && PB.motion) {
        if (before.has(i)) {
          gsap.to(el, { x: next[i].x, y: next[i].y, opacity: 1, scale: 1, duration: 0.9, ease: 'expo.out', overwrite: 'auto' });
        } else {
          gsap.set(el, { x: next[i].x, y: next[i].y + 30 });
          gsap.to(el, { y: next[i].y, opacity: 1, scale: 1, duration: 0.9, delay: 0.12 + Math.min(k, 10) * 0.03, ease: 'expo.out', overwrite: 'auto' });
        }
      } else {
        place(el, next[i]);
        if (window.gsap) gsap.set(el, { opacity: 1, scale: 1 });
      }
      pos[i] = next[i];
    });

    // compteur
    const n = list.length;
    const cn = $('[data-count-n]'), cl = $('[data-count-l]');
    if (cn) cn.textContent = n;
    if (cl) cl.textContent = n > 1 ? 'réalisations' : 'réalisation';
    const empty = $('[data-empty]');
    if (empty) empty.hidden = n > 0;

    if (animate) {
      // URL partageable + retour en haut de la galerie si on l'a dépassée
      try { history.replaceState(null, '', key === 'tous' ? location.pathname : `?f=${key}`); } catch { /* fichier local */ }
      const top = grid.getBoundingClientRect().top + scrollY - 160;
      if (scrollY > top + 40) {
        if (PB.lenis) PB.lenis.scrollTo(top, { duration: RM ? 0 : 1 });
        else scrollTo({ top, behavior: RM ? 'auto' : 'smooth' });
      }
      if (window.ScrollTrigger) setTimeout(() => ScrollTrigger.refresh(), 950);
    }
  }

  function observeReveal() {
    if (!PB.motion || !('IntersectionObserver' in window)) { items.forEach((el) => el.classList.add('is-in')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -6% 0px' });
    items.forEach((el) => io.observe(el));
  }

  /* ======================================================================
     Visionneuse
     ====================================================================== */
  /** Ressort amorti (réponse en s, amortissement 1 = critique), intégration semi-implicite. */
  class Spring {
    constructor(v = 0, { response = 0.4, damping = 1, eps = 0.05 } = {}) {
      this.v = v; this.t = v; this.vel = 0; this.eps = eps;
      this.k = (2 * Math.PI / response) ** 2;
      this.c = (4 * Math.PI * damping) / response;
    }
    step(dt) {
      const a = -this.k * (this.v - this.t) - this.c * this.vel;
      this.vel += a * dt; this.v += this.vel * dt;
      if (this.idle()) { this.v = this.t; this.vel = 0; }
    }
    idle() { return Math.abs(this.v - this.t) < this.eps && Math.abs(this.vel) < this.eps * 20; }
    jump(v) { this.v = this.t = v; this.vel = 0; }
  }

  const LB = (() => {
    let root, bg, stage, track, ui, cap, titleEl, textEl, countEl, prevB, nextB, closeB;
    let slides = [];
    let idx = 0, W = 0, H = 0;
    const GAP = 40;
    let isOpen = false, closing = false, from = null, fade = false, lastFocus = null;
    const S = {
      x: new Spring(0, { response: 0.36, damping: 1, eps: 0.3 }),
      p: new Spring(0, { response: 0.44, damping: 1, eps: 0.002 }),
      dx: new Spring(0, { response: 0.34, damping: 0.86, eps: 0.3 }),
      dy: new Spring(0, { response: 0.34, damping: 0.86, eps: 0.3 }),
    };
    let raf = 0, last = 0;

    /* -------- Mise en page -------- */
    const n = () => slides.length;
    const slideX = (k) => -k * (W + GAP);
    const fit = (k) => {
      const r = DATA[list[k]];
      const mobile = W < 780;
      const padX = mobile ? 0 : Math.max(96, W * 0.07);
      const top = mobile ? 64 : 72;
      const bottom = mobile ? 150 : 124;
      const bw = W - padX * 2, bh = Math.max(120, H - top - bottom);
      const s = Math.min(bw / r.w, bh / r.h, 1.6);
      const w = r.w * s, h = r.h * s;
      return { x: (W - w) / 2, y: top + (bh - h) / 2, w, h };
    };
    const thumbRect = (k) => {
      const el = items[list[k]];
      const m = el && el.querySelector('.r-item__media');
      if (!m) return null;
      const r = m.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight || r.width < 2) return null;
      return { x: r.left, y: r.top, w: r.width };
    };
    const measure = () => {
      W = innerWidth; H = innerHeight;
      slides.forEach((s, k) => {
        const f = fit(k);
        s.el.style.transform = `translate3d(${k * (W + GAP)}px,0,0)`;
        s.img.style.width = `${f.w}px`; s.img.style.height = `${f.h}px`;
        s.f = f;
      });
    };
    const ensure = (k) => {
      const s = slides[k];
      if (s && !s.img.getAttribute('src')) s.img.src = DATA[list[k]].src;
    };

    /* -------- Rendu -------- */
    const clamp01 = (v) => Math.max(0, Math.min(1, v));
    function render() {
      track.style.transform = `translate3d(${S.x.v.toFixed(2)}px,0,0)`;
      const p = clamp01(S.p.v);
      const pull = Math.min(1, Math.hypot(S.dx.v * 0.3, S.dy.v) / (H * 0.55));
      bg.style.opacity = (p * (1 - pull * 0.9)).toFixed(3);
      ui.style.opacity = clamp01(p * 1.4 - 0.4 - pull * 3).toFixed(3);

      slides.forEach((s, k) => {
        const f = s.f;
        if (k !== idx) { s.img.style.transform = `translate3d(${f.x}px,${f.y}px,0)`; s.img.style.opacity = ''; return; }
        const d = 1 - Math.min(0.32, (Math.abs(S.dy.v) / H) * 0.6);
        const R1 = { x: f.x + (f.w * (1 - d)) / 2 + S.dx.v, y: f.y + (f.h * (1 - d)) / 2 + S.dy.v, w: f.w * d };
        let T = R1;
        if (p < 1) {
          const R0 = from && !fade ? from : { x: R1.x + R1.w * 0.04, y: R1.y + R1.w * 0.03, w: R1.w * 0.92 };
          T = { x: R0.x + (R1.x - R0.x) * p, y: R0.y + (R1.y - R0.y) * p, w: R0.w + (R1.w - R0.w) * p };
        }
        s.img.style.opacity = fade ? p.toFixed(3) : '';
        s.img.style.transform = `translate3d(${T.x.toFixed(2)}px,${T.y.toFixed(2)}px,0) scale(${(T.w / f.w).toFixed(4)})`;
      });
    }

    /* -------- Boucle physique -------- */
    let dragging = false;
    const kick = () => { if (!raf) { last = 0; raf = requestAnimationFrame(tick); } };
    function tick(now) {
      raf = 0;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      if (!dragging) {
        // sous-pas pour la stabilité quel que soit le taux de rafraîchissement
        const steps = Math.ceil(dt / (1 / 120));
        for (let i = 0; i < steps; i++) Object.values(S).forEach((s) => s.step(dt / steps));
      }
      render();
      const busy = Object.values(S).some((s) => !s.idle());
      if (busy && !dragging) raf = requestAnimationFrame(tick);
      else if (!dragging) onRest();
    }
    function onRest() {
      if (closing && S.p.v <= 0.001) finishClose();
    }
    const settle = () => { if (RM) { Object.values(S).forEach((s) => s.jump(s.t)); render(); onRest(); } else kick(); };

    /* -------- Légende -------- */
    let capT;
    function caption(instant) {
      const r = DATA[list[idx]];
      const apply = () => {
        titleEl.textContent = r.title;
        textEl.textContent = r.text || '';
        countEl.textContent = `${pad2(idx + 1)} / ${pad2(n())}`;
        cap.classList.remove('is-swap');
      };
      prevB.disabled = idx <= 0;
      nextB.disabled = idx >= n() - 1;
      clearTimeout(capT);
      if (instant || RM) apply();
      else { cap.classList.add('is-swap'); capT = setTimeout(apply, 160); }
    }

    function markThumb() {
      items.forEach((el) => el.classList.remove('is-open'));
      const el = items[list[idx]];
      if (el) el.classList.add('is-open');
    }

    /* -------- Navigation -------- */
    function go(k, { velocity = 0 } = {}) {
      k = Math.max(0, Math.min(n() - 1, k));
      const changed = k !== idx;
      if (changed) {
        // la nouvelle image courante repart de son cadrage neutre
        S.dx.jump(0); S.dy.jump(0);
      }
      idx = k;
      S.x.t = slideX(k);
      S.x.vel = velocity;
      [k - 1, k, k + 1, k + 2].forEach((j) => j >= 0 && j < n() && ensure(j));
      if (changed) { caption(false); markThumb(); }
      settle();
    }

    /* -------- Ouverture / fermeture -------- */
    function open(k, btn) {
      if (isOpen) return;
      isOpen = true; closing = false; lastFocus = btn;
      root.hidden = false;
      track.innerHTML = list.map((i) => `<div class="lb__slide"><img alt="${esc(DATA[i].title)}" draggable="false" decoding="async"></div>`).join('');
      slides = $$('.lb__slide', track).map((el) => ({ el, img: el.querySelector('img'), f: null }));
      idx = k;
      measure();
      [k - 1, k, k + 1].forEach((j) => j >= 0 && j < n() && ensure(j));
      S.x.jump(slideX(k)); S.dx.jump(0); S.dy.jump(0);
      from = thumbRect(k); fade = !from;
      caption(true);
      markThumb();
      if (PB.lenis) PB.lenis.stop();
      document.documentElement.style.overflow = 'hidden';
      document.addEventListener('keydown', onKey);
      if (RM) { S.p.jump(1); render(); }
      else { S.p.jump(0); S.p.t = 1; render(); kick(); }
      closeB.focus({ preventScroll: true });
    }

    function close({ vy = 0 } = {}) {
      if (!isOpen || closing) return;
      closing = true;
      // l'image reste où le doigt l'a laissée, puis rejoint sa vignette
      S.dx.t = S.dx.v; S.dy.t = S.dy.v; S.dx.vel = 0; S.dy.vel = 0;
      S.x.jump(slideX(idx));
      from = thumbRect(idx); fade = !from;
      S.p.t = 0;
      S.p.vel = -Math.min(4, Math.abs(vy) / Math.max(1, H)); // l'élan du geste accélère le retour
      settle();
    }

    function finishClose() {
      isOpen = false; closing = false;
      root.hidden = true;
      track.innerHTML = ''; slides = [];
      items.forEach((el) => el.classList.remove('is-open'));
      if (PB.lenis) PB.lenis.start();
      document.documentElement.style.overflow = '';
      document.removeEventListener('keydown', onKey);
      // focus rendu à la vignette de l'image affichée en dernier
      const el = items[list[idx]];
      const b = (el && el.querySelector('button')) || lastFocus;
      if (b) b.focus({ preventScroll: true });
    }

    /* -------- Clavier -------- */
    function onKey(e) {
      if (!isOpen) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); go(idx + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(idx - 1); }
      else if (e.key === 'Home') { e.preventDefault(); go(0); }
      else if (e.key === 'End') { e.preventDefault(); go(n() - 1); }
      else if (e.key === 'Tab') {
        const f = [closeB, prevB, nextB].filter((b) => !b.disabled && b.offsetParent !== null);
        if (!f.length) return;
        const i = f.indexOf(document.activeElement);
        e.preventDefault();
        f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
    }

    /* -------- Gestes -------- */
    const rubber = (o, dim, c = 0.55) => (o * dim * c) / (dim + c * Math.abs(o));
    const project = (v, d = 0.998) => ((v / 1000) * d) / (1 - d); // distance de fin d'élan (UIScrollView)
    let sx = 0, sy = 0, baseX = 0, baseDx = 0, baseDy = 0, axis = null, moved = false, hist = [], pid = null;

    function down(e) {
      if (!isOpen || closing || (e.pointerType === 'mouse' && e.button !== 0)) return;
      dragging = true; moved = false; axis = null; pid = e.pointerId;
      sx = e.clientX; sy = e.clientY;
      // interruptible : on reprend la valeur affichée, en plein vol si besoin
      baseX = S.x.v; baseDx = S.dx.v; baseDy = S.dy.v;
      Object.values(S).forEach((s) => { if (s !== S.p) { s.t = s.v; s.vel = 0; } });
      hist = [{ x: e.clientX, y: e.clientY, t: e.timeStamp }];
    }
    function move(e) {
      if (!dragging || e.pointerId !== pid) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (!axis) {
        if (Math.hypot(dx, dy) < 7) return;
        const midSwipe = Math.abs(baseX - slideX(idx)) > 4;
        axis = midSwipe || Math.abs(dx) > Math.abs(dy) * 1.1 ? 'x' : 'y';
        moved = true;
        root.classList.add('is-dragging');
        try { stage.setPointerCapture(pid); } catch { /* pointeur déjà relâché */ }
      }
      hist.push({ x: e.clientX, y: e.clientY, t: e.timeStamp });
      if (hist.length > 6) hist.shift();
      if (axis === 'x') {
        const min = slideX(n() - 1);
        let x = baseX + dx;
        if (x > 0) x = rubber(x, W); else if (x < min) x = min + rubber(x - min, W);
        S.x.v = S.x.t = x;
      } else {
        S.dx.v = S.dx.t = baseDx + dx;
        S.dy.v = S.dy.t = baseDy + dy;
      }
      render();
    }
    function up(e) {
      if (!dragging || (e && e.pointerId !== pid)) return;
      dragging = false;
      root.classList.remove('is-dragging');
      if (!moved) {
        // simple toucher : en dehors de l'image, on ferme
        if (e && e.target && e.target.tagName !== 'IMG') close();
        return;
      }
      // vitesse sur les ~100 dernières ms
      const b = hist[hist.length - 1];
      let a = hist[0];
      for (const h of hist) if (b.t - h.t <= 100) { a = h; break; }
      if (a === b && hist.length > 1) a = hist[hist.length - 2]; // toujours au moins un intervalle
      const dt = Math.max(1, b.t - a.t);
      const vx = ((b.x - a.x) / dt) * 1000, vy = ((b.y - a.y) / dt) * 1000;
      if (axis === 'x') {
        // pagination : une chiquenaude suffit (vitesse dans le sens du geste),
        // sinon on projette l'élan et on retient la page la plus proche
        const off = S.x.v - slideX(idx);
        let target = Math.round(-(S.x.v + project(vx)) / (W + GAP));
        if (Math.abs(vx) > 300 && Math.sign(vx) === Math.sign(off)) target = idx - Math.sign(vx);
        go(Math.max(idx - 1, Math.min(idx + 1, target)), { velocity: vx });
      } else {
        const far = Math.abs(S.dy.v) > Math.min(140, H * 0.16);
        const fast = Math.abs(vy) > 700 && Math.sign(vy) === Math.sign(S.dy.v || vy);
        if (far || fast) close({ vy });
        else { S.dx.t = 0; S.dy.t = 0; S.dx.vel = vx; S.dy.vel = vy; settle(); }
      }
    }

    let wheelAcc = 0, wheelLock = 0;
    function wheel(e) {
      if (!isOpen) return;
      e.preventDefault();
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : 0;
      if (!d || performance.now() < wheelLock) return;
      wheelAcc += d;
      if (Math.abs(wheelAcc) > 40) { go(idx + Math.sign(wheelAcc)); wheelAcc = 0; wheelLock = performance.now() + 420; }
    }

    function init() {
      root = $('[data-lb]');
      if (!root) return;
      bg = $('[data-lb-bg]', root); stage = $('[data-lb-stage]', root); track = $('[data-lb-track]', root);
      ui = $('[data-lb-ui]', root); cap = $('[data-lb-cap]', root);
      titleEl = $('[data-lb-title]', root); textEl = $('[data-lb-text]', root); countEl = $('[data-lb-count]', root);
      prevB = $('[data-lb-prev]', root); nextB = $('[data-lb-next]', root); closeB = $('[data-lb-close]', root);
      prevB.addEventListener('click', () => go(idx - 1));
      nextB.addEventListener('click', () => go(idx + 1));
      closeB.addEventListener('click', () => close());
      stage.addEventListener('pointerdown', down);
      stage.addEventListener('pointermove', move);
      stage.addEventListener('pointerup', up);
      stage.addEventListener('pointercancel', up);
      stage.addEventListener('lostpointercapture', (e) => { if (dragging && e.pointerId === pid) up(e); });
      root.addEventListener('wheel', wheel, { passive: false });
      root.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
      addEventListener('resize', () => { if (!isOpen) return; measure(); S.x.jump(slideX(idx)); render(); });
    }

    return { init, open, close };
  })();
})();
