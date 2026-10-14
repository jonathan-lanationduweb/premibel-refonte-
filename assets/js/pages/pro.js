/* ==========================================================================
   Espace professionnel
   - Couverture en parallaxe, bandeau de métiers dont la vitesse suit le scroll
   - Étapes : rail qui se remplit au défilement, pastilles qui s'allument
   - Témoignage hôtelier : lecture guidée
   - Formulaire de demande de compte pro (maquette, aucun envoi réseau) :
     validation inline, SIRET formaté et contrôlé (clé de Luhn), état de succès
   ========================================================================== */
(() => {
  'use strict';

  PB.ready(() => {
    const cta = PB.$('[data-cta]');
    if (cta) cta.innerHTML = PB.ctaBandHTML({
      title: 'Un projet <span class="nw">professionnel&nbsp;?</span> <em>Parlons-en.</em>',
      text: 'Nos experts vous accompagnent pour trouver le parquet idéal selon votre style, votre usage et votre budget.',
      img: 'assets/img/journal/bureau.webp',
    });

    initVideo();
    initForm();

    if (!PB.motion) return;
    initCover();
    initTrades();
    initSteps();
    initUsage();
    initQuote();
  });

  /* ---------------- Vidéo tutoriel ---------------- */
  function initVideo() {
    const box = PB.$('[data-pvideo]');
    if (!box) return;
    const v = PB.$('[data-pvideo-el]', box);
    PB.$('[data-pvideo-play]', box).addEventListener('click', () => {
      v.controls = true;
      const p = v.play();
      if (p && p.catch) p.catch(() => { v.controls = false; PB.toast('Le tutoriel n’a pas pu être lu. Réessayez plus tard.'); });
    });
    v.addEventListener('play', () => box.classList.add('is-playing'));
    v.addEventListener('ended', () => { box.classList.remove('is-playing'); v.controls = false; v.load(); });
  }

  /* ---------------- Couverture ---------------- */
  function initCover() {
    const img = PB.$('[data-pcover-img]');
    if (img) gsap.to(img, { yPercent: -14, ease: 'none', scrollTrigger: { trigger: '[data-pcover]', start: 'top bottom', end: 'bottom top', scrub: true } });
  }

  /* ---------------- Métiers : défilement lié à la vitesse de scroll ---------------- */
  function initTrades() {
    const track = PB.$('[data-trades]');
    if (!track) return;
    const sec = track.parentElement;
    track.innerHTML += track.innerHTML; // boucle sans couture
    sec.classList.add('is-js');
    let x = 0, boost = 0, dir = 1, lastY = scrollY, visible = true;
    PB.onScroll((y) => { const d = y - lastY; lastY = y; if (d) dir = d > 0 ? 1 : -1; boost = Math.min(14, boost + Math.abs(d) * 0.06); });
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(sec);
    gsap.ticker.add((t, dt) => {
      if (!visible) return;
      const half = track.scrollWidth / 2;
      boost *= 0.92;
      x -= (0.5 + boost) * dir * (dt / 16.7);
      if (x <= -half) x += half;
      if (x > 0) x -= half;
      track.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
    });
  }

  /* ---------------- Étapes ---------------- */
  function initSteps() {
    const wrap = PB.$('[data-steps]');
    if (!wrap) return;
    wrap.closest('.p-steps').classList.add('is-js');
    const fill = PB.$('[data-steps-fill]', wrap);
    gsap.to(fill, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: wrap, start: 'top 60%', end: 'bottom 60%', scrub: true } });
    PB.$$('.p-step', wrap).forEach((s) => {
      ScrollTrigger.create({ trigger: s, start: 'top 62%', onEnter: () => s.classList.add('is-on'), onLeaveBack: () => s.classList.remove('is-on') });
      gsap.from(s.querySelector('div'), { x: 30, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: s, start: 'top 85%' } });
    });
  }

  /* ---------------- Usages ---------------- */
  function initUsage() {
    PB.$$('.p-use__meter').forEach((m) => {
      gsap.from(m.children, { scaleX: 0, duration: 1.1, ease: 'expo.out', stagger: 0.12, scrollTrigger: { trigger: m, start: 'top 92%' } });
    });
  }

  /* ---------------- Témoignage ---------------- */
  function initQuote() {
    const q = PB.$('[data-pquote] p');
    if (!q) return;
    PB.splitWords(q, 'xw');
    gsap.to(q.querySelectorAll('.xw'), { opacity: 1, ease: 'none', stagger: 0.1, scrollTrigger: { trigger: q, start: 'top 80%', end: 'bottom 55%', scrub: 0.6 } });
  }

  /* ---------------- Formulaire ---------------- */
  const digits = (s) => s.replace(/\D/g, '');
  const luhn = (num) => {
    let sum = 0;
    for (let i = 0; i < num.length; i++) {
      let d = +num[num.length - 1 - i];
      if (i % 2) { d *= 2; if (d > 9) d -= 9; }
      sum += d;
    }
    return sum % 10 === 0;
  };
  /** SIRET valide : 14 chiffres + clé de Luhn (exception connue : établissements La Poste). */
  const siretOk = (v) => {
    const n = digits(v);
    if (n.length !== 14) return false;
    if (n.startsWith('356000000')) return n.split('').reduce((a, c) => a + +c, 0) % 5 === 0;
    return luhn(n);
  };
  const formatSiret = (v) => {
    const n = digits(v).slice(0, 14);
    return [n.slice(0, 3), n.slice(3, 6), n.slice(6, 9), n.slice(9)].filter(Boolean).join(' ');
  };

  function initForm() {
    const form = PB.$('[data-pro-form]');
    if (!form) return;
    const success = PB.$('[data-pro-success]');
    const siret = form.elements.siret;
    const help = PB.$('[data-siret-help]', form);
    const cgvErr = PB.$('[data-err-cgv]', form);

    const rules = {
      prenom: (v) => (v.trim() ? '' : 'Indiquez votre prénom.'),
      nom: (v) => (v.trim() ? '' : 'Indiquez votre nom.'),
      email: (v) => (!v.trim() ? 'Indiquez votre e-mail professionnel.' : /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? '' : 'Cette adresse e-mail semble incomplète.'),
      telephone: (v) => (digits(v).length >= 9 ? '' : 'Indiquez un numéro de téléphone joignable.'),
      societe: (v) => (v.trim() ? '' : 'Indiquez le nom de votre société.'),
      siret: (v) => (!digits(v).length ? 'Indiquez votre numéro SIRET.' : digits(v).length !== 14 ? `Le SIRET compte 14 chiffres (${digits(v).length} saisis).` : siretOk(v) ? '' : 'Ce numéro SIRET ne semble pas valide. Vérifiez la saisie.'),
      metier: (v) => (v ? '' : 'Choisissez votre métier.'),
      volume: (v) => (v ? '' : 'Choisissez une estimation, même approximative.'),
    };

    const setError = (el, msg) => {
      const field = el.closest('.field');
      let err = field.querySelector('.field__err');
      if (msg) {
        if (!err) { err = document.createElement('div'); err.className = 'field__err'; err.id = `${el.id}-err`; field.appendChild(err); }
        err.textContent = msg;
        field.classList.add('is-error');
        el.setAttribute('aria-invalid', 'true');
        el.setAttribute('aria-describedby', [err.id, el.id === 'pf-siret' ? 'pf-siret-help' : ''].filter(Boolean).join(' '));
      } else {
        if (err) err.remove();
        field.classList.remove('is-error');
        el.removeAttribute('aria-invalid');
        if (el.id === 'pf-siret') el.setAttribute('aria-describedby', 'pf-siret-help'); else el.removeAttribute('aria-describedby');
      }
      return !msg;
    };
    const check = (el) => (rules[el.name] ? setError(el, rules[el.name](el.value)) : true);

    // validation au fil de l'eau (après le premier passage dans le champ)
    Object.keys(rules).forEach((name) => {
      const el = form.elements[name];
      el.addEventListener('blur', () => { el.dataset.touched = '1'; check(el); });
      el.addEventListener(el.tagName === 'SELECT' ? 'change' : 'input', () => { if (el.dataset.touched) check(el); });
    });

    // SIRET : mise en forme 3-3-3-5 et retour immédiat
    siret.addEventListener('input', () => {
      const pos = siret.selectionStart, before = siret.value.length;
      siret.value = formatSiret(siret.value);
      const after = siret.value.length;
      try { siret.setSelectionRange(pos + (after - before), pos + (after - before)); } catch { /* type non sélectionnable */ }
      const n = digits(siret.value);
      if (n.length === 14 && siretOk(n)) { help.textContent = `SIREN ${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6, 9)} · établissement ${n.slice(9)}`; help.classList.add('is-ok'); }
      else { help.textContent = n.length ? `${n.length} / 14 chiffres` : ''; help.classList.remove('is-ok'); }
    });

    form.elements.cgv.addEventListener('change', () => { if (form.elements.cgv.checked) cgvErr.hidden = true; });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let first = null;
      Object.keys(rules).forEach((name) => {
        const el = form.elements[name];
        el.dataset.touched = '1';
        if (!check(el) && !first) first = el;
      });
      if (!form.elements.cgv.checked) { cgvErr.hidden = false; if (!first) first = form.elements.cgv; }
      if (first) {
        first.focus({ preventScroll: true });
        const top = first.getBoundingClientRect().top + scrollY - 140;
        if (PB.lenis) PB.lenis.scrollTo(top, { duration: 0.8 }); else scrollTo({ top, behavior: PB.reduce ? 'auto' : 'smooth' });
        if (PB.motion) gsap.fromTo(first.closest('.field, .check'), { x: 0 }, { keyframes: { x: [-7, 6, -4, 2, 0] }, duration: 0.45, ease: 'power2.out' });
        return;
      }
      // succès (maquette : aucune donnée envoyée)
      const card = form.parentElement;
      const h0 = card.offsetHeight;
      PB.$('[data-success-name]', success).textContent = form.elements.prenom.value.trim();
      form.hidden = true;
      success.hidden = false;
      if (PB.motion) {
        const h1 = card.offsetHeight;
        gsap.fromTo(card, { height: h0 }, { height: h1, duration: 0.7, ease: 'expo.out', clearProps: 'height', onComplete: () => ScrollTrigger.refresh() });
        gsap.from(success.children, { y: 18, opacity: 0, duration: 0.9, ease: 'expo.out', stagger: 0.07 });
      }
      success.focus({ preventScroll: true });
    });
  }
})();
