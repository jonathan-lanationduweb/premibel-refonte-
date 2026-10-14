/* ==========================================================================
   Engagement forêts
   - Matière : parallaxe de la texture bois, citation qui se pose
   - « Forêt bien gérée » : lecture guidée (mots éclairés au scroll)
   - Labels : cartes qui se redressent en perspective
   - Méthode : section épinglée, anneau de progression + 4 étapes (≥ 1001 px)
   - Parquets certifiés FSC® / PEFC tirés du catalogue réel (rail à inertie)
   ========================================================================== */
(() => {
  'use strict';

  const CERT = /^Certifi/i;
  const certOf = (p) => {
    const out = [];
    if (CERT.test(p.spec['FSC®'] || '')) out.push('FSC®');
    if (CERT.test(p.spec.PEFC || '')) out.push('PEFC');
    return out;
  };

  PB.ready(async () => {
    if (PB.motion) {
      initMatter();
      initReading();
      initLabels();
      initMethod();
    }
    await initProducts();
  });

  /* ---------------- Matière ---------------- */
  function initMatter() {
    const sec = PB.$('[data-matter]');
    if (!sec) return;
    gsap.fromTo(PB.$('.e-matter__img', sec), { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true } });
    const q = PB.$('[data-matter-q]', sec);
    PB.splitWords(q);
    gsap.from(q.querySelectorAll('.sw > span'), { yPercent: 110, duration: 1.3, ease: 'expo.out', stagger: 0.035, scrollTrigger: { trigger: sec, start: 'top 60%' } });
  }

  /* ---------------- Lecture guidée ---------------- */
  function initReading() {
    PB.$$('[data-read]').forEach((p) => {
      PB.splitWords(p, 'xw');
      gsap.to(p.querySelectorAll('.xw'), { opacity: 1, ease: 'none', stagger: 0.12, scrollTrigger: { trigger: p, start: 'top 80%', end: 'bottom 50%', scrub: 0.6 } });
    });
  }

  /* ---------------- Labels ---------------- */
  function initLabels() {
    PB.$$('[data-label]').forEach((card, i) => {
      gsap.from(card, { rotateX: 16, y: 70, opacity: 0, duration: 1.4, ease: 'expo.out', delay: i * 0.08, scrollTrigger: { trigger: card, start: 'top 88%' } });
      const logo = card.querySelector('.e-label__logo');
      gsap.from(logo, { scale: 0.86, rotate: i ? 3 : -3, duration: 1.6, ease: 'expo.out', delay: 0.1 + i * 0.08, scrollTrigger: { trigger: card, start: 'top 88%' } });
    });
  }

  /* ---------------- Méthode épinglée ---------------- */
  function initMethod() {
    const sec = PB.$('[data-method]');
    const pinEl = PB.$('[data-method-pin]');
    if (!sec || !pinEl) return;
    const steps = PB.$$('.e-step', sec);
    const dots = PB.$$('.e-method__dots i', sec);
    const ring = PB.$('[data-ring]', sec);
    const C = 2 * Math.PI * 92;
    let cur = -1;
    const setStep = (i) => {
      if (i === cur) return;
      cur = i;
      steps.forEach((s, k) => { s.classList.toggle('is-on', k === i); s.classList.toggle('is-past', k < i); s.setAttribute('aria-hidden', k === i ? 'false' : 'true'); });
      dots.forEach((d, k) => d.classList.toggle('is-on', k === i));
    };

    const mm = gsap.matchMedia();
    mm.add('(min-width: 1001px)', () => {
      sec.classList.add('is-pinned');
      setStep(0);
      const st = ScrollTrigger.create({
        trigger: pinEl,
        start: () => (pinEl.offsetHeight > innerHeight ? 'bottom bottom' : 'center center'),
        end: () => `+=${Math.round(innerHeight * 2.2)}`,
        pin: true,
        anticipatePin: 1,
        refreshPriority: 1,
        invalidateOnRefresh: true,
        onUpdate: (s) => {
          ring.style.strokeDashoffset = (C * (1 - s.progress)).toFixed(2);
          setStep(Math.min(steps.length - 1, Math.floor(s.progress * steps.length * 0.999)));
        },
      });
      return () => {
        st.kill();
        sec.classList.remove('is-pinned');
        steps.forEach((s) => { s.classList.remove('is-on', 'is-past'); s.removeAttribute('aria-hidden'); });
        cur = -1;
      };
    });
    mm.add('(max-width: 1000px)', () => {
      steps.forEach((s) => gsap.from(s, { y: 30, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: s, start: 'top 88%' } }));
    });
  }

  /* ---------------- Parquets certifiés ---------------- */
  async function initProducts() {
    const track = PB.$('[data-cert-track]');
    const railEl = PB.$('[data-cert-rail]');
    if (!track || !railEl) return;
    try {
      await PB.load('products', 'categories');
    } catch (e) {
      railEl.closest('section').hidden = true;
      return;
    }
    const all = PB.products().filter((p) => certOf(p).length);
    const parquets = all.filter((p) => p.cats.includes('parquet') && p.imgs.length);
    const count = PB.$('[data-cert-count]');
    if (count) count.textContent = `${all.length} références certifiées FSC® ou PEFC dans notre catalogue.`;

    // sélection variée : on parcourt la liste à pas réguliers
    const n = Math.min(12, parquets.length);
    const stride = parquets.length / n;
    const pick = Array.from({ length: n }, (_, i) => parquets[Math.floor(i * stride)]);

    track.innerHTML = pick.map((p) => {
      const tags = certOf(p).map((c) => `<span class="tag tag--ink">${c}</span>`).join('');
      return PB.productCard(p).replace('<span class="pcard__tags">', `<span class="pcard__tags">${tags}`);
    }).join('');
    PB.rail(railEl, { progress: PB.$('[data-cert-progress]'), prev: PB.$('[data-cert-prev]'), next: PB.$('[data-cert-next]') });
    if (PB.motion) {
      gsap.from(track.children, { x: 80, opacity: 0, duration: 1.3, ease: 'expo.out', stagger: 0.06, scrollTrigger: { trigger: railEl, start: 'top 85%' } });
      ScrollTrigger.refresh();
    }
  }
})();
