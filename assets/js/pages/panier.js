/* ==========================================================================
   Premibel — panier & commande (panier.html)
   Panier : lignes éditables (éco-participation par ligne), récapitulatif HT /
            TVA / éco-participation / TTC, délais, code promo (interface),
            moyens de paiement, « Compléter mon installation » (colle + sous-couche).
   Tunnel (comme le site en ligne) : 1. Informations → 2. Livraison →
            3. Paiement → confirmation de démonstration.
   Aucun paiement, aucun envoi réseau.
   ========================================================================== */
(() => {
  'use strict';

  const FREE_SHIP_HT = PB.FREE_SHIP_HT || 1000; // livraison offerte dès 1 000 € HT (France métropolitaine)
  // Alma (texte du site : « dès 200 € d'achat HT », « jusqu'à 4 000 € selon éligibilité »)
  const ALMA_MIN_HT = 200, ALMA_MAX = 4000;
  const IDF = /^(75|77|78|91|92|93|94|95)\d{3}$/;
  /* Seul tarif constaté sur le site en ligne (zone Paris / IDF proximité, < 200 kg) */
  const IDF_EXAMPLE = { label: 'PARIS ET IDF PROXIMITÉ < 200 kg – 72 h ouvrées – livraison sur le trottoir', price: 79, maxKg: 200 };
  const KG_PER_M2 = 10; // estimation (« le parquet pèse environ 10 kg/m² ») — pas de poids réel dans les données
  /* Pays proposés au paiement sur le site en ligne */
  const COUNTRIES = [['FR', 'France', '+33'], ['DE', 'Allemagne', '+49'], ['AD', 'Andorre', '+376'], ['BE', 'Belgique', '+32'], ['ES', 'Espagne', '+34'], ['IT', 'Italie', '+39'], ['LU', 'Luxembourg', '+352'], ['NL', 'Pays-Bas', '+31'], ['PL', 'Pologne', '+48'], ['PT', 'Portugal', '+351'], ['CH', 'Suisse', '+41']];

  const nf = (n, d = 2) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: d }).format(n);
  const money = (n) => PB.money(Math.round(n * 100) / 100);
  const NO_IMG = /gescomo-no-image/;
  const imgOf = (p) => p.imgs.find((s) => s && !NO_IMG.test(s)) || PB.PLACEHOLDER;
  const svg = (icon, size = 18) => icon.replace('<svg', `<svg width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"`);
  const R = window.PBReco;
  const longDate = (d) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const addMonths = (n) => { const d = new Date(); const day = d.getDate(); d.setMonth(d.getMonth() + n); if (d.getDate() < day) d.setDate(0); return d; };

  function tweenNumber(el, to, fmt = money) {
    if (!el) return;
    const from = el._v ?? to; el._v = to; cancelAnimationFrame(el._raf);
    if (PB.reduce || from === to) { el.textContent = fmt(to); return; }
    const t0 = performance.now();
    const step = (now) => { const t = Math.min(1, (now - t0) / 520), e = 1 - Math.pow(1 - t, 4); el.textContent = fmt(from + (to - from) * e); if (t < 1) el._raf = requestAnimationFrame(step); };
    el._raf = requestAnimationFrame(step);
  }

  const state = { alma: 3, promo: '', ship: '', pay: 'card', step: 1, max: 1 };
  const pantin = () => (window.PB_SITE.stores || []).find((s) => s.slug === 'pantin') || {};
  const delivery = () => {
    const d = window.PB_SITE.delivery || {};
    return { note: String(d.note || '').replace(/\s*Livraison sur rendez-vous\.?\s*$/i, '').trim(), zones: d.zones || [], text: d.text || '' };
  };
  const deliveryHTML = (cls = 'cdeliv') => {
    const d = delivery();
    return `<div class="${cls}">${svg(PB.I.truck, 20)}<div>${d.note ? `<b>${PB.esc(d.note)}</b>` : ''}<span>${d.zones.map(([z, t]) => `${PB.esc(z)} : ${PB.esc(t)}`).join(' · ')}</span><span><b>Livraison sur rendez-vous.</b> ${PB.esc(d.text)}</span></div></div>`;
  };
  /* Logos de paiement sobres (texte composé, pas de logo de marque reproduit) */
  const payLogos = () => `<ul class="paylogos" aria-label="Moyens de paiement acceptés">${['CB', 'Visa', 'Mastercard', 'PayPal', 'Alma'].map((n) => `<li class="paylogo paylogo--${n.toLowerCase()}">${n}</li>`).join('')}</ul>`;

  /* Unités de vente : colis (m²), ml, kg, pièces */
  const lineInfo = (p, qty) => {
    if (p.unit === 'm²' && p.pack) return { q: `${qty} colis`, eq: `${nf(qty * p.pack, 2)} m²`, unit: `${money(PB.ttc(p.price))} TTC / m² · ${money(p.price)} HT · ${nf(p.pack, 3)} m² par colis`, step: 1 };
    if (p.unit === 'Kg' && p.pack > 1) return { q: `${nf(qty)} kg`, eq: `${nf(qty / p.pack)} pot${qty / p.pack > 1 ? 's' : ''} de ${nf(p.pack)} kg`, unit: `${money(PB.ttc(p.price))} TTC / kg`, step: p.pack };
    if (p.unit === 'ml') return { q: `${nf(qty)} ml`, eq: p.pack ? `soit ${Math.ceil(qty / p.pack - 1e-9)} barre${Math.ceil(qty / p.pack - 1e-9) > 1 ? 's' : ''} de ${nf(p.pack)} m` : '', unit: `${money(PB.ttc(p.price))} TTC / ml`, step: 1 };
    return { q: `${nf(qty)} ${PB.unitLabel(p)}${qty > 1 && PB.unitLabel(p) === 'unité' ? 's' : ''}`, eq: '', unit: `${money(PB.ttc(p.price))} TTC / ${PB.unitLabel(p)}`, step: 1 };
  };

  const isFloor = (p) => p.unit === 'm²' && p.pack && !p.cats.some((c) => /sous-couche|isolation|accessoires|colle/.test(c));
  /** Poids estimé (kg) : ~10 kg/m² de sol, 15 kg par seau de colle, poids réel pour les produits au kilo. */
  const weightOf = (p, qty) => (isFloor(p) ? qty * p.pack * KG_PER_M2 : p.sku === R.GLUE.sku ? qty * R.GLUE.kg : p.unit === 'Kg' ? qty : 0);

  const totals = () => {
    const items = PB.cart.items().filter((i) => PB.bySku(i.sku));
    let ht = 0, eco = 0, saved = 0, m2 = 0, floorM2 = 0, kg = 0;
    items.forEach((i) => {
      const p = PB.bySku(i.sku);
      ht += R.lineHT(p, i.qty); eco += R.ecoHT(p, i.qty);
      if (p.regular) saved += (PB.ttc(p.regular) - PB.ttc(p.price)) * R.saleUnits(p, i.qty);
      if (p.unit === 'm²' && p.pack) m2 += p.pack * i.qty;
      if (isFloor(p)) floorM2 += p.pack * i.qty;
      kg += weightOf(p, i.qty);
    });
    ht = Math.round(ht * 100) / 100;
    const ttc = Math.round(ht * PB.TVA * 100) / 100;
    return { items, ht, ttc, tva: ttc - ht, eco, ecoTTC: eco * PB.TVA, saved, m2, floorM2, kg };
  };

  /* ------------------------------------------------------------------------
     Panier
     ------------------------------------------------------------------------ */
  const lineHTML = (i) => {
    const p = PB.bySku(i.sku); if (!p) return '';
    const L = lineInfo(p, i.qty);
    const d = PB.discount(p);
    const eco = R.ecoHT(p, i.qty);
    return `<li class="cline" data-line="${PB.esc(p.sku)}">
      <a class="cline__img" href="${PB.productUrl(p)}" tabindex="-1" aria-hidden="true"><img src="${PB.esc(imgOf(p))}" alt="" loading="lazy" decoding="async"></a>
      <div class="cline__main">
        <div class="cline__top">
          <div>
            <span class="cline__cat">${PB.esc(PB.mainCat(p))}${d ? ` · <span class="cline__promo">−${d} %</span>` : ''}</span>
            <a class="cline__name" href="${PB.productUrl(p)}">${PB.esc(p.name)}</a>
            <span class="cline__ref">Réf. ${PB.esc(p.sku)} · ${L.unit}</span>
          </div>
          <div class="cline__price">
            <b class="cline__total" data-lt>${money(R.lineTTC(p, i.qty))}</b>
            <small class="cline__ht" data-lht>${money(R.lineHT(p, i.qty))} HT</small>
            <small class="cline__eco" data-leco ${eco ? '' : 'hidden'}>dont éco-participation ${money(eco * PB.TVA)}</small>
          </div>
        </div>
        <div class="cline__bottom">
          <span class="qty qty--line" role="group" aria-label="Quantité pour ${PB.esc(p.name)}">
            <button type="button" data-cq="-1" aria-label="Diminuer">−</button>
            <input value="${nf(i.qty)}" inputmode="numeric" data-ci aria-label="Quantité">
            <button type="button" data-cq="1" aria-label="Augmenter">+</button>
          </span>
          <span class="cline__eq"><b>${L.q}</b>${L.eq ? ` <span>· ${L.eq}</span>` : ''}</span>
          <button class="cline__rm" type="button" data-crm>Retirer</button>
        </div>
      </div>
    </li>`;
  };

  function summaryHTML() {
    return `<aside class="csum" aria-labelledby="csum-t">
      <h2 class="csum__t" id="csum-t">Récapitulatif</h2>
      <dl class="csum__rows">
        <div><dt>Sous-total produits HT</dt><dd data-s-ht></dd></div>
        <div><dt>TVA (20 %)</dt><dd data-s-tva></dd></div>
        <div data-s-eco-row hidden><dt>Dont éco-participation</dt><dd data-s-eco></dd></div>
        <div data-s-saved-row hidden><dt>Dont économies</dt><dd class="csum__saved" data-s-saved></dd></div>
        <div><dt>Livraison</dt><dd>Calculée à l’étape suivante</dd></div>
        <div class="csum__total"><dt>Total TTC</dt><dd data-s-ttc></dd></div>
      </dl>
      <p class="csum__alma" data-s-alma></p>
      ${deliveryHTML('cdeliv csum__deliv')}
      <div class="ship-meter csum__meter" data-meter></div>
      <button class="btn btn--dark btn--block csum__go" type="button" data-checkout><span>Finaliser ma commande</span>${PB.I.arrow}</button>
      <form class="promo" data-promo novalidate>
        <div class="field promo__field"><input id="promo" type="text" placeholder=" " autocomplete="off" data-promo-in value="${PB.esc(state.promo)}"><label for="promo">Vous avez un code promo ?</label></div>
        <button class="btn btn--line btn--sm" type="submit"><span>Appliquer</span></button>
        <p class="promo__msg" data-promo-msg role="status"></p>
      </form>
      <div class="csum__secure"><p>${svg(PB.I.check, 16)} Paiement 100 % sécurisé</p>${payLogos()}</div>
      <p class="csum__legal">*Livraison offerte en France métropolitaine dès ${money(FREE_SHIP_HT)} HT d’achat (hors montagne et îles). Alma : paiement en 2×, 3× ou 4× dès ${money(ALMA_MIN_HT)} HT, jusqu’à ${money(ALMA_MAX)}, sous réserve d’acceptation.</p>
    </aside>`;
  }

  function renderCart(root) {
    const t = totals();
    state.step = 1; setStep(1);
    if (!t.items.length) return renderEmpty(root);
    root.innerHTML = `<div class="cartp-title"><h1 class="h1">Mon <em>panier</em></h1><span class="cartp-count" data-ccount></span></div>
      <div class="cartp-grid">
        <div class="cartp-lines">
          <ul class="clines" data-lines>${t.items.map(lineHTML).join('')}</ul>
          <div class="cartp-after">
            <a class="link-arrow" href="${PB.catUrl('parquet')}"><span aria-hidden="true">←</span> Continuer mes achats</a>
            <a class="link-arrow" href="${PB.esc(window.PB_SITE.whatsapp)}" target="_blank" rel="noopener">Un doute sur les quantités ? Écrivez-nous <span>→</span></a>
          </div>
        </div>
        ${summaryHTML()}
      </div>
      ${R.html({ id: 'creco', eyebrow: 'Pose', title: 'Compléter mon <em>installation</em>', lead: 'Produits compatibles avec votre panier, ajustables selon votre surface — pré-remplie avec la surface de parquet de votre panier.' }).replace('container section--tight reco-sec', 'section--tight reco-sec cartp-reco')}
      ${PB.uspHTML()}`;
    bindCart(root);
    refresh(root, true);
    R.mount(root, { surface: t.floorM2 || t.m2 });
    if (PB.motion) gsap.from(root.querySelectorAll('.cline'), { opacity: 0, y: 18, duration: 0.9, ease: 'expo.out', stagger: 0.05 });
  }

  function refresh(root, instant) {
    const t = totals();
    if (!t.items.length) { renderEmpty(root); return; }
    const q = (s) => root.querySelector(s);
    const set = (sel, v) => { const el = q(sel); if (!el) return; if (instant) { el._v = v; el.textContent = money(v); } else tweenNumber(el, v); };
    set('[data-s-ht]', t.ht); set('[data-s-tva]', t.tva); set('[data-s-ttc]', t.ttc);
    q('[data-s-eco-row]').hidden = !t.eco; if (t.eco) set('[data-s-eco]', t.ecoTTC);
    q('[data-s-saved-row]').hidden = !t.saved; if (t.saved) set('[data-s-saved]', t.saved);
    const left = Math.max(0, FREE_SHIP_HT - t.ht);
    q('[data-meter]').innerHTML = `${left ? `Plus que <b>${money(left)} HT</b> pour la livraison gratuite*` : 'Livraison gratuite en France métropolitaine*'}<div class="ship-meter__bar"><span style="transform:scaleX(${Math.min(1, t.ht / FREE_SHIP_HT)})"></span></div>`;
    q('[data-s-alma]').textContent = t.ht >= ALMA_MIN_HT && t.ttc <= ALMA_MAX ? `ou ${state.alma} × ${money(t.ttc / state.alma)} avec Alma` : '';
    const n = t.items.length;
    q('[data-ccount]').textContent = `${n} article${n > 1 ? 's' : ''}${t.m2 ? ` · ${nf(t.m2, 2)} m²` : ''} — votre sélection avant validation`;
  }

  function updateLine(root, sku) {
    const li = root.querySelector(`[data-line="${CSS.escape(sku)}"]`);
    const it = PB.cart.items().find((i) => i.sku === sku);
    if (!li || !it) return;
    const p = PB.bySku(sku), L = lineInfo(p, it.qty);
    tweenNumber(li.querySelector('[data-lt]'), R.lineTTC(p, it.qty));
    li.querySelector('[data-lht]').textContent = `${money(R.lineHT(p, it.qty))} HT`;
    li.querySelector('[data-leco]').textContent = `dont éco-participation ${money(R.ecoHT(p, it.qty) * PB.TVA)}`;
    li.querySelector('[data-ci]').value = nf(it.qty);
    li.querySelector('.cline__eq').innerHTML = `<b>${L.q}</b>${L.eq ? ` <span>· ${L.eq}</span>` : ''}`;
  }

  function removeLine(root, sku) {
    const li = root.querySelector(`[data-line="${CSS.escape(sku)}"]`);
    const it = PB.cart.items().find((i) => i.sku === sku);
    const p = PB.bySku(sku);
    const done = () => {
      busy = true; PB.cart.setQty(sku, 0); busy = false;
      li && li.remove(); refresh(root);
      PB.toast(`<img src="${PB.esc(imgOf(p))}" alt=""><span><b>${PB.esc(p.name)}</b><br>retiré du panier</span><a href="#" data-undo="${PB.esc(sku)}" data-undo-q="${it ? it.qty : 1}">Annuler</a>`, 5000);
    };
    if (!li || PB.reduce) return done();
    const h = li.offsetHeight;
    li.animate([{ opacity: 1, height: `${h}px`, transform: 'none' }, { opacity: 0, height: '0px', transform: 'translateX(-24px)', paddingTop: '0', paddingBottom: '0' }], { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)' }).onfinish = done;
    li.style.overflow = 'hidden';
  }

  let busy = false;
  function bindCart(root) {
    const lines = root.querySelector('[data-lines]');
    lines.addEventListener('click', (e) => {
      const li = e.target.closest('[data-line]'); if (!li) return;
      const sku = li.dataset.line, p = PB.bySku(sku), it = PB.cart.items().find((i) => i.sku === sku);
      const b = e.target.closest('[data-cq]');
      if (b && it) {
        const step = lineInfo(p, it.qty).step, nq = it.qty + +b.dataset.cq * step;
        if (nq <= 0) return removeLine(root, sku);
        busy = true; PB.cart.setQty(sku, nq); busy = false; updateLine(root, sku); refresh(root);
      }
      if (e.target.closest('[data-crm]')) removeLine(root, sku);
    });
    lines.addEventListener('change', (e) => {
      const inp = e.target.closest('[data-ci]'); if (!inp) return;
      const sku = inp.closest('[data-line]').dataset.line, p = PB.bySku(sku);
      const step = lineInfo(p, 1).step;
      let v = parseFloat(String(inp.value).replace(',', '.'));
      if (!isFinite(v) || v <= 0) return removeLine(root, sku);
      v = Math.max(step, Math.min(9999, Math.round(v / step) * step));
      busy = true; PB.cart.setQty(sku, v); busy = false; updateLine(root, sku); refresh(root);
    });
    bindPromo(root);
    root.querySelector('[data-checkout]').addEventListener('click', () => renderCheckout(root));
  }

  function bindPromo(scope) {
    const f = scope.querySelector('[data-promo]'); if (!f) return;
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = f.querySelector('[data-promo-in]').value.trim().toUpperCase(), msg = f.querySelector('[data-promo-msg]');
      msg.className = 'promo__msg';
      if (!v) { msg.textContent = 'Saisissez un code.'; msg.classList.add('is-err'); return; }
      state.promo = v;
      msg.textContent = `Code « ${v} » enregistré : il sera vérifié par nos équipes à la validation de la commande.`;
      msg.classList.add('is-ok');
    });
  }

  function renderEmpty(root) {
    setStep(1);
    const promos = PB.inCat('promotions').filter((p) => p.imgs.some((s) => !NO_IMG.test(s))).slice(0, 10);
    root.innerHTML = `<section class="cartp-empty">
        <div class="cartp-empty__art" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span></div>
        <h1 class="h1 split">Votre panier <em>attend son parquet.</em></h1>
        <p class="lead reveal">Plus de 700 références à découvrir en ligne et en showroom. Commencez par nos promotions du moment, ou laissez-vous guider par nos experts.</p>
        <div class="cartp-empty__cta reveal">
          <a class="btn btn--dark" href="${PB.catUrl('parquet')}"><span>Découvrir nos parquets</span>${PB.I.arrow}</a>
          <a class="btn btn--line" href="rendez-vous.html"><span>Prendre rendez-vous</span></a>
        </div>
      </section>
      ${promos.length ? `<section class="cartp-sugg" aria-labelledby="sugg-t">
        <div class="head-row"><div><p class="eyebrow">En ce moment</p><h2 class="h2" id="sugg-t">Nos <em>promotions</em></h2></div><a class="link-arrow" href="${PB.catUrl('promotions')}">Toutes les promotions <span>→</span></a></div>
      </section>
      <div class="rail cartp-rail" data-rail><div class="rail__track">${promos.map((p) => PB.productCard(p)).join('')}</div></div>
      <div class="container rail__ui"><div class="rail__progress"><span data-rp></span></div><div class="rail__arrows"><button class="round-btn" type="button" data-rprev aria-label="Précédent">${PB.I.arrowL}</button><button class="round-btn" type="button" data-rnext aria-label="Suivant">${PB.I.arrow}</button></div></div>` : ''}`;
    const r = root.querySelector('[data-rail]');
    if (r) PB.rail(r, { progress: root.querySelector('[data-rp]'), prev: root.querySelector('[data-rprev]'), next: root.querySelector('[data-rnext]') });
    PB.motionIn(root);
  }

  /* ------------------------------------------------------------------------
     Tunnel de commande : Informations → Livraison → Paiement
     ------------------------------------------------------------------------ */
  const fld = (id, label, { type = 'text', attrs = '', req = false, full = false, ph = '', hint = '' } = {}) => `<div class="field${full ? ' field--full' : ''}"><input id="${id}" name="${id}" type="${type}" placeholder="${ph ? PB.esc(ph) : ' '}" ${attrs}${req ? ' required' : ''}><label for="${id}">${label}${req ? ' <span class="req" aria-hidden="true">*</span>' : ' <small>(facultatif)</small>'}</label>${hint ? `<p class="field__hint">${hint}</p>` : ''}<p class="field__err" id="${id}-err" hidden></p></div>`;
  const countrySel = (id, label) => `<div class="field"><select id="${id}" name="${id}" required>${COUNTRIES.map(([c, n]) => `<option value="${c}"${c === 'FR' ? ' selected' : ''}>${n}</option>`).join('')}</select><label for="${id}">${label} <span class="req" aria-hidden="true">*</span></label></div>`;
  const dialSel = (id) => `<div class="field ck-dial"><select id="${id}" name="${id}" aria-label="Indicatif téléphonique">${COUNTRIES.slice().sort((a, b) => a[1].localeCompare(b[1])).map(([c, , d]) => `<option value="${d}"${c === 'FR' ? ' selected' : ''}>${c} (${d})</option>`).join('')}</select><label for="${id}">Indicatif</label></div>`;
  const addrBlock = (px) => `
    ${countrySel(`${px}pays`, 'Pays / région')}
    ${fld(`${px}adresse`, 'Adresse et numéro de voie', { req: true, attrs: 'autocomplete="address-line1"', full: true })}
    ${fld(`${px}adresse2`, 'Complément d’adresse', { attrs: 'autocomplete="address-line2"', full: true, hint: 'Bâtiment, étage, appartement, digicode… Indiquez toute information nécessaire au livreur.' })}
    <div class="fields-2 ck-cp">${fld(`${px}cp`, 'Code postal', { req: true, attrs: 'autocomplete="postal-code"' })}${fld(`${px}ville`, 'Ville', { req: true, attrs: 'autocomplete="address-level2"' })}</div>`;

  const stepHead = (n, title, sub) => `<header class="ck__head"><span class="ck__n" aria-hidden="true"><b>${n}</b>${svg(PB.I.check, 14)}</span><div class="ck__hd"><h2 class="ck__t" id="ck${n}-t" tabindex="-1">${title}</h2><p class="ck__sub">${sub}</p><p class="ck__done" data-done></p></div><button class="ck__edit" type="button" data-edit="${n}" hidden>Modifier</button></header>`;

  function renderCheckout(root) {
    const t = totals(); if (!t.items.length) return renderEmpty(root);
    const st = pantin();
    root.innerHTML = `<div class="cartp-title"><h1 class="h1">Finaliser <em>ma commande</em></h1><a class="link-arrow cartp-back" href="#" data-back><span aria-hidden="true">←</span> Retour au panier</a></div>
      <p class="ck-intro">Complétez les étapes ci-dessous pour confirmer votre commande. <span>${svg(PB.I.check, 15)} Paiement sécurisé</span></p>
      <div class="cartp-grid">
        <form class="ckf" data-ckf novalidate>
          <section class="ck" data-ck="1" aria-labelledby="ck1-t">
            ${stepHead(1, 'Informations personnelles', 'Vos coordonnées et adresse de livraison. Ces informations sont utilisées uniquement pour traiter votre commande.')}
            <div class="ck__body">
              <div class="fields-2">${fld('prenom', 'Prénom', { req: true, attrs: 'autocomplete="given-name"' })}${fld('nom', 'Nom', { req: true, attrs: 'autocomplete="family-name"' })}</div>
              ${fld('societe', 'Nom de l’entreprise', { attrs: 'autocomplete="organization"', full: true })}
              <div class="ck-tva" data-tva hidden>${fld('tva', 'N° de TVA intracommunautaire', { attrs: 'autocomplete="off"', full: true, hint: 'Pour les professionnels : il figurera sur votre facture.' })}</div>
              ${addrBlock('')}
              <div class="ck-tel">${dialSel('indicatif')}${fld('tel', 'Téléphone', { type: 'tel', req: true, attrs: 'autocomplete="tel-national" inputmode="tel"' })}</div>
              ${fld('email', 'Adresse e-mail', { type: 'email', req: true, attrs: 'autocomplete="email" inputmode="email"', full: true })}
              <label class="check ck-diff"><input type="checkbox" name="diff" data-diff><span>Expédier à une adresse différente ?</span></label>
              <div class="ck-ship" data-ship-addr hidden>
                <div class="fields-2">${fld('s_prenom', 'Prénom', { req: true, attrs: 'autocomplete="shipping given-name"' })}${fld('s_nom', 'Nom', { req: true, attrs: 'autocomplete="shipping family-name"' })}</div>
                ${addrBlock('s_')}
                ${fld('s_tel', 'Téléphone', { type: 'tel', attrs: 'autocomplete="shipping tel" inputmode="tel"', full: true })}
              </div>
              <div class="field"><textarea id="notes" name="notes" rows="3" placeholder="Commentaires concernant votre commande, ex. : consignes de livraison."></textarea><label for="notes">Notes de commande <small>(facultatif)</small></label></div>
              <div class="field"><textarea id="livreur" name="livreur" rows="2" placeholder="Accès, portail, interphone, contraintes de livraison…"></textarea><label for="livreur">Instructions pour le livreur <small>(facultatif)</small></label></div>
              <div class="ck__actions"><span></span><button class="btn btn--dark" type="button" data-go="2"><span>Continuer vers la livraison</span>${PB.I.arrow}</button></div>
            </div>
          </section>

          <section class="ck" data-ck="2" aria-labelledby="ck2-t">
            ${stepHead(2, 'Mode de livraison', 'Choisissez comment recevoir votre commande.')}
            <div class="ck__body" hidden>
              <fieldset class="ck-opts"><legend class="sr-only">Méthode d’expédition</legend>
                <label class="opt"><input type="radio" name="ship" value="cc"><span class="opt__box">${svg(PB.I.store, 20)}<span><b>Click &amp; Collect — ${PB.esc(st.name || 'Entrepôt Pantin')}</b><small>${PB.esc(st.address || '')}, ${PB.esc(st.zip || '')}${st.phone ? ` · ${PB.esc(st.phone)}` : ''}</small><small>Retrait aux heures d’ouverture, dès que nous vous confirmons que la commande est prête.</small></span><em class="opt__price">Gratuit</em></span></label>
                <label class="opt"><input type="radio" name="ship" value="home"><span class="opt__box">${svg(PB.I.truck, 20)}<span><b>Livraison à domicile</b><small data-home-note></small><small class="opt__ex" data-home-ex hidden></small></span><em class="opt__price" data-home-price></em></span></label>
              </fieldset>
              <p class="field__err" id="ship-err" hidden></p>
              ${deliveryHTML('cdeliv')}
              <p class="ck-note">Le transporteur livre au pied de l’immeuble ou devant la maison (livraison sur le trottoir), sous réserve d’accessibilité. Un supplément peut s’appliquer en zone de montagne ou sur les îles.</p>
              <div class="ck__actions"><button class="btn btn--line" type="button" data-go="1"><span aria-hidden="true">←</span><span>Retour</span></button><button class="btn btn--dark" type="button" data-go="3"><span>Continuer vers le paiement</span>${PB.I.arrow}</button></div>
            </div>
          </section>

          <section class="ck" data-ck="3" aria-labelledby="ck3-t">
            ${stepHead(3, 'Moyen de paiement', 'Sélectionnez votre mode de règlement.')}
            <div class="ck__body" hidden>
              <fieldset class="ck-opts ck-pay"><legend class="sr-only">Moyen de paiement</legend>
                <label class="opt"><input type="radio" name="pay" value="card" checked><span class="opt__box">${svg(PB.I.card, 20)}<span><b>Carte bancaire</b><small>CB, Visa, Mastercard — paiement 100 % sécurisé, données chiffrées SSL.</small></span></span></label>
                <label class="opt" data-alma-opt><input type="radio" name="pay" value="alma"><span class="opt__box">${svg(PB.I.card, 20)}<span><b>Payer en plusieurs fois avec Alma</b><small data-alma-elig></small></span></span></label>
                <div class="ck-pay__det alma" data-pay-det="alma" hidden>
                  <div class="alma__head"><span>Nombre d’échéances</span><span class="seg alma__seg" role="radiogroup" aria-label="Nombre d’échéances">${[2, 3, 4].map((n) => `<button type="button" role="radio" aria-checked="${n === state.alma}" data-alma-n="${n}">${n}×</button>`).join('')}</span></div>
                  <ol class="alma__plan" data-alma-plan></ol>
                  <p class="alma__note">Échéancier indicatif. Le montant définitif est confirmé par Alma avant validation, sous réserve d’acceptation.</p>
                </div>
                <label class="opt"><input type="radio" name="pay" value="bacs"><span class="opt__box">${svg(PB.I.store, 20)}<span><b>Virement bancaire</b><small>Votre commande est préparée dès réception du virement.</small></span></span></label>
                <div class="ck-pay__det" data-pay-det="bacs" hidden>
                  <p class="ck-bacs__t">Instructions pour le paiement par virement bancaire :</p>
                  <ol class="ck-bacs">
                    <li>Cliquez sur le bouton « Payer maintenant » pour débuter votre paiement.</li>
                    <li>Une fois le bouton cliqué, vous trouverez les informations bancaires ainsi que le numéro de commande nécessaires pour effectuer le virement, ainsi que le montant à régler.</li>
                    <li>Réalisez le virement en utilisant les informations bancaires fournies et en indiquant le numéro de commande et le nom en référence, afin de faciliter le suivi.</li>
                    <li>Votre commande sera préparée dès que le virement sera reçu et un e-mail vous sera envoyé.</li>
                  </ol>
                </div>
              </fieldset>
              <p class="ck-rgpd">Vos données personnelles seront utilisées pour le traitement de votre commande, vous accompagner au cours de votre visite du site web, et pour d’autres raisons décrites dans notre <a href="legal.html?p=confidentialite" target="_blank" rel="noopener">politique de confidentialité</a>.</p>
              <label class="check ck-cgv"><input type="checkbox" name="cgv" id="cgv"><span>J’ai lu et j’accepte les <a href="legal.html?p=cgv" target="_blank" rel="noopener">conditions générales de vente</a> <span class="req" aria-hidden="true">*</span></span></label>
              <p class="field__err" id="cgv-err" hidden></p>
              <div class="ck__actions"><button class="btn btn--line" type="button" data-go="2"><span aria-hidden="true">←</span><span>Retour</span></button><button class="btn btn--accent" type="submit"><span>Payer maintenant</span>${PB.I.arrow}</button></div>
              <p class="cform__demo">Maquette : aucun paiement n’est demandé et aucune donnée n’est transmise.</p>
            </div>
          </section>
        </form>
        <aside class="csum csum--mini" aria-labelledby="osum-t">
          <h2 class="csum__t" id="osum-t">Votre commande</h2>
          <ul class="mlines">${t.items.map((i) => { const p = PB.bySku(i.sku); return `<li><img src="${PB.esc(imgOf(p))}" alt=""><span><b>${PB.esc(p.name)}</b><small>${lineInfo(p, i.qty).q}</small></span><em>${money(R.lineHT(p, i.qty))} <small>HT</small></em></li>`; }).join('')}</ul>
          <dl class="csum__rows" data-osum></dl>
          <p class="csum__alma" data-o-alma></p>
          <details class="ck-coupon"${state.promo ? ' open' : ''}><summary>Vous avez un code promo ?</summary>
            <form class="promo" data-promo novalidate>
              <div class="field promo__field"><input id="promo2" type="text" placeholder=" " autocomplete="off" data-promo-in value="${PB.esc(state.promo)}"><label for="promo2">Code promo</label></div>
              <button class="btn btn--line btn--sm" type="submit"><span>Appliquer</span></button>
              <p class="promo__msg" data-promo-msg role="status"></p>
            </form>
          </details>
          <div class="csum__secure"><p>${svg(PB.I.check, 16)} Paiement 100 % sécurisé — données chiffrées SSL</p>${payLogos()}</div>
        </aside>
      </div>`;
    bindPromo(root.querySelector('.csum--mini'));
    bindCheckout(root);
    state.max = 1;
    goStep(root, 1, { focus: false });
    scrollTop();
    if (PB.motion) gsap.from(root.querySelectorAll('.ck, .csum'), { autoAlpha: 0, y: 20, duration: 0.9, ease: 'expo.out', stagger: 0.06, clearProps: 'opacity,visibility,transform' });
    setTimeout(() => { const f = root.querySelector('#prenom'); f && f.focus({ preventScroll: true }); }, 350);
  }

  /** Livraison à domicile : tarif selon poids & zone (grille réelle non publiée sur le site). */
  function homeShip(form, t) {
    const diff = form.diff.checked;
    const pays = (diff ? form.s_pays : form.pays).value;
    const cp = (diff ? form.s_cp : form.cp).value.trim();
    const metro = pays === 'FR' && /^\d{5}$/.test(cp) && !/^(20|97|98)/.test(cp);
    if (metro && t.ht >= FREE_SHIP_HT) return { free: true, label: 'Offerte', note: `Livraison offerte dès ${money(FREE_SHIP_HT)} HT en France métropolitaine.`, example: '' };
    const ex = pays === 'FR' && IDF.test(cp) && t.kg < IDF_EXAMPLE.maxKg;
    return {
      free: false, label: 'Selon poids et zone',
      note: `Tarif calculé selon le poids et la zone de livraison${t.kg ? ` (poids estimé ≈ ${nf(Math.round(t.kg))} kg)` : ''}, confirmé par nos équipes avant expédition.${pays === 'FR' ? ` Offerte dès ${money(FREE_SHIP_HT)} HT en France métropolitaine.` : ''}`,
      example: ex ? `Exemple : ${IDF_EXAMPLE.label} : ${money(IDF_EXAMPLE.price)}` : '',
    };
  }

  const almaOk = (t) => t.ht >= ALMA_MIN_HT && t.ttc <= ALMA_MAX;

  function paintSummary(root) {
    const form = root.querySelector('[data-ckf]'); if (!form) return;
    const t = totals();
    const h = homeShip(form, t);
    const shipTxt = state.ship === 'cc' ? 'Gratuit (Click & Collect)' : state.ship === 'home' ? (h.free ? 'Offerte' : 'Selon poids et zone') : 'À sélectionner';
    root.querySelector('[data-osum]').innerHTML = `
      <div><dt>Sous-total HT</dt><dd>${money(t.ht)}</dd></div>
      <div><dt>Livraison</dt><dd>${PB.esc(shipTxt)}</dd></div>
      <div><dt>TVA (20 %)</dt><dd>${money(t.tva)}</dd></div>
      ${t.eco ? `<div><dt>Dont éco-participation</dt><dd>${money(t.ecoTTC)}</dd></div>` : ''}
      <div class="csum__total"><dt>Total TTC${state.ship === 'home' && !h.free ? ' <small>hors livraison</small>' : ''}</dt><dd>${money(t.ttc)}</dd></div>`;
    root.querySelector('[data-o-alma]').textContent = state.pay === 'alma' && almaOk(t) ? `${state.alma} échéances de ${money(t.ttc / state.alma)} avec Alma` : '';
    root.querySelector('[data-home-price]').textContent = h.free ? 'Offerte' : 'Sur devis transport';
    root.querySelector('[data-home-note]').textContent = h.note;
    const exEl = root.querySelector('[data-home-ex]'); exEl.hidden = !h.example; exEl.textContent = h.example;
  }

  function renderAlma(root) {
    const t = totals(), ok = almaOk(t);
    const opt = root.querySelector('[data-alma-opt]');
    opt.classList.toggle('is-off', !ok); opt.querySelector('input').disabled = !ok;
    root.querySelector('[data-alma-elig]').textContent = ok ? 'Payez en 2×, 3× ou 4× avec votre carte bancaire.'
      : t.ht < ALMA_MIN_HT ? `Disponible dès ${money(ALMA_MIN_HT)} HT d’achat (encore ${money(ALMA_MIN_HT - t.ht)} HT).` : `Montant éligible jusqu’à ${money(ALMA_MAX)} selon les conditions Alma.`;
    if (!ok && state.pay === 'alma') { state.pay = 'card'; root.querySelector('input[name="pay"][value="card"]').checked = true; root.querySelectorAll('[data-pay-det]').forEach((d) => { d.hidden = true; }); }
    root.querySelectorAll('[data-alma-n]').forEach((b) => b.setAttribute('aria-checked', String(+b.dataset.almaN === state.alma)));
    const n = state.alma, cents = Math.round(t.ttc * 100), base = Math.floor(cents / n), first = cents - base * (n - 1);
    const plan = root.querySelector('[data-alma-plan]');
    plan.innerHTML = Array.from({ length: n }, (_, k) => `<li><span>${k ? longDate(addMonths(k)) : `Aujourd’hui, ${longDate(new Date())}`}</span><b>${money((k ? base : first) / 100)}</b></li>`).join('');
    if (!PB.reduce) plan.querySelectorAll('li').forEach((li, k) => li.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: k * 40, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }));
  }

  const RULES = {
    prenom: (v) => v.trim().length >= 2 || 'Indiquez le prénom.',
    nom: (v) => v.trim().length >= 2 || 'Indiquez le nom.',
    adresse: (v) => v.trim().length >= 5 || 'Indiquez l’adresse (numéro et nom de rue).',
    ville: (v) => v.trim().length >= 2 || 'Indiquez la ville.',
    tel: (v) => v.replace(/[^\d]/g, '').length >= 8 || 'Numéro de téléphone invalide.',
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) || 'Adresse e-mail invalide — exemple : prenom@domaine.fr',
  };
  const cpRule = (pays) => (v) => (pays === 'FR' ? /^\d{5}$/.test(v.trim()) || 'Code postal à 5 chiffres.' : /^[A-Za-z0-9 -]{3,10}$/.test(v.trim()) || 'Code postal invalide.');

  const nudge = (el) => { if (!PB.reduce && el && el.animate) el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }], { duration: 380, easing: 'cubic-bezier(.22,1,.36,1)' }); };

  function bindCheckout(root) {
    const form = root.querySelector('[data-ckf]');
    const ruleFor = (inp) => {
      if (inp.name === 's_tel') return null; // facultatif
      const n = inp.name.replace(/^s_/, '');
      if (n === 'cp') return cpRule((inp.name.startsWith('s_') ? form.s_pays : form.pays).value);
      return RULES[n] || null;
    };
    const check = (inp) => {
      const rule = ruleFor(inp); if (!rule || inp.closest('[hidden]')) return true;
      const r = rule(inp.value), err = root.querySelector(`#${inp.id}-err`), wrap = inp.closest('.field');
      const ok = r === true;
      wrap.classList.toggle('is-error', !ok); err.hidden = ok; err.textContent = ok ? '' : r;
      inp.setAttribute('aria-invalid', String(!ok)); if (!ok) inp.setAttribute('aria-describedby', err.id); else inp.removeAttribute('aria-describedby');
      return ok;
    };
    const validate = (scope) => [...scope.querySelectorAll('input[name]')].filter((i) => !['checkbox', 'radio'].includes(i.type)).filter((i) => !check(i));
    form.addEventListener('focusout', (e) => { if (e.target.matches('input') && e.target.value) check(e.target); });
    form.addEventListener('input', (e) => {
      if (e.target.closest('.is-error')) check(e.target);
      if (e.target.name === 'societe') toggle(root.querySelector('[data-tva]'), !!e.target.value.trim());
      if (/^(s_)?cp$/.test(e.target.name)) paintSummary(root);
    });
    form.addEventListener('change', (e) => {
      const el = e.target;
      if (el.matches('[data-diff]')) { toggle(root.querySelector('[data-ship-addr]'), el.checked); paintSummary(root); }
      if (/^(s_)?pays$/.test(el.name)) {
        if (el.name === 'pays') { const c = COUNTRIES.find((x) => x[0] === el.value); if (c) form.indicatif.value = c[2]; }
        const cpIn = el.name === 'pays' ? form.cp : form.s_cp; if (cpIn.value) check(cpIn);
        paintSummary(root);
      }
      if (el.name === 'ship') { state.ship = el.value; root.querySelector('#ship-err').hidden = true; paintSummary(root); }
      if (el.name === 'pay') { state.pay = el.value; root.querySelectorAll('[data-pay-det]').forEach((d) => toggle(d, d.dataset.payDet === el.value)); paintSummary(root); }
      if (el.name === 'cgv' && el.checked) root.querySelector('#cgv-err').hidden = true;
    });
    root.querySelector('[data-back]').addEventListener('click', (e) => { e.preventDefault(); renderCart(root); scrollTop(); });
    root.querySelector('[data-alma-plan]').closest('.alma').addEventListener('click', (e) => {
      const b = e.target.closest('[data-alma-n]'); if (!b) return;
      state.alma = +b.dataset.almaN; renderAlma(root); paintSummary(root);
    });
    root.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => goStep(root, +b.dataset.edit)));

    const stepOk = (n, btn) => {
      if (n === 1) {
        const bad = validate(root.querySelector('[data-ck="1"]'));
        if (bad.length) { nudge(btn); bad[0].focus(); return false; }
      }
      if (n === 2 && !state.ship) {
        const er = root.querySelector('#ship-err'); er.hidden = false; er.textContent = 'Sélectionnez une méthode de livraison pour continuer.';
        nudge(btn); root.querySelector('input[name="ship"]').focus(); return false;
      }
      return true;
    };
    form.addEventListener('click', (e) => {
      const b = e.target.closest('[data-go]'); if (!b) return;
      const to = +b.dataset.go;
      if (to > state.step && !stepOk(state.step, b)) return;
      goStep(root, to);
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (state.step < 3) { const nx = root.querySelector(`[data-ck="${state.step}"] [data-go="${state.step + 1}"]`); if (nx) nx.click(); return; }
      if (validate(root.querySelector('[data-ck="1"]')).length) { goStep(root, 1); return; }
      if (!state.ship) { goStep(root, 2); return; }
      const cgv = form.cgv, cErr = root.querySelector('#cgv-err');
      cErr.hidden = cgv.checked; cErr.textContent = cgv.checked ? '' : 'Merci de lire et d’accepter les conditions générales de vente.';
      if (!cgv.checked) { cgv.focus(); nudge(form.querySelector('[type="submit"]')); return; }
      renderConfirm(root, { prenom: form.prenom.value.trim(), email: form.email.value.trim(), pay: state.pay });
    });
    renderAlma(root);
    paintSummary(root);
  }

  function toggle(el, on) {
    if (!el || el.hidden === !on) return;
    el.hidden = !on;
    if (on && !PB.reduce) el.animate([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)' });
  }

  /** Résumé d'une étape terminée (affiché quand elle est repliée). */
  function doneText(root, n) {
    const f = root.querySelector('[data-ckf]');
    if (n === 1) { const c = COUNTRIES.find((x) => x[0] === f.pays.value); return `${f.prenom.value} ${f.nom.value} · ${f.adresse.value}, ${f.cp.value} ${f.ville.value}${c && c[0] !== 'FR' ? `, ${c[1]}` : ''} · ${f.email.value}`; }
    if (n === 2) return state.ship === 'cc' ? `Click & Collect — ${pantin().name || 'Entrepôt Pantin'} (gratuit)` : state.ship === 'home' ? `Livraison à domicile — ${homeShip(f, totals()).free ? 'offerte' : 'tarif selon poids et zone'}` : '';
    return '';
  }

  function goStep(root, n, { focus = true } = {}) {
    state.step = n; state.max = Math.max(state.max, n);
    setStep(n + 1);
    root.querySelectorAll('[data-ck]').forEach((sec) => {
      const k = +sec.dataset.ck, body = sec.querySelector('.ck__body');
      const open = k === n, reached = k < state.max || k <= n;
      sec.classList.toggle('is-current', open);
      sec.classList.toggle('is-done', !open && k < state.max);
      sec.classList.toggle('is-locked', !reached);
      const was = !body.hidden;
      body.hidden = !open;
      if (open && !was && !PB.reduce) body.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.22,1,.36,1)' });
      sec.querySelector('[data-done]').textContent = !open && k < state.max ? doneText(root, k) : '';
      sec.querySelector('[data-edit]').hidden = open || k >= state.max;
    });
    if (n === 3) renderAlma(root);
    paintSummary(root);
    if (focus) {
      const sec = root.querySelector(`[data-ck="${n}"]`);
      const y = scrollY + sec.getBoundingClientRect().top - 110;
      if (PB.lenis) PB.lenis.scrollTo(y, { duration: 0.8 }); else scrollTo({ top: y, behavior: PB.reduce ? 'auto' : 'smooth' });
      setTimeout(() => sec.querySelector('.ck__t').focus({ preventScroll: true }), PB.reduce ? 0 : 400);
    }
  }

  /* ------------------------------------------------------------------------
     Confirmation (démo)
     ------------------------------------------------------------------------ */
  function renderConfirm(root, who) {
    const t = totals();
    const cc = state.ship === 'cc', st = pantin();
    const num = `PB-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${String(Math.floor(1000 + Math.random() * 9000))}`;
    const payTxt = who.pay === 'alma' ? `Alma ${state.alma}×` : who.pay === 'bacs' ? 'Virement' : 'Carte bancaire';
    setStep(5);
    root.innerHTML = `<section class="cdone">
        <div class="cdone__mark" aria-hidden="true"><svg viewBox="0 0 64 64" width="72" height="72"><circle cx="32" cy="32" r="30" /><path d="M20 33l8 8 16-17" /></svg></div>
        <p class="eyebrow">Commande n° ${num}</p>
        <h1 class="h1">Merci ${PB.esc(who.prenom)}, <em>c’est noté.</em></h1>
        <p class="lead">Un récapitulatif serait envoyé à <b>${PB.esc(who.email)}</b>. ${cc ? `Nous vous préviendrons dès que votre commande sera prête au retrait, ${PB.esc(st.address || '')} à ${PB.esc(st.city || 'Pantin')}.` : 'Le transporteur vous contactera pour convenir avec vous du jour de livraison.'}</p>
        ${who.pay === 'bacs' ? '<p class="cdone__bacs">Paiement par virement : les coordonnées bancaires et le montant à régler vous seraient communiqués avec votre numéro de commande. Indiquez ce numéro et votre nom en référence ; votre commande est préparée dès réception du virement.</p>' : ''}
        <dl class="cdone__sum">
          <div><dt>Articles</dt><dd>${t.items.length}</dd></div>
          ${t.m2 ? `<div><dt>Surface</dt><dd>${nf(t.m2, 2)} m²</dd></div>` : ''}
          <div><dt>Réception</dt><dd>${cc ? 'Click &amp; Collect' : 'Livraison'}</dd></div>
          <div><dt>Paiement</dt><dd>${payTxt}</dd></div>
          <div><dt>Total TTC</dt><dd>${money(t.ttc)}</dd></div>
        </dl>
        <p class="cdone__demo">Ceci est une démonstration : aucune commande n’a été transmise et aucun paiement n’a été effectué.</p>
        <div class="cdone__cta"><a class="btn btn--dark" href="index.html"><span>Retour à l’accueil</span>${PB.I.arrow}</a><a class="btn btn--line" href="realisations.html"><span>S’inspirer des réalisations</span></a></div>
      </section>`;
    busy = true; PB.cart.clear(); busy = false;
    state.max = 1; state.ship = '';
    scrollTop();
    if (PB.motion) {
      gsap.from('.cdone > *:not(.cdone__mark)', { opacity: 0, y: 20, duration: 1, ease: 'expo.out', stagger: 0.06, delay: 0.25 });
      gsap.fromTo('.cdone__mark circle', { strokeDashoffset: 190 }, { strokeDashoffset: 0, duration: 0.9, ease: 'expo.out' });
      gsap.fromTo('.cdone__mark path', { strokeDashoffset: 40 }, { strokeDashoffset: 0, duration: 0.6, ease: 'expo.out', delay: 0.45 });
    }
  }

  /* ------------------------------------------------------------------------ */
  function setStep(n) {
    document.querySelectorAll('[data-steps] li').forEach((li, k) => {
      li.classList.toggle('is-current', k === n - 1); li.classList.toggle('is-done', k < n - 1);
      if (k === n - 1) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current');
    });
  }
  const scrollTop = () => (PB.lenis ? PB.lenis.scrollTo(0, { immediate: true }) : scrollTo(0, 0));

  PB.ready(async () => {
    await PB.load('products', 'categories');
    const root = document.querySelector('[data-cartp-root]');
    const main = document.querySelector('[data-cartp]');
    renderCart(root);
    main.removeAttribute('aria-busy');
    // Synchronisation : modifications depuis le tiroir, les recommandations ou un autre onglet
    document.addEventListener('pb:cart', () => {
      if (busy || document.querySelector('.cdone, .ckf')) return;
      const y = scrollY;
      renderCart(root); PB.motionIn(root);
      if (PB.lenis) PB.lenis.scrollTo(y, { immediate: true }); else scrollTo(0, y);
    });
    // « Annuler » dans le toast après suppression
    document.addEventListener('click', (e) => {
      const u = e.target.closest('[data-undo]'); if (!u) return;
      e.preventDefault(); e.stopPropagation();
      const sku = u.dataset.undo, q = +u.dataset.undoQ || 1;
      u.removeAttribute('data-undo');
      busy = true; PB.cart.add(sku, q, { silent: true }); busy = false;
      if (!document.querySelector('.ckf, .cdone')) renderCart(root);
      document.querySelector('[data-toast]').classList.remove('is-on');
    }, true);
  });
})();
