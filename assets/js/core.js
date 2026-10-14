/* ==========================================================================
   Premibel — noyau partagé (toutes les pages)
   - Gabarit : bandeau, en-tête + méga-menu, menu mobile, recherche, panier,
     pied de page, WhatsApp, transition de page
   - Données : produits, catégories, bannières (chargement paresseux)
   - Motion  : Lenis + GSAP/ScrollTrigger (reveals, titres, médias, compteurs)
   - Composants : carte produit, rail à inertie, avis Google, adresses
   API publique : window.PB
   ========================================================================== */
(() => {
  'use strict';

  const doc = document, html = doc.documentElement;
  const $ = (s, c = doc) => c.querySelector(s);
  const $$ = (s, c = doc) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hover = matchMedia('(hover: hover)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  const motion = hasGsap && !reduce;
  if (motion) html.classList.add('js-motion');

  const SITE = window.PB_SITE || {};
  const page = doc.body.dataset.page || '';
  const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const qs = (k) => new URLSearchParams(location.search).get(k);

  /* ----------------------------------------------------------------------
     Icônes
     ---------------------------------------------------------------------- */
  const I = {
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg>',
    user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1.4-3.6 4.2-5.4 7.5-5.4s6.1 1.8 7.5 5.4"/></svg>',
    bag: '<svg viewBox="0 0 24 24"><path d="M5 8h14l-1.2 11.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg>',
    arrow: '<svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    arrowL: '<svg viewBox="0 0 24 24"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    pin: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-3.6 19.3c-.1-.8-.2-2 0-2.9l1.2-5s-.3-.6-.3-1.5c0-1.4.8-2.5 1.8-2.5.9 0 1.3.7 1.3 1.5 0 .9-.6 2.2-.9 3.4-.2 1 .5 1.9 1.6 1.9 1.9 0 3.3-2 3.3-4.9 0-2.6-1.8-4.4-4.5-4.4-3 0-4.8 2.3-4.8 4.6 0 .9.4 1.9.8 2.4.1.1.1.2.1.3l-.3 1.2c0 .2-.2.2-.4.1-1.4-.6-2.2-2.6-2.2-4.2 0-3.4 2.5-6.6 7.2-6.6 3.8 0 6.7 2.7 6.7 6.3 0 3.7-2.4 6.8-5.6 6.8-1.1 0-2.2-.6-2.5-1.3l-.7 2.6c-.2.9-.9 2.1-1.4 2.9A10 10 0 1 0 12 2z"/></svg>',
    li: '<svg viewBox="0 0 24 24"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9 9h3.8v1.7h.1c.5-1 1.8-2 3.8-2 4 0 4.8 2.6 4.8 6V21h-4v-5.6c0-1.3 0-3-1.9-3s-2.1 1.4-2.1 2.9V21H9z"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    truck: '<svg viewBox="0 0 24 24"><path d="M3 6h11v10H3zM14 9h4l3 3v4h-7"/><circle cx="7" cy="17.5" r="1.6"/><circle cx="17" cy="17.5" r="1.6"/></svg>',
    store: '<svg viewBox="0 0 24 24"><path d="M4 9l1.5-4h13L20 9M4 9v10h16V9M4 9h16M9 19v-5h6v5"/></svg>',
    card: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M7 15h3"/></svg>',
    chat: '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z"/><path d="M8 10h8M8 13h5"/></svg>',
    leaf: '<svg viewBox="0 0 24 24"><path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14z"/><path d="M5 19l7-7"/></svg>',
    check: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16.5 9.5"/></svg>',
    google: '<svg viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.9 6.1C12.4 13.7 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.8c4.3-4 6.9-9.9 6.9-17.2z"/><path fill="#FBBC05" d="M10.5 28.6A14.6 14.6 0 0 1 9.5 24c0-1.6.3-3.2.8-4.6l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.8c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4.2-13.5-10l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>',
    wa: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 2.9 2.9 0 0 0-.9 2.2 5.1 5.1 0 0 0 1.1 2.7 11.6 11.6 0 0 0 4.4 3.9c1.6.7 2.3.8 3.1.6a2.7 2.7 0 0 0 1.7-1.2 2.2 2.2 0 0 0 .2-1.2c0-.1-.2-.2-.5-.3z"/></svg>',
    ig: '<svg viewBox="0 0 24 24"><path d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4zM17.3 5.5a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4zM21.9 7.9c-.1-1.6-.4-3-1.6-4.2S17.7 2.2 16.1 2.1C14.5 2 9.5 2 7.9 2.1 6.3 2.2 4.9 2.5 3.7 3.7S2.2 6.3 2.1 7.9C2 9.5 2 14.5 2.1 16.1c.1 1.6.4 3 1.6 4.2s2.6 1.5 4.2 1.6c1.6.1 6.6.1 8.2 0 1.6-.1 3-.4 4.2-1.6s1.5-2.6 1.6-4.2c.1-1.6.1-6.6 0-8.2zM19.8 18a3.2 3.2 0 0 1-1.8 1.8c-1.3.5-4.3.4-5.7.4s-4.4.1-5.7-.4A3.2 3.2 0 0 1 4.8 18c-.5-1.3-.4-4.3-.4-5.7s-.1-4.4.4-5.7A3.2 3.2 0 0 1 6.6 4.8C7.9 4.3 10.9 4.4 12.3 4.4s4.4-.1 5.7.4a3.2 3.2 0 0 1 1.8 1.8c.5 1.3.4 4.3.4 5.7s.1 4.4-.4 5.7z"/></svg>',
    fb: '<svg viewBox="0 0 24 24"><path d="M14 8.5V6.8c0-.8.2-1.3 1.4-1.3H17V2.2C16.7 2.1 15.6 2 14.4 2 11.8 2 10 3.6 10 6.5v2H7.4V12H10v10h4V12h2.7l.4-3.5H14z"/></svg>',
    tt: '<svg viewBox="0 0 24 24"><path d="M16.6 5.8A4.3 4.3 0 0 1 15.5 3h-3.1v12.4a2.6 2.6 0 1 1-2.6-2.6c.3 0 .5 0 .8.1V9.7a5.8 5.8 0 1 0 5 5.7V9.1a7.4 7.4 0 0 0 4.3 1.4V7.4a4.3 4.3 0 0 1-3.3-1.6z"/></svg>',
  };

  /* ----------------------------------------------------------------------
     Données
     ---------------------------------------------------------------------- */
  const DATA_FILES = { products: 'data/products.js', categories: 'data/categories.js', posts: 'data/posts.js', banners: 'data/bannieres.js', realisations: 'data/realisations.js', siteImages: 'data/site-images.js' };
  const DATA_VARS = { products: 'PB_PRODUCTS', categories: 'PB_CATEGORIES', posts: 'PB_POSTS', banners: 'PB_BANNIERES', realisations: 'PB_REALISATIONS', siteImages: 'PB_SITE_IMAGES' };
  const loading = {};
  const load = (...keys) => Promise.all(keys.map((k) => {
    if (window[DATA_VARS[k]]) return window[DATA_VARS[k]];
    return (loading[k] ||= new Promise((res, rej) => {
      const s = doc.createElement('script');
      s.src = DATA_FILES[k]; s.onload = () => res(window[DATA_VARS[k]]); s.onerror = rej;
      doc.head.appendChild(s);
    }));
  }));

  const products = () => window.PB_PRODUCTS || [];
  const categories = () => window.PB_CATEGORIES || {};
  let skuIndex = null;
  const bySku = (sku) => {
    if (!skuIndex) skuIndex = new Map(products().map((p) => [p.sku, p]));
    return skuIndex.get(sku);
  };
  const inCat = (slug) => products().filter((p) => p.cats.includes(slug));
  const cat = (slug) => categories()[slug];
  const NOISE = new Set(['accueil', 'racine', 'parquet', 'par-finition', 'par-motif', 'par-couleur', 'par-essence', 'promotions', 'parquet-salon', 'parquet-chambre', 'parquet-entree-couloir', 'parquet-bureau-usage-commercial', 'non-classe']);
  /** Catégorie la plus parlante pour l'étiquette d'une carte. */
  const mainCat = (p) => {
    const c = categories();
    const facet = (s) => ['par-couleur', 'par-finition', 'par-essence', 'par-motif'].includes(c[s].parent);
    let cands = p.cats.filter((s) => !NOISE.has(s) && c[s] && !facet(s));
    if (!cands.length) cands = p.cats.filter((s) => !NOISE.has(s) && c[s]);
    cands.sort((a, b) => (c[a].count || 0) - (c[b].count || 0));
    return cands[0] ? c[cands[0]].name : (p.cats.includes('accessoires') ? 'Accessoire' : 'Parquet');
  };

  /* ----------------------------------------------------------------------
     Formatage & prix (les prix source sont HT ; TVA 20 %)
     ---------------------------------------------------------------------- */
  const TVA = 1.2;
  const nf = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const money = (n) => `${nf.format(n)} €`;
  const ttc = (n) => Math.round(n * TVA * 100) / 100;
  const discount = (p) => (p.regular && p.price < p.regular ? Math.round((1 - p.price / p.regular) * 100) : 0);
  const unitLabel = (p) => ({ 'm²': 'm²', ml: 'ml', Kg: 'kg', kg: 'kg', 'Pièce': 'pièce' }[p.unit] || 'unité');
  const productUrl = (p) => `produit.html?ref=${encodeURIComponent(p.sku)}`;
  const catUrl = (slug) => `catalogue.html?c=${encodeURIComponent(slug)}`;
  const PLACEHOLDER = 'assets/img/placeholder.svg';

  /* ----------------------------------------------------------------------
     Carte produit
     ---------------------------------------------------------------------- */
  const productCard = (p, { eager = false } = {}) => {
    const d = discount(p);
    const isNew = p.id > 47000 && !d;
    const st = p.stock || {};
    const lot = p.cats.includes('lots-de-fin-de-serie');
    const stockTag = st.in === false ? '<span class="tag tag--out">Rupture de stock</span>'
      : /limit/i.test(st.label || '') ? '<span class="tag tag--low">Stock limité</span>'
      : lot ? `<span class="tag tag--ink">Fin de série${st.qty && p.unit === 'm²' ? ` · ${st.qty} m²` : ''}</span>` : '';
    const [a, b] = p.imgs;
    const unit = unitLabel(p);
    return `<article class="pcard" data-sku="${esc(p.sku)}">
      <a class="pcard__media" href="${productUrl(p)}" tabindex="-1" aria-hidden="true">
        <span class="pcard__tags">${d ? `<span class="tag tag--promo">−${d} %</span>` : ''}${isNew && !stockTag ? '<span class="tag">Nouveau</span>' : ''}${stockTag}</span>
        <img src="${esc(a || PLACEHOLDER)}" alt="" ${eager ? '' : 'loading="lazy"'} decoding="async" draggable="false">
        ${b ? `<img src="${esc(b)}" alt="" loading="lazy" decoding="async" draggable="false">` : ''}
      </a>
      <button class="pcard__quick" type="button" data-add="${esc(p.sku)}" aria-label="Ajouter ${esc(p.name)} au panier">${I.plus.replace('<svg', '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6"')} Panier</button>
      <div class="pcard__body">
        <div class="pcard__cat">${esc(mainCat(p))}</div>
        <h3 class="pcard__title"><a href="${productUrl(p)}">${esc(p.name)}</a></h3>
        <div class="pcard__price">${p.regular ? `<s>${money(ttc(p.regular))}</s>` : ''}<b>${money(ttc(p.price))}</b><small>TTC / ${unit}</small></div>
        <div class="pcard__ttc">${money(p.price)} HT · Réf. ${esc(p.sku)}</div>
      </div>
    </article>`;
  };

  /* ----------------------------------------------------------------------
     Panier (localStorage) — quantité = colis pour les produits au m²
     ---------------------------------------------------------------------- */
  const CART_KEY = 'pb-cart-v1';
  const FREE_SHIP_HT = 1000; // livraison offerte dès 1 000 € HT (France métropolitaine, hors montagne et îles)
  const FREE_SHIP = FREE_SHIP_HT * TVA; // seuil exprimé en TTC pour le panier
  const store = {
    get() { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; } },
    set(v) { try { localStorage.setItem(CART_KEY, JSON.stringify(v)); } catch { /* navigation privée */ } },
  };
  const cart = {
    items: () => store.get(),
    count: () => store.get().length, // nombre de références (les unités diffèrent : colis, ml, pièces)
    lineTotal(i) { const p = bySku(i.sku); if (!p) return 0; const eco = p.eco && p.eco.amount ? p.eco.amount : 0; return ttc(p.price + eco) * (p.pack && p.unit === 'm²' ? p.pack : 1) * i.qty; },
    total() { return store.get().reduce((n, i) => n + cart.lineTotal(i), 0); },
    add(sku, qty = 1, { silent = false } = {}) {
      const items = store.get(); const it = items.find((i) => i.sku === sku);
      if (it) it.qty += qty; else items.push({ sku, qty });
      store.set(items); cart.emit();
      const p = bySku(sku);
      if (!silent && p) toast(`<img src="${esc(p.imgs[0] || PLACEHOLDER)}" alt=""><span><b>${esc(p.name)}</b><br>ajouté au panier</span><a href="#" data-open-cart>Voir</a>`);
    },
    setQty(sku, qty) { let items = store.get(); items = qty > 0 ? items.map((i) => (i.sku === sku ? { ...i, qty } : i)) : items.filter((i) => i.sku !== sku); store.set(items); cart.emit(); },
    clear() { store.set([]); cart.emit(); },
    emit() { doc.dispatchEvent(new CustomEvent('pb:cart')); },
  };
  addEventListener('storage', (e) => e.key === CART_KEY && cart.emit());

  /* ----------------------------------------------------------------------
     Sélection « devis » (bouton « Ajouter au devis » des fiches → devis.html)
     ---------------------------------------------------------------------- */
  const DEVIS_KEY = 'pb-devis-v1';
  const devisStore = {
    get() { try { return JSON.parse(localStorage.getItem(DEVIS_KEY)) || []; } catch { return []; } },
    set(v) { try { localStorage.setItem(DEVIS_KEY, JSON.stringify(v)); } catch { /* ignore */ } doc.dispatchEvent(new CustomEvent('pb:devis')); },
  };
  const devis = {
    items: () => devisStore.get(),
    count: () => devisStore.get().length,
    has: (sku) => devisStore.get().some((i) => i.sku === sku),
    add(sku, surface = null) { const l = devisStore.get(); const it = l.find((i) => i.sku === sku); if (it) { if (surface) it.surface = surface; } else l.push({ sku, surface }); devisStore.set(l); },
    setSurface(sku, surface) { devisStore.set(devisStore.get().map((i) => (i.sku === sku ? { ...i, surface } : i))); },
    remove(sku) { devisStore.set(devisStore.get().filter((i) => i.sku !== sku)); },
    clear() { devisStore.set([]); },
  };

  /* ----------------------------------------------------------------------
     Consentement (bandeau cookies façon tarteaucitron : GTM/GA4, Google Ads, YouTube)
     ---------------------------------------------------------------------- */
  const CONSENT_KEY = 'pb-consent-v1';
  const CONSENT_SERVICES = [
    ['analytics', 'Mesure d’audience', 'Google Tag Manager et Google Analytics 4 : statistiques de visite anonymisées.'],
    ['ads', 'Publicité', 'Google Ads : mesure de l’efficacité de nos campagnes.'],
    ['youtube', 'Vidéos YouTube', 'Lecture des vidéos produits et tutoriels hébergées sur YouTube.'],
  ];
  const consent = {
    state() { try { return JSON.parse(localStorage.getItem(CONSENT_KEY)); } catch { return null; } },
    has(svc) { const s = consent.state(); return !!(s && s[svc]); },
    save(v) { try { localStorage.setItem(CONSENT_KEY, JSON.stringify({ ...v, date: new Date().toISOString() })); } catch { /* ignore */ } doc.dispatchEvent(new CustomEvent('pb:consent')); },
    open() { openConsent(true); },
  };
  /** Lecteur YouTube soumis au consentement (vignette + bouton, iframe youtube-nocookie après accord). */
  function youtube(id, { title = 'Vidéo', autoplay = true } = {}) {
    const thumb = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
    return `<div class="yt" data-yt="${esc(id)}" data-yt-title="${esc(title)}" data-autoplay="${autoplay ? 1 : 0}">
      <img src="${thumb}" alt="" loading="lazy"><button type="button" class="yt__play" aria-label="Lire la vidéo : ${esc(title)}"><svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z"/></svg></button>
      <p class="yt__note">La lecture charge YouTube, qui peut déposer des cookies. <button type="button" data-consent-open>Gérer mes choix</button></p></div>`;
  }
  /** Bandeau de consentement : au premier passage, puis via « Gérer mes cookies » (pied de page, icône). */
  function openConsent(details = false) {
    let box = $('[data-consent]');
    if (!box) {
      box = doc.createElement('div'); box.className = 'consent'; box.dataset.consent = ''; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Gestion des cookies');
      doc.body.appendChild(box);
    }
    const s = consent.state() || {};
    box.innerHTML = `<div class="consent__panel">
      <p class="consent__title">Vos choix de cookies</p>
      <p class="consent__text">Nous utilisons des cookies pour mesurer l’audience, améliorer nos campagnes et afficher les vidéos. Les cookies nécessaires au fonctionnement du site (panier, compte) sont toujours actifs. <a href="legal.html?p=confidentialite">Politique de confidentialité</a></p>
      <div class="consent__list" ${details ? '' : 'hidden'}>${CONSENT_SERVICES.map(([k, l, d]) => `<label class="consent__row"><span><b>${l}</b><small>${d}</small></span><input type="checkbox" data-svc="${k}" ${s[k] ? 'checked' : ''}><i aria-hidden="true"></i></label>`).join('')}</div>
      <div class="consent__actions">
        <button type="button" class="btn btn--line btn--sm" data-consent-refuse><span>Tout refuser</span></button>
        <button type="button" class="btn btn--line btn--sm" data-consent-custom ${details ? 'hidden' : ''}><span>Personnaliser</span></button>
        <button type="button" class="btn btn--line btn--sm" data-consent-save ${details ? '' : 'hidden'}><span>Enregistrer</span></button>
        <button type="button" class="btn btn--dark btn--sm" data-consent-accept><span>Tout accepter</span></button>
      </div></div>`;
    requestAnimationFrame(() => box.classList.add('is-on'));
    const close = () => { box.classList.remove('is-on'); };
    box.querySelector('[data-consent-accept]').onclick = () => { consent.save({ analytics: true, ads: true, youtube: true, decided: true }); close(); };
    box.querySelector('[data-consent-refuse]').onclick = () => { consent.save({ analytics: false, ads: false, youtube: false, decided: true }); close(); };
    box.querySelector('[data-consent-custom]').onclick = (e) => { box.querySelector('.consent__list').hidden = false; e.currentTarget.hidden = true; box.querySelector('[data-consent-save]').hidden = false; };
    box.querySelector('[data-consent-save]').onclick = () => { const v = { decided: true }; $$('[data-svc]', box).forEach((i) => (v[i.dataset.svc] = i.checked)); consent.save(v); close(); };
  }
  doc.addEventListener('click', (e) => { if (e.target.closest('[data-consent-open]')) { e.preventDefault(); openConsent(true); } });

  /* Modules chargés à la demande (configurateur, assistant, rétractation) */
  const modules = {};
  const loadModule = (name) => (modules[name] ||= new Promise((res, rej) => {
    const s = doc.createElement('script'); s.src = `assets/js/modules/${name}.js`; s.onload = () => res(window[`PB_${name}`]); s.onerror = rej; doc.head.appendChild(s);
  }));
  const configurateur = { open: (o) => load('products', 'categories').then(() => loadModule('configurateur')).then((m) => m.open(o)) };
  const assistant = { open: (o) => loadModule('assistant').then((m) => m.open(o)) };
  const retractation = { open: (o) => loadModule('retractation').then((m) => m.open(o)) };
  doc.addEventListener('click', (e) => {
    const t = e.target.closest('[data-configurateur], [data-assistant], [data-retractation]'); if (!t) return;
    e.preventDefault();
    if (t.hasAttribute('data-configurateur')) configurateur.open({ motif: t.dataset.configurateur || null });
    else if (t.hasAttribute('data-assistant')) assistant.open();
    else retractation.open();
  });

  doc.addEventListener('click', (e) => {
    const b = e.target.closest('.yt__play'); if (!b) return;
    const box = b.closest('[data-yt]');
    if (!consent.has('youtube')) consent.save({ ...(consent.state() || {}), youtube: true, decided: true });
    box.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${box.dataset.yt}?autoplay=1&rel=0" title="${box.dataset.ytTitle}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
  });

  /* ----------------------------------------------------------------------
     Bannières mensuelles
     ---------------------------------------------------------------------- */
  const today = () => {
    const d = qs('date');
    return d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : new Date().toISOString().slice(0, 10);
  };
  const banners = {
    /** Liste source : brouillon de l'outil admin si ?apercu=1, sinon data/bannieres.js */
    all() {
      if (qs('apercu') === '1') { try { const d = JSON.parse(localStorage.getItem('pb-bannieres-brouillon')); if (Array.isArray(d)) return d; } catch { /* ignore */ } }
      return window.PB_BANNIERES || [];
    },
    active(date = today()) {
      const all = banners.all();
      const only = qs('banniere'); if (only) { const b = all.find((x) => x.id === only); if (b) return [b]; }
      const on = all.filter((b) => !b.permanente && b.debut <= date && date <= b.fin);
      return on.length ? on : all.filter((b) => b.permanente);
    },
  };

  /* ----------------------------------------------------------------------
     Gabarit
     ---------------------------------------------------------------------- */
  const LOGO = 'assets/img/logo-premibel.png';
  /** Cible d'un lien de menu : slug de catégorie, page .html, ou 'configurateur'. */
  const menuLink = (target, label, cls = '', extra = '') => (target === 'configurateur'
    ? `<a class="${cls}" href="#" data-configurateur ${extra}>${esc(label)}</a>`
    : `<a class="${cls}" href="${/\.html/.test(target) ? target : catUrl(target)}" ${extra}>${esc(label)}</a>`);

  const megaHTML = () => (SITE.menu || []).filter((m) => m.cols).map((m, mi) => {
    const f = m.feature; const fc = f && cat(f.cat);
    let i = 0;
    const featureHTML = !f ? '' : `<a class="mega__feature reveal-item" style="--i:6" href="${f.configurateur ? '#' : catUrl(f.cat)}" ${f.configurateur ? 'data-configurateur' : ''}>
        <img src="${esc(f.img || (fc && fc.img) || PLACEHOLDER)}" alt="" loading="lazy"><div>${f.configurateur ? '<span class="mega__badge">Configurateur</span>' : ''}<b>${esc(f.title)}</b><span>${esc(f.text)}</span></div></a>`;
    return `<div class="mega__panel" data-panel="${mi}">
      <div class="mega__cols" style="--n:${m.cols.length}">${m.cols.map((c) => `<div>
        <h4 class="reveal-item" style="--i:${i++}">${c.link ? menuLink(c.link, c.title) : esc(c.title)}</h4>
        ${c.links.map(([l, s, lv]) => menuLink(s, l, `reveal-item${lv === 2 ? ' is-sub' : ''}`, `style="--i:${i++}"`)).join('')}</div>`).join('')}
        <a class="mega__all reveal-item" style="--i:${i++}" href="${m.href}">Tout voir : ${esc(m.label)} →</a></div>
      ${featureHTML}
    </div>`;
  }).join('');

  const navHTML = () => {
    let pi = 0;
    return (SITE.menu || []).map((m) => {
      const panel = m.cols ? pi++ : null;
      return `<a class="nav__link${m.accent ? ' nav__link--accent' : ''}" href="${m.href}"${panel !== null ? ` data-mega="${panel}" aria-haspopup="true"` : ''}><span>${esc(m.label)}</span></a>`;
    }).join('');
  };
  const navRightHTML = () => (SITE.menuRight || []).map((m) => (m.sub
    ? `<div class="dd"><a class="nav__link" href="${m.href}" aria-haspopup="true"><span>${esc(m.label)}</span><svg class="dd__chev" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></a><div class="dd__menu">${m.sub.map(([l, h]) => `<a href="${h}">${esc(l)}</a>`).join('')}</div></div>`
    : `<a class="nav__link" href="${m.href}"><span>${esc(m.label)}</span></a>`)).join('');

  const announceHTML = () => {
    const msgs = [];
    banners.active().forEach((b) => b.annonce && msgs.push(`<a href="${esc(b.cta?.href || b.lien || 'catalogue.html?c=promotions')}"><b>${esc(b.annonce)}</b></a>`));
    (SITE.announces || []).forEach(([t, h]) => msgs.push(`<a href="${h}">${esc(t)}</a>`));
    const row = msgs.map((m) => `<span>${m}</span><i></i>`).join('');
    return `<div class="announce" role="region" aria-label="Informations"><div class="announce__track">${row}<span aria-hidden="true" class="announce__dup">${row}</span></div><a class="announce__stores" href="magasins.html">${I.store}<span>Magasins</span></a></div>`;
  };

  /* ---------- Bas de page commun (comme sur chaque page du site en ligne) ---------- */
  const FAQ = [
    ['Quel type de parquet choisir ?', 'Le choix dépend de votre budget, de la pièce concernée et de l’usage (résidentiel ou passage intensif). Nos conseillers vous orientent vers un parquet massif, contrecollé ou stratifié selon vos besoins.'],
    ['Quelle est la différence entre parquet massif et contrecollé ?', 'Le parquet massif est en bois noble sur toute son épaisseur, il peut être poncé de nombreuses fois. Le contrecollé associe une couche noble à un support stable, plus adapté aux sols chauffants et aux variations d’humidité.'],
    ['Peut-on poser du parquet dans une cuisine ?', 'Oui, à condition de choisir une essence adaptée et une finition huilée ou vitrifiée résistante à l’humidité et aux petits chocs du quotidien.'],
    ['Les professionnels peuvent-ils bénéficier de tarifs dédiés ?', 'Oui, un espace et des tarifs dédiés existent pour les professionnels du bâtiment et de la décoration. Contactez-nous pour ouvrir un compte pro.'],
    ['Où voir les parquets en vrai ?', 'Vous pouvez venir découvrir nos parquets dans nos showrooms parisiens (boulevard Voltaire, rue de la Roquette, rue Balard) et à notre entrepôt de Pantin, du lundi au samedi.'],
  ];
  /** Bande de services compacte (délais + réassurance) : une seule rangée, présente sur toutes les pages. */
  const serviceStripHTML = () => {
    const d = SITE.delivery || {};
    const zones = (d.zones || []).map(([z, t]) => `${esc(z)} ${esc(t.replace(/ jours?/, ' j').replace('environ ', '≈ '))}`).join(' · ');
    const item = (icon, b, s, href) => `<a class="svc__item" href="${href}">${icon}<span><b>${b}</b><small>${s}</small></span></a>`;
    return `<section class="svc container" aria-label="Nos services">
      ${item(I.truck, 'Livraison sur rendez-vous', zones, 'livraison.html')}
      ${item(I.store, 'Click & Collect', 'Retrait à l’entrepôt de Pantin', 'livraison.html')}
      ${item('<svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>', 'Paiement sécurisé', 'CB, virement, Alma 2× 3× 4×', 'paiement.html')}
      ${item(I.chat, 'Conseils personnalisés', 'Experts 6 j/7, en showroom ou à distance', 'contact.html')}
      ${item(I.leaf, 'Engagement durable', 'Bois issus de forêts gérées (FSC, PEFC)', 'engagement.html')}
    </section>`;
  };
  /** Bas de page : bande de services partout ; FAQ + rappel + « unique » sur l'accueil seulement. */
  const prefooterHTML = (mode) => {
    if (mode === 'none') return '';
    if (mode === 'lite') return `<div class="prefooter">${serviceStripHTML()}</div>`;
    return `<div class="prefooter">
      <section class="help container" id="faq">
        <div>
          <p class="eyebrow reveal">Foire aux questions</p>
          <h2 class="h2 split">Nous répondons aux questions <em>les plus répandues.</em></h2>
          <div class="faq">${FAQ.map(([q, a]) => `<details class="reveal"><summary>${esc(q)}</summary><div class="faq__a"><p>${esc(a)}</p></div></details>`).join('')}</div>
        </div>
        <form class="help__form reveal" data-callback-form novalidate>
          <h3>Vous souhaitez obtenir davantage de <em>renseignements ?</em></h3>
          <p>Écrivez-nous directement à <a href="mailto:${esc(SITE.emailVad || '')}">${esc(SITE.emailVad || '')}</a> ou utilisez le formulaire pour être recontacté par un conseiller Premibel Parquet.</p>
          <div class="fields-2">
            <div class="field"><input id="cb-nom" name="nom" placeholder=" " required autocomplete="family-name"><label for="cb-nom">Nom *</label></div>
            <div class="field"><input id="cb-prenom" name="prenom" placeholder=" " required autocomplete="given-name"><label for="cb-prenom">Prénom *</label></div>
          </div>
          <div class="field"><input id="cb-mail" name="email" type="email" placeholder=" " required autocomplete="email"><label for="cb-mail">E-mail *</label></div>
          <div class="field"><textarea id="cb-msg" name="message" rows="3" placeholder=" " required></textarea><label for="cb-msg">Votre message *</label></div>
          <div class="hp" aria-hidden="true"><label>Société <input name="company_name" tabindex="-1" autocomplete="off"></label></div>
          <label class="check"><input type="checkbox" required> <span>J’accepte que mes données soient utilisées afin d’être recontacté au sujet de ma demande. En savoir plus dans notre <a href="legal.html?p=confidentialite">politique de confidentialité</a>.</span></label>
          <button class="btn btn--accent btn--block magnetic" type="submit"><span>Envoyer ma demande</span></button>
        </form>
      </section>
      <section class="unique container">
        <p class="eyebrow reveal">Ce qui rend Premibel Parquet unique</p>
        <p class="unique__text" data-words>Depuis plus de 33 ans, Premibel Parquet s’engage à offrir des produits d’exception, alliant performance technique, raffinement esthétique et respect de l’environnement. Toujours à l’écoute des tendances et des besoins des particuliers comme des professionnels, nous enrichissons régulièrement notre gamme avec de nouvelles essences, finitions et solutions décoratives.</p>
      </section>
      ${serviceStripHTML()}
    </div>`;
  };

  /** Pied de page compact : une rangée (coordonnées · liens · newsletter), liens SEO repliés, barre basse. */
  const footerHTML = () => {
    const s = SITE.socials || {};
    const tel = (n) => `tel:+33${n.replace(/\s/g, '').slice(1)}`;
    const soc = [['facebook', 'Facebook', I.fb], ['pinterest', 'Pinterest', I.pin], ['tiktok', 'TikTok', I.tt], ['instagram', 'Instagram', I.ig], ['linkedin', 'LinkedIn', I.li]];
    const col = (title, links) => `<details class="fcol" open><summary>${title}</summary><div>${links}</div></details>`;
    return `<footer class="footer">
      <div class="container footer__grid">
        <div class="footer__brand">
          <img src="${LOGO}" alt="Premibel Parquet" width="843" height="206" loading="lazy">
          <p>Créateur de tendances parquet depuis 33 ans.</p>
          <a class="footer__tel" href="${tel(SITE.phone)}">${esc(SITE.phone)}</a>
          <a class="footer__line" href="${SITE.whatsapp}" target="_blank" rel="noopener">${I.wa} ${esc(SITE.mobile || '')} · WhatsApp</a>
          <a class="footer__line" href="mailto:${esc(SITE.email)}">${esc(SITE.email)}</a>
          <div class="footer__socials">${soc.filter(([k]) => s[k]).map(([k, l, ic]) => `<a href="${s[k]}" target="_blank" rel="noopener" aria-label="${l}">${ic}</a>`).join('')}</div>
        </div>
        <nav class="footer__cols" aria-label="Pied de page">
          ${col('Nos parquets', `<a href="histoire.html">Premibel Histoire</a><a href="${catUrl('promotions')}">Promotions</a><a href="${catUrl('parquet-massif')}">Parquet massif</a><a href="${catUrl('parquet-flottant')}">Parquet flottant</a><a href="realisations.html">Réalisations</a><a href="journal.html">Astuces & Conseils</a>`)}
          ${col('Services', `<a href="devis.html">Demande de devis</a><a href="rendez-vous.html">Prise de rendez-vous</a><a href="commande.html">Comment commander</a><a href="devis.html#video">Comment demander un devis</a><a href="pro.html">Pro ? Guide inscription</a><a href="compte.html">Mon compte</a>`)}
          ${col('Magasins', `<a href="magasins.html">Nos magasins</a>${(SITE.stores || []).map((st) => `<a href="magasin.html?m=${st.slug}">${esc(st.name)}</a>`).join('')}<a href="expertise.html">Notre expertise</a>`)}
          ${col('Législation', `<a href="livraison.html">Livraison</a><a href="legal.html?p=cgv">CGV</a><a href="legal.html?p=mentions">Mentions légales</a><a href="legal.html?p=retours">Retours</a><a href="legal.html?p=confidentialite">Confidentialité</a><a href="#" data-retractation>Se rétracter</a>`)}
        </nav>
        <form class="footer__news" data-newsletter novalidate>
          <p class="footer__newsT">Newsletter</p>
          <p class="footer__newsTxt">Nouveautés, ventes privées et conseils d’entretien.</p>
          <div class="nform"><input type="email" placeholder="Votre e-mail" aria-label="Adresse e-mail" required><button class="btn btn--light btn--sm" type="submit"><span>S’inscrire</span></button></div>
          <label class="check check--dark"><input type="checkbox" required> <span>J’accepte la <a href="legal.html?p=confidentialite">politique de confidentialité</a>.</span></label>
        </form>
      </div>
      <div class="container">
        <details class="fseo"><summary>Explorer nos parquets par couleur, motif, largeur, finition et essence</summary>
          <div class="footer__seo">${(SITE.footerSeo || []).map((c) => `<div><h4>${esc(c.title)}</h4>${c.links.map(([l, sl]) => `<a href="${catUrl(sl)}">${esc(l)}</a>`).join('')}</div>`).join('')}</div>
        </details>
      </div>
      <div class="container footer__bottom">
        <span>© ${new Date().getFullYear()} Premibel Parquet</span>
        <span class="footer__pay" aria-label="Moyens de paiement"><span>CB</span><span>Visa</span><span>Mastercard</span><span>PayPal</span><span>Alma</span><span>Virement</span></span>
        <span><a href="#" data-consent-open>Cookies</a> · <a href="plan.html">Plan du site</a> · Site conçu par <a href="https://lanationduweb.fr" target="_blank" rel="noopener">La Nation du Web</a></span>
      </div>
    </footer>`;
  };

  const mnavHTML = () => {
    const block = (m) => {
      if (!m.cols) return `<a class="mnav__top" href="${m.href}">${esc(m.label)}</a>`;
      return `<details><summary>${esc(m.label)}</summary><div class="mnav__sub">
        ${m.label === 'Parquet' ? '<a href="#" data-configurateur class="mnav__cfg">Trouver mon parquet →</a>' : ''}
        ${m.cols.map((c) => `<p class="mnav__h">${c.link ? menuLink(c.link, c.title) : esc(c.title)}</p>${c.links.map(([l, sl, lv]) => menuLink(sl, l, lv === 2 ? 'is-sub' : '')).join('')}`).join('')}
        <a class="mnav__all" href="${m.href}">Tout voir →</a></div></details>`;
    };
    return `<nav class="mnav" aria-label="Menu mobile" data-mnav>
      <div>${(SITE.menu || []).map(block).join('')}</div>
      <div class="mnav__links">${(SITE.menuRight || []).flatMap((m) => (m.sub ? m.sub.map(([l, h]) => `<a href="${h}">${esc(l)}</a>`) : [`<a href="${m.href}">${esc(m.label)}</a>`])).join('')}<a href="magasins.html">Magasins</a><a href="realisations.html">Réalisations</a><a href="pro.html">Espace pro</a><a href="compte.html">Mon compte</a></div>
      <a class="btn btn--dark" href="rendez-vous.html"><span>Prendre rendez-vous</span>${I.arrow}</a>
      <ul class="mnav__pictos"><li>${I.store}Retrait magasin</li><li>${I.truck}Livraison rapide</li><li>${I.card}Sécurisé</li></ul>
    </nav>`;
  };

  function renderLayout() {
    if (doc.body.dataset.chrome === 'none') {
      const t = doc.createElement('div');
      t.innerHTML = '<div class="toast" data-toast role="status" aria-live="polite"></div>';
      doc.body.append(...t.children);
      return false;
    }
    const top = doc.createElement('div');
    top.innerHTML = `<a class="skip" href="#main">Aller au contenu</a>${announceHTML()}
      <header class="header" data-header>
        <div class="header__bar">
          <div class="header__inner">
            <button class="burger" aria-label="Menu" aria-expanded="false" data-burger><span></span><span></span></button>
            <nav class="nav nav--left" aria-label="Catalogue">${navHTML()}</nav>
            <a class="logo" href="index.html" aria-label="Premibel Parquet — accueil"><img src="${LOGO}" alt="Premibel Parquet" width="843" height="206"></a>
            <nav class="nav nav--right" aria-label="Services">
              ${navRightHTML()}
              <div class="icons">
                <button class="icon-btn" aria-label="Rechercher (Ctrl+K)" data-search-open>${I.search}</button>
                <div class="dd dd--icon icon-btn--account"><a class="icon-btn" aria-label="Mon compte" href="compte.html" aria-haspopup="true">${I.user}</a><div class="dd__menu dd__menu--end"><a href="compte.html?onglet=connexion">Connexion</a><a href="compte.html?onglet=inscription">Inscription</a><a href="pro.html">Espace professionnel</a><a href="devis.html">Mon devis <b data-devis-count></b></a></div></div>
                <button class="icon-btn" aria-label="Panier" data-open-cart>${I.bag}<b class="badge" data-cart-count>0</b></button>
              </div>
            </nav>
          </div>
        </div>
        <div class="mega" data-mega-wrap>${megaHTML()}</div>
      </header>
      <div class="scrim" data-scrim></div>
      ${mnavHTML()}`;
    doc.body.prepend(...top.children);

    const page = doc.body.dataset.page || '';
    const mode = doc.body.dataset.prefooter || (page === 'home' ? 'full' : 'lite'); // FAQ + rappel : accueil seulement
    const tail = doc.createElement('div');
    tail.innerHTML = `${doc.body.dataset.footer === 'none' ? '' : prefooterHTML(mode) + footerHTML()}
      <div class="search" data-search role="dialog" aria-modal="true" aria-label="Recherche">
        <div class="search__panel">
          <div class="search__top">${I.search}<input type="search" placeholder="Chêne massif, point de Hongrie, réf…" autocomplete="off" data-search-input aria-label="Rechercher un produit"><button class="search__close" data-search-close>Échap</button></div>
          <div class="search__body" data-search-body></div>
        </div>
      </div>
      <aside class="drawer" data-drawer aria-label="Panier" aria-hidden="true">
        <div class="drawer__head"><h3>Votre panier</h3><button class="icon-btn" data-close-cart aria-label="Fermer">${I.close}</button></div>
        <div class="drawer__body" data-drawer-body></div>
        <div class="drawer__foot" data-drawer-foot></div>
      </aside>
      <div class="toast" data-toast role="status" aria-live="polite"></div>
      <button class="wa help-fab" type="button" data-assistant aria-label="Besoin d’aide ? Assistant Premibel">${I.chat}<span class="wa__tip">Besoin d’aide ?</span></button>
      <div class="pt" data-pt aria-hidden="true"><img src="${LOGO}" alt=""></div>`;
    doc.body.append(...tail.children);

    // lien actif
    const here = location.pathname.split('/').pop() || 'index.html';
    $$('.nav__link').forEach((a) => { if (a.getAttribute('href').split('?')[0] === here && here !== 'catalogue.html') a.setAttribute('aria-current', 'page'); });
    // pied de page : colonnes repliées en accordéon sur mobile
    if (matchMedia('(max-width: 780px)').matches) $$('.fcol').forEach((d) => { d.open = false; });
    // compteur devis
    const dc =() => $$('[data-devis-count]').forEach((b) => { const n = devis.count(); b.textContent = n ? `(${n})` : ''; });
    dc(); doc.addEventListener('pb:devis', dc);
  }

  /* ----------------------------------------------------------------------
     Comportements du gabarit
     ---------------------------------------------------------------------- */
  let lenis = null;
  const lock = (on) => { if (lenis) on ? lenis.stop() : lenis.start(); doc.body.style.overflow = on ? 'hidden' : ''; };

  function bindHeader() {
    const header = $('[data-header]');
    const scrim = $('[data-scrim]');
    let lastY = 0;
    const onScroll = (y) => {
      header.classList.toggle('is-scrolled', y > 10);
      if (y > 420 && y > lastY + 3 && !header.classList.contains('mega-open')) header.classList.add('is-hidden');
      else if (y < lastY - 3 || y < 420) header.classList.remove('is-hidden');
      // le bouton WhatsApp suit l'en-tête : il s'efface pendant la lecture, revient en remontant
      const wa = $('.wa'); if (wa) wa.classList.toggle('is-away', header.classList.contains('is-hidden'));
      lastY = y;
    };
    PB.onScroll(onScroll);

    // Méga-menu : ouverture au survol avec intention (délai court), fermeture différée
    const wrap = $('[data-mega-wrap]');
    let tOpen, tClose, current = null;
    const open = (i) => {
      clearTimeout(tClose);
      $$('.mega__panel', wrap).forEach((p) => p.classList.toggle('is-active', p.dataset.panel === String(i)));
      $$('[data-mega]').forEach((a) => a.classList.toggle('is-open', a.dataset.mega === String(i)));
      wrap.classList.add('is-open'); scrim.classList.add('is-on'); header.classList.add('mega-open'); current = i;
    };
    const close = () => {
      clearTimeout(tOpen);
      wrap.classList.remove('is-open'); scrim.classList.remove('is-on'); header.classList.remove('mega-open'); current = null;
      $$('[data-mega]').forEach((a) => a.classList.remove('is-open'));
    };
    $$('[data-mega]').forEach((a) => {
      a.addEventListener('pointerenter', () => { clearTimeout(tOpen); tOpen = setTimeout(() => open(a.dataset.mega), current === null ? 90 : 0); });
      a.addEventListener('pointerleave', () => { clearTimeout(tOpen); tClose = setTimeout(close, 220); });
      a.addEventListener('focus', () => open(a.dataset.mega));
    });
    wrap.addEventListener('pointerenter', () => clearTimeout(tClose));
    wrap.addEventListener('pointerleave', () => { tClose = setTimeout(close, 180); });
    $$('.nav--right .nav__link, .logo').forEach((a) => a.addEventListener('pointerenter', close));
    scrim.addEventListener('click', close);
    addEventListener('keydown', (e) => e.key === 'Escape' && close());

    // Menu mobile
    const burger = $('[data-burger]');
    burger.addEventListener('click', () => {
      const on = !doc.body.classList.contains('menu-open');
      doc.body.classList.toggle('menu-open', on); burger.setAttribute('aria-expanded', on); lock(on);
    });
  }

  /* Recherche instantanée */
  function bindSearch() {
    const box = $('[data-search]'), input = $('[data-search-input]'), body = $('[data-search-body]');
    let focus = -1;
    const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const idle = () => {
      body.innerHTML = `<p class="search__label">Recherches populaires</p><div class="chips">${(SITE.topSearches || []).map(([l, h]) => `<a class="chip" href="${h}">${esc(l)}</a>`).join('')}</div>`;
    };
    const run = () => {
      const q = norm(input.value.trim());
      if (q.length < 2) return idle();
      const terms = q.split(/\s+/);
      const res = [];
      for (const p of products()) {
        const hay = p._n || (p._n = norm(`${p.name} ${p.sku} ${Object.values(p.spec).join(' ')}`));
        if (terms.every((t) => hay.includes(t))) { res.push(p); if (res.length >= 8) break; }
      }
      const cats = Object.values(categories()).filter((c) => c.count && terms.every((t) => norm(c.name).includes(t))).slice(0, 5);
      const hl = (s) => { let out = esc(s); terms.forEach((t) => { out = out.replace(new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<mark>$1</mark>'); }); return out; };
      body.innerHTML = (cats.length ? `<p class="search__label">Catégories</p><div class="chips" style="margin-bottom:1.4rem">${cats.map((c) => `<a class="chip" href="${catUrl(c.slug)}">${esc(c.name)} <small class="muted">${c.count}</small></a>`).join('')}</div>` : '')
        + (res.length ? `<p class="search__label">Produits</p><div class="search__results">${res.map((p) => `<a class="sres" href="${productUrl(p)}"><img src="${esc(p.imgs[0] || PLACEHOLDER)}" alt="" loading="lazy"><span><b>${hl(p.name)}</b><small>Réf. ${esc(p.sku)} · ${esc(mainCat(p))}</small></span><span class="sres__price">${p.regular ? `<s>${money(ttc(p.regular))}</s>` : ''}${money(ttc(p.price))}</span></a>`).join('')}</div>`
          : `<p class="search__empty">Aucun produit pour « ${esc(input.value)} ». Essayez « chêne huilé » ou une référence.</p>`);
      focus = -1;
    };
    const open = async () => {
      box.classList.add('is-open'); lock(true); idle();
      setTimeout(() => input.focus(), 60);
      await load('products', 'categories'); if (input.value) run();
    };
    const close = () => { box.classList.remove('is-open'); lock(false); };
    doc.addEventListener('click', (e) => { if (e.target.closest('[data-search-open]')) { e.preventDefault(); open(); } });
    $('[data-search-close]').addEventListener('click', close);
    box.addEventListener('click', (e) => e.target === box && close());
    input.addEventListener('input', run);
    input.addEventListener('keydown', (e) => {
      const items = $$('.sres', body);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault(); focus = (focus + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        items.forEach((it, i) => it.classList.toggle('is-focus', i === focus));
      } else if (e.key === 'Enter') {
        const t = items[focus] || items[0]; if (t) location.href = t.href;
      }
    });
    addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && box.classList.contains('is-open')) close();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); open(); }
    });
  }

  /* Panier : tiroir */
  function bindCart() {
    const drawer = $('[data-drawer]'), body = $('[data-drawer-body]'), foot = $('[data-drawer-foot]'), scrim = $('[data-scrim]');
    const badge = $('[data-cart-count]');
    const render = () => {
      const n = cart.count();
      badge.textContent = n; badge.classList.toggle('is-on', n > 0);
      const items = cart.items();
      if (!items.length) {
        body.innerHTML = `<div class="drawer__empty"><p>Votre panier est vide.</p><a class="btn btn--dark btn--sm" href="${catUrl('parquet')}"><span>Découvrir nos parquets</span></a></div>`;
        foot.innerHTML = ''; return;
      }
      body.innerHTML = items.map((i) => {
        const p = bySku(i.sku); if (!p) return '';
        const m2 = p.unit === 'm²' && p.pack ? ` · ${nf.format(p.pack * i.qty)} m²` : '';
        return `<div class="citem"><img src="${esc(p.imgs[0] || PLACEHOLDER)}" alt=""><div><b>${esc(p.name)}</b><small>Réf. ${esc(p.sku)}${p.unit === 'm²' ? ` · ${i.qty} colis` : ''}${m2}</small>
          <div class="citem__row"><span class="qty"><button data-q="-1" data-sku="${esc(p.sku)}" aria-label="Moins">−</button><input value="${i.qty}" inputmode="numeric" data-qi="${esc(p.sku)}" aria-label="Quantité"><button data-q="1" data-sku="${esc(p.sku)}" aria-label="Plus">+</button></span><b>${money(cart.lineTotal(i))}</b></div>
          <button class="citem__rm" data-rm="${esc(p.sku)}">Retirer</button></div></div>`;
      }).join('');
      const total = cart.total();
      const left = Math.max(0, FREE_SHIP - total);
      foot.innerHTML = `<div class="ship-meter">${left ? `Plus que <b>${money(left)}</b> TTC pour la livraison offerte*` : 'Livraison offerte* ✓'}<div class="ship-meter__bar"><span style="transform:scaleX(${Math.min(1, total / FREE_SHIP)})"></span></div></div>
        <div class="drawer__total"><span>Total TTC</span><b>${money(total)}</b></div>
        <a class="btn btn--dark btn--block" href="panier.html"><span>Voir le panier</span>${I.arrow}</a>
        <small class="muted" style="text-align:center">Paiement en 2×, 3× ou 4× sans frais avec Alma</small>`;
    };
    const open = () => { if (!window.PB_PRODUCTS) { load('products').then(() => { render(); open(); }); return; } render(); drawer.classList.add('is-open'); drawer.setAttribute('aria-hidden', 'false'); scrim.classList.add('is-on'); lock(true); };
    const close = () => { drawer.classList.remove('is-open'); drawer.setAttribute('aria-hidden', 'true'); scrim.classList.remove('is-on'); lock(false); };
    doc.addEventListener('click', (e) => {
      if (e.target.closest('[data-open-cart]')) { e.preventDefault(); open(); return; }
      if (e.target.closest('[data-close-cart]') || (e.target === scrim && drawer.classList.contains('is-open'))) close();
      const q = e.target.closest('[data-q]'); if (q) { const it = cart.items().find((i) => i.sku === q.dataset.sku); cart.setQty(q.dataset.sku, (it?.qty || 0) + +q.dataset.q); }
      const rm = e.target.closest('[data-rm]'); if (rm) cart.setQty(rm.dataset.rm, 0);
      const add = e.target.closest('[data-add]');
      if (add) {
        e.preventDefault(); const sku = add.dataset.add;
        load('products').then(() => { cart.add(sku, 1); flyToCart(add.closest('.pcard')?.querySelector('img') || add); });
      }
    });
    doc.addEventListener('change', (e) => { const qi = e.target.closest('[data-qi]'); if (qi) cart.setQty(qi.dataset.qi, Math.max(0, parseInt(qi.value, 10) || 0)); });
    addEventListener('keydown', (e) => e.key === 'Escape' && drawer.classList.contains('is-open') && close());
    doc.addEventListener('pb:cart', () => { render(); badge.classList.remove('bump'); void badge.offsetWidth; badge.classList.add('bump'); });
    const n = cart.count(); badge.textContent = n; badge.classList.toggle('is-on', n > 0);
    if (n) load('products').then(render);
  }

  /* Petite image qui « vole » vers l'icône panier */
  function flyToCart(src) {
    if (reduce || !src || !src.getBoundingClientRect) return;
    const target = $('[data-open-cart]').getBoundingClientRect();
    const r = src.getBoundingClientRect();
    const ghost = doc.createElement('img');
    ghost.src = src.currentSrc || src.src || PLACEHOLDER;
    Object.assign(ghost.style, { position: 'fixed', zIndex: 120, left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px`, objectFit: 'cover', borderRadius: '16px', pointerEvents: 'none' });
    doc.body.appendChild(ghost);
    const dx = target.left + target.width / 2 - (r.left + r.width / 2), dy = target.top + target.height / 2 - (r.top + r.height / 2);
    ghost.animate([
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${dx * .6}px, ${dy * .3 - 60}px) scale(.45)`, opacity: .9, offset: .55 },
      { transform: `translate(${dx}px, ${dy}px) scale(.06)`, opacity: .2 },
    ], { duration: 820, easing: 'cubic-bezier(.65,0,.35,1)' }).onfinish = () => ghost.remove();
  }

  let toastT;
  function toast(htmlStr, ms = 3200) {
    const t = $('[data-toast]'); if (!t) return;
    t.innerHTML = htmlStr; t.classList.add('is-on');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('is-on'), ms);
  }

  /** Validation inline d'un champ .field (au blur et à l'envoi). */
  function checkField(f) {
    const field = f.closest('.field'); if (!field) return f.checkValidity();
    const ok = f.checkValidity(); field.classList.toggle('is-error', !ok);
    let err = field.querySelector('.field__err');
    if (!ok) { if (!err) { err = doc.createElement('p'); err.className = 'field__err'; field.appendChild(err); } err.textContent = f.validity.typeMismatch ? 'Adresse e-mail invalide.' : 'Ce champ est requis.'; } else if (err) err.remove();
    return ok;
  }
  function bindForms() {
    doc.addEventListener('focusout', (e) => { const f = e.target.closest('[data-callback-form] .field input, [data-callback-form] .field textarea'); if (f && f.value) checkField(f); });
    doc.addEventListener('submit', (e) => {
      const nf = e.target.closest('[data-newsletter]');
      if (nf) {
        e.preventDefault();
        const input = nf.querySelector('input[type=email]'), rgpd = nf.querySelector('input[type=checkbox]');
        if (!/^\S+@\S+\.\S+$/.test(input.value)) { input.focus(); toast('Adresse e-mail invalide'); return; }
        if (rgpd && !rgpd.checked) { rgpd.focus(); toast('Merci d’accepter la politique de confidentialité.'); return; }
        nf.innerHTML = '<p class="nform__ok">Merci ! Vous êtes inscrit·e à la newsletter Premibel.</p>';
        return;
      }
      const cf = e.target.closest('[data-callback-form]');
      if (!cf) return;
      e.preventDefault();
      if (cf.querySelector('[name=company_name]')?.value) return; // piège anti-spam
      const fields = $$('.field input, .field textarea', cf);
      const ok = fields.map(checkField).every(Boolean);
      const rgpd = $('input[type=checkbox]', cf);
      if (!ok) { fields.find((f) => !f.checkValidity()).focus(); return; }
      if (!rgpd.checked) { rgpd.focus(); toast('Merci d’accepter l’utilisation de vos données pour être recontacté.'); return; }
      const name = esc($('[name=prenom]', cf)?.value || '');
      cf.style.minHeight = `${cf.offsetHeight}px`;
      cf.innerHTML = `<div class="form-success">${I.check}<h3>Merci${name ? `, ${name}` : ''}</h3><p class="muted">Votre demande est bien enregistrée. Un conseiller Premibel Parquet vous recontacte dans les meilleurs délais.</p></div>`;
    });
  }

  /* Transition de page (rideau) — liens internes uniquement */
  function bindTransitions() {
    const pt = $('[data-pt]');
    if (reduce) return;
    // entrée : si on vient d'une transition, on lève le rideau
    if (sessionStorage.getItem('pb-pt') === '1') {
      sessionStorage.removeItem('pb-pt');
      pt.style.transform = 'scaleY(1)';
      requestAnimationFrame(() => requestAnimationFrame(() => { pt.style.transform = ''; pt.classList.add('is-entering'); setTimeout(() => pt.classList.remove('is-entering'), 800); }));
    }
    doc.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || !/\.html$/.test(url.pathname) || (url.pathname === location.pathname && url.search === location.search)) return;
      if (url.pathname === location.pathname && url.hash) return;
      e.preventDefault();
      sessionStorage.setItem('pb-pt', '1');
      pt.classList.add('is-leaving');
      setTimeout(() => { location.href = url.href; }, 520);
    });
    addEventListener('pageshow', (e) => { if (e.persisted) pt.classList.remove('is-leaving'); });
  }

  /* ----------------------------------------------------------------------
     Motion
     ---------------------------------------------------------------------- */
  const scrollCbs = [];
  const PB_onScroll = (fn) => scrollCbs.push(fn);

  function initScroll() {
    if (!reduce && window.Lenis) {
      lenis = new Lenis({ duration: 1.1, easing: (t) => 1 - Math.pow(1 - t, 4), smoothWheel: true });
      lenis.on('scroll', ({ scroll }) => scrollCbs.forEach((f) => f(scroll)));
      if (hasGsap) {
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((t) => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0);
      } else {
        const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); }; requestAnimationFrame(raf);
      }
      doc.addEventListener('click', (e) => {
        const a = e.target.closest('a[href^="#"]'); if (!a || a.getAttribute('href').length < 2) return;
        const t = $(a.getAttribute('href')); if (!t) return;
        e.preventDefault(); lenis.scrollTo(t, { offset: -90 });
      });
    } else addEventListener('scroll', () => scrollCbs.forEach((f) => f(scrollY)), { passive: true });
  }

  const splitWords = (el, cls = 'sw') => {
    if (el.dataset.split) return; el.dataset.split = '1';
    const walk = (node) => [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = doc.createDocumentFragment();
        // découpe sur les espaces ordinaires seulement : les insécables gardent « ? » avec son mot
        n.textContent.split(/([ \t\n]+)/).forEach((part) => {
          if (!part) return;
          if (/^[ \t\n]+$/.test(part)) { frag.appendChild(doc.createTextNode(part)); return; }
          const o = doc.createElement('span'); o.className = cls; const i = doc.createElement('span'); i.textContent = part; o.appendChild(i); frag.appendChild(o);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && !['SUP', 'BR', 'SVG'].includes(n.tagName)) walk(n);
    });
    walk(el);
  };

  /** Typographie française : espace fine insécable avant ? ! ; et dans les guillemets, insécable avant « : ». */
  const SKIP_TYPO = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'CODE', 'PRE', 'OPTION']);
  function frTypo(root = doc.body) {
    const w = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (SKIP_TYPO.has(n.parentNode?.nodeName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const t = n.nodeValue;
      if (!/[?!;:»«]/.test(t)) continue;
      const v = t.replace(/[  ]+([?!;»])/g, ' $1').replace(/«[  ]+/g, '« ').replace(/ +:(?=\s|$)/g, ' :');
      if (v !== t) n.nodeValue = v;
    }
  }

  /** Active les animations d'entrée sur un conteneur (à rappeler après rendu dynamique). */
  function motionIn(root = doc) {
    frTypo(root === doc ? doc.body : root);
    if (!motion) {
      $$('[data-count]', root).forEach((el) => (el.textContent = (el.dataset.prefix || '') + el.dataset.count + (el.dataset.suffix || '')));
      return;
    }
    $$('.split:not([data-split])', root).forEach((el) => {
      splitWords(el);
      gsap.from(el.querySelectorAll('.sw > span'), { yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: .03, scrollTrigger: { trigger: el, start: 'top 88%' } });
    });
    $$('[data-words]:not([data-split])', root).forEach((el) => {
      splitWords(el, 'w');
      gsap.to(el.querySelectorAll('.w'), { opacity: 1, stagger: .05, ease: 'none', scrollTrigger: { trigger: el, start: 'top 78%', end: 'bottom 50%', scrub: true } });
    });
    const reveals = $$('.reveal:not([data-rv])', root);
    reveals.forEach((el) => (el.dataset.rv = '1'));
    if (reveals.length) ScrollTrigger.batch(reveals, { start: 'top 92%', onEnter: (els) => gsap.to(els, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: .07, overwrite: true }) });
    $$('.media-reveal:not([data-rv])', root).forEach((m) => {
      m.dataset.rv = '1';
      const media = m.querySelector('img, video');
      const tl = gsap.timeline({ scrollTrigger: { trigger: m, start: 'top 88%' } });
      tl.to(m, { clipPath: 'inset(0% 0% 0% 0% round 18px)', duration: 1.5, ease: 'expo.out' });
      if (media) tl.to(media, { scale: 1, duration: 1.8, ease: 'expo.out' }, 0);
    });
    $$('[data-count]:not([data-rv])', root).forEach((el) => {
      el.dataset.rv = '1';
      const o = { v: 0 }, end = +el.dataset.count, pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
      gsap.to(o, { v: end, duration: 2, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 92%' }, onUpdate: () => (el.textContent = pre + Math.round(o.v) + suf) });
    });
    $$('[data-speed]:not([data-rv])', root).forEach((el) => {
      el.dataset.rv = '1';
      gsap.to(el, { yPercent: -10 * +el.dataset.speed, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    if (hover) $$('.magnetic:not([data-rv])', root).forEach((b) => {
      b.dataset.rv = '1';
      const xTo = gsap.quickTo(b, 'x', { duration: .6, ease: 'expo.out' }), yTo = gsap.quickTo(b, 'y', { duration: .6, ease: 'expo.out' });
      b.addEventListener('pointermove', (e) => { const r = b.getBoundingClientRect(); xTo((e.clientX - r.left - r.width / 2) * .25); yTo((e.clientY - r.top - r.height / 2) * .35); });
      b.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
    ScrollTrigger.refresh();
  }

  /* FAQ : ouverture douce de <details> */
  function bindDetails() {
    doc.addEventListener('click', (e) => {
      const s = e.target.closest('.faq summary'); if (!s || !motion) return;
      const d = s.parentElement, a = d.querySelector('.faq__a'); if (!a) return;
      e.preventDefault(); gsap.killTweensOf(a);
      if (d.open) gsap.to(a, { height: 0, duration: .45, ease: 'expo.out', onComplete: () => { d.open = false; a.style.height = ''; ScrollTrigger.refresh(); } });
      else { d.open = true; gsap.fromTo(a, { height: 0 }, { height: a.scrollHeight, duration: .6, ease: 'expo.out', onComplete: () => { a.style.height = ''; ScrollTrigger.refresh(); } }); }
    });
  }

  /* ----------------------------------------------------------------------
     Rail à inertie (Apple : suivi 1:1, projection d'élan d=0.998,
     ressort critique, rubber-band aux bords)
     ---------------------------------------------------------------------- */
  function rail(root, { track = root.querySelector('.rail__track'), progress, prev, next } = {}) {
    let x = 0, target = 0, min = 0, vel = 0, dragging = false, raf = 0, startX = 0, startY = 0, startPos = 0, hist = [], moved = false, axis = null;
    const step = () => { const c = track.firstElementChild; return c ? c.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 20) : 300; };
    const bounds = () => { const pl = parseFloat(getComputedStyle(root).paddingLeft) || 0; min = Math.min(0, root.clientWidth - track.scrollWidth - pl - parseFloat(getComputedStyle(root).paddingRight || 0) - 16); };
    const rubber = (o, d, c = .55) => (o * d * c) / (d + c * Math.abs(o));
    const project = (v, d = .998) => (v / 1000) * d / (1 - d);
    const render = () => {
      let shown = x;
      if (x > 0) shown = rubber(x, root.clientWidth); else if (x < min) shown = min + rubber(x - min, root.clientWidth);
      track.style.transform = `translate3d(${shown}px,0,0)`;
      if (progress) progress.style.transform = `scaleX(${min ? Math.max(.06, Math.min(1, x / min)) : 1})`;
    };
    const springTo = (to) => {
      target = Math.max(min, Math.min(0, to)); cancelAnimationFrame(raf);
      const w = 2 * Math.PI / .45; let last = performance.now();
      const tick = (now) => {
        const dt = Math.min(.032, (now - last) / 1000); last = now;
        vel += (-w * w * (x - target) - 2 * w * vel) * dt; x += vel * dt; render();
        if (Math.abs(x - target) > .3 || Math.abs(vel) > 5) raf = requestAnimationFrame(tick); else { x = target; vel = 0; render(); }
      };
      raf = requestAnimationFrame(tick);
    };
    root.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      cancelAnimationFrame(raf); dragging = true; moved = false; axis = null;
      startX = e.clientX; startY = e.clientY; startPos = x; hist = [{ x: e.clientX, t: e.timeStamp }];
    });
    root.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      if (!axis) { if (Math.hypot(dx, dy) < 8) return; axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'; if (axis === 'y') { dragging = false; return; } root.setPointerCapture(e.pointerId); }
      if (!moved) { moved = true; root.classList.add('is-dragging'); }
      x = startPos + dx; hist.push({ x: e.clientX, t: e.timeStamp }); if (hist.length > 6) hist.shift(); render();
    });
    const release = () => {
      if (!dragging) return; dragging = false; root.classList.remove('is-dragging');
      if (!moved) return;
      const a = hist[0], b = hist[hist.length - 1];
      vel = b.t > a.t ? ((b.x - a.x) / (b.t - a.t)) * 1000 : 0;
      const s = step(); springTo(Math.round((x + project(vel)) / s) * s);
    };
    root.addEventListener('pointerup', release); root.addEventListener('pointercancel', release);
    root.addEventListener('click', (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    root.addEventListener('wheel', (e) => { if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) { e.preventDefault(); cancelAnimationFrame(raf); x = Math.max(min - 60, Math.min(60, x - e.deltaX)); render(); clearTimeout(root._wt); root._wt = setTimeout(() => springTo(Math.round(x / step()) * step()), 120); } }, { passive: false });
    prev && prev.addEventListener('click', () => { vel = 0; springTo(target + step()); });
    next && next.addEventListener('click', () => { vel = 0; springTo(target - step()); });
    addEventListener('resize', () => { bounds(); springTo(target); });
    bounds(); render();
    return { refresh() { x = target = 0; vel = 0; bounds(); render(); }, springTo };
  }

  /* ----------------------------------------------------------------------
     Blocs réutilisables
     ---------------------------------------------------------------------- */
  const initials = (n) => n.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  function reviewsHTML({ limit = 9 } = {}) {
    const R = SITE.reviews || [], S = SITE.reviewsSummary || {};
    return `<div class="greviews">
      <div class="greviews__score reveal">
        <div class="gbadge">${I.google}<div><b>${esc(S.label || '')}</b><span>Basée sur ${S.count} avis Google</span></div></div>
        <div class="stars" aria-hidden="true">★★★★★</div>
        <p class="muted" style="margin:.8rem 0 1.4rem;font-size:14.5px">Avis authentiques publiés par nos clients sur Google, pour nos showrooms Voltaire et Roquette.</p>
        <a class="btn btn--line btn--sm" href="https://www.google.com/search?q=Premibel+Parquet+avis" target="_blank" rel="noopener"><span>Voir tous les avis</span></a>
      </div>
      <div class="greviews__list">${R.slice(0, limit).map((r) => {
        const long = r.text.length > 260;
        return `<figure class="greview reveal"><header><span class="greview__av">${esc(initials(r.name))}</span><div><b>${esc(r.name)}</b><small>${I.google} Avis Google</small></div></header><div class="stars" aria-label="5 étoiles sur 5">★★★★★</div><p>${esc(long ? r.text.slice(0, 240).replace(/\s\S*$/, '') + '…' : r.text)}</p>${long ? `<button class="greview__more" data-full="${esc(r.text)}">Lire la suite</button>` : ''}</figure>`;
      }).join('')}</div></div>`;
  }
  doc.addEventListener('click', (e) => { const b = e.target.closest('.greview__more'); if (b) { b.previousElementSibling.textContent = b.dataset.full; b.remove(); if (hasGsap) ScrollTrigger.refresh(); } });

  /** Ouvert maintenant ? (heure de Paris approximée par l'heure locale) */
  function openNow(st) {
    if (!st.hours) return null;
    const d = new Date(); const day = st.hours[(d.getDay() + 6) % 7][1];
    if (/ferm/i.test(day)) return false;
    const mins = d.getHours() * 60 + d.getMinutes();
    return day.split('·').some((r) => { const m = r.match(/(\d+):(\d+)\s*–\s*(\d+):(\d+)/); return m && mins >= +m[1] * 60 + +m[2] && mins < +m[3] * 60 + +m[4]; });
  }
  function storesHTML() {
    return `<div class="stores">${(SITE.stores || []).map((s) => {
      const o = openNow(s);
      return `<article class="store reveal"><div class="store__media"><img src="${esc(s.imgs[0])}" alt="${esc(s.name)}" loading="lazy"></div><div class="store__body"><span class="store__type">${esc(s.type)} · ${esc(s.city)}</span><span class="store__name">${esc(s.name)}</span><span class="store__addr">${esc(s.address)}, ${esc(s.zip)}</span>${o === null ? '<span class="store__open">Horaires sur rendez-vous</span>' : `<span class="store__open${o ? ' is-open' : ''}"><i></i>${o ? 'Ouvert maintenant' : 'Fermé actuellement'}</span>`}<a class="store__go" href="magasin.html?m=${s.slug}">Voir la fiche →</a></div></article>`;
    }).join('')}</div>`;
  }
  function uspHTML() {
    return `<div class="usp container">
      <div class="usp__item reveal">${I.truck}<div><b>Livraison offerte*</b><span>Dès 1 000 € HT, ou Click & Collect</span></div></div>
      <div class="usp__item reveal">${I.card}<div><b>2×, 3×, 4× sans frais</b><span>Paiement sécurisé avec Alma</span></div></div>
      <div class="usp__item reveal">${I.store}<div><b>3 showrooms + entrepôt</b><span>Voir, toucher, comparer</span></div></div>
      <div class="usp__item reveal">${I.chat}<div><b>Experts 6j/7</b><span>Conseil par téléphone ou WhatsApp</span></div></div>
    </div>`;
  }
  function ctaBandHTML({ title = 'Un projet de parquet&#8239;? <em>Parlons-en.</em>', text = 'Rendez-vous avec nos experts en showroom, devis gratuit en ligne et en showroom, ou conseil sur WhatsApp.', img = 'assets/img/site/generated-with-kivclienbts.webp' } = {}) {
    return `<section class="cta-band on-dark"><div class="cta-band__bg" data-speed="1"><img src="${img}" alt="" loading="lazy"></div>
      <div><p class="eyebrow">Accompagnement</p><h2 class="h2 split">${title}</h2><p style="color:rgba(250,247,242,.8);max-width:44ch;margin:1.2rem 0 0">${text}</p></div>
      <div class="cta-band__actions"><a class="btn btn--light magnetic" href="rendez-vous.html"><span>Prendre rendez-vous</span>${I.arrow}</a><a class="btn btn--ghost magnetic" href="devis.html"><span>Demander un devis</span></a></div></section>`;
  }

  /* ----------------------------------------------------------------------
     API publique
     ---------------------------------------------------------------------- */
  const PB = window.PB = {
    $, $$, esc, qs, I, load, reduce, motion, hover,
    products, categories, bySku, inCat, cat, mainCat,
    FREE_SHIP, FREE_SHIP_HT, TVA,
    money, ttc, discount, unitLabel, productUrl, catUrl, productCard, PLACEHOLDER,
    cart, devis, consent, youtube, configurateur, assistant, retractation, toast, flyToCart, banners, today,
    rail, motionIn, splitWords, frTypo, onScroll: PB_onScroll,
    reviewsHTML, storesHTML, uspHTML, ctaBandHTML, openNow,
    get lenis() { return lenis; },
  };

  /* ----------------------------------------------------------------------
     Démarrage
     ---------------------------------------------------------------------- */
  { const l = doc.createElement('link'); l.rel = 'stylesheet'; l.href = 'assets/css/modules.css'; doc.head.appendChild(l); }
  const chrome = renderLayout() !== false;
  initScroll();
  if (chrome) { bindHeader(); bindSearch(); bindCart(); bindTransitions(); }
  bindForms();
  bindDetails();
  // bandeau cookies au premier passage (pas dans les aperçus d'admin)
  if (chrome && !(consent.state() || {}).decided && qs('apercu') !== '1') setTimeout(() => openConsent(false), 1400);
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  // Les pages appellent PB.ready(fn) : exécuté après le gabarit, puis motionIn().
  const queue = window.__pbReady || [];
  PB.ready = (fn) => { Promise.resolve().then(fn).then(() => motionIn()); };
  queue.forEach(PB.ready);
  // motion du gabarit (pied de page) + contenu statique de la page
  requestAnimationFrame(() => {
    motionIn();
    if (motion && $('.footer__giant')) gsap.from('.footer__giant', { yPercent: 40, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true } });
  });
  addEventListener('load', () => hasGsap && ScrollTrigger.refresh());
})();
