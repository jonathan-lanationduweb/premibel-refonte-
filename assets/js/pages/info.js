/* ==========================================================================
   Pages d'information — utilitaires partagés (window.PBInfo)
   + comportements autonomes : bloc Click & Collect (livraison), recherche 404
   ========================================================================== */
(() => {
  'use strict';
  const doc = document;
  const $ = (s, c = doc) => c.querySelector(s);
  const $$ = (s, c = doc) => [...c.querySelectorAll(s)];
  const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** Contrôle segmenté à indicateur glissant (ressort léger, interruptible : transition CSS). */
  function slideSeg(seg, attr = 'aria-selected') {
    let ind = $('.seg__ind', seg);
    if (!ind) { ind = doc.createElement('span'); ind.className = 'seg__ind'; ind.setAttribute('aria-hidden', 'true'); seg.prepend(ind); }
    const place = (instant) => {
      const on = $(`button[${attr}="true"]`, seg); if (!on) return;
      if (instant) ind.style.transition = 'none';
      ind.style.width = `${on.offsetWidth}px`;
      ind.style.transform = `translateX(${on.offsetLeft}px)`;
      if (instant) { void ind.offsetWidth; ind.style.transition = ''; }
    };
    place(true);
    new ResizeObserver(() => place(true)).observe(seg);
    return place;
  }

  /** Tableau d'horaires (jour courant mis en avant). */
  function hoursHTML(store) {
    if (!store || !store.hours) return '<p class="note">Horaires sur rendez-vous.</p>';
    const today = (new Date().getDay() + 6) % 7;
    return `<table class="hours"><caption class="sr-only">Horaires d’ouverture — ${esc(store.name)}</caption><tbody>${store.hours.map(([d, h], i) => `<tr${i === today ? ' class="is-today"' : ''}><th scope="row">${esc(d)}</th><td>${esc(h)}</td></tr>`).join('')}</tbody></table>`;
  }
  function statusHTML(store) {
    const o = window.PB && PB.openNow ? PB.openNow(store) : null;
    if (o === null) return '';
    return `<span class="status${o ? ' is-open' : ''}"><i></i>${o ? 'Ouvert maintenant' : 'Fermé actuellement'}</span>`;
  }
  const storeBy = (slug) => ((window.PB_SITE || {}).stores || []).find((s) => s.slug === slug);

  /** Tween numérique (montants) — interruptible, respecte reduced-motion. */
  function tweenNumber(el, to, fmt, dur = 700) {
    const from = el._v ?? 0;
    cancelAnimationFrame(el._raf);
    if (reduce || from === to) { el._v = to; el.textContent = fmt(to); return; }
    const t0 = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 4);
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      el._v = from + (to - from) * ease(t);
      el.textContent = fmt(el._v);
      if (t < 1) el._raf = requestAnimationFrame(tick); else el._v = to;
    };
    el._raf = requestAnimationFrame(tick);
  }

  window.PBInfo = { $, $$, esc, reduce, slideSeg, hoursHTML, statusHTML, storeBy, tweenNumber };

  /* ---------- Bloc Click & Collect (livraison.html) ---------- */
  function renderCollect() {
    const host = $('[data-collect]'); if (!host) return;
    const s = storeBy(host.dataset.collect || 'pantin'); if (!s) return;
    host.innerHTML = `
      <div class="collect__media media-reveal"><img src="${esc(s.imgs[1] || s.imgs[0])}" alt="Entrepôt Premibel de Pantin" loading="lazy">
        <div class="collect__badge"><b>2 h</b><span>Commande prête dans un délai de 2 heures après réception du paiement (hors week-ends et jours fériés).</span></div>
      </div>
      <div class="collect__body">
        <div>
          <p class="eyebrow">Click &amp; Collect</p>
          <h2 class="h2 split">Retrait à l’entrepôt <em>de Pantin</em></h2>
        </div>
        <p class="collect__addr reveal"><b>${esc(s.name)}</b><br>${esc(s.address)}<br>${esc(s.zip)}</p>
        <div class="reveal">${statusHTML(s)}</div>
        <div class="reveal">${hoursHTML(s)}</div>
        <ul class="ticks reveal">
          <li>Un e-mail de confirmation vous est envoyé dès que vos produits sont prêts à être récupérés.</li>
          <li>Munissez-vous de votre pièce d’identité et de votre numéro de commande lors du retrait.</li>
          <li>Retrait possible pendant les heures ouvrées.</li>
        </ul>
        <div class="collect__actions reveal">
          <a class="btn btn--dark" href="${esc(s.maps)}" target="_blank" rel="noopener"><span>Itinéraire</span>${PB.I.arrow}</a>
          <a class="btn btn--line" href="tel:+33${s.phone.replace(/\D/g, '').slice(1)}"><span>${esc(s.phone)}</span></a>
        </div>
      </div>`;
  }

  /* ---------- Recherche de la page 404 : ouvre la recherche instantanée du socle ---------- */
  function bind404() {
    const f = $('[data-nf-search]'); if (!f) return;
    const chips = $('[data-nf-chips]');
    if (chips) chips.innerHTML = ((window.PB_SITE || {}).topSearches || []).map(([l, h]) => `<a class="chip" href="${esc(h)}">${esc(l)}</a>`).join('');
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = f.querySelector('input').value.trim();
      const opener = $('[data-search-open]'); if (!opener) return;
      opener.click();
      const input = $('[data-search-input]');
      if (input && q) {
        input.value = q;
        // le socle charge les produits puis relance la recherche si un terme est saisi
        setTimeout(() => input.dispatchEvent(new Event('input')), 80);
      }
    });
  }

  /* ---------- Bandeau d'appel à l'action du socle, paramétré en data-* ---------- */
  function renderCta() {
    $$('[data-cta]').forEach((el) => {
      const o = {};
      if (el.dataset.title) o.title = el.dataset.title;
      if (el.dataset.text) o.text = el.dataset.text;
      if (el.dataset.img) o.img = el.dataset.img;
      el.innerHTML = PB.ctaBandHTML(o);
    });
  }

  const start = () => { renderCollect(); renderCta(); bind404(); };
  if (window.PB && PB.ready) PB.ready(start);
  else (window.__pbReady = window.__pbReady || []).push(start);
})();
