/* ==========================================================================
   Guide d'achat — guide.html (hub + outil « Quel parquet pour moi ? »)
   et guide.html?g=<slug> (détail d'un guide, contenu réel de premibel.fr)
   Données : data/guides.js (window.PB_GUIDES), produits/catégories à la demande.
   ========================================================================== */
PB.ready(async () => {
  const { $, $$, esc } = PB;
  const J = window.PBJ;
  const DATA = window.PB_GUIDES || { hub: {}, guides: [] };
  const GUIDES = DATA.guides;
  const root = $('[data-guide-root]');
  const slugify = (s) => J.norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const secId = (s) => `s-${slugify(s.title)}`;
  const num = (i) => String(i + 1).padStart(2, '0');
  const typo = J.typo;
  /** « Les types de pose » → « Les types de <em>pose</em> » */
  const emLast = (t) => { const w = typo(t).split(' '); const last = w.pop(); return `${esc(w.join(' '))} <em>${esc(last)}</em>`; };
  const cover = (g) => (g.sections.find((s) => s.img) || {}).img;

  await PB.load('categories');
  const slug = PB.qs('g');
  const guide = slug && GUIDES.find((g) => g.slug === slug);

  /* Mini-liste produits (aperçu compact) */
  const mini = (p) => `<a class="gmini" href="${PB.productUrl(p)}">
      <span class="gmini__img"><img src="${esc(p.imgs[0] || PB.PLACEHOLDER)}" alt="" loading="lazy" decoding="async"></span>
      <span class="gmini__txt"><b>${esc(p.name)}</b><small>${PB.money(PB.ttc(p.price))} TTC / ${PB.unitLabel(p)}</small></span>
    </a>`;
  const pickProducts = (cat, n, filter = () => true) => PB.inCat(cat).filter((p) => p.imgs && p.imgs.length && filter(p)).slice(0, n);

  const helpHTML = (help) => `<section class="container section--tight">
    <div class="ghelp">
      <div><p class="eyebrow">Accompagnement</p><h2 class="h2 split">${help ? esc(help.title.replace(/\s*\?$/, '')) : 'Besoin d’aide pour choisir'}&nbsp;<em>?</em></h2></div>
      <div class="ghelp__side reveal">
        <p class="lead">${esc(help ? help.text : 'Nos experts vous accompagnent pour trouver le parquet idéal selon votre style, votre usage et votre budget.')}</p>
        <div class="ghelp__actions">
          <a class="btn btn--dark" href="rendez-vous.html"><span>Prendre rendez-vous</span>${PB.I.arrow}</a>
          <a class="btn btn--line" href="contact.html"><span>Contacter un expert</span></a>
          <a class="btn btn--line" href="${esc(PB_SITE.whatsapp)}" target="_blank" rel="noopener"><span>WhatsApp</span></a>
        </div>
      </div>
    </div>
  </section>`;

  if (guide) renderGuide(guide);
  else renderHub(slug);

  /* =======================================================================
     DÉTAIL D'UN GUIDE
     ======================================================================= */
  function renderGuide(g) {
    const gi = GUIDES.indexOf(g);
    const prev = GUIDES[(gi - 1 + GUIDES.length) % GUIDES.length], next = GUIDES[(gi + 1) % GUIDES.length];
    document.title = `${g.title} — Guide d’achat Premibel Parquet`;
    const md = $('meta[name="description"]');
    if (md) md.content = `${g.title} : ${g.sections.map((s) => s.title).join(', ')}. Le guide d’achat parquet Premibel.`;
    const single = g.sections.length === 1;

    root.innerHTML = `
    <section class="page-hero container ghero">
      <nav class="crumbs" aria-label="Fil d’Ariane"><a href="index.html">Accueil</a><span aria-hidden="true">/</span><a href="guide.html">Guide d’achat</a><span aria-hidden="true">/</span><span>${esc(g.short)}</span></nav>
      <p class="eyebrow">Guide d’achat · ${num(gi)} / ${num(GUIDES.length - 1)}</p>
      <div class="page-hero__grid">
        <h1 class="h1 split">${emLast(g.title)}</h1>
        <div class="reveal">
          <p class="lead">${esc(typo(g.kicker))}.</p>
          ${single ? '' : `<p class="ghero__in muted">Dans ce guide — ${g.sections.length} ${g.slug === 'teintes' ? 'teintes' : 'fiches'}</p>`}
        </div>
      </div>
      ${single ? '' : `<nav class="gtoc reveal" aria-label="Sommaire du guide">${g.sections.map((s) => `<a class="gtoc__item" href="#${secId(s)}"><span class="gtoc__img" data-sec-thumb="${secId(s)}">${s.img ? `<img src="${esc(s.img.src)}" alt="" loading="lazy">` : ''}</span>${esc(s.title)}</a>`).join('')}</nav>`}
    </section>

    <div class="gsecs">${g.sections.map((s, i) => `
      <section class="gsec ${i % 2 ? 'gsec--flip' : ''} container" id="${secId(s)}" aria-labelledby="${secId(s)}-t">
        <div class="gsec__media media-reveal" data-sec-media="${secId(s)}">${s.img ? `<img src="${esc(s.img.src)}" alt="${esc(s.img.alt)}" loading="${i ? 'lazy' : 'eager'}" decoding="async">` : ''}</div>
        <div class="gsec__body">
          <p class="gsec__n">${single ? 'Guide' : `${num(i)} — ${num(g.sections.length - 1)}`}</p>
          <h2 class="gsec__title split" id="${secId(s)}-t">${esc(typo(s.title))}${s.tagline ? `<span class="gsec__tag"> <em>${esc(s.tagline)}</em></span>` : ''}</h2>
          ${s.text.map((t) => `<p class="gsec__text reveal">${esc(t)}</p>`).join('')}
          ${s.items.length ? `<ul class="gsec__list reveal" aria-label="Avantages">${s.items.map((it) => `<li>${esc(it)}</li>`).join('')}</ul>` : ''}
          ${s.link && s.link.cat && PB.cat(s.link.cat) ? `<div class="gsec__shop reveal" data-shop="${esc(s.link.cat)}">
              <div class="gsec__minis" data-minis></div>
              <a class="btn btn--dark btn--sm" href="${PB.catUrl(s.link.cat)}"><span>${esc(s.link.label)}</span><small class="gsec__count">${PB.cat(s.link.cat).count}</small>${PB.I.arrow}</a>
            </div>` : ''}
        </div>
      </section>`).join('')}
    </div>

    ${helpHTML(g.help)}

    <nav class="container gpager" aria-label="Autres guides">
      <a class="gpager__link" href="guide.html?g=${prev.slug}"><small>← Guide précédent</small><b>${esc(prev.title)}</b></a>
      <a class="gpager__hub" href="guide.html">Tous les guides</a>
      <a class="gpager__link gpager__link--next" href="guide.html?g=${next.slug}"><small>Guide suivant →</small><b>${esc(next.title)}</b></a>
    </nav>`;

    // Images manquantes (ex. teinte « brun » : visuel absent du site source) → photo produit de la catégorie
    PB.load('products').then(() => {
      g.sections.forEach((s) => {
        const id = secId(s);
        const shop = $(`#${id} [data-shop]`);
        if (shop) {
          const list = pickProducts(shop.dataset.shop, 3);
          $('[data-minis]', shop).innerHTML = list.map(mini).join('');
          if (!list.length) $('[data-minis]', shop).remove();
        }
        if (!s.img && s.link && s.link.cat) {
          const p = pickProducts(s.link.cat, 1)[0];
          if (p) {
            const m = $(`[data-sec-media="${id}"]`);
            m.innerHTML = `<img src="${esc(p.imgs[0])}" alt="${esc(s.title)}" loading="lazy">`;
            const t = $(`[data-sec-thumb="${id}"]`); if (t) t.innerHTML = `<img src="${esc(p.imgs[0])}" alt="" loading="lazy">`;
            PB.motionIn(m.parentElement);
          }
        }
        if (!s.img && !(s.link && s.link.cat)) $(`[data-sec-media="${id}"]`)?.classList.add('is-empty');
      });
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    });

    // sommaire : section active
    const items = $$('.gtoc__item');
    if (items.length) {
      const secs = g.sections.map((s) => document.getElementById(secId(s)));
      const onScroll = () => {
        let id = null; const y = innerHeight * .45;
        secs.forEach((el) => { if (el.getBoundingClientRect().top <= y) id = el.id; });
        items.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${id}`));
      };
      PB.onScroll(onScroll); addEventListener('scroll', onScroll, { passive: true }); onScroll();
    }
    // ancre directe (#s-...) à l'arrivée
    if (location.hash) setTimeout(() => { const t = document.getElementById(location.hash.slice(1)); if (t) (PB.lenis ? PB.lenis.scrollTo(t, { offset: -90, immediate: true }) : t.scrollIntoView()); }, 120);
  }

  /* =======================================================================
     HUB
     ======================================================================= */
  function renderHub(badSlug) {
    root.innerHTML = `
    <section class="page-hero container ghub-hero">
      <nav class="crumbs" aria-label="Fil d’Ariane"><a href="index.html">Accueil</a><span aria-hidden="true">/</span><span>Guide d’achat</span></nav>
      ${badSlug ? `<p class="gnotice reveal" role="status">Le guide « ${esc(badSlug)} » n’existe pas. Voici l’ensemble de nos guides.</p>` : ''}
      <p class="eyebrow">${esc(DATA.hub.title || 'Guide d’achat parquet')}</p>
      <div class="page-hero__grid">
        <h1 class="h1 split">Bien choisir <em>son parquet</em></h1>
        <div class="reveal">
          <p class="lead">${esc(DATA.hub.intro || '')}</p>
          <a class="link-arrow ghub-hero__quiz" href="#quiz">Quel parquet pour moi ? Répondez à 4 questions <span>→</span></a>
        </div>
      </div>
    </section>

    <section class="container gindex" aria-label="Les guides">
      <ol class="gindex__list">${GUIDES.map((g, i) => {
        const c = cover(g);
        return `<li class="gindex__row reveal">
          <a class="gindex__link" href="guide.html?g=${g.slug}" data-preview="${esc(c ? c.src : '')}">
            <span class="gindex__n">${num(i)}</span>
            <span class="gindex__thumb">${c ? `<img src="${esc(c.src)}" alt="" loading="lazy">` : ''}</span>
            <span class="gindex__title">${esc(g.title)}</span>
            <span class="gindex__kicker">${esc(g.kicker)}</span>
            <span class="gindex__secs">${g.sections.length > 1 ? `${g.sections.length} fiches` : 'Usage modéré ou intensif'}</span>
            <span class="gindex__go" aria-hidden="true">${PB.I.arrow}</span>
          </a>
        </li>`;
      }).join('')}</ol>
      <div class="gindex__preview" aria-hidden="true"><img alt="" data-preview-img></div>
    </section>

    <section class="section" id="quiz" aria-labelledby="quiz-t">
      <div class="panel gquiz" data-quiz></div>
    </section>

    <section class="container section--tight gmosaic" aria-labelledby="gmosaic-t">
      <div class="head-row"><h2 class="h2 split" id="gmosaic-t">Motifs, teintes, <em>finitions</em></h2><p class="muted gmosaic__note reveal">Un aperçu des fiches détaillées de nos guides.</p></div>
      <div class="gmosaic__grid" data-mosaic></div>
    </section>

    <section class="container section--tight" data-reads hidden>
      <div class="head-row"><h2 class="h2 split">Pour aller <em>plus loin</em></h2><a class="link-arrow" href="journal.html">Journal & conseils <span>→</span></a></div>
      <div class="jgrid" data-reads-grid></div>
    </section>

    ${helpHTML(GUIDES[0] && GUIDES[0].help)}`;

    /* Aperçu image au survol (desktop) — suit le pointeur avec un ressort */
    const prev = $('.gindex__preview'), pimg = $('[data-preview-img]');
    if (PB.hover && !PB.reduce && window.gsap) {
      const xTo = gsap.quickTo(prev, 'x', { duration: .6, ease: 'expo.out' }), yTo = gsap.quickTo(prev, 'y', { duration: .6, ease: 'expo.out' });
      const list = $('.gindex__list');
      list.addEventListener('pointermove', (e) => { const r = $('.gindex').getBoundingClientRect(); xTo(e.clientX - r.left); yTo(e.clientY - r.top); });
      $$('.gindex__link').forEach((a) => a.addEventListener('pointerenter', () => { if (a.dataset.preview) { pimg.src = a.dataset.preview; prev.classList.add('is-on'); } }));
      list.addEventListener('pointerleave', () => prev.classList.remove('is-on'));
    }

    /* Mosaïque : fiches visuelles tirées des guides motifs / teintes / finitions */
    const pick = [['motifs-parquet', 0], ['teintes', 1], ['finitions-parquet', 0], ['motifs-parquet', 1], ['teintes', 0], ['essences', 0], ['finitions-parquet', 1]];
    $('[data-mosaic]').innerHTML = pick.map(([gs, si], i) => {
      const g = GUIDES.find((x) => x.slug === gs); const s = g && g.sections[si]; if (!s || !s.img) return '';
      return `<a class="gtile gtile--${i} reveal" href="guide.html?g=${gs}#${secId(s)}"><img src="${esc(s.img.src)}" alt="${esc(s.img.alt)}" loading="lazy"><span class="gtile__cap"><small>${esc(g.short)}</small><b>${esc(s.title)}</b></span></a>`;
    }).join('');

    /* Articles du journal liés au choix */
    PB.load('posts').then(([posts]) => {
      const want = ['choisir-son-parquet-guide-complet-par-premibel-parquet', 'chene-huile-ou-verni', 'difference-point-de-hongrie-baton-rompu'];
      const list = want.map((s) => (posts || []).find((p) => p.slug === s)).filter(Boolean);
      if (!list.length) return;
      $('[data-reads-grid]').innerHTML = list.map((p, i) => J.card(p, 'sm', { i })).join('');
      $('[data-reads]').hidden = false; PB.motionIn($('[data-reads]'));
    });

    initQuiz($('[data-quiz]'));
  }

  /* =======================================================================
     « Quel parquet pour moi ? »
     Les justifications sont tirées mot pour mot des guides (data/guides.js) :
     aucune règle ne contredit leur contenu.
     ======================================================================= */
  function initQuiz(el) {
    const sec = (gs, title) => { const g = GUIDES.find((x) => x.slug === gs); return g && g.sections.find((s) => s.title === title); };
    const item = (gs, title, i) => { const s = sec(gs, title); return s && s.items[i] ? { text: s.items[i], href: `guide.html?g=${gs}#${secId(s)}`, from: s.title } : null; };

    const Q = [
      { key: 'room', q: 'Pour quelle pièce ?', opts: [['salon', 'Salon, séjour'], ['chambre', 'Chambre'], ['cuisine', 'Cuisine'], ['sdb', 'Salle de bain'], ['entree', 'Entrée, couloir'], ['bureau', 'Bureau, commerce'], ['ext', 'Extérieur, terrasse']] },
      { key: 'traffic', q: 'Quel niveau de passage ?', skip: (a) => a.room === 'ext', opts: [['calme', 'Modéré', 'Chambre, bureau à domicile'], ['quotidien', 'Quotidien', 'Vie de famille, pièce ouverte'], ['intensif', 'Intensif', 'Commerce, accueil, couloir très fréquenté']] },
      { key: 'heat', q: 'Chauffage au sol ?', skip: (a) => a.room === 'ext', opts: [['non', 'Non'], ['oui', 'Oui'], ['nsp', 'Je ne sais pas']] },
      { key: 'style', q: 'Quel style recherchez-vous ?', skip: (a) => a.room === 'ext', opts: [['charme', 'Charme & caractère', 'Haussmannien, motifs'], ['naturel', 'Naturel & lumineux', 'Bois clair, aspect brut'], ['contemporain', 'Contemporain & sobre', 'Lignes droites, tons neutres'], ['intense', 'Chaleureux & affirmé', 'Teintes profondes']] },
    ];
    const ROOM = { salon: ['Parquet salon', 3], chambre: ['Parquet chambre', 1], cuisine: ['Parquet cuisine', 3], sdb: ['Parquet salle de bain', 3], entree: ['Parquet entrée & couloir', 3], bureau: ['Parquet bureau', 2] };

    const decide = (a) => {
      const r = { reasons: [], extras: [], heatFilter: a.heat === 'oui' };
      const add = (x) => x && r.reasons.push(x);
      const extra = (label, value, gs, title) => { const s = sec(gs, title); r.extras.push({ label, value, href: s ? `guide.html?g=${gs}#${secId(s)}` : `guide.html?g=${gs}` }); };
      const traffic = a.room === 'entree' && a.traffic === 'calme' ? 'quotidien' : a.traffic; // entrée = zone de passage (guide « types de pièce »)

      if (a.room === 'ext') {
        Object.assign(r, { type: 'Lames de terrasse', cat: 'lames-de-terrasse', guide: ['types-parquets', 'Lames de terrasse'] });
        add(item('types-parquets', 'Lames de terrasse', 1)); add(item('types-parquets', 'Lames de terrasse', 3)); add(item('types-parquets', 'Lames de terrasse', 5));
        return r;
      }
      if (ROOM[a.room]) add(item('types-piece', ROOM[a.room][0], ROOM[a.room][1]));

      if (a.room === 'cuisine' || a.room === 'sdb') {
        Object.assign(r, { type: 'Parquet salle de bain & cuisine', cat: 'parquet-pour-salles-de-bain-et-cuisines', guide: ['types-parquets', 'Parquet salle de bain & cuisine'] });
        add(item('types-parquets', 'Parquet salle de bain & cuisine', 5));
        add(item('finitions-parquet', 'Parquet verni', 2));
        extra('Finition', 'Vernie', 'finitions-parquet', 'Parquet verni');
      } else if (a.heat === 'oui' || a.heat === 'nsp') {
        const motif = a.style === 'charme';
        Object.assign(r, { type: motif ? 'Parquet contrecollé en point de Hongrie' : 'Parquet contrecollé', cat: motif ? 'parquet-flottant-point-de-hongrie' : 'parquet-flottant', guide: ['types-parquets', 'Parquet contrecollé'] });
        add(item('types-parquets', 'Parquet contrecollé', 1));
        if (a.heat === 'oui') { add(item('types-pose', 'Pose collée', 3)); extra('Pose', 'Collée', 'types-pose', 'Pose collée'); }
        else extra('Pose', 'À définir avec nos experts', 'types-pose', 'Pose collée');
        if (motif) extra('Motif', 'Point de Hongrie', 'motifs-parquet', 'Point de Hongrie');
        if (traffic === 'intensif') { add(item('finitions-parquet', 'Parquet verni', 0)); extra('Finition', 'Vernie', 'finitions-parquet', 'Parquet verni'); }
      } else if (traffic === 'intensif') {
        if (a.style === 'contemporain' || a.style === 'naturel') {
          Object.assign(r, { type: 'Sol stratifié', cat: 'parquet-sol-stratifie', guide: ['types-parquets', 'Sol stratifié'] });
          add(item('types-parquets', 'Sol stratifié', 3)); add(item('types-parquets', 'Sol stratifié', 2));
          extra('Pose', 'Clipsée', 'types-pose', 'Pose clipsée');
        } else {
          Object.assign(r, { type: 'Parquet contrecollé verni', cat: 'parquet-flottant-chene-verni', guide: ['types-parquets', 'Parquet contrecollé'] });
          add(item('types-parquets', 'Parquet contrecollé', 1)); add(item('finitions-parquet', 'Parquet verni', 0));
          extra('Finition', 'Vernie', 'finitions-parquet', 'Parquet verni');
        }
      } else if (a.style === 'charme') {
        Object.assign(r, { type: 'Parquet massif en point de Hongrie', cat: 'point-de-hongrie', guide: ['types-parquets', 'Parquet massif'] });
        add(item('motifs-parquet', 'Point de Hongrie', 2)); add(item('types-parquets', 'Parquet massif', 3));
        extra('Motif', 'Point de Hongrie ou bâton rompu', 'motifs-parquet', 'Point de Hongrie');
        extra('Pose', 'Collée ou clouée', 'types-pose', 'Pose clouée');
      } else if (a.style === 'naturel') {
        const fam = traffic === 'quotidien';
        Object.assign(r, { type: fam ? 'Parquet massif en chêne verni' : 'Parquet massif en chêne huilé', cat: fam ? 'parquet-massif-chene-verni' : 'parquet-massif-chene-huile', guide: ['essences', 'Chêne'] });
        add(item('essences', 'Chêne', 1));
        add(fam ? item('finitions-parquet', 'Parquet verni', 3) : item('finitions-parquet', 'Parquet huilé', 0));
        extra('Finition', fam ? 'Vernie' : 'Huilée', 'finitions-parquet', fam ? 'Parquet verni' : 'Parquet huilé');
        extra('Teinte', 'Claire ou naturelle', 'teintes', 'Parquet clair');
      } else if (a.style === 'contemporain') {
        if (traffic === 'quotidien') {
          Object.assign(r, { type: 'Sol stratifié', cat: 'parquet-sol-stratifie', guide: ['types-parquets', 'Sol stratifié'] });
          add(item('types-parquets', 'Sol stratifié', 5)); add(item('types-parquets', 'Sol stratifié', 4));
          extra('Pose', 'Clipsée', 'types-pose', 'Pose clipsée');
        } else {
          Object.assign(r, { type: 'Parquet contrecollé en lames droites', cat: 'parquet-flottant-en-chene', guide: ['types-parquets', 'Parquet contrecollé'] });
          add(item('types-parquets', 'Parquet contrecollé', 5)); add(item('motifs-parquet', 'Lames droites', 2));
          extra('Pose', 'Flottante', 'types-pose', 'Pose flottante');
        }
        extra('Teinte', 'Grise ou naturelle', 'teintes', 'Parquet gris');
      } else {
        Object.assign(r, { type: 'Parquet massif en bois exotique', cat: 'massif-en-bois-exotique', guide: ['essences', 'Essences exotiques'] });
        add(item('essences', 'Essences exotiques', 0)); add(item('essences', 'Essences exotiques', 1));
        if (traffic === 'quotidien') { add(item('finitions-parquet', 'Parquet verni', 3)); extra('Finition', 'Vernie', 'finitions-parquet', 'Parquet verni'); }
        extra('Teinte', 'Brune ou foncée', 'teintes', 'Parquet foncé');
      }
      if (a.room === 'bureau' && traffic === 'intensif') { add(item('parquets-professionnels', 'Usage professionnel', 0)); r.extras.push({ label: 'Usage pro', value: 'Voir le guide', href: 'guide.html?g=parquets-professionnels' }); }
      if (a.heat === 'oui') r.extras.push({ label: 'Chauffage au sol', value: 'Aperçu filtré sur les références compatibles' });
      r.reasons = r.reasons.slice(0, 4);
      return r;
    };

    const ans = {};
    let step = 0;
    const steps = () => Q.filter((q) => !(q.skip && q.skip(ans)));

    el.innerHTML = `<div class="gquiz__head">
        <div><p class="eyebrow">Outil d’aide au choix</p><h2 class="h2 split" id="quiz-t">Quel parquet <em>pour moi ?</em></h2></div>
        <p class="muted gquiz__intro reveal">Quatre questions pour une première orientation, fondée sur le contenu de nos guides. Nos experts affinent ensuite selon votre support et votre projet.</p>
      </div>
      <div class="gquiz__stage" data-stage aria-live="polite"></div>`;
    const stage = $('[data-stage]', el);

    const anim = (node, dir = 1) => {
      if (PB.reduce || !node.animate) return;
      node.animate([{ opacity: 0, transform: `translateX(${dir * 24}px)` }, { opacity: 1, transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.22,1,.36,1)' });
    };

    const renderStep = (dir = 1) => {
      const S = steps();
      if (step >= S.length) return renderResult();
      const q = S[step];
      stage.innerHTML = `<form class="gq" data-q="${q.key}">
        <div class="gq__top"><span class="gq__count">Question ${step + 1} / ${S.length}</span><span class="gq__bar" aria-hidden="true"><i style="transform:scaleX(${(step + 1) / S.length})"></i></span></div>
        <fieldset><legend class="gq__q">${esc(q.q)}</legend>
          <div class="gq__opts ${q.opts.length > 4 ? 'gq__opts--many' : ''}">${q.opts.map(([v, l, h]) => `<label class="gq__opt"><input type="radio" name="${q.key}" value="${v}" ${ans[q.key] === v ? 'checked' : ''}><span><b>${esc(l)}</b>${h ? `<small>${esc(h)}</small>` : ''}</span></label>`).join('')}</div>
        </fieldset>
        <div class="gq__nav">${step ? '<button class="btn btn--line btn--sm" type="button" data-back><span>← Retour</span></button>' : '<span></span>'}<span class="muted gq__hint">Choisissez une réponse</span></div>
      </form>`;
      const form = $('form', stage);
      anim(form, dir);
      form.addEventListener('change', (e) => {
        ans[q.key] = e.target.value;
        setTimeout(() => { step += 1; renderStep(1); focusStage(); }, PB.reduce ? 0 : 220);
      });
      $('[data-back]', form)?.addEventListener('click', () => { step -= 1; renderStep(-1); focusStage(); });
    };
    const focusStage = () => { const f = $('input:checked, input, [data-restart]', stage); if (f && el.getBoundingClientRect().top < innerHeight) f.focus({ preventScroll: true }); };

    const renderResult = async () => {
      const r = decide(ans);
      await PB.load('products');
      const compat = (p) => /temp/i.test(p.spec['Chauffage au sol'] || '');
      let all = PB.inCat(r.cat).filter((p) => p.imgs && p.imgs.length);
      if (r.heatFilter) all = all.filter(compat);
      const prods = all.slice(0, 4);
      const c = PB.cat(r.cat);
      const S = steps();
      const recap = S.map((q) => { const o = q.opts.find((x) => x[0] === ans[q.key]); return o ? o[1] : ''; }).filter(Boolean);
      stage.innerHTML = `<div class="gres">
        <div class="gres__main">
          <p class="gres__recap">${recap.map((x) => `<span>${esc(x)}</span>`).join('')}</p>
          <p class="gres__label">Notre orientation</p>
          <h3 class="gres__type">${esc(r.type)}</h3>
          ${r.reasons.length ? `<ul class="gres__why">${r.reasons.map((x) => `<li><span>${esc(x.text)}</span><a href="${x.href}">${esc(x.from)} →</a></li>`).join('')}</ul>` : ''}
          ${r.extras.length ? `<dl class="gres__extras">${r.extras.map((x) => `<div><dt>${esc(x.label)}</dt><dd>${x.href ? `<a href="${x.href}">${esc(x.value)}</a>` : esc(x.value)}</dd></div>`).join('')}</dl>` : ''}
          <div class="gres__actions">
            <a class="btn btn--dark" href="${PB.catUrl(r.cat)}"><span>Voir ${c ? `les ${c.count} références` : 'la sélection'}</span>${PB.I.arrow}</a>
            <button class="btn btn--line" type="button" data-restart><span>Recommencer</span></button>
          </div>
          <p class="gres__note">Orientation indicative, à confirmer avec nos experts selon votre support, la surface et la pose envisagée${r.heatFilter ? ' ; vérifiez la mention « Chauffage au sol » sur chaque fiche produit' : ''}.</p>
        </div>
        <div class="gres__prods">${prods.length ? `<p class="gres__label">${r.heatFilter ? 'Compatibles chauffage au sol' : 'Aperçu de la sélection'}</p><div class="gres__grid">${prods.map(mini).join('')}</div>` : ''}</div>
      </div>`;
      anim($('.gres', stage), 1);
      $('[data-restart]', stage).addEventListener('click', () => { Object.keys(ans).forEach((k) => delete ans[k]); step = 0; renderStep(-1); focusStage(); });
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    };

    renderStep();
  }
});
