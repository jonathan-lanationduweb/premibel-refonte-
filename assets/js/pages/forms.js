/* ==========================================================================
   Premibel — formulaires partagés (contact, rendez-vous, devis)
   - Validation inline au blur (messages en français), revalidation à la saisie
   - Groupes de choix (radio / cases) avec message d'erreur
   - Parcours en étapes : barre de progression, retour, transitions directionnelles
     (avance = glisse vers la gauche, retour = vers la droite), interruptibles
   - État de succès animé. Aucun envoi réseau.
   API : window.PBF
   ========================================================================== */
(() => {
  'use strict';
  const doc = document;
  const $ = (s, c = doc) => c.querySelector(s);
  const $$ = (s, c = doc) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gs = () => (window.gsap && !reduce ? window.gsap : null);
  let uid = 0;

  /* ----------------------------------------------------------------------
     Règles
     ---------------------------------------------------------------------- */
  const RX = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
    tel: /^(?:(?:\+|00)33\s?[1-9]|0[1-9])(?:[\s.-]?\d{2}){4}$/,
    cp: /^(?:0[1-9]|[1-8]\d|9[0-8])\d{3}$/,
  };
  const digits = (v) => v.replace(/\D/g, '');
  const fmtTel = (v) => {
    const d = digits(v);
    if (/^0\d{9}$/.test(d)) return d.replace(/(\d{2})(?=\d)/g, '$1 ');
    if (/^33\d{9}$/.test(d)) return `+33 ${d.slice(2, 3)} ${d.slice(3).replace(/(\d{2})(?=\d)/g, '$1 ')}`;
    return v.trim();
  };

  /** Retourne un message d'erreur ou '' si valide. */
  function check(el) {
    const v = (el.value || '').trim();
    const rule = el.dataset.rule || el.type;
    if (el.type === 'checkbox') return el.required && !el.checked ? (el.dataset.msg || 'Cette case doit être cochée pour continuer.') : '';
    if (!v) return el.required ? (el.dataset.msg || (el.tagName === 'SELECT' ? 'Choisissez une option dans la liste.' : 'Ce champ est requis.')) : '';
    if (rule === 'email' && !RX.email.test(v)) return 'Adresse e-mail incomplète — exemple : prenom@domaine.fr';
    if (rule === 'tel' && !RX.tel.test(v.replace(/\s+/g, ' '))) return 'Numéro à 10 chiffres attendu — exemple : 06 12 34 56 78';
    if (rule === 'cp' && !RX.cp.test(v)) return 'Code postal à 5 chiffres — exemple : 75011';
    if (rule === 'name' && v.length < 2) return 'Deux caractères minimum.';
    if (el.type === 'number') {
      const n = Number(v.replace(',', '.'));
      if (!Number.isFinite(n)) return 'Indiquez un nombre.';
      if (el.min !== '' && n < +el.min) return el.dataset.msgRange || `Valeur minimale : ${el.min}.`;
      if (el.max !== '' && n > +el.max) return el.dataset.msgRange || `Valeur maximale : ${el.max}.`;
    }
    if (el.minLength > 0 && v.length < el.minLength) return `${el.minLength} caractères minimum (actuellement ${v.length}).`;
    return '';
  }

  const holderOf = (el) => el.closest('.field, .check-wrap, .fgroup') || el.parentElement;
  function errEl(holder, describe) {
    let e = holder.querySelector(':scope > .field__err');
    if (!e) {
      e = doc.createElement('p'); e.className = 'field__err'; e.id = `err-${++uid}`; e.setAttribute('aria-live', 'polite');
      holder.appendChild(e);
    }
    describe.forEach((d) => {
      const ids = new Set((d.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean)); ids.add(e.id);
      d.setAttribute('aria-describedby', [...ids].join(' '));
    });
    return e;
  }
  function show(holder, describe, msg) {
    const e = errEl(holder, describe);
    const was = holder.classList.contains('is-error');
    holder.classList.toggle('is-error', !!msg);
    holder.classList.toggle('is-valid', !msg && describe.some((d) => (d.value || '').trim() && d.type !== 'checkbox'));
    describe.forEach((d) => (msg ? d.setAttribute('aria-invalid', 'true') : d.removeAttribute('aria-invalid')));
    if (msg) { e.textContent = msg; if (!was && gs()) gs().fromTo(e, { y: -4, opacity: 0 }, { y: 0, opacity: 1, duration: .45, ease: 'expo.out' }); }
    else e.textContent = '';
  }

  /** Valide un champ simple. */
  function validateField(el) {
    if (el.disabled || el.closest('[hidden]:not(.step)')) return true;
    if (el.dataset.rule === 'tel' && el.value.trim() && RX.tel.test(el.value.trim().replace(/\s+/g, ' '))) el.value = fmtTel(el.value);
    const msg = check(el);
    show(holderOf(el), [el], msg);
    return !msg;
  }

  /** Valide un groupe .fgroup[data-required] (radios / cases). */
  function validateGroup(g) {
    if (g.closest('[hidden]:not(.step)')) return true;
    const inputs = $$('input', g).filter((i) => i.type === 'radio' || i.type === 'checkbox');
    const ok = !g.hasAttribute('data-required') || inputs.some((i) => i.checked);
    show(g, [g], ok ? '' : (g.dataset.msg || 'Sélectionnez une option.'));
    return ok;
  }

  const fieldsIn = (scope) => $$('input, select, textarea', scope).filter((el) => !el.closest('.fgroup') && el.type !== 'hidden' && el.type !== 'file' && el.type !== 'search' && !el.hasAttribute('data-novalidate'));
  /** Valide tout un périmètre ; renvoie le premier élément invalide (ou null). */
  function validateScope(scope) {
    let first = null;
    $$('.fgroup', scope).forEach((g) => { if (!validateGroup(g) && !first) first = g.querySelector('input'); });
    fieldsIn(scope).forEach((el) => { if (!validateField(el) && !first) first = el; });
    // ordre visuel : le premier invalide dans le DOM
    const all = $$('[aria-invalid="true"]', scope);
    const target = all[0] ? (all[0].classList.contains('fgroup') ? all[0].querySelector('input') : all[0]) : first;
    return target;
  }

  /** Branche la validation inline sur un formulaire (au blur, puis à la saisie une fois en erreur). */
  function bind(form) {
    form.noValidate = true;
    form.addEventListener('focusout', (e) => {
      const el = e.target;
      if (el.matches('input, select, textarea') && !el.closest('.fgroup') && el.type !== 'file' && el.type !== 'search' && !el.hasAttribute('data-novalidate') && el.type !== 'checkbox') {
        if ((el.value || '').trim() || el.dataset.touched) validateField(el);
        el.dataset.touched = '1';
      }
      const g = el.closest && el.closest('.fgroup');
      if (g && !g.contains(e.relatedTarget) && g.dataset.touched) validateGroup(g);
    });
    form.addEventListener('input', (e) => {
      const el = e.target;
      if (el.getAttribute('aria-invalid') === 'true' && !el.closest('.fgroup')) {
        const msg = check(el); if (!msg) show(holderOf(el), [el], '');
      }
    });
    form.addEventListener('change', (e) => {
      const el = e.target;
      const g = el.closest('.fgroup');
      if (g) { g.dataset.touched = '1'; if (g.classList.contains('is-error')) validateGroup(g); }
      else if (el.type === 'checkbox' || el.tagName === 'SELECT') validateField(el);
    });
  }

  const focusEl = (el) => {
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    if (top < 100 || top > innerHeight - 80) {
      const y = scrollY + top - 140;
      if (window.PB && PB.lenis) PB.lenis.scrollTo(y, { duration: .8 }); else scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
    }
    setTimeout(() => el.focus({ preventScroll: true }), reduce ? 0 : 350);
  };

  /** Petit refus physique (bouton) — ressort amorti. */
  const nudge = (el) => {
    if (!el || reduce || !el.animate) return;
    el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(-3px)' }, { transform: 'translateX(0)' }], { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)' });
  };

  /* ----------------------------------------------------------------------
     Parcours en étapes
     markup : [data-stepper] > .stepper__bar > span ; .stepper__nav li ; .stepper__viewport > .step
     ---------------------------------------------------------------------- */
  function stepper(root, { onEnter, beforeNext } = {}) {
    const vp = $('.stepper__viewport', root);
    const steps = $$('.step', vp);
    const bar = $('.stepper__bar span', root);
    const navItems = $$('.stepper__nav li', root);
    const count = $('[data-step-count]', root);
    let i = 0, max = 0, tl = null;

    const paint = () => {
      if (bar) bar.style.transform = `scaleX(${(i + 1) / steps.length})`;
      if (count) count.textContent = `Étape ${i + 1} sur ${steps.length}`;
      navItems.forEach((li, k) => {
        li.classList.toggle('is-done', k < i); li.classList.toggle('is-current', k === i);
        const b = li.querySelector('button');
        if (b) { b.disabled = k > max || k === i; k === i ? b.setAttribute('aria-current', 'step') : b.removeAttribute('aria-current'); }
      });
    };
    steps.forEach((s, k) => { s.hidden = k !== 0; s.setAttribute('aria-hidden', k !== 0); });
    paint();

    function go(to, { focus = true } = {}) {
      if (to === i || to < 0 || to >= steps.length) return;
      const dir = to > i ? 1 : -1;
      const from = steps[i], next = steps[to];
      if (tl) tl.progress(1).kill();
      i = to; max = Math.max(max, to); paint();
      onEnter && onEnter(to, dir);
      const g = gs();
      const h0 = vp.offsetHeight;
      next.hidden = false; next.setAttribute('aria-hidden', 'false');
      from.setAttribute('aria-hidden', 'true');
      const done = () => { from.hidden = true; vp.style.height = ''; from.style.cssText = ''; next.style.cssText = ''; vp.classList.remove('is-moving'); if (window.ScrollTrigger) ScrollTrigger.refresh(); };
      if (!g) { done(); }
      else {
        const h1 = next.offsetHeight;
        vp.classList.add('is-moving');
        const d = Math.min(56, innerWidth * .08);
        tl = g.timeline({ onComplete: done, onInterrupt: done });
        tl.set(vp, { height: h0 })
          .to(from, { x: -d * dir, opacity: 0, duration: .32, ease: 'power2.in' }, 0)
          .fromTo(next, { x: d * dir, opacity: 0 }, { x: 0, opacity: 1, duration: .7, ease: 'expo.out' }, .18)
          .to(vp, { height: h1, duration: .6, ease: 'expo.out' }, .1)
          .set(vp, { clearProps: 'height' });
      }
      if (focus) {
        const t = $('[data-step-title]', next) || next;
        const rect = root.getBoundingClientRect();
        if (rect.top < 0 || rect.top > innerHeight * .5) {
          const y = scrollY + rect.top - 110;
          if (window.PB && PB.lenis) PB.lenis.scrollTo(y, { duration: .9 }); else scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
        }
        setTimeout(() => t.focus({ preventScroll: true }), reduce ? 0 : 380);
      }
    }

    root.addEventListener('click', (e) => {
      const nx = e.target.closest('[data-next]'), pv = e.target.closest('[data-prev]'), gt = e.target.closest('[data-goto]');
      if (nx) {
        e.preventDefault();
        const bad = validateScope(steps[i]);
        if (bad || (beforeNext && beforeNext(i) === false)) { nudge(nx); if (bad) focusEl(bad); return; }
        go(i + 1);
      } else if (pv) { e.preventDefault(); go(i - 1); }
      else if (gt) { e.preventDefault(); go(+gt.dataset.goto); }
    });
    navItems.forEach((li, k) => { const b = li.querySelector('button'); b && b.addEventListener('click', () => go(k)); });

    return { go, get index() { return i; }, steps, validate: () => validateScope(steps[i]) };
  }

  /* ----------------------------------------------------------------------
     Succès
     ---------------------------------------------------------------------- */
  function success(container, { title, text, extra = '' }) {
    const box = doc.createElement('div');
    box.className = 'form-success fx-success';
    box.setAttribute('role', 'status'); box.tabIndex = -1;
    box.innerHTML = `<svg viewBox="0 0 56 56" aria-hidden="true"><circle class="fx-success__c" cx="28" cy="28" r="26"/><path class="fx-success__p" d="M17 29l7.5 7.5L40 21"/></svg>
      <h2 class="h3">${title}</h2><p class="lead">${text}</p>${extra}`;
    const g = gs();
    const swap = () => {
      container.replaceChildren(box);
      if (g) {
        g.fromTo(box, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: .9, ease: 'expo.out' });
        g.fromTo(box.querySelectorAll('h2, p, .acts, .fx-recap'), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .9, ease: 'expo.out', stagger: .07, delay: .25 });
      }
      box.classList.add('is-in');
      focusEl(box);
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    };
    if (g) g.to(container.children, { opacity: 0, y: -12, duration: .3, ease: 'power2.in', onComplete: swap });
    else swap();
  }

  /* Bouton d'envoi : état « en cours » bref (aucun réseau, simple retour visuel) */
  const busy = (btn, ms = 900) => new Promise((res) => {
    if (!btn) return res();
    btn.classList.add('is-busy'); btn.setAttribute('aria-busy', 'true'); btn.disabled = true;
    setTimeout(() => { btn.classList.remove('is-busy'); btn.removeAttribute('aria-busy'); btn.disabled = false; res(); }, reduce ? 150 : ms);
  });

  /* Libellés lisibles d'un groupe coché */
  const picked = (scope, name) => $$(`input[name="${name}"]:checked`, scope).map((i) => i.dataset.label || i.value);

  window.PBF = { check, validateField, validateGroup, validateScope, bind, stepper, success, busy, focusEl, nudge, fmtTel, picked, RX };
})();
