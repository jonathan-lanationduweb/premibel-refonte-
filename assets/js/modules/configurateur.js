/* ==========================================================================
   Configurateur « Trouver mon parquet » (parité avec nation_modal_parquet du site en ligne)
   4 étapes : Motif → Couleur → Finition → Produits. Compteurs calculés sur les produits réels.
   Ouverture : PB.configurateur.open({ motif }) ou tout élément [data-configurateur].
   ========================================================================== */
(() => {
  'use strict';
  const { esc, I } = PB;
  const MOTIFS = [
    { slug: 'baton-rompu', name: 'Bâton rompu', img: 'assets/img/journal/batons-rompus.webp', text: 'Motif en zigzag composé de lames posées à angle droit. Il apporte du rythme et un style traditionnel haut de gamme.' },
    { slug: 'lames-droites', name: 'Lames droites', img: 'assets/img/site/lames-droites.webp', text: 'Pose classique avec des lames alignées dans le même sens. C’est le rendu le plus sobre, moderne et facile à intégrer.' },
    { slug: 'point-de-hongrie', name: 'Point de Hongrie', img: 'assets/img/site/point-de-hongrie.webp', text: 'Motif en V avec des coupes en angle. Il donne un rendu élégant, graphique et très décoratif.' },
    { slug: 'versailles', name: 'Versailles', img: 'assets/img/site/dalles-de-versailles.webp', text: 'Panneaux décoratifs composés de plusieurs petites pièces de bois. C’est un style raffiné, inspiré des parquets anciens.' },
  ];
  const TEINTES = [['blanc', 'Blanc'], ['clair', 'Clair'], ['naturel', 'Naturel'], ['miel', 'Miel'], ['cuivre', 'Cuivre'], ['gris', 'Gris'], ['brun', 'Brun'], ['fonce', 'Foncé']];
  const FINITIONS = [
    ['huile', 'Huilé', 'assets/img/journal/parquet-massif-chene-huile.webp', 'Finition qui pénètre dans le bois et conserve un aspect naturel. Elle demande un entretien régulier.'],
    ['verni', 'Verni', 'assets/img/site/verni.webp', 'Protection en surface qui rend le parquet plus résistant aux taches et plus simple à entretenir.'],
    ['brut', 'Brut', 'assets/img/site/brut.webp', 'Bois non traité ou très peu préparé. Il doit généralement être protégé après la pose selon le rendu souhaité.'],
  ];
  const NONE = '_none';
  const STEPS = ['Motif', 'Couleur', 'Finition', 'Produits'];
  const TITLES = [
    ['Choisissez votre motif', 'Sélectionnez le motif qui correspond le mieux à votre style et à votre espace.'],
    ['Choisissez votre couleur', 'Les teintes disponibles pour le motif choisi.'],
    ['Choisissez votre finition', 'Huilé, verni ou brut : l’aspect et l’entretien de votre sol.'],
    ['Découvrez nos produits', 'Les parquets qui correspondent à votre sélection.'],
  ];

  let root, state, lastFocus;
  const pool = () => PB.products().filter((p) => p.cats.includes('parquet') || MOTIFS.some((m) => p.cats.includes(m.slug)));
  const match = (s = state) => pool().filter((p) => p.cats.includes(s.motif)
    && (!s.teinte || (s.teinte === NONE ? !TEINTES.some(([t]) => p.cats.includes(t)) : p.cats.includes(s.teinte)))
    && (!s.finition || (s.finition === NONE ? !FINITIONS.some(([f]) => p.cats.includes(f)) : p.cats.includes(s.finition))));
  // pas de visuel « brun » sur le site en ligne : photo d'un produit de la teinte
  const swatch = (slug) => (slug === 'brun' ? (PB.inCat('brun').find((p) => p.imgs.length) || {}).imgs?.[0] : `assets/img/site/parquet-${slug}.webp`);

  function build() {
    root = document.createElement('div');
    root.className = 'cfg';
    root.innerHTML = `<div class="cfg__scrim" data-cfg-close></div>
      <div class="cfg__dialog" role="dialog" aria-modal="true" aria-labelledby="cfg-title">
        <header class="cfg__head">
          <p class="cfg__kicker">Configurateur parquet</p>
          <button class="cfg__x" type="button" aria-label="Fermer le configurateur" data-cfg-close>${I.close}</button>
          <ol class="cfg__steps">${STEPS.map((s, i) => `<li data-step="${i}"><span>${i + 1}</span>${s}</li>`).join('')}</ol>
          <p class="cfg__mstep" aria-live="polite"></p>
          <h2 id="cfg-title" class="cfg__title"></h2><p class="cfg__sub"></p>
        </header>
        <div class="cfg__body"><div class="cfg__stage"></div></div>
        <footer class="cfg__foot">
          <button class="btn btn--line btn--sm" type="button" data-cfg-prev><span>Précédent</span></button>
          <p class="cfg__err" role="alert"></p>
          <button class="btn btn--dark btn--sm" type="button" data-cfg-next><span>Suivant</span>${I.arrow}</button>
        </footer>
      </div>`;
    document.body.appendChild(root);
    root.addEventListener('click', onClick);
    root.addEventListener('keydown', onKey);
  }

  function optionCard({ value, label, img, text, count, selected, disabled }) {
    return `<button type="button" class="cfg__opt${selected ? ' is-sel' : ''}" data-val="${esc(value)}" ${disabled ? 'disabled' : ''} aria-pressed="${selected}">
      <span class="cfg__img">${img ? `<img src="${esc(img)}" alt="" loading="lazy" onerror="this.remove()">` : '<i class="cfg__noimg"></i>'}<span class="cfg__sel">${I.check}Sélectionné</span></span>
      <span class="cfg__lbl"><b>${esc(label)}</b><small>${count} produit${count > 1 ? 's' : ''}</small></span>
      ${text ? `<span class="cfg__info" tabindex="0" aria-label="${esc(text)}">i<span role="tooltip">${esc(text)}</span></span>` : ''}
    </button>`;
  }

  function render(dir = 1) {
    const s = state; const step = s.step;
    root.querySelectorAll('.cfg__steps li').forEach((li, i) => { li.classList.toggle('is-on', i === step); li.classList.toggle('is-done', i < step); });
    root.querySelector('.cfg__mstep').textContent = `Étape ${step + 1} sur 4`;
    root.querySelector('.cfg__title').textContent = TITLES[step][0];
    root.querySelector('.cfg__sub').textContent = TITLES[step][1];
    root.querySelector('.cfg__err').textContent = '';
    root.querySelector('[data-cfg-prev]').style.visibility = step ? 'visible' : 'hidden';
    const next = root.querySelector('[data-cfg-next]');
    next.innerHTML = step === 3 ? `<span>Voir les produits correspondants</span>${I.arrow}` : `<span>Suivant</span>${I.arrow}`;
    let html = '';
    if (step === 0) {
      html = `<div class="cfg__grid cfg__grid--4">${MOTIFS.map((m) => optionCard({ value: m.slug, label: m.name, img: m.img, text: m.text, count: pool().filter((p) => p.cats.includes(m.slug)).length, selected: s.motif === m.slug })).join('')}</div>`;
    } else if (step === 1) {
      const opts = TEINTES.map(([slug, label]) => ({ value: slug, label, img: swatch(slug), count: match({ ...s, teinte: slug, finition: null }).length }));
      const none = match({ ...s, teinte: NONE, finition: null }).length;
      if (none) opts.push({ value: NONE, label: 'Non définie', count: none, text: 'Produits sans teinte référencée.' });
      html = `<div class="cfg__grid">${opts.filter((o) => o.count).map((o) => optionCard({ ...o, selected: s.teinte === o.value })).join('')}</div>`;
    } else if (step === 2) {
      const opts = FINITIONS.map(([slug, label, img, text]) => ({ value: slug, label, img, text, count: match({ ...s, finition: slug }).length }));
      const none = match({ ...s, finition: NONE }).length;
      if (none) opts.push({ value: NONE, label: 'Non définie', count: none, text: 'Sans finition / sans couleur référencée.' });
      html = `<div class="cfg__grid cfg__grid--3">${opts.filter((o) => o.count).map((o) => optionCard({ ...o, selected: s.finition === o.value })).join('')}</div>`;
    } else {
      const list = match();
      const lbl = (arr, v) => (v === NONE ? 'Non définie' : (arr.find((a) => a[0] === v || a.slug === v) || {}).name || (arr.find((a) => a[0] === v) || [])[1] || '');
      html = `<div class="cfg__recap">
          <span class="chip is-active">Motif : ${esc(MOTIFS.find((m) => m.slug === s.motif).name)}</span>
          <span class="chip is-active">Couleur : ${esc(lbl(TEINTES, s.teinte))}</span>
          <span class="chip is-active">Finition : ${esc(lbl(FINITIONS, s.finition))}</span>
          <b class="cfg__count">${list.length} produit${list.length > 1 ? 's' : ''} trouvé${list.length > 1 ? 's' : ''}</b>
        </div>
        <div class="pgrid cfg__results">${list.slice(0, 8).map((p) => PB.productCard(p)).join('')}</div>`;
    }
    const stage = root.querySelector('.cfg__stage');
    if (window.gsap && !PB.reduce) {
      gsap.to(stage, { x: -24 * dir, opacity: 0, duration: .18, ease: 'power2.in', onComplete: () => {
        stage.innerHTML = html; PB.frTypo(stage);
        gsap.fromTo(stage, { x: 32 * dir, opacity: 0 }, { x: 0, opacity: 1, duration: .55, ease: 'expo.out' });
        gsap.from(stage.querySelectorAll('.cfg__opt, .pcard'), { y: 16, opacity: 0, duration: .5, stagger: .035, ease: 'expo.out' });
      } });
    } else { stage.innerHTML = html; }
    root.querySelector('.cfg__body').scrollTop = 0;
  }

  function resultUrl() {
    const q = new URLSearchParams({ c: state.motif });
    if (state.teinte && state.teinte !== NONE) q.set('te', state.teinte);
    if (state.finition && state.finition !== NONE) q.set('fi', state.finition);
    return `catalogue.html?${q}`;
  }
  const required = ['motif', 'teinte', 'finition'];
  function go(delta) {
    if (delta > 0 && state.step < 3 && !state[required[state.step]]) {
      root.querySelector('.cfg__err').textContent = 'Veuillez sélectionner une option';
      root.querySelector('.cfg__stage').animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }], { duration: 280 });
      return;
    }
    if (delta > 0 && state.step === 3) { location.href = resultUrl(); return; }
    state.step = Math.max(0, Math.min(3, state.step + delta));
    render(delta);
  }

  function onClick(e) {
    if (e.target.closest('[data-cfg-close]')) { close(); return; }
    if (e.target.closest('[data-cfg-prev]')) { go(-1); return; }
    if (e.target.closest('[data-cfg-next]')) { go(1); return; }
    const opt = e.target.closest('.cfg__opt');
    if (opt && !opt.disabled && !e.target.closest('.cfg__info')) {
      const key = required[state.step];
      state[key] = opt.dataset.val;
      if (key === 'motif') { state.teinte = null; state.finition = null; }
      if (key === 'teinte') state.finition = null;
      root.querySelectorAll('.cfg__opt').forEach((o) => { const on = o === opt; o.classList.toggle('is-sel', on); o.setAttribute('aria-pressed', on); });
      setTimeout(() => go(1), 260); // « choisir une carte charge l'étape suivante » (comme en ligne)
    }
  }
  function onKey(e) {
    if (e.key === 'Escape') { close(); return; }
    if (e.key !== 'Tab') return;
    const f = [...root.querySelectorAll('button:not([disabled]), a[href], [tabindex="0"]')].filter((x) => x.offsetParent);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  }

  function open({ motif = null } = {}) {
    if (!root) build();
    lastFocus = document.activeElement;
    state = { step: motif ? 1 : 0, motif, teinte: null, finition: null };
    root.classList.add('is-open');
    document.documentElement.style.overflow = 'hidden'; PB.lenis && PB.lenis.stop();
    render(1);
    setTimeout(() => root.querySelector('.cfg__x').focus(), 60);
  }
  function close() {
    root.classList.remove('is-open');
    document.documentElement.style.overflow = ''; PB.lenis && PB.lenis.start();
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  if (!document.querySelector('link[href$="modules.css"]')) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'assets/css/modules.css'; document.head.appendChild(l); }
  window.PB_configurateur = { open, close };
})();
