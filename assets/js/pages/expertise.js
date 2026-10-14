/* ==========================================================================
   Notre expertise
   - Film TF1 : cadre qui s'ouvre au scroll, lecture à la demande (preload=none)
   - Millésime « 1992 » : chiffres qui montent un à un
   - Points clés : cartes collantes qui s'empilent (la précédente recule)
   - Transcription : les mots s'éclairent au fil de la lecture (scrub)
   ========================================================================== */
(() => {
  'use strict';

  PB.ready(() => {
    const { $, $$ } = PB;

    const rev = $('[data-reviews]');
    if (rev) rev.innerHTML = PB.reviewsHTML({ limit: 6 });
    const cta = $('[data-cta]');
    if (cta) cta.innerHTML = PB.ctaBandHTML({
      title: 'Un projet de <span class="nw">parquet&nbsp;?</span> <em>Parlons-en.</em>',
      text: 'Commande, devis et accompagnement disponibles en ligne, ou dans nos showrooms parisiens.',
      img: 'assets/img/journal/parquet-de-qualite-a-petit-prix-chez-premibel-parquet-1.webp',
    });

    $$('.x-card').forEach((c, i) => c.style.setProperty('--i', i));
    initFilm();

    if (!PB.motion) return;
    initFilmMotion();
    initYear();
    initStack();
    initReading();
  });

  /* ---------------- Film ---------------- */
  function initFilm() {
    const sec = PB.$('[data-film]');
    if (!sec) return;
    const video = PB.$('[data-film-video]', sec);
    const btn = PB.$('[data-film-play]', sec);
    btn.addEventListener('click', () => {
      video.controls = true;
      const p = video.play();
      if (p && p.catch) p.catch(() => {
        PB.toast('La vidéo n’a pas pu être lue. Réessayez plus tard.');
        video.controls = false;
      });
    });
    video.addEventListener('play', () => sec.classList.add('is-playing'));
    video.addEventListener('ended', () => { sec.classList.remove('is-playing'); video.controls = false; video.load(); });
  }

  function initFilmMotion() {
    const frame = PB.$('[data-film-frame]');
    const video = PB.$('[data-film-video]');
    if (!frame) return;
    const mm = gsap.matchMedia();
    mm.add({ wide: '(min-width: 781px)', narrow: '(max-width: 780px)' }, (ctx) => {
      const side = ctx.conditions.wide ? 7 : 4;
      const r = ctx.conditions.wide ? 28 : 22;
      gsap.fromTo(frame,
        { clipPath: `inset(4% ${side}% 4% ${side}% round ${r}px)` },
        { clipPath: `inset(0% 0% 0% 0% round ${r}px)`, ease: 'none', scrollTrigger: { trigger: frame, start: 'top 92%', end: 'center 55%', scrub: true } });
      gsap.fromTo(video, { scale: 1.14 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    gsap.from('.x-film__meta > div', { y: 20, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.06, scrollTrigger: { trigger: '.x-film__meta', start: 'top 95%' } });
  }

  /* ---------------- Millésime ---------------- */
  function initYear() {
    const el = PB.$('[data-year]');
    if (!el) return;
    const txt = el.textContent.trim();
    el.innerHTML = [...txt].map((d) => `<span class="x-dig">${d}</span>`).join('');
    el.setAttribute('aria-label', txt);
    const digs = el.querySelectorAll('.x-dig');
    gsap.from(digs, { yPercent: 105, duration: 1.5, ease: 'expo.out', stagger: 0.09, scrollTrigger: { trigger: el, start: 'top 85%' } });
    gsap.from('.x-desc__since', { x: -24, opacity: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 85%' } });
  }

  /* ---------------- Cartes empilées ---------------- */
  function initStack() {
    const cards = PB.$$('[data-stack] .x-card');
    const mm = gsap.matchMedia();
    mm.add('(min-width: 901px)', () => {
      cards.forEach((card, i) => {
        const next = cards[i + 1];
        if (!next) return;
        gsap.to(card, {
          scale: 0.94, '--dim': 0.14, ease: 'none',
          scrollTrigger: { trigger: next, start: 'top bottom', end: 'top 30%', scrub: true },
        });
      });
      cards.forEach((card) => {
        const img = card.querySelector('img');
        if (img) gsap.fromTo(img, { scale: 1.15 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'top 20%', scrub: true } });
      });
    });
    mm.add('(max-width: 900px)', () => {
      cards.forEach((card) => gsap.from(card, { y: 50, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: card, start: 'top 90%' } }));
    });
  }

  /* ---------------- Lecture guidée ---------------- */
  function initReading() {
    PB.$$('[data-read]').forEach((p) => {
      PB.splitWords(p, 'xw');
      const words = p.querySelectorAll('.xw');
      gsap.to(words, {
        opacity: 1, ease: 'none', stagger: 0.12,
        scrollTrigger: { trigger: p, start: 'top 82%', end: 'bottom 52%', scrub: 0.6 },
      });
    });
  }
})();
