/* ==========================================================================
   Premibel — « Recommandations pour une installation parfaite »
   Cartes interactives Colle + Sous-couche Dinachoc, partagées par la fiche
   produit (produit.html) et le panier (panier.html, « Compléter mon installation »).
   Logique reprise du site en ligne (main.js, cartes .recommendation-item) :
   - Colle C901 : 1 seau = 15 kg ≈ 12 m² → seaux = ⌈surface / 12⌉ (et inversement)
   - Sous-couche : type S801 / S880 → épaisseur → colis = ⌈surface / colisage⌉
   - Totaux HT / TTC éco-participation incluse, ajout au panier.
   Expose aussi les utilitaires d'éco-participation : window.PBReco.eco*
   Charger après core.js et avant la page qui l'utilise.
   ========================================================================== */
(() => {
  'use strict';

  /* Colle recommandée (site en ligne : « 1 Pièce = 15 kg de colle, soit environ 12 m² de surface couverte ») */
  const GLUE = { sku: 'COLL0046', yieldM2: 12, kg: 15 };
  /* Gammes de sous-couche (catégories du catalogue) — libellés du site en ligne */
  const UNDERLAYS = [
    { key: 'S801', cat: 'sous-couche-dinachoc-s801', tag: 'Performance optimale', def: 3 },
    { key: 'S880', cat: 'sous-couche-dinachoc-s880-chantier', tag: 'Meilleur rapport qualité/prix', def: 5 },
  ];

  const NO_IMG = /gescomo-no-image/;
  const imgOf = (p) => (p.imgs || []).find((s) => s && !NO_IMG.test(s)) || PB.PLACEHOLDER;
  const nf = (n, d = 2) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: d }).format(n);
  const nf2 = (n) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  const money = (n) => PB.money(Math.round(n * 100) / 100);
  const parseNum = (v) => { const n = parseFloat(String(v).replace(',', '.').replace(/[^\d.]/g, '')); return isFinite(n) && n > 0 ? Math.min(n, 10000) : 0; };
  const thick = (p) => parseFloat(String(p.spec && p.spec['Épaisseur'] || '').replace(',', '.')) || parseFloat((p.name.match(/(\d+)\s*mm/i) || [])[1]) || 0;

  /* ------------------------------------------------------------------------
     Éco-participation (montants HT, par unité de vente : m², pièce, kg…)
     ------------------------------------------------------------------------ */
  /** { ht, org, ref, unit } ou null. « PMCB VALOBAT (ref : 070101600) » → org + réf. */
  function ecoInfo(p) {
    if (!p || !p.eco || !(p.eco.amount > 0)) return null;
    const m = String(p.eco.org || '').match(/^(.*?)\s*\(\s*r[ée]f\.?\s*:?\s*([^)]+)\)\s*$/i);
    const unit = p.unit === 'm²' ? 'm²' : PB.unitLabel(p);
    return { ht: p.eco.amount, org: (m ? m[1] : p.eco.org || '').trim(), ref: m ? m[2].trim() : '', unit };
  }
  /** Quantité en unité de vente (m² réels pour les produits au colis). */
  const saleUnits = (p, qty) => (p.unit === 'm²' && p.pack ? p.pack * qty : qty);
  /** Éco-participation HT d'une ligne (qty = colis pour les produits au m², sinon unités). */
  const ecoHT = (p, qty) => { const e = ecoInfo(p); return e ? e.ht * saleUnits(p, qty) : 0; };
  /** Total TTC d'une ligne, éco-participation incluse (le socle PB.cart.lineTotal ne l'inclut pas). */
  const lineTTC = (p, qty) => PB.ttc(p.price) * saleUnits(p, qty) + ecoHT(p, qty) * PB.TVA;
  const lineHT = (p, qty) => p.price * saleUnits(p, qty) + ecoHT(p, qty);
  /** Mention courte : « 0,20 €/m² – PMCB VALOBAT (réf. 070101600) » */
  const ecoLabel = (p) => { const e = ecoInfo(p); return e ? `${nf2(e.ht)} €/${e.unit} – ${e.org}${e.ref ? ` (réf. ${e.ref})` : ''}` : ''; };

  /* ------------------------------------------------------------------------
     Données
     ------------------------------------------------------------------------ */
  function underlays() {
    return UNDERLAYS.map((u) => ({ ...u, items: PB.inCat(u.cat).filter((p) => p.price > 0 && p.unit === 'm²' && p.pack).sort((a, b) => thick(a) - thick(b)) }))
      .filter((u) => u.items.length);
  }
  const glue = () => PB.bySku(GLUE.sku);
  const available = () => !!(glue() || underlays().length);

  /* ------------------------------------------------------------------------
     Gabarits
     ------------------------------------------------------------------------ */
  let uid = 0;
  const qtyHTML = (id, label, unit) => `<div class="reco__q">
      <span class="reco__ql" id="${id}-l">${label}</span>
      <span class="qty reco__qty" role="group" aria-labelledby="${id}-l">
        <button type="button" data-r-step="-1" aria-label="Retirer un ${unit}">−</button>
        <input value="1" inputmode="numeric" data-r-qty aria-label="Nombre de ${unit}s">
        <button type="button" data-r-step="1" aria-label="Ajouter un ${unit}">+</button>
      </span>
    </div>`;
  const surfHTML = (id, label) => `<div class="field reco__s">
      <input id="${id}" type="text" inputmode="decimal" autocomplete="off" placeholder=" " data-r-surface>
      <label for="${id}">${label}</label><span class="reco__suffix" aria-hidden="true">m²</span>
    </div>`;
  const priceHTML = (unitLabel) => `<dl class="reco__price" aria-live="polite">
      <div><dt>Prix / ${unitLabel}</dt><dd><b data-r-unit-ttc></b> TTC<small data-r-unit-ht></small></dd></div>
      <div class="reco__tot"><dt>Total</dt><dd><b data-r-tot-ttc></b> TTC<small data-r-tot-ht></small></dd></div>
    </dl>
    <p class="reco__eco" data-r-eco></p>`;
  const actHTML = (name) => `<button class="btn btn--dark btn--block reco__add" type="button" data-r-add><span class="reco__add-l">Ajouter au panier</span><span class="reco__add-ok" aria-hidden="true">Ajouté au panier</span></button>
    <p class="reco__incart" data-r-incart role="status" hidden>Déjà dans votre panier. <a href="panier.html">Ajuster la quantité</a></p>`;

  function glueCard() {
    const p = glue(); if (!p) return '';
    const id = `rg${++uid}`;
    return `<article class="reco reco--glue" data-reco="glue" data-sku="${PB.esc(p.sku)}">
      <div class="reco__top">
        <a class="reco__img" href="${PB.productUrl(p)}" tabindex="-1" aria-hidden="true"><img src="${PB.esc(imgOf(p))}" alt="" loading="lazy" decoding="async"></a>
        <div class="reco__txt">
          <span class="reco__k">Colle à parquet</span>
          <h3 class="reco__t"><a href="${PB.productUrl(p)}">${PB.esc(p.name)}</a></h3>
          <p class="reco__d">Issue d’une conception originale, reconnue comme la plus performante de l’industrie du parquet. <b>1 seau = ${GLUE.kg} kg de colle</b>, soit environ <b>${GLUE.yieldM2} m² couverts</b>.</p>
        </div>
      </div>
      <div class="reco__cfg">
        <div class="reco__fields">${surfHTML(`${id}-s`, 'Surface totale')}${qtyHTML(`${id}-q`, `Seaux de ${GLUE.kg} kg`, 'seau')}</div>
        <p class="reco__meta" data-r-meta></p>
      </div>
      ${priceHTML('seau')}
      ${actHTML(p.name)}
    </article>`;
  }

  function underlayCard() {
    const U = underlays(); if (!U.length) return '';
    const id = `ru${++uid}`;
    const first = U[0];
    const defP = first.items.find((p) => thick(p) === first.def) || first.items[0];
    return `<article class="reco reco--under" data-reco="under" data-sku="${PB.esc(defP.sku)}">
      <div class="reco__top">
        <a class="reco__img" href="${PB.productUrl(defP)}" tabindex="-1" aria-hidden="true" data-r-imglink><img src="${PB.esc(imgOf(defP))}" alt="" loading="lazy" decoding="async" data-r-img></a>
        <div class="reco__txt">
          <span class="reco__k">Sous-couche Dinachoc®</span>
          <h3 class="reco__t"><a href="${PB.productUrl(defP)}" data-r-name>${PB.esc(defP.name)}</a></h3>
          <p class="reco__d">Disponible en plusieurs épaisseurs pour une isolation optimale et une longévité accrue. Choisissez le type et l’épaisseur adaptés à votre projet.</p>
        </div>
      </div>
      <div class="reco__cfg">
        <fieldset class="reco__set"><legend>Type de sous-couche</legend>
          <div class="reco__types">${U.map((u, k) => `<label class="reco__type"><input type="radio" name="${id}-t" value="${u.key}" ${k ? '' : 'checked'} data-r-type><span><b>${u.key}</b><small>${u.tag}</small></span></label>`).join('')}</div>
        </fieldset>
        <fieldset class="reco__set"><legend>Épaisseur</legend><div class="reco__thick" data-r-thick></div></fieldset>
        <div class="reco__fields">${surfHTML(`${id}-s`, 'Surface souhaitée')}${qtyHTML(`${id}-q`, 'Nombre de colis', 'colis')}</div>
        <p class="reco__meta" data-r-meta></p>
      </div>
      ${priceHTML('m²')}
      ${actHTML(defP.name)}
    </article>`;
  }

  /** Section complète. */
  function html({ id = 'reco', eyebrow = 'Pose', title = 'Recommandations pour une <em>installation parfaite</em>', lead = 'Colle et sous-couche calculées sur votre surface : ajustez-la, les quantités suivent.' } = {}) {
    if (!available()) return '';
    return `<section class="container section--tight reco-sec" data-reco-root aria-labelledby="${id}-t">
      <div class="head-row"><div><p class="eyebrow">${eyebrow}</p><h2 class="h2" id="${id}-t">${title}</h2></div><p class="muted reco-sec__lead">${lead}</p></div>
      <div class="reco-grid">${glueCard()}${underlayCard()}</div>
    </section>`;
  }

  /* ------------------------------------------------------------------------
     Comportement
     ------------------------------------------------------------------------ */
  function tween(el, to, fmt) {
    if (!el) return;
    const from = el._v ?? to; el._v = to; cancelAnimationFrame(el._raf);
    if (PB.reduce || from === to) { el.textContent = fmt(to); return; }
    const t0 = performance.now();
    const step = (now) => { const t = Math.min(1, (now - t0) / 480), e = 1 - Math.pow(1 - t, 4); el.textContent = fmt(from + (to - from) * e); if (t < 1) el._raf = requestAnimationFrame(step); };
    el._raf = requestAnimationFrame(step);
  }

  function mount(root, { surface = 0 } = {}) {
    const sec = root.querySelector('[data-reco-root]');
    if (!sec) return { setSurface() {} };
    const cards = [];

    sec.querySelectorAll('[data-reco]').forEach((card) => {
      const kind = card.dataset.reco;
      const sIn = card.querySelector('[data-r-surface]'), qIn = card.querySelector('[data-r-qty]');
      const meta = card.querySelector('[data-r-meta]');
      const st = { qty: 1, p: PB.bySku(card.dataset.sku), type: null };
      const per = () => (kind === 'glue' ? GLUE.yieldM2 : st.p.pack); // m² couverts par seau / colis

      const paint = () => {
        const p = st.p, q = st.qty;
        const e = ecoInfo(p);
        const uHT = p.price + (e ? e.ht : 0); // prix / unité de vente, éco-participation incluse
        tween(card.querySelector('[data-r-unit-ttc]'), uHT * PB.TVA, money);
        card.querySelector('[data-r-unit-ht]').textContent = `${money(uHT)} HT`;
        tween(card.querySelector('[data-r-tot-ttc]'), lineTTC(p, q), money);
        card.querySelector('[data-r-tot-ht]').textContent = `${money(lineHT(p, q))} HT`;
        const ecoEl = card.querySelector('[data-r-eco]');
        ecoEl.textContent = e ? `Dont éco-participation : ${money(ecoHT(p, q) * PB.TVA)} TTC (${nf2(e.ht)} € HT / ${e.unit}) — ${e.org}${e.ref ? ` · réf. ${e.ref}` : ''}` : '';
        ecoEl.hidden = !e;
        const cov = q * per();
        meta.innerHTML = kind === 'glue'
          ? `≈ <b>${nf(cov)} m²</b> couverts <span>(${GLUE.yieldM2} m² par seau de ${GLUE.kg} kg)</span>`
          : `<b>${nf(cov)} m²</b> livrés <span>(${nf(p.pack, 3)} m² par colis)</span>`;
        const inCart = PB.cart.items().some((i) => i.sku === p.sku);
        card.querySelector('[data-r-incart]').hidden = !inCart;
      };
      const fromSurface = () => {
        const s = parseNum(sIn.value);
        if (s) { st.qty = Math.max(1, Math.ceil(s / per() - 1e-9)); qIn.value = st.qty; }
        paint();
      };
      const fromQty = (q) => {
        st.qty = Math.max(1, Math.min(999, q | 0)); qIn.value = st.qty;
        sIn.value = nf2(st.qty * per()).replace(/ |\s/g, '');
        paint();
      };
      sIn.addEventListener('input', fromSurface);
      sIn.addEventListener('blur', () => { const s = parseNum(sIn.value); if (s) sIn.value = nf2(s).replace(/ |\s/g, ''); });
      qIn.addEventListener('change', () => fromQty(parseInt(qIn.value, 10) || 1));
      card.addEventListener('click', (ev) => {
        const b = ev.target.closest('[data-r-step]'); if (b) fromQty(st.qty + +b.dataset.rStep);
      });

      if (kind === 'under') {
        const U = underlays();
        const thickBox = card.querySelector('[data-r-thick]');
        const nameA = card.querySelector('[data-r-name]'), img = card.querySelector('[data-r-img]'), imgA = card.querySelector('[data-r-imglink]');
        const renderThick = (u, selSku) => {
          thickBox.innerHTML = u.items.map((p) => {
            const d = PB.discount(p);
            return `<label class="reco__th"><input type="radio" name="${card.querySelector('[data-r-type]').name}-th" value="${PB.esc(p.sku)}" ${p.sku === selSku ? 'checked' : ''} data-r-th><span><b>${nf(thick(p))} mm</b><small>${money(p.price)} HT/m²${d ? ` <em>−${d} %</em>` : ''}</small></span></label>`;
          }).join('');
        };
        const select = (p) => {
          st.p = p; card.dataset.sku = p.sku;
          nameA.textContent = p.name; nameA.href = PB.productUrl(p); imgA.href = PB.productUrl(p);
          if (img.getAttribute('src') !== imgOf(p)) {
            if (!PB.reduce) img.animate([{ opacity: 0.2, transform: 'scale(1.04)' }, { opacity: 1, transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.22,1,.36,1)' });
            img.src = imgOf(p);
          }
          fromSurface();
        };
        st.type = U[0];
        renderThick(U[0], st.p.sku);
        card.addEventListener('change', (ev) => {
          if (ev.target.matches('[data-r-type]')) {
            const u = U.find((x) => x.key === ev.target.value); if (!u) return;
            st.type = u;
            // garde l'épaisseur si elle existe dans la nouvelle gamme
            const same = u.items.find((p) => thick(p) === thick(st.p)) || u.items.find((p) => thick(p) === u.def) || u.items[0];
            renderThick(u, same.sku); select(same);
          } else if (ev.target.matches('[data-r-th]')) {
            const p = PB.bySku(ev.target.value); if (p) select(p);
          }
        });
      }

      const addBtn = card.querySelector('[data-r-add]');
      addBtn.addEventListener('click', () => {
        // colle : 1 unité = 1 seau ; sous-couche : quantité = colis (produit au m²)
        PB.cart.add(st.p.sku, st.qty);
        PB.flyToCart(card.querySelector('.reco__img img') || addBtn);
        addBtn.classList.add('is-added'); clearTimeout(addBtn._t); addBtn._t = setTimeout(() => addBtn.classList.remove('is-added'), 1800);
        paint();
      });

      cards.push({
        setSurface(m2) { if (!(m2 > 0)) return; sIn.value = nf2(m2).replace(/ |\s/g, ''); fromSurface(); },
        paint,
      });
      paint();
    });

    const onCart = () => cards.forEach((c) => c.paint());
    document.addEventListener('pb:cart', onCart);
    const api = { setSurface(m2) { cards.forEach((c) => c.setSurface(m2)); } };
    api.setSurface(surface);
    return api;
  }

  window.PBReco = { html, mount, available, ecoInfo, ecoHT, ecoLabel, lineTTC, lineHT, saleUnits, GLUE };
})();
