/* ==========================================================================
   Premibel — fiche produit (produit.html?ref=<SKU>)
   - Galerie : loupe au survol (pointeur lissé), plein écran avec swipe à
     inertie, rubber-band aux bords et fermeture par geste vers le bas.
   - Bloc achat collant : prix, compte à rebours, calculateur de surface
     (m² → colis), quantité (ml / pièce), ajout panier.
   - Onglets, accessoires complémentaires, produits similaires, vus récemment,
     barre d'achat mobile.
   ========================================================================== */
(() => {
  'use strict';

  const RECENT_KEY = 'pb-recent-v1';
  const NO_IMG = /gescomo-no-image/;
  const MOTIFS = ['point-de-hongrie', 'point-de-hongrie-massif', 'parquet-flottant-point-de-hongrie', 'baton-rompu', 'parquet-flottant-baton-rompu', 'parquet-massif-baton-rompu', 'versailles', 'parquet-flottant-versailles'];
  const GENERIC = new Set(['accueil', 'racine', 'parquet', 'par-finition', 'par-motif', 'par-couleur', 'par-essence', 'promotions', 'parquet-salon', 'parquet-chambre', 'parquet-entree-couloir', 'parquet-bureau-usage-commercial', 'non-classe', 'accessoires']);

  const nf2 = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const nf = (n, d = 2) => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: d }).format(n);
  const unitTxt = (p) => (p.unit === 'Kg' ? 'kg' : PB.unitLabel(p));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const svg = (icon, size = 18) => icon.replace('<svg', `<svg width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"`);

  /* ------------------------------------------------------------------------
     Ressort (intégration semi-implicite) — interruptible, conserve la vitesse
     ------------------------------------------------------------------------ */
  function spring({ from, to, velocity = 0, response = 0.42, damping = 1, onUpdate, onDone }) {
    let x = from, v = velocity, raf = 0, last = performance.now(), stopped = false;
    const k = Math.pow(2 * Math.PI / response, 2), c = 4 * Math.PI * damping / response;
    const tick = (now) => {
      if (stopped) return;
      const dt = Math.min(0.032, (now - last) / 1000); last = now;
      v += (-k * (x - to) - c * v) * dt; x += v * dt;
      onUpdate(x, v);
      if (Math.abs(x - to) < 0.2 && Math.abs(v) < 2) { onUpdate(to, 0); onDone && onDone(); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return { stop() { stopped = true; cancelAnimationFrame(raf); return { x, v }; } };
  }
  const rubber = (o, dim, c = 0.55) => (o * dim * c) / (dim + c * Math.abs(o));
  const project = (v, d = 0.998) => (v / 1000) * d / (1 - d);

  /* Chiffres animés (interruptibles : repartent de la valeur affichée) */
  function tweenNumber(el, to, fmt) {
    const from = el._v ?? to;
    el._v = to;
    cancelAnimationFrame(el._raf);
    if (PB.reduce || from === to) { el.textContent = fmt(to); return; }
    const t0 = performance.now(), dur = 520;
    const step = (now) => {
      const t = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - t, 4);
      el.textContent = fmt(from + (to - from) * e);
      if (t < 1) el._raf = requestAnimationFrame(step);
    };
    el._raf = requestAnimationFrame(step);
  }

  /* ------------------------------------------------------------------------
     Données produit
     ------------------------------------------------------------------------ */
  const isParquet = (p) => p.unit === 'm²' && !p.cats.includes('accessoires') && p.cats.some((c) => /parquet|stratifie|lames|hongrie|baton|versailles|massif|contrecolle|vinyle|sol/.test(c));
  const isMotif = (p) => p.cats.some((c) => MOTIFS.includes(c)) || /hongrie|b[âa]ton rompu|versailles/i.test(p.name);
  const realImgs = (p) => p.imgs.filter((s) => s && !NO_IMG.test(s));

  /** Catégorie la plus spécifique + chaîne de parents (pour le fil d'Ariane). */
  function crumbChain(p) {
    const C = PB.categories();
    const depth = (s) => { let d = 0, c = C[s]; while (c && c.parent && C[c.parent] && d < 8) { d++; c = C[c.parent]; } return d; };
    const cands = p.cats.filter((s) => C[s] && !GENERIC.has(s) && C[s].count);
    if (!cands.length) return p.cats.includes('accessoires') && C.accessoires ? [C.accessoires] : [];
    cands.sort((a, b) => depth(b) - depth(a) || (C[a].count || 0) - (C[b].count || 0));
    const chain = []; let c = C[cands[0]];
    while (c && !['accueil', 'racine'].includes(c.slug) && chain.length < 5) { chain.unshift(c); c = C[c.parent]; }
    return chain;
  }

  /** Date de fin de promo exploitable ? (ISO ou timestamp ; sinon ignorée) */
  function promoDate(p) {
    if (!p.promoEnd || !PB.discount(p)) return null;
    const v = String(p.promoEnd).trim();
    let d = null;
    if (/^\d{4}-\d{2}-\d{2}/.test(v)) d = new Date(v.length === 10 ? `${v}T23:59:59` : v);
    else if (/^\d{10,13}$/.test(v)) d = new Date(v.length === 10 ? +v * 1000 : +v);
    return d && !isNaN(d) && d > new Date() ? d : null;
  }

  /** Mode d'achat : surface (m² + colis), longueur (ml), poids (kg par pot) ou pièce. */
  function buyMode(p) {
    if (p.unit === 'm²') return p.pack ? { kind: 'surface', step: 1, min: 1 } : { kind: 'qty', step: 1, min: 1, label: 'm²' };
    if (p.unit === 'ml') return { kind: 'qty', step: 1, min: 1, label: 'ml', bar: p.pack > 0 ? p.pack : null };
    if (p.unit === 'Kg' && p.pack > 1) return { kind: 'qty', step: p.pack, min: p.pack, label: 'kg', pot: p.pack };
    return { kind: 'qty', step: 1, min: 1, label: p.unit === 'Pièce' || p.unit === 'unité' ? 'pièce' : p.unit };
  }

  /** Disponibilité (p.stock) : En stock / Stock limité / Lot de fin de série / Rupture. */
  function stockInfo(p) {
    const s = p.stock || {}, lbl = s.label || '';
    if (s.in === false || /rupture/i.test(lbl)) return { k: 'out', t: 'Rupture de stock', sub: '', out: true, max: 0 };
    if (/fin de s[ée]rie/i.test(lbl) || p.cats.includes('lots-de-fin-de-serie')) {
      const u = PB.unitLabel(p);
      const sub = s.qty ? (p.unit === 'm²' && p.pack ? `${nf(s.qty * p.pack, 2)} m² disponibles` : `${nf(s.qty)} ${u}${s.qty > 1 && u !== 'm²' && u !== 'ml' && u !== 'kg' ? 's' : ''} disponible${s.qty > 1 ? 's' : ''}`) : '';
      return { k: 'lot', t: 'Lot de fin de série', sub, max: s.qty || 0 };
    }
    if (/limit/i.test(lbl)) return { k: 'low', t: 'Stock limité', sub: '', max: 0 };
    return { k: 'in', t: lbl || 'En stock', sub: '', max: 0 };
  }

  /** Délais (PB_SITE.delivery) : mêmes délais que la commande. */
  function deliveryInfo() {
    const d = window.PB_SITE.delivery || {};
    const note = String(d.note || '').replace(/\s*Livraison sur rendez-vous\.?\s*$/i, '').trim();
    return { note, zones: d.zones || [], text: d.text || '' };
  }

  const certif = (p) => {
    const out = [];
    const f = p.spec['FSC®'], e = p.spec.PEFC;
    if (f && /^certifi/i.test(f)) out.push(f.replace(/^Certifié\s*/i, '').trim() || 'FSC');
    if (e && /^certifi/i.test(e)) out.push(e.replace(/^Certifié\s*/i, '').trim() || 'PEFC');
    return out;
  };

  /* ------------------------------------------------------------------------
     Vus récemment
     ------------------------------------------------------------------------ */
  const recent = {
    get() { try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; } catch { return []; } },
    push(sku) {
      const list = [sku, ...recent.get().filter((s) => s !== sku)].slice(0, 8);
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch { /* navigation privée */ }
    },
  };

  /* ------------------------------------------------------------------------
     Gabarits HTML
     ------------------------------------------------------------------------ */
  function crumbsHTML(p, chain) {
    const parts = ['<a href="index.html">Accueil</a>'];
    chain.forEach((c) => parts.push(`<a href="${PB.catUrl(c.slug)}">${PB.esc(c.name)}</a>`));
    parts.push(`<span aria-current="page">${PB.esc(p.name)}</span>`);
    return `<nav class="crumbs pdp-crumbs" aria-label="Fil d’Ariane">${parts.join('<span aria-hidden="true">/</span>')}</nav>`;
  }

  const vids = (p) => (Array.isArray(p.videos) ? p.videos.filter((v) => /^[\w-]{6,20}$/.test(v)) : []);
  const playIc = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>';
  const vidBtn = (p, cls = 'pg__vid') => vids(p).map((id, k) => `<button class="${cls}" type="button" data-video="${PB.esc(id)}" aria-label="Lire la vidéo${vids(p).length > 1 ? ` ${k + 1}` : ''} du produit">${playIc}<span>Vidéo${vids(p).length > 1 ? ` ${k + 1}` : ''}</span></button>`).join('');

  function galleryHTML(p) {
    const imgs = realImgs(p);
    const V = vids(p);
    if (!imgs.length) {
      return `<div class="pg pg--empty">
        <div class="pg__noimg">
          <span class="pg__noimg-k">Réf. ${PB.esc(p.sku)}</span>
          <p class="pg__noimg-t">${PB.esc(p.name)}</p>
          <span class="pg__noimg-s">Visuel en cours de mise en ligne. Demandez-nous une photo ou un échantillon, ou venez le voir en showroom.</span>
          ${V.length ? `<span class="pg__vids">${vidBtn(p)}</span>` : ''}
        </div>
      </div>`;
    }
    const contain = p.unit !== 'm²';
    const multi = imgs.length > 1;
    const vThumbs = V.map((id, k) => `<button class="pg__thumb pg__thumb--vid" type="button" data-video="${PB.esc(id)}" aria-label="Lire la vidéo${V.length > 1 ? ` ${k + 1}` : ''} du produit"><img src="https://i.ytimg.com/vi/${PB.esc(id)}/mqdefault.jpg" alt="" loading="lazy" decoding="async"><span>${playIc}Vidéo</span></button>`).join('');
    return `<div class="pg${multi ? ' pg--multi' : ' pg--single'}${contain ? ' pg--contain' : ''}" data-gallery>
      ${multi ? `<div class="pg__thumbs" role="tablist" aria-label="Photos du produit">${imgs.map((src, i) => `<button class="pg__thumb${i ? '' : ' is-active'}" role="tab" aria-selected="${!i}" aria-label="Photo ${i + 1} sur ${imgs.length}" data-thumb="${i}"><img src="${PB.esc(src)}" alt="" loading="${i < 4 ? 'eager' : 'lazy'}" decoding="async"></button>`).join('')}${vThumbs}</div>` : ''}
      ${!multi && V.length ? `<div class="pg__vids">${vidBtn(p)}</div>` : ''}
      <div class="pg__stage" data-stage>
        <div class="pg__strip" data-strip>${imgs.map((src, i) => `<figure class="pg__slide" data-slide="${i}"><img src="${PB.esc(src)}" alt="${PB.esc(p.name)}${multi ? ` — vue ${i + 1}` : ''}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'} decoding="async" draggable="false"></figure>`).join('')}</div>
        <button class="pg__expand" type="button" data-expand aria-label="Afficher la photo en plein écran"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button>
        ${multi ? `<span class="pg__count" aria-hidden="true"><b data-count-cur>1</b> / ${imgs.length}</span>` : ''}
        ${PB.hover ? '<span class="pg__hint" aria-hidden="true">Survolez pour zoomer · cliquez pour agrandir</span>' : ''}
      </div>
    </div>`;
  }

  function priceHTML(p) {
    const d = PB.discount(p);
    const unit = unitTxt(p);
    const until = promoDate(p);
    const q = p.spec['Qualité'] || '';
    const cond = /promo/i.test(q) ? q.split(/\s+-\s+/).slice(1).join(' - ').trim() : '';
    return `<div class="pb-price">
      <div class="pb-price__main">
        <b class="pb-price__ttc">${PB.money(PB.ttc(p.price))}</b>
        <span class="pb-price__unit">TTC / ${unit}</span>
        ${p.regular ? `<s class="pb-price__was" aria-label="Prix initial">${PB.money(PB.ttc(p.regular))}</s>` : ''}
      </div>
      <div class="pb-price__ht">${PB.money(p.price)} HT / ${unit}${d ? ` · <span class="pb-price__save">vous économisez ${PB.money(PB.ttc(p.regular) - PB.ttc(p.price))} / ${unit}</span>` : ''}</div>
      ${cond ? `<p class="pb-price__cond">${PB.esc(cond.charAt(0).toUpperCase() + cond.slice(1))}.</p>` : ''}
      ${until ? `<div class="pb-countdown" data-countdown="${until.toISOString()}" role="timer" aria-live="off"><span>Offre se termine dans</span><b data-cd-d>00</b><i>j</i><b data-cd-h>00</b><i>h</i><b data-cd-m>00</b><i>min</i><b data-cd-s>00</b><i>s</i></div>` : ''}
    </div>`;
  }

  function buyerHTML(p, mode) {
    if (mode.kind === 'surface') {
      const motif = isMotif(p);
      const waste = motif ? 15 : 10;
      return `<div class="calc" data-calc data-waste-pct="${waste}">
        <div class="calc__head"><span class="calc__title">Calculer ma surface</span><span class="calc__pack">1 colis = ${nf(p.pack, 3)} m²</span></div>
        <div class="calc__row">
          <div class="field calc__field">
            <input id="calc-surface" type="text" inputmode="decimal" autocomplete="off" placeholder=" " data-surface aria-describedby="calc-help">
            <label for="calc-surface">Surface de la pièce</label>
            <span class="calc__suffix" aria-hidden="true">m²</span>
          </div>
          <div class="calc__qty">
            <span class="calc__qty-l" id="colis-l">Colis</span>
            <span class="qty qty--lg" role="group" aria-labelledby="colis-l">
              <button type="button" data-step="-1" aria-label="Retirer un colis">−</button>
              <input value="1" inputmode="numeric" data-colis aria-label="Nombre de colis">
              <button type="button" data-step="1" aria-label="Ajouter un colis">+</button>
            </span>
          </div>
        </div>
        <label class="check calc__waste"><input type="checkbox" data-waste ${motif ? 'checked' : ''}><span>Ajouter ${waste} % de chutes${motif ? ' <small>(recommandé pour une pose en motif)</small>' : ' <small>(coupes et ajustements)</small>'}</span></label>
        <p class="calc__help muted" id="calc-help">Saisissez la surface au sol : nous arrondissons au colis supérieur.</p>
        <dl class="calc__out" aria-live="polite">
          <div><dt>À couvrir</dt><dd><b data-o-need>—</b></dd></div>
          <div><dt>Livrés</dt><dd><b data-o-m2>${nf(p.pack, 3)}</b> m²</dd></div>
          <div class="calc__total"><dt>Total TTC</dt><dd><b data-o-total>${PB.money(PBReco.lineTTC(p, 1))}</b></dd></div>
        </dl>
        <p class="calc__sub" data-o-sub></p>
        <p class="calc__cap" data-o-cap hidden></p>
      </div>`;
    }
    const hint = mode.bar ? `Vendu au mètre linéaire · barres de ${nf(mode.bar)} m` : mode.pot ? `Vendu au kilo · pot de ${nf(mode.pot)} kg` : '';
    return `<div class="calc calc--qty" data-qtybox>
      <div class="calc__row">
        <div class="calc__qty">
          <span class="calc__qty-l" id="qty-l">Quantité <small>(${PB.esc(mode.label)})</small></span>
          <span class="qty qty--lg" role="group" aria-labelledby="qty-l">
            <button type="button" data-step="-1" aria-label="Diminuer">−</button>
            <input value="${mode.min}" inputmode="numeric" data-q aria-label="Quantité en ${PB.esc(mode.label)}">
            <button type="button" data-step="1" aria-label="Augmenter">+</button>
          </span>
        </div>
        <dl class="calc__out calc__out--inline" aria-live="polite"><div class="calc__total"><dt>Total TTC</dt><dd><b data-o-total>${PB.money(PBReco.lineTTC(p, mode.min))}</b></dd></div></dl>
      </div>
      ${hint ? `<p class="calc__help muted">${hint}${mode.bar ? ` · <span data-o-bars></span>` : ''}</p>` : ''}
      <p class="calc__sub" data-o-sub></p>
      <p class="calc__cap" data-o-cap hidden></p>
    </div>`;
  }

  function waLink(p) {
    try {
      const u = new URL(window.PB_SITE.whatsapp);
      u.searchParams.set('text', `Bonjour, je souhaiterais un échantillon ou un conseil pour le produit « ${p.name} » (réf. ${p.sku}).`);
      return u.toString();
    } catch { return window.PB_SITE.whatsapp || '#'; }
  }

  function buyHTML(p, chain) {
    const d = PB.discount(p);
    const certs = certif(p);
    const mode = buyMode(p);
    const kicker = chain.length ? chain[chain.length - 1].name : PB.mainCat(p);
    const pantin = (window.PB_SITE.stores || []).find((s) => s.slug === 'pantin');
    const st = stockInfo(p);
    const eco = PBReco.ecoLabel(p);
    const dl = deliveryInfo();
    const desig = (p.designation || '').trim();
    const showDesig = desig && desig.toLowerCase() !== p.name.toLowerCase() && desig.toLowerCase() !== (p.raw || '').toLowerCase();
    return `<div class="pbuy" data-buy>
      <p class="pbuy__kicker">${PB.esc(kicker)}</p>
      <h1 class="pbuy__title">${PB.esc(p.name)}</h1>
      ${showDesig ? `<p class="pbuy__desig">${PB.esc(desig)}</p>` : ''}
      <div class="pbuy__meta">
        <span class="pbuy__ref">Réf. <b>${PB.esc(p.sku)}</b></span>
        ${p.unit === 'm²' && p.pack ? `<span class="pbuy__ref">Colis <b>${nf(p.pack, 3)} m²</b></span>` : ''}
        ${d ? `<span class="tag tag--promo">−${d} %</span>` : ''}
        ${certs.map((c) => `<span class="tag tag--cert">${svg(PB.I.leaf, 13)}${PB.esc(c)}</span>`).join('')}
      </div>
      ${priceHTML(p)}
      <div class="pbuy__avail">
        <p class="pstock pstock--${st.k}"><i aria-hidden="true"></i><b>${st.t}</b>${st.sub ? `<span>${PB.esc(st.sub)}</span>` : ''}</p>
        ${eco ? `<p class="pbuy__eco">Éco-participation : ${PB.esc(eco)}</p>` : ''}
      </div>
      <div class="pbuy__ship">
        ${svg(PB.I.truck, 20)}
        <div>
          ${dl.note ? `<b>${PB.esc(dl.note)}</b>` : ''}
          ${dl.zones.length ? `<span class="pbuy__zones">${dl.zones.map(([z, t]) => `${PB.esc(z)} : ${PB.esc(t)}`).join(' · ')}</span>` : ''}
          <span><b>Livraison sur rendez-vous.</b> ${PB.esc(dl.text)}</span>
        </div>
      </div>
      ${buyerHTML(p, mode)}
      <div class="pbuy__actions">
        <button class="btn btn--dark btn--block pbuy__add" type="button" data-add-main ${st.out ? 'disabled aria-disabled="true"' : ''}><span class="pbuy__add-l">${st.out ? 'Indisponible à la commande' : 'Ajouter au panier'}</span><span class="pbuy__add-ok" aria-hidden="true">${svg(PB.I.check, 18)} Ajouté</span></button>
        <button class="btn ${st.out ? 'btn--accent' : 'btn--line'} btn--block pbuy__devis" type="button" data-devis-add aria-pressed="false"><span class="pbuy__devis-l">Ajouter au devis</span><span class="pbuy__devis-ok" aria-hidden="true">${svg(PB.I.check, 18)} Dans votre devis</span></button>
        <p class="pbuy__devis-note" data-devis-note role="status" hidden></p>
        ${st.out ? `<p class="pbuy__out">Ce produit est momentanément en rupture de stock. Ajoutez-le à votre devis : nous vous indiquerons le délai de réapprovisionnement ou une alternative. Vous pouvez aussi <a href="contact.html">nous contacter</a> ou nous écrire sur <a href="${PB.esc(window.PB_SITE.whatsapp || '#')}" target="_blank" rel="noopener">WhatsApp</a>.</p>` : ''}
        <div class="pbuy__sec">
          <a class="btn btn--line btn--sm" href="${PB.esc(waLink(p))}" target="_blank" rel="noopener">${PB.I.wa.replace('<svg', '<svg width="16" height="16" fill="currentColor" aria-hidden="true"')}<span>Échantillon ou conseil</span></a>
          <a class="btn btn--line btn--sm" href="magasins.html">${svg(PB.I.store, 16)}<span>Voir en showroom</span></a>
        </div>
      </div>
      <ul class="pbuy__reassure">
        <li>${svg(PB.I.truck)}<span><b>Livraison offerte dès 1 000 € HT*</b> ou Click &amp; Collect à ${pantin ? PB.esc(pantin.city) : 'Pantin'}</span></li>
        <li>${svg(PB.I.card)}<span><b>Paiement en 2×, 3× ou 4×</b> avec Alma<span class="pbuy__alma" data-alma></span></span></li>
        <li>${svg(PB.I.chat)}<span><b>Conseil d’experts 6j/7</b> par téléphone ou WhatsApp</span></li>
      </ul>
    </div>`;
  }

  function specRows(p) {
    const rows = Object.entries(p.spec).filter(([, v]) => v && String(v).trim() && !/^0$/.test(String(v).trim()));
    const ord = ['Essence', 'Finition', 'Aspect', 'Qualité', 'Largeur', 'Épaisseur', 'Longueur', 'Longueur variable', "Couche d'usure", 'Support', 'Nombre de frises', 'Chanfrein', 'Pose', 'Chauffage au sol', 'Couches de verni', 'Classement au feu', 'Formaldéhyde', 'Labels', 'FSC®', 'PEFC', 'ISO'];
    rows.sort((a, b) => (ord.indexOf(a[0]) + 1 || 99) - (ord.indexOf(b[0]) + 1 || 99));
    const fmt = (k, v) => {
      let s = String(v).trim();
      if (k === 'Qualité') s = s.split(/\s+-\s+/)[0];
      s = s.replace(/(\d)(mm)\b/g, '$1 mm');
      return s.charAt(0) + s.slice(1);
    };
    const label = (k) => (k === "Couche d'usure" ? 'Couche d’usure' : k === 'Couches de verni' ? 'Couches de vernis' : k);
    const out = rows.map(([k, v]) => [label(k), fmt(k, v)]);
    if (p.unit === 'm²' && p.pack) out.push(['Colisage', `${nf(p.pack, 3)} m² par colis`]);
    if (p.unit === 'ml' && p.pack) out.push(['Conditionnement', `Barre de ${nf(p.pack)} m · vendu au mètre linéaire`]);
    if (p.unit === 'Kg' && p.pack) out.push(['Conditionnement', `Pot de ${nf(p.pack)} kg · prix au kilo`]);
    out.push(['Référence', p.sku]);
    return out;
  }

  const TABS = [
    ['desc', 'Description'],
    ['spec', 'Caractéristiques'],
    ['pose', 'Pose & entretien'],
    ['ship', 'Livraison'],
  ];

  function tabsHTML(p) {
    const rows = specRows(p);
    const poses = (p.spec.Pose || '').split(',').map((s) => s.trim()).filter(Boolean);
    const store = (window.PB_SITE.stores || []).find((s) => s.slug === 'pantin');
    const dl = deliveryInfo();
    return `<section class="ptabs container section--tight" aria-label="Informations produit">
      <div class="ptabs__bar" role="tablist" aria-label="Informations produit">
        ${TABS.map(([id, l], i) => `<button class="ptabs__tab" role="tab" id="tab-${id}" aria-controls="panel-${id}" aria-selected="${!i}" tabindex="${i ? -1 : 0}" data-tab="${id}">${l}</button>`).join('')}
        <span class="ptabs__ink" data-ink aria-hidden="true"></span>
      </div>
      <div class="ptabs__panels" data-panels>
        <div class="ptabs__panel" role="tabpanel" id="panel-desc" aria-labelledby="tab-desc" tabindex="0">
          <div class="ptabs__two">
            <div class="prose">${p.desc && p.desc.trim() ? p.desc : `<p>${PB.esc(p.short || p.name)}</p>`}</div>
            <aside class="ptabs__aside">
              <p class="eyebrow">En bref</p>
              <dl class="kv">${rows.filter(([k]) => ['Essence', 'Finition', 'Aspect', 'Largeur', 'Épaisseur', 'Longueur', 'Pose'].includes(k)).slice(0, 6).map(([k, v]) => `<div><dt>${PB.esc(k)}</dt><dd>${PB.esc(v)}</dd></div>`).join('') || `<div><dt>Référence</dt><dd>${PB.esc(p.sku)}</dd></div>`}</dl>
            </aside>
          </div>
        </div>
        <div class="ptabs__panel" role="tabpanel" id="panel-spec" aria-labelledby="tab-spec" tabindex="0" hidden>
          <table class="spec">
            <caption class="sr-only">Caractéristiques techniques de ${PB.esc(p.name)}</caption>
            <tbody>${rows.map(([k, v]) => `<tr><th scope="row">${PB.esc(k)}</th><td>${PB.esc(v)}</td></tr>`).join('')}</tbody>
          </table>
        </div>
        <div class="ptabs__panel" role="tabpanel" id="panel-pose" aria-labelledby="tab-pose" tabindex="0" hidden>
          <div class="ptabs__two">
            <div>
              <h3 class="ptabs__h">Modes de pose compatibles</h3>
              ${poses.length ? `<div class="chips">${poses.map((s) => `<a class="chip" href="guide.html?g=types-pose">${PB.esc(s)}</a>`).join('')}</div>` : '<p class="muted">Mode de pose à confirmer avec nos conseillers.</p>'}
              ${p.spec['Chauffage au sol'] ? `<p class="ptabs__p">Compatibilité chauffage au sol : <b>${PB.esc(p.spec['Chauffage au sol'].toLowerCase())}</b>.</p>` : ''}
              <p class="ptabs__p muted">Flottante, collée, clouée ou clipsée : chaque pose a ses contraintes de support et de pièce. Notre guide les détaille, et nos experts vous conseillent en showroom ou sur WhatsApp.</p>
              <a class="link-arrow" href="guide.html?g=types-pose">Lire le guide des types de pose <span>→</span></a>
            </div>
            <div data-care></div>
          </div>
        </div>
        <div class="ptabs__panel" role="tabpanel" id="panel-ship" aria-labelledby="tab-ship" tabindex="0" hidden>
          <div class="ship">
            <div class="ship__col">
              <span class="ship__ic">${svg(PB.I.truck, 22)}</span>
              <h3 class="ptabs__h">Livraison</h3>
              ${dl.note ? `<p class="ptabs__p">${PB.esc(dl.note)}</p>` : ''}
              <ul class="ship__list">
                ${dl.zones.map(([z, t]) => `<li><span>${PB.esc(z)}</span><b>${PB.esc(t)}</b></li>`).join('')}
              </ul>
              <p class="ptabs__p muted"><b>Livraison sur rendez-vous :</b> ${PB.esc(dl.text)} Livraison sur le trottoir, présence obligatoire au déchargement ; le parquet pèse environ 10 kg/m².</p>
            </div>
            <div class="ship__col">
              <span class="ship__ic">${svg(PB.I.store, 22)}</span>
              <h3 class="ptabs__h">Click &amp; Collect</h3>
              ${store ? `<p class="ptabs__p"><b>${PB.esc(store.name)}</b><br>${PB.esc(store.address)}<br>${PB.esc(store.zip)}</p>` : ''}
              <p class="ptabs__p muted">Retirez votre commande directement à notre entrepôt.</p>
              ${store ? `<a class="link-arrow" href="magasin.html?m=${store.slug}">Horaires et accès <span>→</span></a>` : ''}
            </div>
            <div class="ship__col">
              <span class="ship__ic">${svg(PB.I.card, 22)}</span>
              <h3 class="ptabs__h">Bon à savoir</h3>
              <p class="ptabs__p muted">Toute modification de livraison doit être faite au minimum 3 jours avant. Paiement intégral 48 h avant la livraison. En cas de litige, faites une réserve claire et contactez-nous sous 72 h.</p>
              <a class="link-arrow" href="livraison.html">Conditions de livraison <span>→</span></a>
            </div>
          </div>
        </div>
      </div>
    </section>`;
  }

  /* Ligne compacte (accessoire / entretien) */
  const miniHTML = (p, note = '') => `<article class="mini">
      <a class="mini__img" href="${PB.productUrl(p)}" tabindex="-1" aria-hidden="true"><img src="${PB.esc(realImgs(p)[0] || PB.PLACEHOLDER)}" alt="" loading="lazy" decoding="async"></a>
      <div class="mini__body">
        ${note ? `<span class="mini__note">${PB.esc(note)}</span>` : ''}
        <a class="mini__name" href="${PB.productUrl(p)}">${PB.esc(p.name)}</a>
        <span class="mini__price">${p.regular ? `<s>${PB.money(PB.ttc(p.regular))}</s> ` : ''}${PB.money(PB.ttc(p.price))} <small>TTC / ${unitTxt(p)}</small></span>
      </div>
      <button class="mini__add" type="button" data-add-mini="${PB.esc(p.sku)}" aria-label="Ajouter ${PB.esc(p.name)} au panier">${svg(PB.I.plus, 18)}</button>
    </article>`;

  /* ------------------------------------------------------------------------
     Sélections
     ------------------------------------------------------------------------ */
  const tokens = (p) => new Set(`${p.name} ${p.spec.Finition || ''} ${p.spec.Essence || ''}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z]+/).filter((w) => w.length > 3));

  function pickFor(p, slug, n) {
    const t = tokens(p);
    return PB.inCat(slug).filter((x) => x.sku !== p.sku)
      .map((x) => ({ x, s: [...tokens(x)].filter((w) => t.has(w)).length + (realImgs(x).length ? 0.5 : 0) + (PB.discount(x) ? 0.2 : 0) }))
      .sort((a, b) => b.s - a.s).slice(0, n).map((o) => o.x);
  }

  function similar(p, n = 12) {
    const C = PB.categories();
    const mine = p.cats.filter((s) => !GENERIC.has(s) && C[s]);
    const pool = PB.products().filter((x) => x.sku !== p.sku && x.unit === p.unit);
    return pool.map((x) => {
      let s = 0;
      mine.forEach((c) => { if (x.cats.includes(c)) s += 1 + 12 / Math.max(3, C[c].count || 3); });
      if (p.spec.Essence && x.spec.Essence === p.spec.Essence) s += 1.5;
      if (p.spec.Finition && x.spec.Finition === p.spec.Finition) s += 1.5;
      if (p.spec.Aspect && x.spec.Aspect === p.spec.Aspect) s += 0.5;
      if (realImgs(x).length) s += 0.8;
      return { x, s };
    }).filter((o) => o.s > 2).sort((a, b) => b.s - a.s).slice(0, n).map((o) => o.x);
  }

  const railHTML = (id, eyebrow, title, items) => `<section class="section--tight pdp-rail" aria-labelledby="${id}-t">
      <div class="container head-row"><div><p class="eyebrow">${eyebrow}</p><h2 class="h2" id="${id}-t">${title}</h2></div></div>
      <div class="rail" data-rail="${id}"><div class="rail__track">${items.map((x) => PB.productCard(x)).join('')}</div></div>
      <div class="container rail__ui"><div class="rail__progress"><span data-rp="${id}"></span></div><div class="rail__arrows"><button class="round-btn" type="button" data-rprev="${id}" aria-label="Précédent">${PB.I.arrowL}</button><button class="round-btn" type="button" data-rnext="${id}" aria-label="Suivant">${PB.I.arrow}</button></div></div>
    </section>`;

  function mountRail(root, id) {
    const el = root.querySelector(`[data-rail="${id}"]`); if (!el) return;
    PB.rail(el, { progress: root.querySelector(`[data-rp="${id}"]`), prev: root.querySelector(`[data-rprev="${id}"]`), next: root.querySelector(`[data-rnext="${id}"]`) });
  }

  /* ------------------------------------------------------------------------
     Galerie : loupe + bande + plein écran
     ------------------------------------------------------------------------ */
  function initGallery(root, p) {
    const g = root.querySelector('[data-gallery]'); if (!g) return { current: () => null };
    const stage = g.querySelector('[data-stage]'), strip = g.querySelector('[data-strip]');
    const slides = [...strip.children];
    const thumbs = [...g.querySelectorAll('[data-thumb]')];
    const curEl = g.querySelector('[data-count-cur]');
    let index = 0;

    const setActive = (i) => {
      index = i;
      thumbs.forEach((t, k) => { t.classList.toggle('is-active', k === i); t.setAttribute('aria-selected', k === i); });
      if (curEl) curEl.textContent = i + 1;
    };
    const goTo = (i, smooth = true) => {
      i = clamp(i, 0, slides.length - 1);
      strip.scrollTo({ left: slides[i].offsetLeft, behavior: smooth && !PB.reduce ? 'smooth' : 'auto' });
      setActive(i);
    };
    thumbs.forEach((t) => t.addEventListener('click', () => goTo(+t.dataset.thumb)));
    let st;
    strip.addEventListener('scroll', () => { clearTimeout(st); st = setTimeout(() => setActive(Math.round(strip.scrollLeft / strip.clientWidth)), 60); }, { passive: true });

    // Loupe : échelle et origine lissées (lerp) — suit le pointeur sans à-coups
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (fine && !PB.reduce) {
      const Z = 2.1;
      let s = 1, ts = 1, ox = 50, oy = 50, tx = 50, ty = 50, raf = 0, img = null;
      const loop = () => {
        s += (ts - s) * 0.16; ox += (tx - ox) * 0.2; oy += (ty - oy) * 0.2;
        if (img) img.style.transform = `scale(${s.toFixed(4)})`, img.style.transformOrigin = `${ox.toFixed(2)}% ${oy.toFixed(2)}%`;
        if (Math.abs(ts - s) > 0.001 || Math.abs(tx - ox) > 0.05 || Math.abs(ty - oy) > 0.05) raf = requestAnimationFrame(loop);
        else { raf = 0; if (ts === 1 && img) { img.style.transform = ''; img.style.transformOrigin = ''; } }
      };
      const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
      const setTarget = (e) => {
        const r = stage.getBoundingClientRect();
        tx = clamp(((e.clientX - r.left) / r.width) * 100, 0, 100); ty = clamp(((e.clientY - r.top) / r.height) * 100, 0, 100);
      };
      stage.addEventListener('pointerenter', (e) => {
        if (e.pointerType !== 'mouse') return;
        img = slides[index].querySelector('img'); setTarget(e); ox = tx; oy = ty; ts = Z; stage.classList.add('is-zoom'); kick();
      });
      stage.addEventListener('pointermove', (e) => { if (e.pointerType !== 'mouse' || !img) return; setTarget(e); kick(); });
      stage.addEventListener('pointerleave', () => { ts = 1; tx = ty = 50; stage.classList.remove('is-zoom'); kick(); });
    }

    const lb = lightbox(p, realImgs(p), (i) => goTo(i, false));
    stage.addEventListener('click', (e) => { if (e.target.closest('[data-expand]') || e.target.closest('[data-slide]')) lb.open(index, slides[index].querySelector('img')); });
    return { current: () => slides[index].querySelector('img') };
  }

  /* Plein écran : suivi 1:1, projection d'élan, rubber-band, ressorts, glisser vers le bas pour fermer */
  function lightbox(p, imgs, onChange) {
    let el = null, track = null, i = 0, x = 0, y = 0, anim = null, yAnim = null, opener = null, returnFocus = null;
    const W = () => innerWidth;

    const build = () => {
      el = document.createElement('div');
      el.className = 'lbx';
      el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', `Photos — ${p.name}`);
      el.innerHTML = `<div class="lbx__bg" data-lbg></div>
        <div class="lbx__track" data-ltrack>${imgs.map((src, k) => `<figure class="lbx__slide"><img src="${PB.esc(src)}" alt="${PB.esc(p.name)} — vue ${k + 1}" draggable="false" decoding="async"></figure>`).join('')}</div>
        <div class="lbx__ui">
          <span class="lbx__count" data-lcount>${imgs.length > 1 ? `1 / ${imgs.length}` : ''}</span>
          <button class="lbx__close" type="button" data-lclose aria-label="Fermer">${svg(PB.I.close, 22)}</button>
        </div>
        ${imgs.length > 1 ? `<button class="lbx__nav lbx__nav--prev" type="button" data-lnav="-1" aria-label="Photo précédente">${svg(PB.I.arrowL, 20)}</button><button class="lbx__nav lbx__nav--next" type="button" data-lnav="1" aria-label="Photo suivante">${svg(PB.I.arrow, 20)}</button>` : ''}
        <p class="lbx__tip" aria-hidden="true">Glissez vers le bas pour fermer</p>`;
      document.body.appendChild(el);
      track = el.querySelector('[data-ltrack]');
      bind();
    };

    const render = () => {
      const min = -(imgs.length - 1) * W();
      let sx = x;
      if (x > 0) sx = rubber(x, W()); else if (x < min) sx = min + rubber(x - min, W());
      track.style.transform = `translate3d(${sx}px, ${y}px, 0) scale(${1 - Math.min(0.22, Math.abs(y) / 1600)})`;
      const fade = 1 - Math.min(0.85, Math.abs(y) / 420);
      el.querySelector('[data-lbg]').style.opacity = fade;
      el.style.setProperty('--ui', fade < 0.98 ? 0 : 1);
    };
    const setIndex = (k) => {
      i = clamp(k, 0, imgs.length - 1);
      const c = el.querySelector('[data-lcount]'); if (imgs.length > 1) c.textContent = `${i + 1} / ${imgs.length}`;
      el.querySelectorAll('[data-lnav]').forEach((b) => { b.disabled = (+b.dataset.lnav < 0 && i === 0) || (+b.dataset.lnav > 0 && i === imgs.length - 1); });
      onChange(i);
    };
    const settleX = (v = 0) => {
      anim && anim.stop();
      if (PB.reduce) { x = -i * W(); render(); return; }
      anim = spring({ from: x, to: -i * W(), velocity: v, response: 0.42, onUpdate: (val) => { x = val; render(); } });
    };
    const settleY = (v = 0) => {
      yAnim && yAnim.stop();
      if (PB.reduce) { y = 0; render(); return; }
      yAnim = spring({ from: y, to: 0, velocity: v, response: 0.38, onUpdate: (val) => { y = val; render(); } });
    };

    function bind() {
      let drag = null;
      el.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || e.target.closest('button')) return;
        const s1 = anim && anim.stop(), s2 = yAnim && yAnim.stop();
        drag = { sx: e.clientX, sy: e.clientY, x0: x, y0: y, axis: null, hist: [{ x: e.clientX, y: e.clientY, t: e.timeStamp }], v0: (s1 && s1.v) || 0, vy0: (s2 && s2.v) || 0 };
        try { el.setPointerCapture(e.pointerId); } catch { /* pointeur synthétique */ }
      });
      el.addEventListener('pointermove', (e) => {
        if (!drag) return;
        const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
        if (!drag.axis) { if (Math.hypot(dx, dy) < 6) return; drag.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'; el.classList.add('is-dragging'); }
        if (drag.axis === 'x' && imgs.length > 1) x = drag.x0 + dx;
        else if (drag.axis === 'y') y = drag.y0 + (dy < 0 ? rubber(dy, innerHeight, 0.35) : dy);
        else x = drag.x0 + rubber(dx, W(), 0.25); // une seule photo : léger rubber-band
        drag.hist.push({ x: e.clientX, y: e.clientY, t: e.timeStamp }); if (drag.hist.length > 6) drag.hist.shift();
        render();
      });
      const end = (e) => {
        if (!drag) return;
        el.classList.remove('is-dragging');
        const a = drag.hist[0], b = drag.hist[drag.hist.length - 1], dt = Math.max(1, b.t - a.t);
        const vx = ((b.x - a.x) / dt) * 1000, vy = ((b.y - a.y) / dt) * 1000;
        const axis = drag.axis; drag = null;
        if (!axis) { if (e && e.type === 'pointerup' && e.target.closest('[data-lbg]')) close(); return; }
        if (axis === 'y') {
          if (y + project(vy, 0.99) > innerHeight * 0.22 && y > 0) close(vy); else settleY(vy);
          return;
        }
        if (imgs.length > 1) {
          const proj = x + project(vx, 0.995);
          let k = Math.round(-proj / W());
          k = clamp(k, i - 1, i + 1); // une photo à la fois, comme Photos
          setIndex(k);
        }
        settleX(vx);
      };
      el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
      el.addEventListener('click', (e) => {
        if (e.target.closest('[data-lclose]')) close();
        const n = e.target.closest('[data-lnav]'); if (n) { setIndex(i + +n.dataset.lnav); settleX(); }
      });
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { e.stopPropagation(); close(); }
        else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { setIndex(i + (e.key === 'ArrowRight' ? 1 : -1)); settleX(); }
        else if (e.key === 'Tab') { // piège de focus
          const f = [...el.querySelectorAll('button:not([disabled])')]; if (!f.length) return;
          const first = f[0], last = f[f.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      });
      addEventListener('resize', () => { if (el.classList.contains('is-open')) { x = -i * W(); render(); } });
    }

    function open(k, fromImg) {
      if (!el) build();
      returnFocus = document.activeElement; opener = fromImg;
      i = k; x = -i * W(); y = 0; setIndex(i); render();
      el.classList.add('is-open');
      PB.lenis && PB.lenis.stop(); document.documentElement.classList.add('lbx-lock');
      // entrée : la photo « sort » de la vignette (FLIP approximatif sur la diapositive)
      const img = track.children[i].querySelector('img');
      if (!PB.reduce && fromImg) {
        const r = fromImg.getBoundingClientRect(), t = img.getBoundingClientRect();
        const sc = Math.min(1, r.width / Math.max(1, t.width));
        const dx = r.left + r.width / 2 - (t.left + t.width / 2), dy = r.top + r.height / 2 - (t.top + t.height / 2);
        img.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${sc})`, opacity: 0.6 }, { transform: 'none', opacity: 1 }], { duration: 560, easing: 'cubic-bezier(.22,1,.36,1)' });
      }
      setTimeout(() => el.querySelector('[data-lclose]').focus({ preventScroll: true }), 30);
    }

    function close(vy = 0) {
      if (!el || !el.classList.contains('is-open')) return;
      anim && anim.stop(); yAnim && yAnim.stop();
      const finish = () => {
        el.classList.remove('is-open', 'is-closing'); y = 0; render();
        PB.lenis && PB.lenis.start(); document.documentElement.classList.remove('lbx-lock');
        returnFocus && returnFocus.focus && returnFocus.focus({ preventScroll: true });
      };
      if (PB.reduce) return finish();
      el.classList.add('is-closing');
      if (y > 0) {
        // poursuit le geste vers le bas avec sa vitesse, puis disparaît
        let done = false;
        const end = () => { if (done) return; done = true; yAnim && yAnim.stop(); finish(); };
        yAnim = spring({ from: y, to: innerHeight * 1.3, velocity: Math.max(vy, 1200), response: 0.45, onUpdate: (val) => { y = val; render(); if (val >= innerHeight) end(); }, onDone: end });
      } else {
        el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, easing: 'ease-out' }).onfinish = finish;
      }
    }
    return { open, close };
  }

  /* ------------------------------------------------------------------------
     Achat : calculateur & quantité
     ------------------------------------------------------------------------ */
  function initBuy(root, p, gallery) {
    const mode = buyMode(p);
    const st = stockInfo(p);
    const buy = root.querySelector('[data-buy]');
    const alma = buy.querySelector('[data-alma]');
    const bar = root.querySelector('[data-buybar]');
    const barTotal = bar && bar.querySelector('[data-bar-total]');
    const barQty = bar && bar.querySelector('[data-bar-qty]');
    const sub = buy.querySelector('[data-o-sub]'), cap = buy.querySelector('[data-o-cap]');
    const money = (n) => PB.money(Math.round(n * 100) / 100);
    // Lot de fin de série : quantité plafonnée au stock (colis ou unités)
    const maxQ = st.k === 'lot' && st.max ? st.max * (mode.kind === 'qty' ? mode.step : 1) : 9999;
    let qty = mode.min; // colis (m²) ou unités de vente
    let surfaceTyped = 0; // surface saisie (m²) pour le devis et les recommandations
    const listeners = [];
    const api = {
      onChange(fn) { listeners.push(fn); },
      m2: () => (mode.kind === 'surface' ? qty * p.pack : 0),
      surface: () => surfaceTyped || (mode.kind === 'surface' ? qty * p.pack : 0),
      qty: () => qty,
    };

    const updateCommon = () => {
      const t = PBReco.lineTTC(p, qty);
      const ecoT = PBReco.ecoHT(p, qty) * PB.TVA;
      const out = buy.querySelector('[data-o-total]');
      tweenNumber(out, t, money);
      if (barTotal) tweenNumber(barTotal, t, money);
      if (barQty) barQty.textContent = mode.kind === 'surface' ? `${qty} colis · ${nf(qty * p.pack, 2)} m²` : `${nf(qty)} ${mode.label}`;
      sub.textContent = `Total HT ${money(PBReco.lineHT(p, qty))}${ecoT ? ` · dont éco-participation ${money(ecoT)}` : ''}`;
      const ht = t / PB.TVA;
      alma.textContent = ht >= 200 && t <= 4000 ? ` — soit 3 × ${money(t / 3)}` : '';
      listeners.forEach((fn) => fn(api));
    };
    const showCap = (hit) => {
      cap.hidden = !hit;
      if (hit) cap.textContent = mode.kind === 'surface' ? `Lot limité à ${maxQ} colis (${nf(maxQ * p.pack, 2)} m²). Pour une quantité supérieure, demandez un devis.` : `Lot limité à ${nf(maxQ)} ${mode.label}.`;
    };

    if (mode.kind === 'surface') {
      const calc = buy.querySelector('[data-calc]');
      const sIn = calc.querySelector('[data-surface]'), cIn = calc.querySelector('[data-colis]'), wIn = calc.querySelector('[data-waste]');
      const need = calc.querySelector('[data-o-need]'), m2 = calc.querySelector('[data-o-m2]');
      const wastePct = +calc.dataset.wastePct;
      const surface = () => { const v = parseFloat(String(sIn.value).replace(',', '.').replace(/[^\d.]/g, '')); return isFinite(v) && v > 0 ? Math.min(v, 5000) : 0; };
      const fromSurface = () => {
        const s = surface();
        surfaceTyped = s;
        if (!s) { need.textContent = '—'; need._v = undefined; calc.classList.remove('has-surface'); showCap(false); return; }
        const n = s * (wIn.checked ? 1 + wastePct / 100 : 1);
        const want = Math.max(1, Math.ceil(n / p.pack - 1e-9));
        qty = Math.min(want, maxQ); showCap(want > maxQ);
        cIn.value = qty;
        calc.classList.add('has-surface');
        tweenNumber(need, n, (v) => `${nf(v, 2)} m²`);
      };
      const refresh = () => { tweenNumber(m2, qty * p.pack, (v) => nf(v, 2)); updateCommon(); };
      sIn.addEventListener('input', () => { fromSurface(); refresh(); });
      wIn.addEventListener('change', () => { fromSurface(); refresh(); });
      calc.addEventListener('click', (e) => {
        const b = e.target.closest('[data-step]'); if (!b) return;
        const want = Math.max(1, qty + +b.dataset.step);
        qty = Math.min(want, maxQ); showCap(want > maxQ); cIn.value = qty; refresh();
      });
      cIn.addEventListener('change', () => {
        const want = Math.max(1, Math.min(9999, parseInt(cIn.value, 10) || 1));
        qty = Math.min(want, maxQ); showCap(want > maxQ); cIn.value = qty; refresh();
      });
      m2._v = p.pack; refresh();
    } else {
      const box = buy.querySelector('[data-qtybox]');
      const qIn = box.querySelector('[data-q]'), bars = box.querySelector('[data-o-bars]');
      const refresh = () => {
        qIn.value = nf(qty, 2);
        if (bars) { const n = Math.ceil(qty / mode.bar - 1e-9); bars.textContent = `soit ${n} barre${n > 1 ? 's' : ''}`; }
        updateCommon();
      };
      box.addEventListener('click', (e) => {
        const b = e.target.closest('[data-step]'); if (!b) return;
        const want = Math.max(mode.min, qty + +b.dataset.step * mode.step);
        qty = Math.min(want, maxQ); showCap(want > maxQ); refresh();
      });
      qIn.addEventListener('change', () => {
        let v = parseFloat(String(qIn.value).replace(',', '.')) || mode.min;
        v = Math.max(mode.min, Math.min(9999, Math.round(v / mode.step) * mode.step));
        qty = Math.min(v, maxQ); showCap(v > maxQ); refresh();
      });
      refresh();
    }

    // Ajout au panier
    const addBtn = buy.querySelector('[data-add-main]');
    const add = (srcBtn) => {
      if (st.out) return;
      PB.cart.add(p.sku, qty);
      PB.flyToCart(gallery.current() || srcBtn);
      [addBtn, bar && bar.querySelector('[data-bar-add]')].forEach((b) => {
        if (!b) return; b.classList.add('is-added'); clearTimeout(b._t); b._t = setTimeout(() => b.classList.remove('is-added'), 1800);
      });
    };
    addBtn.addEventListener('click', () => add(addBtn));
    if (bar) {
      const bAdd = bar.querySelector('[data-bar-add]');
      if (st.out) { bAdd.disabled = true; bAdd.querySelector('.pbuy__add-l').textContent = 'Indisponible'; }
      bAdd.addEventListener('click', (e) => add(e.currentTarget));
    }

    // Ajout au devis — PB.devis.add(sku, surface) : surface saisie (m²) ou, hors m², quantité dans l'unité de vente
    const dBtn = buy.querySelector('[data-devis-add]'), dNote = buy.querySelector('[data-devis-note]');
    const devisVal = () => (mode.kind === 'surface' ? Math.round((surfaceTyped || qty * p.pack) * 100) / 100 : qty);
    const paintDevis = (justAdded) => {
      const it = PB.devis.items().find((i) => i.sku === p.sku);
      dBtn.classList.toggle('is-in', !!it); dBtn.setAttribute('aria-pressed', String(!!it));
      dNote.hidden = !it;
      if (!it) return;
      const v = it.surface ? `${nf(+it.surface, 2)} ${mode.kind === 'surface' ? 'm²' : mode.label}` : '';
      dNote.innerHTML = `${justAdded ? 'Ajouté à votre demande de devis' : 'Dans votre demande de devis'}${v ? ` · <b>${v}</b>` : ''}. <a href="devis.html">Voir mon devis <span aria-hidden="true">→</span></a>`;
      if (justAdded && !PB.reduce) dNote.animate([{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)' });
    };
    let justAdded = false;
    dBtn.addEventListener('click', () => {
      justAdded = true;
      PB.devis.add(p.sku, devisVal()); // déclenche pb:devis → paintDevis
      justAdded = false;
      if (!PB.reduce) dBtn.animate([{ transform: 'scale(.97)' }, { transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.22,1,.36,1)' });
    });
    document.addEventListener('pb:devis', () => paintDevis(justAdded));
    paintDevis(false);

    // Barre d'achat mobile : visible quand le bouton principal a quitté l'écran (au-dessus)
    if (bar) {
      let shown = null, queued = false;
      const check = () => {
        queued = false;
        const show = addBtn.getBoundingClientRect().bottom < 0;
        if (show === shown) return; shown = show;
        bar.classList.toggle('is-on', show); document.body.classList.toggle('has-buybar', show);
        bar.setAttribute('aria-hidden', String(!show)); bar.inert = !show;
      };
      const q = () => { if (!queued) { queued = true; requestAnimationFrame(check); } };
      PB.onScroll(q); addEventListener('scroll', q, { passive: true }); addEventListener('resize', q);
      check();
    }
    return api;
  }

  function initCountdown(root) {
    const cd = root.querySelector('[data-countdown]'); if (!cd) return;
    const end = new Date(cd.dataset.countdown).getTime();
    const parts = ['d', 'h', 'm', 's'].map((k) => cd.querySelector(`[data-cd-${k}]`));
    const pad = (n) => String(n).padStart(2, '0');
    const tick = () => {
      let s = Math.max(0, Math.floor((end - Date.now()) / 1000));
      const v = [Math.floor(s / 86400), Math.floor((s %= 86400) / 3600), Math.floor((s %= 3600) / 60), s % 60];
      parts.forEach((el, k) => { const t = pad(v[k]); if (el.textContent !== t) { el.textContent = t; if (k === 3 && !PB.reduce) { el.classList.remove('tick'); void el.offsetWidth; el.classList.add('tick'); } } });
      if (end - Date.now() <= 0) { cd.innerHTML = '<span>Offre terminée</span>'; clearInterval(iv); }
    };
    const iv = setInterval(tick, 1000); tick();
  }

  /* Onglets accessibles + indicateur glissant */
  function initTabs(root) {
    const bar = root.querySelector('.ptabs__bar'); if (!bar) return;
    const tabs = [...bar.querySelectorAll('[role="tab"]')], ink = bar.querySelector('[data-ink]');
    const place = (t, instant) => {
      if (instant) ink.style.transition = 'none';
      ink.style.width = `${t.offsetWidth}px`; ink.style.transform = `translateX(${t.offsetLeft}px)`;
      if (instant) { void ink.offsetWidth; ink.style.transition = ''; }
    };
    const select = (t, focus) => {
      tabs.forEach((x) => {
        const on = x === t; x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1;
        const panel = root.querySelector(`#${x.getAttribute('aria-controls')}`);
        if (on) {
          panel.hidden = false;
          if (!PB.reduce) panel.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 480, easing: 'cubic-bezier(.22,1,.36,1)' });
        } else panel.hidden = true;
      });
      place(t); if (focus) t.focus();
      t.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    };
    bar.addEventListener('click', (e) => { const t = e.target.closest('[role="tab"]'); if (t) select(t); });
    bar.addEventListener('keydown', (e) => {
      const k = tabs.indexOf(document.activeElement); if (k < 0) return;
      let n = null;
      if (e.key === 'ArrowRight') n = (k + 1) % tabs.length; else if (e.key === 'ArrowLeft') n = (k - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') n = 0; else if (e.key === 'End') n = tabs.length - 1;
      if (n !== null) { e.preventDefault(); select(tabs[n], true); }
    });
    requestAnimationFrame(() => place(tabs[0], true));
    addEventListener('resize', () => place(tabs.find((t) => t.getAttribute('aria-selected') === 'true'), true));
    document.fonts && document.fonts.ready.then(() => place(tabs.find((t) => t.getAttribute('aria-selected') === 'true'), true));
  }

  /* ------------------------------------------------------------------------
     Vidéo produit : lecteur YouTube (soumis au consentement) en surimpression
     ------------------------------------------------------------------------ */
  let vbox = null;
  function openVideo(id, title, opener) {
    if (!vbox) {
      vbox = document.createElement('div');
      vbox.className = 'pvid';
      vbox.setAttribute('role', 'dialog'); vbox.setAttribute('aria-modal', 'true');
      vbox.innerHTML = `<div class="pvid__bg" data-vclose></div><div class="pvid__box"><button class="pvid__close" type="button" data-vclose aria-label="Fermer la vidéo">${svg(PB.I.close, 22)}</button><div class="pvid__player" data-vplayer></div></div>`;
      document.body.appendChild(vbox);
      vbox.addEventListener('click', (e) => { if (e.target.closest('[data-vclose]')) closeVideo(); });
      vbox.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { e.stopPropagation(); closeVideo(); }
        else if (e.key === 'Tab') {
          const f = [...vbox.querySelectorAll('button, iframe')]; if (!f.length) return;
          const first = f[0], last = f[f.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      });
    }
    vbox._return = opener || document.activeElement;
    vbox.setAttribute('aria-label', title);
    vbox.querySelector('[data-vplayer]').innerHTML = PB.youtube(id, { title });
    vbox.classList.add('is-open');
    PB.lenis && PB.lenis.stop(); document.documentElement.classList.add('lbx-lock');
    setTimeout(() => (vbox.querySelector('.yt__play') || vbox.querySelector('[data-vclose].pvid__close')).focus({ preventScroll: true }), 60);
  }
  function closeVideo() {
    if (!vbox || !vbox.classList.contains('is-open')) return;
    const done = () => {
      vbox.classList.remove('is-open', 'is-closing');
      vbox.querySelector('[data-vplayer]').innerHTML = ''; // coupe la lecture
      PB.lenis && PB.lenis.start(); document.documentElement.classList.remove('lbx-lock');
      vbox._return && vbox._return.focus && vbox._return.focus({ preventScroll: true });
    };
    if (PB.reduce) return done();
    vbox.classList.add('is-closing');
    setTimeout(done, 280);
  }

  /* ------------------------------------------------------------------------
     Astuces & conseils : 3 à 6 articles liés au produit (data/posts.js)
     ------------------------------------------------------------------------ */
  const fold = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  function relatedPosts(p, n = 6) {
    const posts = window.PB_POSTS || [];
    const cats = p.cats.join(' ');
    const ctx = fold(`${p.name} ${cats} ${p.spec.Essence || ''} ${p.spec.Finition || ''} ${p.spec.Pose || ''}`);
    // thèmes du produit → mots-clés recherchés dans le titre de l'article (poids)
    const themes = [
      [/massif/, /massif/, 3], [/flottant|contrecolle/, /flottant|contrecolle/, 3], [/stratifie/, /stratifie/, 3],
      [/hongrie/, /hongrie/, 3], [/baton|rompu/, /baton|rompu/, 3], [/versailles/, /versailles|styles|design/, 2],
      [/bambou/, /bambou/, 3], [/terrasse/, /terrasse/, 3], [/sous-couche|isolation/, /sous-couche|isolation|acoustique/, 3],
      [/huil/, /huile/, 2], [/verni|vitrif/, /verni/, 2], [/chene/, /chene/, 2],
      [/salle-de-bain|cuisine/, /cuisine|salle/, 2],
    ].filter(([k]) => k.test(ctx));
    // familles exclusives : un article sur une autre famille de sol est écarté
    const fams = [/stratifie/, /bambou/, /terrasse/, /carrelage/];
    const scored = posts.map((a, i) => {
      const t = fold(a.title);
      let s = themes.reduce((n, [, rx, w]) => n + (rx.test(t) ? w : 0), 0);
      if (/choisir|guide|entretien|longevite|qualite/.test(t)) s += 0.6;
      if (fams.some((rx) => rx.test(t) && !rx.test(ctx))) s -= 4;
      return { a, s: s - i * 0.01 }; // à score égal : les plus récents d'abord
    }).sort((x, y) => y.s - x.s);
    return scored.slice(0, n).map((o) => o.a);
  }
  function mountTips(main, p) {
    const box = main.querySelector('[data-tips]'); if (!box) return;
    const list = relatedPosts(p, 6);
    if (list.length < 3) return;
    const date = (d) => { try { return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return ''; } };
    box.outerHTML = `<section class="container section--tight ptips" aria-labelledby="tips-t">
      <div class="head-row"><div><p class="eyebrow">Le journal</p><h2 class="h2" id="tips-t">Astuces <em>&amp; conseils</em></h2></div><a class="link-arrow" href="journal.html">Tous les articles <span>→</span></a></div>
      <div class="ptips__grid">${list.map((a) => `<article class="ptip reveal">
        <a class="ptip__img" href="article.html?a=${encodeURIComponent(a.slug)}" tabindex="-1" aria-hidden="true"><img src="${PB.esc(a.img || PB.PLACEHOLDER)}" alt="" loading="lazy" decoding="async"></a>
        <div class="ptip__body">
          <span class="ptip__meta">${PB.esc(date(a.date))}${a.minutes ? ` · ${a.minutes} min de lecture` : ''}</span>
          <h3 class="ptip__t"><a href="article.html?a=${encodeURIComponent(a.slug)}">${PB.esc(a.title)}</a></h3>
          <p class="ptip__x">${PB.esc(String(a.excerpt || '').slice(0, 150).replace(/\s+\S*$/, ''))}…</p>
          <a class="link-arrow ptip__go" href="article.html?a=${encodeURIComponent(a.slug)}">Lire l’article <span>→</span></a>
        </div>
      </article>`).join('')}</div>
    </section>`;
    PB.motionIn(main.querySelector('.ptips'));
  }

  /* ------------------------------------------------------------------------
     Rendu
     ------------------------------------------------------------------------ */
  function renderEmpty(main, ref) {
    document.title = 'Produit introuvable — Premibel Parquet';
    const promos = PB.inCat('promotions').filter((x) => realImgs(x).length).slice(0, 12);
    main.innerHTML = `<section class="container pdp-empty">
        <nav class="crumbs" aria-label="Fil d’Ariane"><a href="index.html">Accueil</a><span aria-hidden="true">/</span><span>Produit</span></nav>
        <p class="pdp-empty__k">${ref ? `Référence « ${PB.esc(ref)} »` : 'Aucune référence'}</p>
        <h1 class="h1 split">Ce parquet <em>nous échappe.</em></h1>
        <p class="lead reveal">${ref ? 'Cette référence n’existe pas ou n’est plus au catalogue. Elle a peut-être été remplacée par un modèle proche : cherchez-la, ou laissez-vous guider par nos sélections.' : 'Choisissez un produit dans le catalogue, ou recherchez une essence, une finition ou une référence.'}</p>
        <div class="pdp-empty__cta reveal">
          <button class="btn btn--dark" type="button" data-search-open><span>Rechercher un produit</span>${PB.I.arrow}</button>
          <a class="btn btn--line" href="${PB.catUrl('parquet')}"><span>Tout le catalogue</span></a>
        </div>
      </section>
      ${promos.length ? railHTML('promo', 'En ce moment', 'Nos <em>promotions</em>', promos) : ''}`;
    mountRail(main, 'promo');
  }

  function render(main, p) {
    const chain = crumbChain(p);
    const parquet = isParquet(p);

    // <title>, meta, données structurées
    document.title = `${p.name} — Premibel Parquet`;
    const md = document.querySelector('meta[name="description"]');
    if (md) md.setAttribute('content', `${p.name} (réf. ${p.sku}) : ${PB.money(PB.ttc(p.price))} TTC / ${unitTxt(p)}. ${(p.short || '').slice(0, 110)}`.trim());
    const ld = document.createElement('script'); ld.type = 'application/ld+json';
    ld.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'Product', name: p.name, sku: p.sku, image: realImgs(p).map((s) => new URL(s, location.href).href), brand: { '@type': 'Brand', name: 'Premibel Parquet' }, offers: { '@type': 'Offer', priceCurrency: 'EUR', price: PB.ttc(p.price).toFixed(2), availability: stockInfo(p).out ? 'https://schema.org/OutOfStock' : stockInfo(p).k === 'lot' || stockInfo(p).k === 'low' ? 'https://schema.org/LimitedAvailability' : 'https://schema.org/InStock' } });
    document.head.appendChild(ld);

    const imgs = realImgs(p);
    const accHTML = parquet ? (() => {
      const groups = [
        ['plinthe-mdf', 'Plinthes', 'Pour une finition nette en périphérie', 2],
        ['barre-de-seuil', 'Barres de seuil', 'Pour les passages entre deux pièces', 2],
        ['quart-de-rond', 'Quarts de rond', 'Pour masquer le joint de dilatation', 2],
      ].map(([slug, title, sub, n]) => ({ slug, title, sub, items: pickFor(p, slug, n) })).filter((g) => g.items.length);
      if (!groups.length) return '';
      return `<section class="container section--tight pdp-acc" aria-labelledby="acc-t">
        <div class="head-row"><div><p class="eyebrow">Accessoires de finition</p><h2 class="h2" id="acc-t">Complétez <em>votre sol</em></h2></div><p class="muted pdp-acc__lead">Plinthes, seuils et quarts de rond pour des finitions nettes.</p></div>
        <div class="pdp-acc__grid">${groups.map((g) => `<div class="pdp-acc__col reveal"><div class="pdp-acc__h"><b>${g.title}</b><span>${g.sub}</span></div>${g.items.map((x) => miniHTML(x)).join('')}<a class="link-arrow pdp-acc__all" href="${PB.catUrl(g.slug)}">Voir tout <span>→</span></a></div>`).join('')}</div>
      </section>`;
    })() : '';

    const sims = similar(p);
    const rec = recent.get().filter((s) => s !== p.sku).map((s) => PB.bySku(s)).filter(Boolean);

    main.innerHTML = `
      <section class="container pdp-top">
        ${crumbsHTML(p, chain)}
        <div class="pdp-grid">
          <div class="pdp-media">${galleryHTML(p)}</div>
          <div class="pdp-side">${buyHTML(p, chain)}</div>
        </div>
      </section>
      ${tabsHTML(p)}
      ${parquet ? PBReco.html({ id: 'reco', eyebrow: 'Pose', title: 'Recommandations pour une <em>installation parfaite</em>', lead: 'Colle et sous-couche calculées sur la surface de votre calculateur : ajustez-la, les quantités suivent.' }) : ''}
      ${accHTML}
      ${sims.length ? railHTML('sim', 'Dans le même esprit', parquet ? 'Des parquets <em>de la même veine</em>' : 'Produits <em>similaires</em>', sims) : ''}
      <div data-tips></div>
      ${rec.length ? railHTML('rec', 'Votre sélection', 'Vus <em>récemment</em>', rec) : ''}
      <div class="buybar" data-buybar aria-hidden="true" inert>
        <img src="${PB.esc(imgs[0] || PB.PLACEHOLDER)}" alt="" class="buybar__img">
        <div class="buybar__txt"><b data-bar-total>${PB.money(PB.ttc(p.price))}</b><small data-bar-qty></small></div>
        <button class="btn btn--dark btn--sm buybar__add" type="button" data-bar-add><span class="pbuy__add-l">Ajouter</span><span class="pbuy__add-ok" aria-hidden="true">${svg(PB.I.check, 16)} Ajouté</span></button>
      </div>`;

    // Entretien (catégorie finition-et-entretien) adapté à la finition
    const care = main.querySelector('[data-care]');
    if (care) {
      const fin = (p.spec.Finition || '').toLowerCase();
      const kw = /huil/.test(fin) ? /huile|savon|entretien|cire/i : /vern|vitrif/.test(fin) ? /vitrif|vernis|entretien|nettoy/i : /entretien|nettoy|huile|vitrif/i;
      const list = PB.inCat('finition-et-entretien').filter((x) => x.sku !== p.sku).sort((a, b) => (kw.test(b.name) - kw.test(a.name)) || (realImgs(b).length - realImgs(a).length)).slice(0, 3);
      care.innerHTML = list.length ? `<h3 class="ptabs__h">Produits d’entretien</h3><div class="pdp-care">${list.map((x) => miniHTML(x)).join('')}</div><a class="link-arrow" href="${PB.catUrl('finition-et-entretien')}">Tous les traitements <span>→</span></a>` : '';
    }

    main.removeAttribute('aria-busy');
    const gallery = initGallery(main, p);
    const buyApi = initBuy(main, p, gallery);
    // Recommandations : surface pré-remplie avec celle du calculateur principal, puis synchronisée
    const reco = PBReco.mount(main, { surface: buyApi.surface() });
    buyApi.onChange((a) => reco.setSurface(a.surface()));
    // Vidéos produit (vignette « Vidéo » de la galerie → lecteur en surimpression)
    main.addEventListener('click', (e) => {
      const v = e.target.closest('[data-video]'); if (!v) return;
      e.preventDefault(); openVideo(v.dataset.video, `Vidéo — ${p.name}`, v);
    });
    // Astuces & conseils (data/posts.js chargé à la demande)
    PB.load('posts').then(() => mountTips(main, p)).catch(() => {});
    initCountdown(main);
    initTabs(main);
    ['sim', 'rec'].forEach((id) => mountRail(main, id));

    main.addEventListener('click', (e) => {
      const b = e.target.closest('[data-add-mini]'); if (!b) return;
      PB.cart.add(b.dataset.addMini, 1);
      PB.flyToCart(b.closest('.mini').querySelector('img') || b);
      b.classList.add('is-added'); setTimeout(() => b.classList.remove('is-added'), 1400);
    });

    // Entrée de la colonne achat
    if (PB.motion) {
      gsap.from('.pdp-media', { opacity: 0, y: 24, duration: 1.1, ease: 'expo.out' });
      gsap.from('.pbuy > *', { opacity: 0, y: 18, duration: 1, ease: 'expo.out', stagger: 0.05, delay: 0.08 });
    }
    recent.push(p.sku);
  }

  PB.ready(async () => {
    await PB.load('products', 'categories');
    const main = document.querySelector('[data-pdp]');
    const ref = (PB.qs('ref') || '').trim();
    const p = ref && (PB.bySku(ref) || PB.bySku(ref.toUpperCase()));
    if (!p) renderEmpty(main, ref); else render(main, p);
    main.removeAttribute('aria-busy');
  });
})();
