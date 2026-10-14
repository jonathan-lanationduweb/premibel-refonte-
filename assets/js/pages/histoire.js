/* ==========================================================================
   Notre histoire
   - Couverture : parallaxe légère de la devanture
   - Chronologie : frise horizontale épinglée et pilotée au scroll (≥ 901 px,
     mouvement autorisé) ; sinon frise verticale statique
   - Récit : image collante qui change par révélation (clip-path) selon le
     chapitre lu
   ========================================================================== */
(() => {
  'use strict';

  PB.ready(() => {
    const { $, $$ } = PB;

    /* Blocs du socle */
    const stores = $('[data-stores]');
    // NB : data/site.js référence une image de magasin rangée dans journal/ (et non site/)
    if (stores) stores.innerHTML = PB.storesHTML().replaceAll('assets/img/site/parquet-de-qualite', 'assets/img/journal/parquet-de-qualite');
    const cta = $('[data-cta]');
    if (cta) cta.innerHTML = PB.ctaBandHTML({
      title: 'Besoin d’un conseil pour votre <em>projet <span class="nw">parquet&nbsp;?</span></em>',
      text: 'Nos experts vous accompagnent avec des conseils personnalisés et des solutions sur-mesure.',
      img: 'assets/img/site/premibel-magasin-voltaire.webp',
    });

    initStory();
    if (!PB.motion) return;
    initCover();
    initChrono();
  });

  /* ---------------- Couverture ---------------- */
  function initCover() {
    const img = PB.$('[data-cover-img]');
    if (!img) return;
    gsap.to(img, { yPercent: -12, ease: 'none', scrollTrigger: { trigger: '[data-cover]', start: 'top bottom', end: 'bottom top', scrub: true } });
  }

  /* ---------------- Chronologie ---------------- */
  function initChrono() {
    const sec = PB.$('[data-chrono]');
    const track = PB.$('[data-chrono-track]');
    const bar = PB.$('[data-chrono-bar]');
    if (!sec || !track) return;
    const steps = PB.$$('.h-step', track);
    // on épingle un conteneur sans marge (les marges de la section fausseraient la largeur épinglée)
    const pinEl = sec.parentElement;

    const mm = gsap.matchMedia();
    mm.add('(min-width: 901px)', () => {
      sec.classList.add('is-h');
      const dist = () => Math.max(0, track.scrollWidth - document.documentElement.clientWidth + 40);
      const tween = gsap.to(track, {
        x: () => -dist(),
        ease: 'none',
        scrollTrigger: {
          trigger: pinEl,
          // si la section dépasse la hauteur d'écran, on l'épingle par le bas
          start: () => (pinEl.offsetHeight > innerHeight ? 'bottom bottom' : 'center center'),
          end: () => `+=${dist()}`,
          pin: true,
          scrub: 0.8,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          refreshPriority: 2,
          onUpdate: (s) => { if (bar) bar.style.transform = `scaleX(${s.progress.toFixed(4)})`; },
        },
      });

      steps.forEach((st, i) => {
        ScrollTrigger.create({
          trigger: st,
          containerAnimation: tween,
          start: i === 0 ? 'left right' : 'left 72%',
          onEnter: () => st.classList.add('is-active'),
          onLeaveBack: () => st.classList.remove('is-active'),
        });
        gsap.from(st.querySelectorAll('.h-step__title, p'), {
          y: 24, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.06,
          scrollTrigger: { trigger: st, containerAnimation: tween, start: 'left 88%' },
        });
      });
      steps[0] && steps[0].classList.add('is-active');

      return () => {
        sec.classList.remove('is-h');
        steps.forEach((st) => st.classList.remove('is-active'));
        if (bar) bar.style.transform = '';
      };
    });

    // vue verticale : le fil se dessine au défilement
    mm.add('(max-width: 900px)', () => {
      const line = document.createElement('span');
      line.className = 'h-chrono__line';
      Object.assign(line.style, { position: 'absolute', left: '0', top: '.6rem', bottom: '.6rem', width: '1px', background: 'var(--red-soft)', transformOrigin: 'top', transform: 'scaleY(0)' });
      track.appendChild(line);
      gsap.to(line, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: track, start: 'top 75%', end: 'bottom 60%', scrub: true } });
      steps.forEach((st) => gsap.from(st.children, { y: 26, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.06, scrollTrigger: { trigger: st, start: 'top 85%' } }));
      return () => line.remove();
    });
  }

  /* ---------------- Récit à image collante ---------------- */
  function initStory() {
    const sec = PB.$('[data-story]');
    if (!sec || !('IntersectionObserver' in window)) return;
    const chaps = PB.$$('[data-chap]', sec);
    const imgs = PB.$$('[data-story-img]', sec);
    const num = PB.$('[data-story-n]', sec);
    let cur = 0;
    sec.classList.add('is-live');
    chaps[0].classList.add('is-on');

    const show = (i) => {
      if (i === cur) return;
      imgs.forEach((im, k) => {
        im.classList.toggle('is-on', k === i);
        im.classList.toggle('is-out', k === cur);
      });
      chaps.forEach((c, k) => c.classList.toggle('is-on', k === i));
      cur = i;
      if (num) num.textContent = String(i + 1).padStart(2, '0');
    };

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) show(+e.target.dataset.chap); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    chaps.forEach((c) => io.observe(c));
  }
})();
