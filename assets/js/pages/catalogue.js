/* ==========================================================================
   Premibel — Catalogue / liste de catégorie
   catalogue.html?c=<slug>  (sans paramètre → parquet)
   - Héros éditorial, sous-catégories, offre en cours (promotions : opération
     de la bannière active + onglets de familles)
   - Recherche dans la catégorie, filtres à facettes (panneau latéral desktop /
     feuille glissante mobile), Remise (promotions, lots), Disponibilité
   - Tri, densité de grille, vue Détaillée / Compacte, FLIP entre états
   - Encarts dans la grille (Alma, livraison offerte, article du journal)
   - Pagination « Voir plus » doublée de vrais liens ?page=N (rel prev/next)
   - Texte SEO de bas de page replié (« Lire la suite »)
   - État synchronisé dans l'URL (history.replaceState)
   ========================================================================== */
(() => {
  'use strict';

  PB.ready(async () => {
    await PB.load('products', 'categories');

    const { $, $$, esc, I } = PB;
    const doc = document;
    const root = $('[data-catalogue]');
    const C = PB.categories();
    const ALL = PB.products();
    const SITE = window.PB_SITE || {};
    const motionOK = !PB.reduce && 'animate' in Element.prototype;
    const PAGE = 24;
    const SLUG = (PB.qs('c') || 'parquet').trim().toLowerCase();
    const cat = C[SLUG];
    const EASE = 'cubic-bezier(.22,1,.36,1)';

    /* --------------------------------------------------------------------
       Outils texte
       -------------------------------------------------------------------- */
    const deco = doc.createElement('textarea');
    const clean = (s = '') => { deco.innerHTML = String(s); return deco.value.replace(/\s+/g, ' ').replace(/\s+([.,])/g, '$1').trim(); };
    const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    const slugify = (s) => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const nbsp = (s) => s.replace(/\s([;:!?»])/g, ' $1').replace(/«\s/g, '« ');
    const plural = (k, one, many) => `${k} ${k > 1 ? many : one}`;

    const KEEP = new Set(['Hongrie', 'Paris', 'Vieux', 'Versailles', 'Alexandrie', 'Amsterdam', 'Milan', 'Monaco', 'Venise', 'Dernière', 'Chance', 'Saint-Tropez']);
    /** « Parquet Flottant Chêne Huilé » → « Parquet flottant chêne huilé » (casse française). */
    const pretty = (name = '') => {
      const w = clean(name).split(' ');
      return w.map((x, i) => {
        if (i === 0) return x.charAt(0).toUpperCase() + x.slice(1);
        if (KEEP.has(x) || /\d|®/.test(x) || (x.length > 1 && x === x.toUpperCase() && /[A-Z]/.test(x))) return x;
        return x.toLowerCase();
      }).join(' ');
    };
    const titleHTML = (name) => {
      const n = pretty(name);
      const m = n.match(/^(Collection)\s+(.+)$/);
      if (m) return `${m[1]} <em>${esc(m[2])}</em>`;
      const w = n.split(' ');
      if (w.length === 1) return `<em>${esc(n)}</em>`;
      return `${esc(w.slice(0, -1).join(' '))} <em>${esc(w[w.length - 1])}</em>`;
    };

    /** Les descriptions source commencent par un titre SEO collé au texte : on les sépare. */
    const STARTERS = 'Le|La|Les|L’|L\'|Chez|Découvrez|Profitez|Apportez|Que|Vous|Notre|Nos|Un|Une|Pour|Offrez|Donnez|Choisissez|Optez|Sublimez|Avec|Alliant|Idéal|Idéale|Idéales|Conçu|Conçue|Conçues|Dans|Grâce|Entre|Faites|Créez|Il|Elle|Ce|Cette|Ces|Envie|Bienvenue|Si|Quand|Mettez|Habillez|Protégez|Transformez|Associez|Issu|Issue|Issues|Fabriqué|Fabriquée|Fabriquées|Tout|Toute|Rien|En|Au|Aux|Vos|Votre|Plus|Depuis|Doté|Dotée|Dotées|Améliorez|Illuminez|Redonnez|Transformer|Renforcez|Réalisez|Assurez|Garantissez|Alliez|Un';
    const START_RE = new RegExp(`([a-zà-ÿ®)!?\\d])\\s+((?:${STARTERS})(?:\\s+|(?<=’|'))[a-zà-ÿ])`, 'u');
    const splitDesc = (raw) => {
      const txt = clean(raw);
      if (!txt) return { title: '', body: '' };
      const m = txt.match(START_RE);
      if (m && m.index > 10 && m.index < 170) return { title: txt.slice(0, m.index + 1).trim(), body: txt.slice(m.index + 1).trim() };
      if (txt.length < 110 && !/[.!?]$/.test(txt)) return { title: txt, body: '' };
      return { title: '', body: txt };
    };
    const firstSentences = (txt, max = 230) => {
      const parts = txt.match(/[^.!?]+[.!?]+(\s|$)/g) || [txt];
      let out = '';
      for (const s of parts) { if ((out + s).length > max && out) break; out += s; }
      out = out.trim();
      return out.length > max + 60 ? `${out.slice(0, max).replace(/\s\S*$/, '')}…` : out;
    };

    /* --------------------------------------------------------------------
       Images de repli (photos réelles du site)
       -------------------------------------------------------------------- */
    const TINTS = ['blanc', 'clair', 'naturel', 'miel', 'gris', 'brun', 'fonce', 'cuivre'];
    const TINT_IMG = { blanc: 'site/parquet-blanc', clair: 'site/parquet-clair', naturel: 'site/parquet-naturel', miel: 'site/parquet-miel', gris: 'site/parquet-gris', fonce: 'site/parquet-fonce', cuivre: 'site/parquet-cuivre' };
    const TINT_HEX = { blanc: '#ece6da', clair: '#dcc49f', naturel: '#c59a64', miel: '#b47a3c', gris: '#9a958d', brun: '#6e4a2e', fonce: '#3d2a1e', cuivre: '#a4572f' };
    const FALLBACK_IMG = {
      ...TINT_IMG,
      brut: 'site/brut', verni: 'site/verni', huile: 'journal/parquet-massif-chene-huile', 'par-finition': 'site/finitions',
      'point-de-hongrie': 'site/point-de-hongrie', 'lames-droites': 'site/lames-droites', versailles: 'site/dalles-de-versailles', 'baton-rompu': 'journal/batons-rompus',
      'par-motif': 'journal/parquet-en-point-de-hongrie', exotique: 'site/exotique-1', 'par-essence': 'site/chene', 'par-couleur': 'journal/couleur-parquet',
      'parquet-salon': 'site/salon', 'parquet-chambre': 'site/chambre', 'parquet-entree-couloir': 'site/entree', 'parquet-bureau-usage-commercial': 'journal/bureau',
      isolation: 'journal/isolation-phonique-et-acoustique-_-comprendre-la-difference-et-bien-choisir-son-',
      'par-dimension': 'site/lames-droites',
    };
    const catImg = (slug, list, depth = 0) => {
      const c = C[slug];
      if (c && c.img) return c.img;
      if (FALLBACK_IMG[slug]) return `assets/img/${FALLBACK_IMG[slug]}.webp`;
      const p = (list || PB.inCat(slug)).find((x) => x.imgs[0]);
      if (p) return p.imgs[0];
      // catégorie vide : visuel de la famille parente
      if (c && c.parent && C[c.parent] && depth < 3 && !['accueil', 'racine'].includes(c.parent)) return catImg(c.parent, null, depth + 1);
      return PB.PLACEHOLDER;
    };

    /* --------------------------------------------------------------------
       Lien actif dans la navigation + SEO
       -------------------------------------------------------------------- */
    $$('.nav__link').forEach((a) => { if (a.getAttribute('href') === PB.catUrl(SLUG)) a.setAttribute('aria-current', 'page'); });
    const setMeta = (title, desc) => {
      doc.title = `${title} — Premibel Parquet`;
      let m = $('meta[name="description"]');
      if (!m) { m = doc.createElement('meta'); m.name = 'description'; doc.head.appendChild(m); }
      m.content = desc;
    };

    let stT;
    const refreshST = () => { clearTimeout(stT); stT = setTimeout(() => window.ScrollTrigger && ScrollTrigger.refresh(), 220); };

    const MAIN_LINKS = [['parquet', 'Tous les parquets'], ['parquet-massif', 'Parquet massif'], ['parquet-flottant', 'Parquet flottant'], ['parquet-sol-stratifie', 'Sol stratifié'], ['point-de-hongrie', 'Point de Hongrie'], ['lames-de-terrasse', 'Lames de terrasse'], ['accessoires', 'Accessoires'], ['promotions', 'Promotions']];
    const searchIco = (s = 15) => I.search.replace('<svg', `<svg width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"`);
    const linksChips = () => `<div class="chips cat-links">${MAIN_LINKS.map(([s, l]) => `<a class="chip" href="${PB.catUrl(s)}">${esc(l)}</a>`).join('')}<button class="chip" type="button" data-search-open>${searchIco()} Rechercher</button></div>`;
    const tail = () => `<div class="cat-tail">${PB.uspHTML()}<div class="section--tight"></div>${PB.ctaBandHTML()}</div>`;

    /* --------------------------------------------------------------------
       Catégorie inconnue
       -------------------------------------------------------------------- */
    if (!cat) {
      setMeta('Catégorie introuvable', 'Cette catégorie n’existe pas ou plus. Retrouvez tous les parquets, lames de terrasse et accessoires Premibel.');
      root.innerHTML = `<section class="cat-void container">
          <nav class="crumbs" aria-label="Fil d’Ariane"><a href="index.html">Accueil</a><span aria-hidden="true">/</span><span>Catalogue</span></nav>
          <p class="eyebrow">Catalogue</p>
          <h1 class="h1 split">Catégorie <em>introuvable</em></h1>
          <p class="lead reveal">La catégorie «&#8239;${esc(SLUG)}&#8239;» n’existe pas ou a été renommée. Parcourez nos familles de produits ou lancez une recherche.</p>
          <div class="reveal">${linksChips()}</div>
        </section>${tail()}`;
      return;
    }

    /* --------------------------------------------------------------------
       Données de la catégorie
       -------------------------------------------------------------------- */
    const NAME = pretty(cat.name);
    const IS_PROMO = SLUG === 'promotions';
    const KIDS = Object.values(C).filter((c) => c.parent === SLUG).map((c) => c.slug);
    let srcList = ALL.filter((p) => p.cats.includes(SLUG));
    // Catégorie « chapeau » sans produit propre (ex. Par dimension) : union de ses sous-catégories
    if (!srcList.length && KIDS.length) srcList = ALL.filter((p) => KIDS.some((k) => p.cats.includes(k)));
    const LIST = srcList.map((p, i) => ({ p, i, ttc: PB.ttc(p.price), disc: PB.discount(p) }));
    const { title: descTitle, body: descBody } = splitDesc(cat.desc);

    // Promotions : l'opération en cours vient de la bannière active
    const actives = (PB.banners && PB.banners.active()) || [];
    const OP = IS_PROMO ? (actives.find((b) => !b.permanente && b.fin && b.cta && b.cta.href === PB.catUrl('promotions')) || actives.find((b) => !b.permanente && b.fin)) : null;

    const n = LIST.length;
    let lead = descBody ? firstSentences(descBody) : (n ? `${plural(n, 'référence', 'références')} à comparer, filtrer et commander en ligne.` : '');
    if (IS_PROMO) lead = OP && OP.texte ? OP.texte : (n ? `${plural(n, 'référence', 'références')} à prix remisé, dans la limite des stocks disponibles.` : '');
    setMeta(OP ? `${OP.accroche || ''} ${OP.titre || ''}`.trim() || NAME : NAME,
      (IS_PROMO ? lead : descBody ? firstSentences(descBody, 150) : `${NAME} : ${n} références chez Premibel Parquet, showrooms à Paris 11e et entrepôt à Pantin.`).slice(0, 160));

    // fil d'Ariane
    const chain = [];
    for (let s = cat.parent, guard = 0; s && C[s] && !['accueil', 'racine'].includes(s) && guard < 6; s = C[s].parent, guard++) chain.unshift(C[s]);
    const crumbs = `<nav class="crumbs" aria-label="Fil d’Ariane"><a href="index.html">Accueil</a>${chain.map((c) => `<span aria-hidden="true">/</span><a href="${PB.catUrl(c.slug)}">${esc(pretty(c.name))}</a>`).join('')}<span aria-hidden="true">/</span><span aria-current="page">${esc(NAME)}</span></nav>`;
    const ld = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ name: 'Accueil', url: 'index.html' }, ...chain.map((c) => ({ name: pretty(c.name), url: PB.catUrl(c.slug) })), { name: NAME, url: PB.catUrl(SLUG) }].map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: x.name, item: new URL(x.url, location.href).href })) };
    const ldEl = doc.createElement('script'); ldEl.type = 'application/ld+json'; ldEl.textContent = JSON.stringify(ld); doc.head.appendChild(ldEl);

    // chiffres clés (calculés sur les données réelles)
    const unitCount = {};
    LIST.forEach(({ p }) => { unitCount[PB.unitLabel(p)] = (unitCount[PB.unitLabel(p)] || 0) + 1; });
    const mainUnit = Object.entries(unitCount).sort((a, b) => b[1] - a[1])[0]?.[0];
    const minPrice = Math.min(...LIST.filter(({ p }) => PB.unitLabel(p) === mainUnit).map((x) => x.ttc));
    const maxDisc = Math.max(0, ...LIST.map((x) => x.disc));
    const promoN = LIST.filter((x) => x.disc).length;

    const heroImg = OP && OP.image ? OP.image : catImg(SLUG, LIST.map((x) => x.p));
    const inset = LIST.find(({ p }) => p.imgs[0] && p.imgs[0] !== heroImg)?.p;

    /* --------------------------------------------------------------------
       Sous-catégories (ou catégories sœurs)
       -------------------------------------------------------------------- */
    const realCount = (s) => ALL.reduce((k, p) => k + (p.cats.includes(s) ? 1 : 0), 0);
    let subs = Object.values(C).filter((c) => c.parent === SLUG);
    let subsLabel = 'Affiner par famille';
    if (!subs.length && cat.parent && C[cat.parent] && !['accueil', 'racine'].includes(cat.parent)) {
      subs = Object.values(C).filter((c) => c.parent === cat.parent);
      subsLabel = `Dans la même famille · ${pretty(C[cat.parent].name)}`;
    }
    subs = subs.map((c) => ({ c, n: realCount(c.slug) })).filter((x) => x.n > 0 || x.c.slug === SLUG);
    if (TINTS.includes(SLUG) || SLUG === 'par-couleur') subs.sort((a, b) => TINTS.indexOf(a.c.slug) - TINTS.indexOf(b.c.slug));
    else if (SLUG === 'par-dimension' || cat.parent === 'par-dimension') subs.sort((a, b) => parseFloat(a.c.slug) - parseFloat(b.c.slug) || (a.c.slug === '90mm' ? -1 : 1));
    else subs.sort((a, b) => b.n - a.n);
    const subsHTML = !IS_PROMO && (subs.length > 1 || (subs.length === 1 && subs[0].c.slug !== SLUG)) ? `<section class="cat-subs" aria-label="${esc(subsLabel)}">
        <div class="container cat-subs__head"><p class="eyebrow">${esc(subsLabel)}</p></div>
        <div class="rail cat-subs__rail"><div class="rail__track">${subs.map(({ c, n: k }) => `<a class="subcard${c.slug === SLUG ? ' is-current' : ''}" href="${PB.catUrl(c.slug)}"${c.slug === SLUG ? ' aria-current="page"' : ''}>
            <span class="subcard__img">${TINT_HEX[c.slug] && !c.img && !TINT_IMG[c.slug] ? `<i style="--tint:${TINT_HEX[c.slug]}"></i>` : ''}<img src="${esc(catImg(c.slug))}" alt="" loading="lazy" draggable="false"></span>
            <span class="subcard__txt"><b>${esc(pretty(c.name))}</b><small>${k ? `${k} réf.` : 'Bientôt'}</small></span></a>`).join('')}</div></div>
      </section>` : '';

    /* --------------------------------------------------------------------
       Offre en cours (bannière active ciblant cette catégorie)
       Sur Promotions, l'opération est portée par le héros (titre + compte à rebours).
       -------------------------------------------------------------------- */
    const countdownHTML = (fin) => `<div class="countdown" data-countdown="${esc(fin)}" role="timer" aria-live="off">
        <span><b data-u="d">00</b><small>jours</small></span><span><b data-u="h">00</b><small>heures</small></span><span><b data-u="m">00</b><small>min</small></span><span><b data-u="s">00</b><small>s</small></span>
      </div>`;
    const offer = IS_PROMO ? null : actives.filter((b) => !b.permanente && b.fin && b.mode === 'compose' && b.cta && b.cta.href === PB.catUrl(SLUG))[0];
    const offerHTML = offer ? `<section class="offer container" aria-label="Offre en cours">
        <div class="offer__inner on-dark">
          <div class="offer__bg"><img src="${esc(offer.image)}" alt="" loading="lazy"></div>
          <div class="offer__txt">
            <p class="eyebrow">${esc(offer.surtitre || 'Offre en cours')}</p>
            <h2 class="offer__title">${esc(offer.accroche || '')} <em>${esc(offer.titre || '')}</em></h2>
            ${offer.texte ? `<p class="offer__text">${esc(offer.texte)}</p>` : ''}
          </div>
          <div class="offer__side">
            <p class="offer__label">Fin de l’offre dans</p>
            ${countdownHTML(offer.fin)}
          </div>
        </div>
      </section>` : '';

    /* --------------------------------------------------------------------
       Promotions : onglets de familles (comme en ligne)
       -------------------------------------------------------------------- */
    const FAMS = [['', 'Toutes'], ['parquet', 'Parquet'], ['isolation', 'Isolation'], ['accessoires', 'Accessoires'], ['panneaux-muraux', 'Panneaux muraux']];
    const famCount = (f) => (f ? LIST.filter((x) => x.p.cats.includes(f)).length : n);
    const tabsHTML = IS_PROMO && n ? `<nav class="cat-tabs container" aria-label="Familles en promotion"><div class="cat-tabs__in" data-tabs>${FAMS.map(([f, l]) => {
      const k = famCount(f);
      return k ? `<a class="cat-tab" href="${PB.catUrl(SLUG)}${f ? `&amp;fam=${f}` : ''}" data-fam="${f}"><span>${esc(l)}</span><small>${k}</small></a>`
        : `<span class="cat-tab is-off" aria-disabled="true"><span>${esc(l)}</span><small>0</small></span>`;
    }).join('')}</div></nav>` : '';

    /* --------------------------------------------------------------------
       Facettes
       -------------------------------------------------------------------- */
    const toks = (v) => (v ? String(v).split(/\s*,\s*/).map((x) => x.trim()).filter(Boolean) : []);
    const mm = (v) => { const k = parseFloat(String(v || '').replace(',', '.')); return Number.isFinite(k) ? k : null; };
    const capWord = (w) => (/\d/.test(w) || w.length <= 3 ? w : w.charAt(0) + w.slice(1).toLowerCase());
    const normQual = (v) => {
      if (!v) return [];
      let q = String(v).split(/\s*-?\s*Promo/i)[0].replace(/[\s-]+$/, '').trim();
      if (!q || q.length > 32) return [];
      q = q.split(' ').map(capWord).join(' ');
      return [q];
    };
    // Largeur : mêmes tranches que le site en ligne (et que les catégories « par dimension »)
    const LARG = [['l0', '< 90 mm', (k) => k < 90], ['l1', '90 – 120 mm', (k) => k < 120], ['l2', '120 – 160 mm', (k) => k < 160], ['l3', '160 – 200 mm', (k) => k < 200], ['l4', '> 200 mm', () => true]];
    const EPAI = [['e0', 'Jusqu’à 10 mm', (k) => k <= 10], ['e1', '11 à 14 mm', (k) => k < 15], ['e2', '15 à 19 mm', (k) => k < 20], ['e3', '20 mm et plus', () => true]];
    const bucket = (B) => (v) => { const k = mm(v); if (k === null) return []; const b = B.find(([, , t]) => t(k)); return [b[0]]; };
    // Longueur : « 2400mm », « 1,38mm » (= 1,38 m), « 400 à 1900 mm » (longueurs variables → toutes les tranches couvertes)
    const LONG = [['o0', 'Moins de 600 mm', 0, 600], ['o1', '600 à 1 199 mm', 600, 1200], ['o2', '1 200 à 1 799 mm', 1200, 1800], ['o3', '1 800 à 2 199 mm', 1800, 2200], ['o4', '2 200 mm et plus', 2200, 6001]];
    const lenMM = (v) => { let k = mm(v); if (k === null) return null; if (k < 10) k *= 1000; return k >= 200 && k <= 6000 ? k : null; };
    const longOf = (p) => {
      const out = new Set();
      const one = lenMM(p.spec.Longueur);
      if (one !== null) LONG.forEach(([id, , a, b]) => { if (one >= a && one < b) out.add(id); });
      const vr = String(p.spec['Longueur variable'] || '').match(/(\d+[.,]?\d*)\s*(?:mm)?\s*(?:à|-|–)\s*(\d+[.,]?\d*)/);
      if (vr) { const a = lenMM(vr[1]), b = lenMM(vr[2]); if (a !== null && b !== null) LONG.forEach(([id, , lo, hi]) => { if (a < hi && b >= lo) out.add(id); }); }
      return [...out];
    };
    const CH_ORDER = ['Basse température', 'Haute température', 'Non compatible'];
    const RANGE_KEYS = new Set(['la', 'lo', 'ep']);
    const FI_CAT = { huile: 'Huilé', verni: 'Verni', brut: 'Brut' };

    const URLP = new URLSearchParams(location.search);
    const GROUPS = [
      { key: 'te', label: 'Teinte', type: 'swatch', get: (p) => TINTS.filter((t) => p.cats.includes(t)), name: (v) => pretty(C[v]?.name || v), order: (a, b) => TINTS.indexOf(a) - TINTS.indexOf(b) },
      { key: 'es', label: 'Essence', get: (p) => toks(p.spec.Essence).slice(0, 1) },
      // Finition : attribut produit + catégories de finition (huile/verni/brut, utilisées par le configurateur via ?fi=)
      { key: 'fi', label: 'Finition', get: (p) => [...new Set([...toks(p.spec.Finition), ...Object.keys(FI_CAT).filter((s) => p.cats.includes(s)).map((s) => FI_CAT[s])])] },
      { key: 'po', label: 'Pose', get: (p) => toks(p.spec.Pose) },
      { key: 'la', label: 'Largeur', get: (p) => bucket(LARG)(p.spec.Largeur), name: (v) => LARG.find((b) => b[0] === v)[1], order: (a, b) => a.localeCompare(b) },
      { key: 'lo', label: 'Longueur', get: longOf, name: (v) => LONG.find((b) => b[0] === v)[1], order: (a, b) => a.localeCompare(b) },
      { key: 'as', label: 'Aspect', get: (p) => toks(p.spec.Aspect) },
      { key: 'ep', label: 'Épaisseur', get: (p) => bucket(EPAI)(p.spec['Épaisseur']), name: (v) => EPAI.find((b) => b[0] === v)[1], order: (a, b) => a.localeCompare(b) },
      { key: 'ch', label: 'Chauffage au sol', get: (p) => toks(p.spec['Chauffage au sol']), order: (a, b) => CH_ORDER.indexOf(a) - CH_ORDER.indexOf(b) },
      { key: 'qu', label: 'Qualité', get: (p) => normQual(p.spec['Qualité']) },
    ];
    LIST.forEach((x) => {
      x.f = {}; GROUPS.forEach((g) => { x.f[g.key] = g.get(x.p); });
      x.lot = x.p.cats.includes('lots-de-fin-de-serie');
      x.instock = !(x.p.stock && x.p.stock.in === false);
      x.hay = norm([x.p.name, x.p.raw, x.p.sku, x.p.designation].filter(Boolean).join(' '));
      x.nm = pretty(x.p.name);
    });
    GROUPS.forEach((g) => {
      const tally = new Map();
      LIST.forEach((x) => x.f[g.key].forEach((v) => tally.set(v, (tally.get(v) || 0) + 1)));
      const vals = [...tally.keys()];
      vals.sort(g.order || ((a, b) => tally.get(b) - tally.get(a) || a.localeCompare(b, 'fr')));
      g.opts = vals.map((v) => ({ v, id: g.type === 'swatch' || RANGE_KEYS.has(g.key) ? v : slugify(v), label: g.name ? g.name(v) : v }));
      g.byId = new Map(g.opts.map((o) => [o.id, o]));
      g.show = g.opts.length >= 2 && (g.key !== 'ch' || LIST.some((x) => x.p.unit === 'm²'));
      // Arrivée depuis le configurateur (?te=…&fi=…) : la sélection est conservée même sans
      // résultat (option à 0, chip supprimable) et le groupe reste visible.
      const want = (URLP.get(g.key) || '').split('.').filter(Boolean);
      want.forEach((id) => {
        if (g.byId.has(id)) return;
        let o = null;
        if (g.key === 'te' && TINTS.includes(id)) o = { v: id, id, label: pretty(C[id]?.name || id) };
        if (g.key === 'fi' && FI_CAT[id]) o = { v: FI_CAT[id], id, label: FI_CAT[id] };
        if (o) { g.opts.push(o); g.byId.set(id, o); }
      });
      if (want.some((id) => g.byId.has(id))) g.show = true;
    });
    const ACTIVE_GROUPS = GROUPS.filter((g) => g.show);

    // Échelle de prix : linéaire, ou quadratique si quelques références très chères écrasent la plage
    const prices = LIST.map((x) => x.ttc).sort((a, b) => a - b);
    const PMIN = prices.length ? Math.floor(prices[0]) : 0;
    const PMAX = prices.length ? Math.ceil(prices[prices.length - 1]) : 0;
    const median = prices[Math.floor(prices.length / 2)] || 1;
    const POW = PMAX > median * 5 ? 2.2 : 1;
    const tToPrice = (t) => Math.round(PMIN + (PMAX - PMIN) * Math.pow(t, POW));
    const priceToT = (v) => (PMAX === PMIN ? 0 : Math.pow(Math.max(0, Math.min(1, (v - PMIN) / (PMAX - PMIN))), 1 / POW));
    const HAS_PRICE = PMAX - PMIN >= 3 && LIST.length > 2;
    const HAS_PROMO = promoN > 0 && !IS_PROMO && promoN < n;
    const lotN = LIST.filter((x) => x.lot).length;
    const HAS_LOTS = lotN > 0 && lotN < n && SLUG !== 'lots-de-fin-de-serie';
    const outN = LIST.filter((x) => !x.instock).length;
    const HAS_STOCK = outN > 0 && outN < n;

    /* --------------------------------------------------------------------
       État (lu depuis l'URL)
       -------------------------------------------------------------------- */
    const SORTS = [['pertinence', 'Pertinence'], ['prix-asc', 'Prix croissant'], ['prix-desc', 'Prix décroissant'], ['remise', 'Meilleure remise'], ['nom-asc', 'Nom A→Z'], ['nom-desc', 'Nom Z→A'], ['nouveautes', 'Nouveautés']];
    const DEFAULT_SORT = IS_PROMO ? 'remise' : 'pertinence';
    const state = { sel: {}, pmin: PMIN, pmax: PMAX, promo: false, lots: false, stock: false, fam: '', q: '', sort: DEFAULT_SORT, start: 1, pages: 1 };
    GROUPS.forEach((g) => { state.sel[g.key] = new Set(); });
    {
      const sp = new URLSearchParams(location.search);
      ACTIVE_GROUPS.forEach((g) => { (sp.get(g.key) || '').split('.').filter(Boolean).forEach((id) => g.byId.has(id) && state.sel[g.key].add(id)); });
      const a = parseFloat(sp.get('pmin')), b = parseFloat(sp.get('pmax'));
      if (HAS_PRICE && Number.isFinite(a)) state.pmin = Math.max(PMIN, Math.min(PMAX, a));
      if (HAS_PRICE && Number.isFinite(b)) state.pmax = Math.max(state.pmin, Math.min(PMAX, b));
      state.promo = HAS_PROMO && sp.get('promo') === '1';
      state.lots = HAS_LOTS && sp.get('lots') === '1';
      state.stock = HAS_STOCK && sp.get('dispo') === '1';
      const f = sp.get('fam'); if (IS_PROMO && FAMS.some(([k]) => k && k === f) && famCount(f)) state.fam = f;
      state.q = (sp.get('q') || '').slice(0, 80);
      const t = sp.get('tri'); if (SORTS.some(([k]) => k === t)) state.sort = t;
      const pg = parseInt(sp.get('page'), 10); if (pg > 1) state.start = pg;
    }
    const qTokens = () => norm(state.q).split(/\s+/).filter(Boolean);
    const paramsFor = (page) => {
      const sp = new URLSearchParams(); sp.set('c', SLUG);
      ACTIVE_GROUPS.forEach((g) => { if (state.sel[g.key].size) sp.set(g.key, [...state.sel[g.key]].join('.')); });
      if (state.pmin > PMIN) sp.set('pmin', state.pmin);
      if (state.pmax < PMAX) sp.set('pmax', state.pmax);
      if (state.promo) sp.set('promo', '1');
      if (state.lots) sp.set('lots', '1');
      if (state.stock) sp.set('dispo', '1');
      if (state.fam) sp.set('fam', state.fam);
      if (state.q.trim()) sp.set('q', state.q.trim());
      if (state.sort !== DEFAULT_SORT) sp.set('tri', state.sort);
      if (page > 1) sp.set('page', page);
      return sp;
    };
    const pageHref = (page) => `catalogue.html?${paramsFor(page).toString()}`;
    const syncURL = () => history.replaceState(history.state, '', `${location.pathname}?${paramsFor(state.start).toString()}${location.hash}`);

    // identifiant d'option pré-calculé par produit (évite slugify à chaque passe)
    LIST.forEach((x) => { x.fid = {}; GROUPS.forEach((g) => { x.fid[g.key] = x.f[g.key].map((v) => (g.type === 'swatch' || RANGE_KEYS.has(g.key) ? v : slugify(v))); }); });
    let QT = qTokens();
    const matchFast = (x, except) => {
      for (const g of ACTIVE_GROUPS) {
        if (g.key === except) continue;
        const s = state.sel[g.key];
        if (s.size && !x.fid[g.key].some((v) => s.has(v))) return false;
      }
      if (except !== 'price' && (x.ttc < state.pmin - 0.005 || x.ttc > state.pmax + 0.005)) return false;
      if (except !== 'promo' && state.promo && !x.disc) return false;
      if (except !== 'lots' && state.lots && !x.lot) return false;
      if (except !== 'stock' && state.stock && !x.instock) return false;
      if (except !== 'fam' && state.fam && !x.p.cats.includes(state.fam)) return false;
      if (except !== 'q' && QT.length && !QT.every((t) => x.hay.includes(t))) return false;
      return true;
    };

    const coll = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });
    const sorters = {
      pertinence: (a, b) => (b.p.imgs.length ? 1 : 0) - (a.p.imgs.length ? 1 : 0) || a.i - b.i, // visuels réels d'abord
      'prix-asc': (a, b) => a.ttc - b.ttc || a.i - b.i,
      'prix-desc': (a, b) => b.ttc - a.ttc || a.i - b.i,
      remise: (a, b) => b.disc - a.disc || a.ttc - b.ttc,
      'nom-asc': (a, b) => coll.compare(a.nm, b.nm) || a.i - b.i,
      'nom-desc': (a, b) => coll.compare(b.nm, a.nm) || a.i - b.i,
      nouveautes: (a, b) => b.p.id - a.p.id,
    };
    const results = () => LIST.filter((x) => matchFast(x)).sort(sorters[state.sort]);
    const activeCount = () => ACTIVE_GROUPS.reduce((k, g) => k + state.sel[g.key].size, 0) + (state.pmin > PMIN || state.pmax < PMAX ? 1 : 0) + (state.promo ? 1 : 0) + (state.lots ? 1 : 0) + (state.stock ? 1 : 0);

    /* --------------------------------------------------------------------
       Texte SEO de bas de page (cat.seo) — à défaut, la description longue
       -------------------------------------------------------------------- */
    let seoTitle = '', seoBody = '';
    const seoRaw = String(cat.seo || '').trim().replace(/<li>\s*[-–•]\s*/g, '<li>');
    if (seoRaw) {
      const m = seoRaw.match(/^\s*<h([23])[^>]*>([\s\S]*?)<\/h\1>/);
      if (m) { seoTitle = clean(m[2].replace(/<[^>]+>/g, '')); seoBody = seoRaw.slice(m[0].length); } else { seoTitle = descTitle || NAME; seoBody = seoRaw; }
    } else if (descBody && descBody.length > 160 && !IS_PROMO) {
      seoTitle = descTitle || NAME;
      seoBody = (descBody.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [descBody]).reduce((acc, s, i) => { const k = Math.floor(i / 3); acc[k] = (acc[k] || '') + s; return acc; }, []).map((p) => `<p>${esc(nbsp(p.trim()))}</p>`).join('');
    }
    const telHref = `tel:${String(SITE.phone || '').replace(/[^\d+]/g, '').replace(/^0/, '+33')}`;
    const seoHTML = seoBody ? `<section class="cat-seo container" id="guide" aria-labelledby="cat-seo-title">
        <header class="cat-seo__head">
          <p class="eyebrow">Bien choisir</p>
          <h2 class="h3" id="cat-seo-title">${esc(nbsp(seoTitle))}</h2>
          ${SITE.phone ? `<div class="cat-seo__help reveal"><p>Une question sur cette sélection&#8239;? Nos conseillers vous répondent.</p><a class="link-arrow" href="${esc(telHref)}">${esc(SITE.phone)} <span>→</span></a><a class="link-arrow" href="rendez-vous.html">Prendre rendez-vous <span>→</span></a></div>` : ''}
        </header>
        <div class="cat-seo__main">
          <div class="cat-seo__body" data-seo id="cat-seo-body"><div class="prose">${seoBody}</div></div>
          <button type="button" class="cat-seo__toggle" data-seo-toggle hidden aria-expanded="false" aria-controls="cat-seo-body"><span data-seo-lbl>Lire la suite</span><i aria-hidden="true"></i></button>
        </div>
      </section>` : '';

    /* --------------------------------------------------------------------
       État vide (catégorie sans référence en ligne) : suggestions
       -------------------------------------------------------------------- */
    const parentSlug = cat.parent && C[cat.parent] && !['accueil', 'racine'].includes(cat.parent) ? cat.parent : 'parquet';
    const zeroHTML = () => {
      const pool = ALL.filter((p) => p.cats.includes(parentSlug) && p.imgs.length).sort((a, b) => PB.discount(b) - PB.discount(a));
      const picks = pool.slice(0, 4);
      const wa = SITE.whatsapp;
      return `<section class="container cat-zero" aria-label="Aucune référence">
        <div class="cat-zero__card reveal">
          <span class="cat-zero__mark" aria-hidden="true">${searchIco(22)}</span>
          <div class="cat-zero__txt">
            <h2 class="h3">Aucune référence en ligne <em>pour le moment.</em></h2>
            <p class="muted">Cette sélection n’a pas de produit disponible à la vente en ligne actuellement. Nos conseillers vous renseignent sur les arrivages et les alternatives, en showroom, par téléphone ou sur WhatsApp.</p>
            <div class="cat-zero__act">
              <a class="btn btn--dark btn--sm" href="${PB.catUrl(parentSlug)}"><span>Voir ${esc(pretty(C[parentSlug]?.name || 'les parquets').toLowerCase())}</span>${I.arrow}</a>
              ${SITE.phone ? `<a class="btn btn--line btn--sm" href="${esc(telHref)}"><span>${esc(SITE.phone)}</span></a>` : ''}
              ${wa ? `<a class="btn btn--line btn--sm" href="${esc(wa)}" target="_blank" rel="noopener"><span>Conseil WhatsApp</span></a>` : ''}
            </div>
          </div>
        </div>
        ${picks.length ? `<div class="cat-zero__sugg">
          <div class="cat-zero__shead"><p class="eyebrow">À découvrir dans la même famille</p><a class="link-arrow" href="${PB.catUrl(parentSlug)}">${esc(pretty(C[parentSlug]?.name || ''))} <span>→</span></a></div>
          <div class="cat-grid cat-grid--sugg">${picks.map((p) => PB.productCard(p)).join('')}</div>
        </div>` : ''}
      </section>`;
    };

    /* --------------------------------------------------------------------
       Rendu de la page
       -------------------------------------------------------------------- */
    const unitTxt = mainUnit === 'unité' ? 'pièce' : mainUnit;
    const stats = n ? [
      `<div class="cat-stat"><b data-count="${n}">${n}</b><span>référence${n > 1 ? 's' : ''}</span></div>`,
      Number.isFinite(minPrice) ? `<div class="cat-stat"><b>${PB.money(minPrice).replace(/\s€$/, ' €')}</b><span>à partir de · TTC / ${esc(unitTxt)}</span></div>` : '',
      maxDisc ? `<div class="cat-stat cat-stat--promo"><b>−${maxDisc} %</b><span>${IS_PROMO ? 'remise maximale' : `${promoN} en promotion`}</span></div>` : '',
    ].join('') : '';

    const filterGroupHTML = (g, i) => {
      const many = g.opts.length > 7 && g.type !== 'swatch';
      const opts = g.opts.map((o) => {
        const id = `f-${g.key}-${o.id}`;
        if (g.type === 'swatch') {
          const img = TINT_IMG[o.v] ? `assets/img/${TINT_IMG[o.v]}.webp` : '';
          return `<label class="swatch" data-opt="${o.id}"><input type="checkbox" id="${id}" value="${o.id}" data-g="${g.key}"><span class="swatch__dot" style="--tint:${TINT_HEX[o.v] || '#ccc'}">${img ? `<img src="${img}" alt="" loading="lazy">` : ''}</span><span class="swatch__name">${esc(o.label)}</span><small class="swatch__n" data-n></small></label>`;
        }
        return `<label class="opt" data-opt="${o.id}"><input type="checkbox" id="${id}" value="${o.id}" data-g="${g.key}"><span class="opt__box" aria-hidden="true"></span><span class="opt__name">${esc(o.label)}</span><small class="opt__n" data-n></small></label>`;
      }).join('');
      return `<details class="fgroup${many ? ' is-collapsed' : ''}" data-group="${g.key}"${i < 4 ? ' open' : ''}>
          <summary><span>${esc(g.label)}</span><i class="fgroup__sel" data-sel></i></summary>
          <div class="fgroup__body"><div class="${g.type === 'swatch' ? 'swatches' : 'opts'}">${opts}</div>
          ${many ? `<button type="button" class="fgroup__more" data-fmore>Afficher ${g.opts.length - 6} de plus</button>` : ''}</div>
        </details>`;
    };

    const priceHTML = HAS_PRICE ? `<details class="fgroup fgroup--price" data-group="price" open>
        <summary><span>Prix TTC</span><i class="fgroup__sel" data-sel></i></summary>
        <div class="fgroup__body">
          <div class="price">
            <div class="price__hist" aria-hidden="true" data-hist></div>
            <div class="price__range" data-range>
              <div class="price__track"><span data-fill></span></div>
              <input type="range" min="0" max="1000" step="1" data-p="min" aria-label="Prix minimum TTC">
              <input type="range" min="0" max="1000" step="1" data-p="max" aria-label="Prix maximum TTC">
            </div>
            <div class="price__vals"><span data-pv="min"></span><span data-pv="max"></span></div>
            <p class="price__note">Prix TTC par unité de vente (m², ml ou pièce).</p>
          </div>
        </div>
      </details>` : '';

    const fswitch = (attr, title) => `<label class="fswitch"><span><b>${title}</b><small data-sw-n="${attr}"></small></span><input type="checkbox" role="switch" data-sw="${attr}"><i aria-hidden="true"></i></label>`;
    const remiseHTML = HAS_PROMO || HAS_LOTS ? `<details class="fgroup fgroup--sw" data-group="remise" open>
        <summary><span>Remise</span><i class="fgroup__sel" data-sel></i></summary>
        <div class="fgroup__body">${HAS_PROMO ? fswitch('promo', 'En promotion') : ''}${HAS_LOTS ? fswitch('lots', 'Lots de fin de série') : ''}</div>
      </details>` : '';
    const stockHTML = HAS_STOCK ? `<details class="fgroup fgroup--sw" data-group="dispo" open>
        <summary><span>Disponibilité</span><i class="fgroup__sel" data-sel></i></summary>
        <div class="fgroup__body">${fswitch('stock', 'En stock uniquement')}</div>
      </details>` : '';
    const hasFilters = n > 6 && (ACTIVE_GROUPS.length || HAS_PRICE || HAS_PROMO || HAS_LOTS || HAS_STOCK);

    const heroTitle = OP ? `${esc(OP.accroche || '')} <em>${esc(OP.titre || NAME)}</em>` : titleHTML(cat.name);
    const heroEyebrow = IS_PROMO ? esc(OP?.surtitre || 'Offres du moment') : chain.length ? esc(pretty(chain[chain.length - 1].name)) : 'Catalogue';

    root.innerHTML = `
      <section class="cat-hero container${IS_PROMO ? ' cat-hero--promo' : ''}">
        <div class="cat-hero__txt">
          ${crumbs}
          <p class="eyebrow">${heroEyebrow}</p>
          <h1 class="h1 cat-hero__title split${(OP ? `${OP.accroche} ${OP.titre}` : NAME).length > 26 ? ' is-long' : ''}">${heroTitle}</h1>
          ${lead ? `<p class="lead cat-hero__lead reveal">${esc(nbsp(lead))}</p>` : ''}
          ${OP ? `<div class="cat-hero__op reveal"><p class="cat-hero__oplbl">Fin de l’opération dans</p>${countdownHTML(OP.fin)}</div>` : ''}
          ${stats ? `<div class="cat-stats reveal">${stats}</div>` : ''}
          ${seoBody ? `<a class="link-arrow cat-hero__more reveal" href="#guide">En savoir plus <span>→</span></a>` : ''}
        </div>
        <figure class="cat-hero__media">
          <div class="cat-hero__frame media-reveal"><img src="${esc(heroImg)}" alt="${esc(NAME)}" fetchpriority="high" decoding="async"></div>
          ${inset ? `<a class="cat-hero__inset reveal" href="${PB.productUrl(inset)}" aria-label="${esc(inset.name)}"><img src="${esc(inset.imgs[0])}" alt="" loading="lazy"><span><small>Dans cette sélection</small>${esc(inset.name)}</span></a>` : ''}
          <figcaption class="cat-hero__cap" aria-hidden="true"><em>${esc(NAME)}</em><span>Premibel · Paris 11<sup>e</sup></span></figcaption>
        </figure>
      </section>
      ${offerHTML}
      ${subsHTML}
      ${tabsHTML}
      ${n ? `<section class="cat-shop" data-shop aria-label="Produits">
        <div class="cat-toolbar" data-toolbar>
          <div class="container cat-toolbar__in">
            <div class="cat-toolbar__l">
              ${hasFilters ? `<button type="button" class="tbtn" data-filters-toggle aria-controls="cat-filters" aria-expanded="true"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg><span class="tbtn__lbl" data-toggle-lbl>Filtres</span><b class="tbtn__n" data-fcount hidden></b></button>` : ''}
              <p class="cat-count" aria-live="polite"><b data-total>${n}</b> <span data-total-lbl>références</span></p>
            </div>
            <div class="cat-toolbar__r">
              <label class="sortsel"><span>Trier</span><select data-sort aria-label="Trier les produits">${SORTS.filter(([k]) => k !== 'remise' || maxDisc).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></label>
              <div class="density" role="group" aria-label="Densité de la grille">
                ${[2, 3, 4].map((c) => `<button type="button" data-cols="${c}" aria-label="${c} par ligne" aria-pressed="false">${'<i></i>'.repeat(c)}</button>`).join('')}
              </div>
            </div>
          </div>
        </div>
        <div class="container cat-layout${hasFilters ? '' : ' no-filters'}" data-layout>
          ${hasFilters ? `<aside class="cat-filters" id="cat-filters" aria-label="Filtres" data-fpanel>
            <div class="cat-filters__head" data-sheet-handle>
              <span class="cat-filters__grab" aria-hidden="true"></span>
              <h2>Filtres</h2>
              <button type="button" class="icon-btn" data-sheet-close aria-label="Fermer les filtres">${I.close}</button>
            </div>
            <div class="cat-filters__body" data-lenis-prevent data-sheet-body>
              ${priceHTML}${remiseHTML}${stockHTML}${ACTIVE_GROUPS.map(filterGroupHTML).join('')}
            </div>
            <div class="cat-filters__foot">
              <button type="button" class="btn btn--line btn--sm" data-clear>Tout effacer</button>
              <button type="button" class="btn btn--dark btn--sm" data-sheet-close><span data-see>Voir les résultats</span></button>
            </div>
          </aside>` : ''}
          <div class="cat-results">
            <div class="cat-rhead">
              <div class="cat-search" role="search">
                ${searchIco(17)}
                <input type="search" id="cat-q" data-csearch placeholder="Nom, référence…" autocomplete="off" spellcheck="false" enterkeyhint="search" aria-label="Rechercher dans ${esc(NAME)}" maxlength="80">
                <button type="button" class="cat-search__clear" data-csearch-clear aria-label="Effacer la recherche" hidden>${I.close}</button>
              </div>
              <div class="cat-view" role="group" aria-label="Affichage">
                <button type="button" data-view="detail" aria-pressed="true" title="Affichage détaillé"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><path d="M4 15h7M4 18h5M13 15h7M13 18h5"/></svg><span>Détaillé</span></button>
                <button type="button" data-view="compact" aria-pressed="false" title="Affichage compact"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg><span>Compact</span></button>
              </div>
            </div>
            <div class="cat-active" data-active hidden></div>
            <a class="cat-prev" data-prev hidden rel="prev" href="#"><span>Afficher les produits précédents</span></a>
            <div class="cat-grid" data-grid></div>
            <div class="cat-empty" data-empty hidden>
              <p class="h3" data-empty-title>Aucune référence ne correspond <em>à ces critères.</em></p>
              <p class="muted">Élargissez votre sélection ou demandez conseil à nos experts, par téléphone ou sur WhatsApp.</p>
              <div class="cat-empty__act"><button type="button" class="btn btn--dark btn--sm" data-clear><span>Tout effacer</span></button><a class="btn btn--line btn--sm" href="${esc(SITE.whatsapp || 'contact.html')}" target="_blank" rel="noopener"><span>Conseil WhatsApp</span></a></div>
            </div>
            <div class="cat-more" data-more-wrap>
              <p class="cat-more__txt" data-progress-txt></p>
              <div class="cat-more__bar" aria-hidden="true"><span data-progress></span></div>
              <button type="button" class="btn btn--line" data-loadmore><span>Voir plus</span></button>
              <nav class="cat-pages" aria-label="Pagination" data-pages></nav>
            </div>
          </div>
        </div>
        <div class="cat-scrim" data-sheet-scrim></div>
      </section>` : zeroHTML()}
      ${seoHTML}
      ${tail()}`;

    /* --------------------------------------------------------------------
       Sous-catégories : rail à inertie
       -------------------------------------------------------------------- */
    const subRail = $('.cat-subs__rail');
    if (subRail) {
      const r = PB.rail(subRail);
      const cur = $('.subcard.is-current', subRail);
      if (cur && cur.offsetLeft > subRail.clientWidth * .6) requestAnimationFrame(() => r.springTo(-(cur.offsetLeft - 40)));
    }

    /* --------------------------------------------------------------------
       Comptes à rebours
       -------------------------------------------------------------------- */
    $$('[data-countdown]').forEach((cd) => {
      const end = new Date(`${cd.dataset.countdown}T23:59:59`).getTime();
      const pad = (v) => String(v).padStart(2, '0');
      const u = Object.fromEntries($$('[data-u]', cd).map((b) => [b.dataset.u, b]));
      const tick = () => {
        let s = Math.max(0, Math.floor((end - Date.now()) / 1000));
        const d = Math.floor(s / 86400); s -= d * 86400; const h = Math.floor(s / 3600); s -= h * 3600; const m = Math.floor(s / 60); s -= m * 60;
        const vals = { d: pad(d), h: pad(h), m: pad(m), s: pad(s) };
        Object.entries(vals).forEach(([k, v]) => { if (u[k].textContent !== v) { u[k].textContent = v; if (motionOK && k !== 's') u[k].animate([{ transform: 'translateY(-30%)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: EASE }); } });
        cd.setAttribute('aria-label', `${d} jours, ${h} heures et ${m} minutes restantes`);
      };
      tick(); setInterval(tick, 1000);
    });

    /* --------------------------------------------------------------------
       Texte SEO : repli / dépliage fluide (hauteur réelle animée)
       -------------------------------------------------------------------- */
    const seo = $('[data-seo]'), seoBtn = $('[data-seo-toggle]'), seoLbl = $('[data-seo-lbl]');
    if (seo && seoBtn) {
      const clampPx = () => parseFloat(getComputedStyle(seo).getPropertyValue('--clamp')) || 420;
      const measure = () => {
        if (seo.classList.contains('is-open')) return;
        const need = seo.scrollHeight > clampPx() + 60;
        seoBtn.hidden = !need; seo.classList.toggle('is-clamped', need);
      };
      requestAnimationFrame(measure);
      addEventListener('load', measure, { once: true });
      seoBtn.addEventListener('click', () => {
        const open = !seo.classList.contains('is-open');
        const from = seo.getBoundingClientRect().height;
        seo.classList.toggle('is-open', open);
        seoBtn.setAttribute('aria-expanded', String(open));
        seoLbl.textContent = open ? 'Réduire' : 'Lire la suite';
        const to = open ? seo.scrollHeight : clampPx();
        if (!open) {
          const top = seo.closest('.cat-seo').getBoundingClientRect().top;
          if (top < 0) { const y = scrollY + top - 90; if (PB.lenis) PB.lenis.scrollTo(y, { duration: .9 }); else scrollTo({ top: y, behavior: PB.reduce ? 'auto' : 'smooth' }); }
        }
        if (motionOK) {
          seo.style.maxHeight = 'none';
          const a = seo.animate([{ height: `${from}px` }, { height: `${to}px` }], { duration: Math.min(1100, 520 + Math.abs(to - from) * .25), easing: EASE });
          seo.style.overflow = 'hidden';
          a.onfinish = () => { seo.style.overflow = ''; seo.style.maxHeight = ''; refreshST(); };
        } else refreshST();
      });
    }

    if (!n) {
      // suggestions de l'état vide : réutiliser l'ajout panier du socle (délégué) suffit
      return;
    }

    /* --------------------------------------------------------------------
       Références DOM
       -------------------------------------------------------------------- */
    const shop = $('[data-shop]'), grid = $('[data-grid]'), panel = $('[data-fpanel]'), layout = $('[data-layout]');
    const toolbar = $('[data-toolbar]'), sortSel = $('[data-sort]');
    const totalEl = $('[data-total]'), totalLbl = $('[data-total-lbl]'), fcount = $('[data-fcount]');
    const activeEl = $('[data-active]'), emptyEl = $('[data-empty]'), emptyTitle = $('[data-empty-title]');
    const moreWrap = $('[data-more-wrap]'), moreBtn = $('[data-loadmore]'), progTxt = $('[data-progress-txt]'), prog = $('[data-progress]');
    const pagesEl = $('[data-pages]'), prevEl = $('[data-prev]');
    const seeBtn = $('[data-see]');
    const sw = Object.fromEntries($$('[data-sw]').map((el) => [el.dataset.sw, el]));
    const swN = Object.fromEntries($$('[data-sw-n]').map((el) => [el.dataset.swN, el]));
    const qIn = $('[data-csearch]'), qClear = $('[data-csearch-clear]');
    const tabs = $('[data-tabs]');
    const mqSheet = matchMedia('(max-width: 980px)');
    sortSel.value = state.sort;
    qIn.value = state.q; qClear.hidden = !state.q;

    /* --------------------------------------------------------------------
       Barre d'outils : suit l'en-tête (masqué au scroll descendant)
       -------------------------------------------------------------------- */
    const header = $('[data-header]');
    const onScroll = () => {
      const flush = header && header.classList.contains('is-hidden');
      toolbar.classList.toggle('is-flush', !!flush);
      shop.classList.toggle('is-flush', !!flush);
      const r = toolbar.getBoundingClientRect();
      toolbar.classList.toggle('is-stuck', r.top <= (flush ? 1 : (header?.offsetHeight || 76) + 1) && scrollY > 200);
    };
    PB.onScroll(onScroll); addEventListener('scroll', onScroll, { passive: true }); onScroll();

    /* --------------------------------------------------------------------
       Cartes : cache de nœuds (pas de rechargement d'image entre états)
       -------------------------------------------------------------------- */
    const tpl = doc.createElement('template');
    const cache = new Map();
    const node = (x, i) => {
      let el = cache.get(x.p.sku);
      if (!el) { tpl.innerHTML = PB.productCard(x.p, { eager: i < 4 }).trim(); el = tpl.content.firstElementChild; cache.set(x.p.sku, el); }
      return el;
    };
    const mk = (html) => { tpl.innerHTML = html.trim(); return tpl.content.firstElementChild; };

    /* --------------------------------------------------------------------
       Encarts dans la grille (comme en ligne) : Alma, livraison, journal
       -------------------------------------------------------------------- */
    const freeHT = new Intl.NumberFormat('fr-FR').format(PB.cart?.FREE_SHIP_HT || 1000);
    const ENC = {
      alma: mk(`<aside class="encart encart--alma" aria-label="Paiement en plusieurs fois">
          <a class="encart__link" href="paiement.html">
            <span class="encart__eyebrow">Paiement</span>
            <span class="encart__big">2×, 3×, 4× <em>sans frais</em></span>
            <span class="encart__txt">Réglez votre commande en plusieurs fois avec Alma.</span>
            <span class="encart__foot"><img class="encart__logo" src="assets/img/site/alma-couleur.webp" alt="Alma" loading="lazy" width="72" height="54"><span class="encart__cta">En savoir plus ${I.arrow}</span></span>
          </a>
        </aside>`),
      ship: mk(`<aside class="encart encart--ship" aria-label="Livraison offerte">
          <a class="encart__link" href="livraison.html">
            <span class="encart__ico" aria-hidden="true">${I.truck}</span>
            <span class="encart__eyebrow">Livraison</span>
            <span class="encart__big">Offerte dès <em>${freeHT} € HT</em></span>
            <span class="encart__txt">En France métropolitaine, sur rendez-vous avec le transporteur.</span>
            <span class="encart__foot"><span class="encart__cta">Conditions de livraison ${I.arrow}</span></span>
          </a>
        </aside>`),
      post: null,
    };
    let lastCols = 0;
    const colsNow = () => { const t = getComputedStyle(grid).gridTemplateColumns; return t && t !== 'none' ? t.split(' ').length : 3; };
    /** Séquence affichée : cartes produits de la page courante + encarts aux fins de rangées. */
    let current = [];
    const range = () => { const s = (state.start - 1) * PAGE; return [s, Math.min(current.length, s + state.pages * PAGE)]; };
    const sequence = () => {
      const [a, b] = range();
      const prods = current.slice(a, b).map(node);
      const c = (lastCols = colsNow());
      const ins = state.start === 1 && prods.length >= c * 2 ? [
        { pos: c * 2 - 1, el: ENC.alma },
        ENC.post && { pos: c * 3 + (c > 2 ? 0 : 1), el: ENC.post },
        { pos: c * 6 - 1, el: ENC.ship },
      ].filter(Boolean).sort((x, y) => x.pos - y.pos) : [];
      const seq = []; let k = 0;
      for (const el of prods) { while (k < ins.length && seq.length === ins[k].pos) seq.push(ins[k++].el); seq.push(el); }
      return seq;
    };

    // Article du journal le plus pertinent pour la catégorie (chargé à la demande)
    const STOP = new Set(['parquet', 'parquets', 'de', 'des', 'du', 'en', 'le', 'la', 'les', 'et', 'a', 'pour', 'par', 'collection', 'mm', 'sol', 'lames', 'lame', 'plancher', 'votre', 'son']);
    const words = (s) => slugify(s).split('-').filter((w) => w.length > 2 && !STOP.has(w));
    const pickPost = (posts) => {
      if (!posts || !posts.length) return null;
      const sets = [[SLUG, cat.name], ...chain.slice().reverse().map((c) => [c.slug, c.name])].map(([s, nm]) => new Set([...words(s), ...words(nm)]));
      const recent = posts.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
      for (const set of sets) {
        if (!set.size) continue;
        let best = null, bs = 0;
        recent.forEach((p) => {
          const hay = new Set([...words(p.slug), ...words(p.title)]);
          let s = 0; set.forEach((w) => { if (hay.has(w)) s += 1; });
          if (s > bs) { bs = s; best = p; }
        });
        if (best) return best;
      }
      return recent.find((p) => /choisir/.test(p.slug)) || recent[0];
    };
    PB.load('posts').then(([posts]) => {
      const p = pickPost(posts || window.PB_POSTS);
      if (!p) return;
      ENC.post = mk(`<aside class="encart encart--post" aria-label="Article du journal">
          <a class="encart__link" href="article.html?a=${encodeURIComponent(p.slug)}">
            <span class="encart__media"><img src="${esc(p.img || PB.PLACEHOLDER)}" alt="" loading="lazy" decoding="async"></span>
            <span class="encart__body">
              <span class="encart__eyebrow">Le journal${p.minutes ? ` · ${p.minutes} min` : ''}</span>
              <span class="encart__title">${esc(clean(p.title))}</span>
              <span class="encart__cta">Lire l’article ${I.arrow}</span>
            </span>
          </a>
        </aside>`);
      if (!firstPaint && state.start === 1) { const seq = sequence(); if (seq.includes(ENC.post)) flip(() => grid.replaceChildren(...seq)); }
    }).catch(() => { /* journal indisponible : pas d'encart article */ });

    /** FLIP : mesure → mutation → animation inverse (cartes visibles uniquement). */
    function flip(mutate) {
      if (!motionOK) { mutate(); return; }
      const vh = innerHeight;
      const before = new Map();
      [...grid.children].forEach((el) => { const r = el.getBoundingClientRect(); if (r.bottom > -100 && r.top < vh + 100) before.set(el, r); });
      mutate();
      let k = 0;
      [...grid.children].forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) return;
        const b = before.get(el);
        el.getAnimations().forEach((a) => a.cancel());
        if (b) {
          const dx = b.left - r.left, dy = b.top - r.top, sx = b.width / r.width;
          if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(sx - 1) < .01) return;
          el.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${sx})`, transformOrigin: '0 0' }, { transform: 'none', transformOrigin: '0 0' }], { duration: 620, easing: EASE });
        } else {
          el.animate([{ opacity: 0, transform: 'translateY(18px) scale(.98)' }, { opacity: 1, transform: 'none' }], { duration: 560, delay: Math.min(k++, 10) * 35, easing: EASE, fill: 'backwards' });
        }
      });
    }

    /* --------------------------------------------------------------------
       Densité de grille (desktop) + vue Détaillée / Compacte
       -------------------------------------------------------------------- */
    let cols = 3, view = 'detail';
    try { const c = +localStorage.getItem('pb-cat-cols'); if ([2, 3, 4].includes(c)) cols = c; view = localStorage.getItem('pb-cat-view') === 'compact' ? 'compact' : 'detail'; } catch { /* stockage indisponible */ }
    const paintCols = () => { grid.style.setProperty('--cols', cols); $$('[data-cols]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.cols === cols))); };
    const paintView = () => { grid.classList.toggle('is-compact', view === 'compact'); $$('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === view))); };
    paintCols(); paintView();
    $$('[data-cols]').forEach((b) => b.addEventListener('click', () => {
      const c = +b.dataset.cols; if (c === cols) return;
      flip(() => { cols = c; paintCols(); grid.replaceChildren(...sequence()); });
      try { localStorage.setItem('pb-cat-cols', c); } catch { /* idem */ }
      refreshST();
    }));
    $$('[data-view]').forEach((b) => b.addEventListener('click', () => {
      const v = b.dataset.view; if (v === view) return;
      flip(() => { view = v; paintView(); });
      try { localStorage.setItem('pb-cat-view', v); } catch { /* idem */ }
      refreshST();
    }));
    let rzT;
    addEventListener('resize', () => { clearTimeout(rzT); rzT = setTimeout(() => { if (colsNow() !== lastCols) grid.replaceChildren(...sequence()); }, 160); });

    /* --------------------------------------------------------------------
       Panneau de filtres : mises à jour (compteurs, désactivation)
       -------------------------------------------------------------------- */
    const histEl = $('[data-hist]');
    const BINS = 28;
    if (histEl) {
      const bins = new Array(BINS).fill(0);
      LIST.forEach((x) => { bins[Math.min(BINS - 1, Math.floor(priceToT(x.ttc) * BINS))]++; });
      const mx = Math.max(...bins);
      histEl.innerHTML = bins.map((b) => `<i style="--h:${b ? Math.max(.08, b / mx) : 0}"></i>`).join('');
    }
    const rIn = { min: $('[data-p="min"]'), max: $('[data-p="max"]') };
    const pv = { min: $('[data-pv="min"]'), max: $('[data-pv="max"]') };
    const fill = $('[data-fill]');
    const paintPrice = () => {
      if (!rIn.min) return;
      const a = priceToT(state.pmin), b = priceToT(state.pmax);
      rIn.min.value = Math.round(a * 1000); rIn.max.value = Math.round(b * 1000);
      fill.style.left = `${a * 100}%`; fill.style.right = `${(1 - b) * 100}%`;
      pv.min.textContent = `${state.pmin} €`; pv.max.textContent = `${state.pmax} €`;
      rIn.min.setAttribute('aria-valuetext', `${state.pmin} euros`); rIn.max.setAttribute('aria-valuetext', `${state.pmax} euros`);
      if (histEl) [...histEl.children].forEach((bar, i) => bar.classList.toggle('is-off', (i + 1) / BINS < a || i / BINS > b));
    };

    const SW_TEST = { promo: (x) => x.disc, lots: (x) => x.lot, stock: (x) => x.instock };
    const updatePanel = () => {
      if (tabs) $$('[data-fam]', tabs).forEach((a) => { const on = a.dataset.fam === state.fam; a.classList.toggle('is-active', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
      if (!panel) return;
      ACTIVE_GROUPS.forEach((g) => {
        const cnt = new Map();
        LIST.forEach((x) => { if (matchFast(x, g.key)) x.fid[g.key].forEach((v) => cnt.set(v, (cnt.get(v) || 0) + 1)); });
        const box = $(`[data-group="${g.key}"]`, panel);
        $$('[data-opt]', box).forEach((lab) => {
          const id = lab.dataset.opt, c = cnt.get(id) || 0, input = lab.querySelector('input');
          const on = state.sel[g.key].has(id);
          input.checked = on; input.disabled = !c && !on;
          lab.classList.toggle('is-checked', on); lab.classList.toggle('is-zero', !c && !on);
          lab.querySelector('[data-n]').textContent = c;
        });
        const s = state.sel[g.key].size;
        $('[data-sel]', box).textContent = s ? s : '';
      });
      const pBox = $('[data-group="price"]', panel);
      if (pBox) $('[data-sel]', pBox).textContent = state.pmin > PMIN || state.pmax < PMAX ? '1' : '';
      Object.entries(sw).forEach(([k, el]) => {
        el.checked = state[k];
        const c = LIST.filter((x) => SW_TEST[k](x) && matchFast(x, k)).length;
        swN[k].textContent = plural(c, 'référence', 'références');
      });
      const rBox = $('[data-group="remise"]', panel);
      if (rBox) $('[data-sel]', rBox).textContent = (state.promo ? 1 : 0) + (state.lots ? 1 : 0) || '';
      const dBox = $('[data-group="dispo"]', panel);
      if (dBox) $('[data-sel]', dBox).textContent = state.stock ? '1' : '';
      paintPrice();
    };

    const chipsHTML = () => {
      const out = [];
      if (state.q.trim()) out.push(`<button type="button" class="fchip" data-frm="q|"><span class="fchip__k">Recherche</span>«&#8239;${esc(state.q.trim())}&#8239;»${I.close}</button>`);
      ACTIVE_GROUPS.forEach((g) => state.sel[g.key].forEach((id) => out.push(`<button type="button" class="fchip" data-frm="${g.key}|${esc(id)}"><span class="fchip__k">${esc(g.label)}</span>${esc(g.byId.get(id)?.label || id)}${I.close}</button>`)));
      if (state.pmin > PMIN || state.pmax < PMAX) out.push(`<button type="button" class="fchip" data-frm="price|"><span class="fchip__k">Prix</span>${state.pmin} € – ${state.pmax} €${I.close}</button>`);
      if (state.promo) out.push(`<button type="button" class="fchip" data-frm="promo|">En promotion${I.close}</button>`);
      if (state.lots) out.push(`<button type="button" class="fchip" data-frm="lots|">Lots de fin de série${I.close}</button>`);
      if (state.stock) out.push(`<button type="button" class="fchip" data-frm="stock|">En stock${I.close}</button>`);
      return out.length ? `${out.join('')}<button type="button" class="fchip-clear" data-clear>Tout effacer</button>` : '';
    };

    /* --------------------------------------------------------------------
       Pagination : « Voir plus » + vrais liens ?page=N (rel prev/next)
       -------------------------------------------------------------------- */
    const lastPage = () => Math.max(1, Math.ceil(current.length / PAGE));
    const headLink = (rel, href) => {
      let l = $(`link[rel="${rel}"][data-cat]`, doc.head);
      if (!href) { l?.remove(); return; }
      if (!l) { l = doc.createElement('link'); l.rel = rel; l.dataset.cat = ''; doc.head.appendChild(l); }
      l.href = href;
    };
    const paintPages = () => {
      const L = lastPage(), s = state.start, e = Math.min(L, state.start + state.pages - 1);
      const prev = s > 1 ? s - 1 : 0, next = e < L ? e + 1 : 0;
      headLink('prev', prev ? new URL(pageHref(prev), location.href).href : '');
      headLink('next', next ? new URL(pageHref(next), location.href).href : '');
      prevEl.hidden = !prev; if (prev) prevEl.href = pageHref(prev);
      if (L < 2) { pagesEl.innerHTML = ''; pagesEl.hidden = true; return; }
      pagesEl.hidden = false;
      const set = new Set([1, L, s, e, s - 1, e + 1]);
      const nums = [...set].filter((k) => k >= 1 && k <= L).sort((a, b) => a - b);
      let html = prev ? `<a class="cat-pages__arr" href="${pageHref(prev)}" rel="prev" data-page="${prev}" aria-label="Page précédente">${I.arrowL || '‹'}</a>` : '<span class="cat-pages__arr is-off" aria-hidden="true">‹</span>';
      nums.forEach((k, i) => {
        if (i && k - nums[i - 1] > 1) html += '<span class="cat-pages__gap" aria-hidden="true">…</span>';
        const on = k >= s && k <= e;
        html += `<a href="${pageHref(k)}" data-page="${k}"${on ? ' class="is-on"' : ''}${k === s ? ' aria-current="page"' : ''}${k === prev ? ' rel="prev"' : k === next ? ' rel="next"' : ''}>${k}</a>`;
      });
      html += next ? `<a class="cat-pages__arr" href="${pageHref(next)}" rel="next" data-page="${next}" aria-label="Page suivante">${I.arrow}</a>` : '<span class="cat-pages__arr is-off" aria-hidden="true">›</span>';
      pagesEl.innerHTML = html;
    };
    const paintMore = () => {
      const [a, b] = range(), t = current.length;
      moreWrap.hidden = !t;
      progTxt.textContent = a ? `${a + 1}–${b} sur ${t}` : `${b} sur ${t}`;
      prog.style.transform = `scaleX(${t ? b / t : 0})`;
      moreBtn.hidden = b >= t;
      paintPages();
    };

    /* --------------------------------------------------------------------
       Application : filtre → tri → grille
       -------------------------------------------------------------------- */
    let firstPaint = true;
    function apply({ animate = true, keepPages = false } = {}) {
      if (!keepPages) { state.start = 1; state.pages = 1; }
      QT = qTokens();
      current = results();
      state.start = Math.min(state.start, lastPage());
      const t = current.length;
      totalEl.textContent = t; totalLbl.textContent = t > 1 ? 'références' : 'référence';
      const ac = activeCount();
      if (fcount) { fcount.hidden = !ac; fcount.textContent = ac; }
      if (seeBtn) seeBtn.textContent = t ? `Voir ${t} résultat${t > 1 ? 's' : ''}` : 'Aucun résultat';
      const ch = chipsHTML(); activeEl.innerHTML = ch; activeEl.hidden = !ch;
      emptyEl.hidden = !!t;
      if (!t) emptyTitle.innerHTML = state.q.trim() && !ac ? `Aucun résultat pour «&#8239;${esc(state.q.trim())}&#8239;» <em>dans cette catégorie.</em>` : 'Aucune référence ne correspond <em>à ces critères.</em>';
      const seq = sequence();
      const mutate = () => grid.replaceChildren(...seq);
      if (animate && !firstPaint) flip(mutate);
      else {
        mutate();
        if (firstPaint && motionOK) seq.slice(0, 12).forEach((el, i) => el.animate([{ opacity: 0, transform: 'translateY(26px)' }, { opacity: 1, transform: 'none' }], { duration: 900, delay: 250 + i * 55, easing: EASE, fill: 'backwards' }));
      }
      firstPaint = false;
      paintMore(); updatePanel(); syncURL(); refreshST();
    }

    const animateIn = (els) => { if (motionOK) els.forEach((el, i) => el.animate([{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' }], { duration: 700, delay: Math.min(i, 12) * 40, easing: EASE, fill: 'backwards' })); };
    const loadMore = () => {
      state.pages++;
      const seq = sequence(), had = [...grid.children];
      const prefix = had.every((el, i) => seq[i] === el);
      const add = prefix ? seq.slice(had.length) : seq.filter((el) => !had.includes(el));
      if (prefix) grid.append(...add); else grid.replaceChildren(...seq);
      animateIn(add);
      paintMore(); refreshST();
      const first = add.find((el) => el.matches('.pcard'))?.querySelector('.pcard__title a'); if (first) first.focus({ preventScroll: true });
    };
    moreBtn.addEventListener('click', loadMore);

    // « Afficher les produits précédents » : on ajoute la page au-dessus sans faire sauter la vue
    prevEl.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || state.start < 2) return;
      e.preventDefault();
      const anchor = grid.firstElementChild, y0 = anchor ? anchor.getBoundingClientRect().top : 0;
      const had = new Set(grid.children);
      state.start--; state.pages++;
      grid.replaceChildren(...sequence());
      if (anchor) { const dy = anchor.getBoundingClientRect().top - y0; if (PB.lenis) PB.lenis.scrollTo(scrollY + dy, { immediate: true, force: true }); else scrollTo(0, scrollY + dy); }
      animateIn([...grid.children].filter((el) => !had.has(el)));
      paintMore(); syncURL(); refreshST();
    });

    // remonter en haut des résultats quand l'état change et que l'utilisateur est loin
    const toResults = (force) => {
      const top = shop.getBoundingClientRect().top + scrollY - 10;
      if (force || scrollY > top + 40) { if (PB.lenis) PB.lenis.scrollTo(top, { duration: .9, force: true }); else scrollTo({ top, behavior: PB.reduce ? 'auto' : 'smooth' }); }
    };
    pagesEl.addEventListener('click', (e) => {
      const a = e.target.closest('a[data-page]');
      if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      const k = +a.dataset.page;
      if (k === state.start + state.pages && !moreBtn.hidden) { loadMore(); return; } // page suivante = « Voir plus »
      state.start = k; state.pages = 1;
      apply({ keepPages: true });
      toResults(true);
    });

    let pendingScroll = false;
    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { apply(); if (sheetOpen) pendingScroll = true; else toResults(); });
    };

    /* Recherche dans la catégorie : instantanée, synchronisée dans l'URL */
    let qRaf = 0;
    qIn.addEventListener('input', () => {
      state.q = qIn.value.slice(0, 80);
      qClear.hidden = !qIn.value;
      cancelAnimationFrame(qRaf);
      qRaf = requestAnimationFrame(() => apply());
    });
    qIn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); if (mqSheet.matches) qIn.blur(); toResults(); }
      if (e.key === 'Escape' && qIn.value) { e.preventDefault(); e.stopPropagation(); qIn.value = ''; state.q = ''; qClear.hidden = true; apply(); }
    });
    qClear.addEventListener('click', () => { qIn.value = ''; state.q = ''; qClear.hidden = true; apply(); qIn.focus(); });

    /* Onglets de familles (Promotions) */
    if (tabs) tabs.addEventListener('click', (e) => {
      const a = e.target.closest('a[data-fam]');
      if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      state.fam = a.dataset.fam;
      schedule();
    });

    /* Événements filtres */
    if (panel) {
      panel.addEventListener('change', (e) => {
        const inp = e.target;
        if (inp.dataset.g) { const s = state.sel[inp.dataset.g]; inp.checked ? s.add(inp.value) : s.delete(inp.value); schedule(); }
        else if (inp.dataset.sw) { state[inp.dataset.sw] = inp.checked; schedule(); }
      });
      panel.addEventListener('click', (e) => {
        const more = e.target.closest('[data-fmore]');
        if (more) { const g = more.closest('.fgroup'); const c = g.classList.toggle('is-collapsed'); more.textContent = c ? `Afficher ${$$('[data-opt]', g).length - 6} de plus` : 'Afficher moins'; }
      });
      // curseurs de prix : mise à jour immédiate de l'affichage, filtrage en rAF
      Object.entries(rIn).forEach(([k, el]) => {
        if (!el) return;
        el.addEventListener('input', () => {
          let a = tToPrice(+rIn.min.value / 1000), b = tToPrice(+rIn.max.value / 1000);
          if (a > b) { if (k === 'min') a = b; else b = a; }
          state.pmin = Math.max(PMIN, a); state.pmax = Math.min(PMAX, b);
          paintPrice();
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(() => apply({ animate: false }));
        });
        el.addEventListener('change', () => apply());
        // le curseur le plus proche du pointeur passe au-dessus
        el.addEventListener('pointerdown', () => { rIn.min.style.zIndex = k === 'min' ? 3 : 2; rIn.max.style.zIndex = k === 'max' ? 3 : 2; });
      });
    }
    const clearAll = () => {
      ACTIVE_GROUPS.forEach((g) => state.sel[g.key].clear());
      state.pmin = PMIN; state.pmax = PMAX; state.promo = false; state.lots = false; state.stock = false;
      state.q = ''; qIn.value = ''; qClear.hidden = true;
      schedule();
    };
    root.addEventListener('click', (e) => {
      if (e.target.closest('[data-clear]')) { clearAll(); return; }
      const rm = e.target.closest('[data-frm]');
      if (rm) {
        const [k, id] = rm.dataset.frm.split('|');
        if (k === 'price') { state.pmin = PMIN; state.pmax = PMAX; }
        else if (k === 'q') { state.q = ''; qIn.value = ''; qClear.hidden = true; }
        else if (k in SW_TEST) state[k] = false;
        else state.sel[k]?.delete(id);
        schedule();
      }
    });
    sortSel.addEventListener('change', () => { state.sort = sortSel.value; apply(); });

    /* --------------------------------------------------------------------
       Desktop : masquer / afficher le panneau · Mobile : feuille glissante
       -------------------------------------------------------------------- */
    const toggleBtn = $('[data-filters-toggle]'), toggleLbl = $('[data-toggle-lbl]');
    const scrim = $('[data-sheet-scrim]');
    let sheetOpen = false, lastFocus = null;
    let sheetY = 0, sheetV = 0, sheetRaf = 0;
    const sheetH = () => panel.getBoundingClientRect().height + 24;
    const rubber = (o, d, c = .55) => (o * d * c) / (d + c * o);
    const setY = (y) => {
      sheetY = y;
      const H = sheetH();
      const shown = y < 0 ? -rubber(-y, H) : y;
      panel.style.transform = `translate3d(0, ${shown}px, 0)`;
      scrim.style.opacity = String(Math.max(0, Math.min(1, 1 - y / H)));
    };
    const springTo = (target, done) => {
      cancelAnimationFrame(sheetRaf);
      if (!motionOK) { setY(target); done && done(); return; }
      const w = 2 * Math.PI / .5; let last = performance.now();
      const tick = (now) => {
        const dt = Math.min(.032, (now - last) / 1000); last = now;
        sheetV += (-w * w * (sheetY - target) - 2 * w * sheetV) * dt; setY(sheetY + sheetV * dt);
        if (Math.abs(sheetY - target) > .5 || Math.abs(sheetV) > 8) sheetRaf = requestAnimationFrame(tick);
        else { sheetV = 0; setY(target); done && done(); }
      };
      sheetRaf = requestAnimationFrame(tick);
    };
    const lockPage = (on) => { if (PB.lenis) on ? PB.lenis.stop() : PB.lenis.start(); doc.body.style.overflow = on ? 'hidden' : ''; };
    const openSheet = () => {
      if (sheetOpen) return;
      sheetOpen = true; lastFocus = doc.activeElement;
      panel.classList.add('is-open'); scrim.classList.add('is-on');
      panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true');
      toggleBtn?.setAttribute('aria-expanded', 'true');
      lockPage(true);
      sheetV = 0; setY(sheetH());
      requestAnimationFrame(() => springTo(0));
      setTimeout(() => $('[data-sheet-close]', panel)?.focus({ preventScroll: true }), 60);
    };
    const closeSheet = () => {
      if (!sheetOpen) return;
      sheetOpen = false;
      toggleBtn?.setAttribute('aria-expanded', 'false');
      scrim.classList.remove('is-on');
      springTo(sheetH(), () => {
        panel.classList.remove('is-open'); panel.style.transform = ''; scrim.style.opacity = '';
        panel.removeAttribute('role'); panel.removeAttribute('aria-modal');
      });
      lockPage(false);
      lastFocus?.focus?.({ preventScroll: true });
      if (pendingScroll) { pendingScroll = false; setTimeout(toResults, 120); }
    };

    // Desktop : repli du panneau (préférence mémorisée)
    let collapsed = false;
    try { collapsed = localStorage.getItem('pb-cat-collapsed') === '1'; } catch { /* idem */ }
    const paintCollapse = () => {
      layout.classList.toggle('is-collapsed', collapsed);
      if (!mqSheet.matches && toggleBtn) { toggleBtn.setAttribute('aria-expanded', String(!collapsed)); toggleLbl.textContent = collapsed ? 'Afficher les filtres' : 'Masquer les filtres'; }
      else if (toggleLbl) toggleLbl.textContent = 'Filtrer';
    };
    paintCollapse();
    toggleBtn?.addEventListener('click', () => {
      if (mqSheet.matches) { openSheet(); return; }
      flip(() => { collapsed = !collapsed; paintCollapse(); grid.replaceChildren(...sequence()); });
      try { localStorage.setItem('pb-cat-collapsed', collapsed ? '1' : '0'); } catch { /* idem */ }
      refreshST();
    });
    mqSheet.addEventListener('change', () => {
      if (!mqSheet.matches && sheetOpen) { sheetOpen = false; panel.classList.remove('is-open'); panel.style.transform = ''; scrim.classList.remove('is-on'); scrim.style.opacity = ''; panel.removeAttribute('role'); panel.removeAttribute('aria-modal'); lockPage(false); }
      paintCollapse();
    });
    $$('[data-sheet-close]', panel || doc).forEach((b) => b.addEventListener('click', closeSheet));
    scrim?.addEventListener('click', closeSheet);
    addEventListener('keydown', (e) => {
      if (!sheetOpen) return;
      if (e.key === 'Escape') { e.stopPropagation(); closeSheet(); }
      if (e.key === 'Tab') { // piège de focus minimal
        const f = $$('button:not([disabled]), input:not([disabled]), summary, select, a[href]', panel).filter((el) => el.offsetParent !== null);
        if (!f.length) return;
        if (e.shiftKey && doc.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && doc.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
      }
    });

    // Glisser pour fermer (poignée/en-tête : pointer ; corps : touch quand il est en haut)
    if (panel) {
      const handle = $('[data-sheet-handle]', panel), body = $('[data-sheet-body]', panel);
      let drag = null;
      const dStart = (y, t) => { cancelAnimationFrame(sheetRaf); drag = { y0: y, s0: sheetY, hist: [{ y, t }] }; panel.classList.add('is-dragging'); };
      const dMove = (y, t) => { if (!drag) return; drag.hist.push({ y, t }); if (drag.hist.length > 6) drag.hist.shift(); setY(drag.s0 + (y - drag.y0)); };
      const dEnd = () => {
        if (!drag) return;
        const a = drag.hist[0], b = drag.hist[drag.hist.length - 1];
        const v = b.t > a.t ? (b.y - a.y) / (b.t - a.t) : 0; // px/ms
        drag = null; panel.classList.remove('is-dragging');
        sheetV = v * 1000;
        const projected = sheetY + v * 180; // projection d'élan
        if (projected > sheetH() * .35 || v > .6) closeSheet(); else springTo(0);
      };
      handle.addEventListener('pointerdown', (e) => {
        if (!sheetOpen || e.target.closest('button')) return;
        handle.setPointerCapture(e.pointerId); dStart(e.clientY, e.timeStamp);
      });
      handle.addEventListener('pointermove', (e) => drag && dMove(e.clientY, e.timeStamp));
      handle.addEventListener('pointerup', dEnd); handle.addEventListener('pointercancel', dEnd);

      let ts = null;
      body.addEventListener('touchstart', (e) => { if (!sheetOpen) return; ts = { y: e.touches[0].clientY, x: e.touches[0].clientX, top: body.scrollTop <= 0, active: false }; }, { passive: true });
      body.addEventListener('touchmove', (e) => {
        if (!ts || !sheetOpen) return;
        const y = e.touches[0].clientY, dy = y - ts.y, dx = e.touches[0].clientX - ts.x;
        if (!ts.active) {
          if (ts.top && dy > 6 && Math.abs(dy) > Math.abs(dx) && body.scrollTop <= 0) { ts.active = true; dStart(y, e.timeStamp); } else if (Math.abs(dy) > 6) { ts = null; return; } else return;
        }
        e.preventDefault(); dMove(y, e.timeStamp);
      }, { passive: false });
      const tEnd = () => { if (ts && ts.active) dEnd(); ts = null; };
      body.addEventListener('touchend', tEnd); body.addEventListener('touchcancel', tEnd);
    }

    /* --------------------------------------------------------------------
       Premier rendu (la page ?page=N de l'URL est respectée)
       -------------------------------------------------------------------- */
    apply({ animate: false, keepPages: true });
  });
})();
