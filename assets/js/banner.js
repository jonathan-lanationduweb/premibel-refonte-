/* ==========================================================================
   Moteur des bannières mensuelles (accueil + aperçu de l'outil admin)
   window.PBBanner.mount(heroEl, bannieres[], { autoplay, interval })
   ========================================================================== */
(() => {
  'use strict';
  const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ARROW = '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  const endOf = (iso) => (iso ? new Date(`${iso}T23:59:59`) : null);
  const left = (end) => {
    const ms = Math.max(0, end - Date.now());
    return { d: Math.floor(ms / 864e5), h: Math.floor(ms / 36e5) % 24, m: Math.floor(ms / 6e4) % 60, s: Math.floor(ms / 1e3) % 60, ms };
  };
  const pad = (n) => String(n).padStart(2, '0');

  /** Découpe un titre en lettres (pour l'entrée lettre par lettre). */
  const letters = (t) => `<span class="ln">${[...t].map((c) => (c === ' ' ? ' ' : `<span class="ch">${esc(c)}</span>`)).join('')}</span>`;

  function featHTML(b) {
    const PB = window.PB;
    const p = b.produit && PB && PB.bySku(b.produit);
    if (!p) return '';
    const d = PB.discount(p);
    const end = endOf(b.fin);
    return `<a class="feat" href="${PB.productUrl(p)}" data-feat>
      <span class="feat__img"><img src="${esc(p.imgs[0] || PB.PLACEHOLDER)}" alt="">${d ? `<span class="tag tag--promo">−${d} %</span>` : ''}</span>
      <span><small>Le parquet du moment</small><b>${esc(p.name)}</b>
        <span class="feat__price">${p.regular ? `<s>${PB.money(PB.ttc(p.regular))}</s>` : ''}<strong>${PB.money(PB.ttc(p.price))}</strong><span>TTC/${PB.unitLabel(p)}</span></span></span>
      ${end && !b.permanente ? `<span class="feat__cd"><span>Fin de l’offre dans</span><span class="cd" data-cd="${end.getTime()}"></span></span>` : ''}
    </a>`;
  }

  function slideHTML(b, i) {
    if (b.mode === 'image') {
      return `<div class="slide slide--image" data-i="${i}" role="group" aria-roledescription="bannière" aria-label="${esc(b.alt || 'Bannière')}">
        <div class="slide__media"><picture>${b.imageMobile ? `<source media="(max-width: 780px)" srcset="${esc(b.imageMobile)}">` : ''}<img src="${esc(b.image)}" alt="${esc(b.alt || '')}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'}></picture></div>
        ${b.lien ? `<a href="${esc(b.lien)}" aria-label="${esc(b.alt || 'Découvrir l’offre')}"></a>` : ''}
      </div>`;
    }
    const titleTag = i === 0 ? 'h2' : 'p';
    return `<div class="slide" data-i="${i}" role="group" aria-roledescription="bannière" aria-label="${esc(b.titre)}">
      <div class="slide__media"><img src="${esc(b.image)}" alt="" ${i ? 'loading="lazy"' : 'fetchpriority="high"'}></div>
      <div class="slide__veil"></div>
      <div class="slide__inner container">
        <div class="slide__copy">
          ${b.surtitre ? `<span class="slide__date" data-in><span class="dot"></span><span>${esc(b.surtitre).replace(/\b1er\b/, '1<sup>er</sup>')}</span></span>` : ''}
          <${titleTag} class="slide__title">${b.accroche ? `<span class="slide__kicker" data-in>${esc(b.accroche)}</span>` : ''}${letters(b.titre || '')}</${titleTag}>
          ${b.texte ? `<p class="slide__text" data-in>${esc(b.texte)}</p>` : ''}
          ${b.cta ? `<div class="slide__ctas" data-in><a class="btn btn--light magnetic" href="${esc(b.cta.href)}"><span>${esc(b.cta.label)}</span>${ARROW}</a><a class="btn btn--ghost" href="rendez-vous.html"><span>Prendre rendez-vous</span></a></div>` : ''}
        </div>
        <div data-in-feat>${featHTML(b)}</div>
      </div>
    </div>`;
  }

  function mount(hero, list, { autoplay = true, interval = 7000 } = {}) {
    const slidesEl = hero.querySelector('[data-slides]');
    const ui = hero.querySelector('[data-hero-ui]');
    const dotsEl = hero.querySelector('[data-dots]');
    const pauseBtn = hero.querySelector('[data-pause]');
    slidesEl.innerHTML = list.map(slideHTML).join('');
    const slides = [...slidesEl.children];
    let cur = -1, timer = null, paused = false, busy = false;
    const gsap = window.gsap;

    if (dotsEl) dotsEl.innerHTML = list.map((b, i) => `<button class="hero__dot" role="tab" aria-selected="false" aria-label="Bannière ${i + 1} : ${esc(b.titre || b.alt || '')}" data-dot="${i}" style="--dur:${interval}ms"><span></span></button>`).join('');
    if (ui) ui.hidden = list.length < 2;

    const enter = (el, dir) => {
      if (!gsap || reduce) return;
      const media = el.querySelector('.slide__media');
      gsap.fromTo(media, { clipPath: dir > 0 ? 'inset(0 0 0 100%)' : 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0%)', duration: 1.25, ease: 'expo.inOut' });
      const chars = el.querySelectorAll('.ch');
      if (chars.length) gsap.fromTo(chars, { yPercent: 110, rotate: 4 }, { yPercent: 0, rotate: 0, duration: 1.3, ease: 'expo.out', stagger: .035, delay: .35 });
      gsap.fromTo(el.querySelectorAll('[data-in]'), { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, ease: 'expo.out', stagger: .08, delay: .5 });
      const f = el.querySelector('[data-feat]');
      if (f) gsap.fromTo(f, { y: 40, opacity: 0, scale: .96, filter: 'blur(8px)' }, { y: 0, opacity: 1, scale: 1, filter: 'blur(0px)', duration: 1.2, ease: 'expo.out', delay: .8 });
    };

    const go = (n, dir = 1) => {
      if (busy || n === cur || !slides.length) return;
      const prev = slides[cur];
      cur = (n + slides.length) % slides.length;
      const next = slides[cur];
      slides.forEach((s) => s.classList.remove('is-leaving'));
      if (prev) { prev.classList.remove('is-active'); prev.classList.add('is-leaving'); busy = true; setTimeout(() => { prev.classList.remove('is-leaving'); busy = false; }, reduce ? 0 : 1250); }
      next.classList.add('is-active');
      // relance l'animation Ken Burns
      const img = next.querySelector('.slide__media img'); if (img) { img.style.animation = 'none'; void img.offsetWidth; img.style.animation = ''; }
      enter(next, dir);
      dotsEl && dotsEl.querySelectorAll('[data-dot]').forEach((d, i) => { d.setAttribute('aria-selected', String(i === cur)); const sp = d.firstElementChild; sp.style.animation = 'none'; void sp.offsetWidth; sp.style.animation = ''; });
      schedule();
    };
    const schedule = () => {
      clearTimeout(timer);
      if (autoplay && !paused && slides.length > 1 && !reduce) timer = setTimeout(() => go(cur + 1, 1), interval);
    };
    const setPaused = (v) => { paused = v; hero.classList.toggle('is-paused', v); if (pauseBtn) pauseBtn.textContent = v ? 'Lecture' : 'Pause'; schedule(); };

    dotsEl && dotsEl.addEventListener('click', (e) => { const d = e.target.closest('[data-dot]'); if (d) go(+d.dataset.dot, +d.dataset.dot > cur ? 1 : -1); });
    pauseBtn && pauseBtn.addEventListener('click', () => setPaused(!paused));
    hero.addEventListener('pointerenter', () => { if (slides.length > 1) { hero.classList.add('is-paused'); clearTimeout(timer); } });
    hero.addEventListener('pointerleave', () => { if (!paused) { hero.classList.remove('is-paused'); schedule(); } });

    // Swipe horizontal : décision au relâchement selon la vitesse (signe) ou la distance
    let sx = 0, sy = 0, st = 0, track = false;
    hero.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; st = e.timeStamp; track = slides.length > 1; });
    hero.addEventListener('pointerup', (e) => {
      if (!track) return; track = false;
      const dx = e.clientX - sx, dy = e.clientY - sy, v = dx / Math.max(1, e.timeStamp - st);
      if (Math.abs(dx) > Math.abs(dy) && (Math.abs(dx) > 60 || Math.abs(v) > .5)) go(cur + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
    });
    addEventListener('keydown', (e) => {
      if (!hero.matches(':hover') && !hero.contains(document.activeElement)) return;
      if (e.key === 'ArrowRight') go(cur + 1, 1); if (e.key === 'ArrowLeft') go(cur - 1, -1);
    });

    // Comptes à rebours
    const tick = () => {
      hero.querySelectorAll('[data-cd]').forEach((el) => {
        const t = left(+el.dataset.cd);
        el.innerHTML = t.ms ? `<span><b>${t.d}</b> j</span><span><b>${pad(t.h)}</b> h</span><span><b>${pad(t.m)}</b> min</span><span><b>${pad(t.s)}</b> s</span>` : '<span>Offre terminée</span>';
      });
    };
    tick(); const cdTimer = setInterval(tick, 1000);

    go(0, 1);
    return { go, destroy() { clearTimeout(timer); clearInterval(cdTimer); } };
  }

  window.PBBanner = { mount, slideHTML };
})();
