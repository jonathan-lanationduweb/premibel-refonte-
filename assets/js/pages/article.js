/* ==========================================================================
   Article du journal — article.html?a=<slug>
   Héros, progression de lecture, sommaire automatique (section active),
   contenu WordPress nettoyé (.prose), liens internes réécrits vers la maquette,
   produits liés, articles suivants, partage.
   ========================================================================== */
PB.ready(async () => {
  const { $, $$, esc } = PB;
  const J = window.PBJ;
  const main = $('[data-article]');
  const posts = [...(window.PB_POSTS || [])].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const slug = PB.qs('a') || '';
  const post = posts.find((p) => p.slug === slug);

  await PB.load('categories');

  /* ---------- Slug inconnu : état vide ---------- */
  if (!post) {
    document.title = 'Article introuvable — Premibel Parquet';
    main.innerHTML = `<section class="page-hero container aempty">
      <nav class="crumbs" aria-label="Fil d’Ariane"><a href="index.html">Accueil</a><span aria-hidden="true">/</span><a href="journal.html">Journal</a><span aria-hidden="true">/</span><span>Article introuvable</span></nav>
      <p class="eyebrow">Erreur de lien</p>
      <h1 class="h1 split">Cet article <em>n’existe pas</em> ou plus.</h1>
      <p class="lead reveal">${slug ? `Aucun article ne correspond à l’adresse « ${esc(slug)} ». ` : ''}Il a peut-être été renommé. Retrouvez tous nos conseils dans le journal.</p>
      <div class="aempty__actions reveal"><a class="btn btn--dark" href="journal.html"><span>Voir le journal</span>${PB.I.arrow}</a><a class="btn btn--line" href="guide.html"><span>Guide d’achat</span></a></div>
    </section>
    <section class="container section--tight"><p class="eyebrow">Derniers articles</p><div class="jgrid">${posts.slice(0, 3).map((p, i) => J.card(p, 'sm', { i })).join('')}</div></section>`;
    $('.aprogress')?.remove();
    return;
  }

  /* ---------- Méta ---------- */
  const th = J.themeOf(post.slug);
  const title = J.typo(J.titleOf(post));
  document.title = `${J.titleOf(post)} — Journal Premibel Parquet`;
  const md = $('meta[name="description"]'); if (md) md.content = J.excerpt(post, 155);

  /* ---------- Nettoyage du HTML WordPress ---------- */
  const POST_SLUGS = new Set(posts.map((p) => p.slug));
  const ALIAS_POSTS = {
    'astuces/choisir-le-parquet-ideal-massif-contrecolle-ou-stratifie': 'choisir-son-parquet-guide-complet-par-premibel-parquet',
    'couleur-parquet': 'comment-choisir-la-meilleure-couleur-de-parquet',
  };
  const PAGES = {
    '': 'index.html', magasins: 'magasins.html', contact: 'contact.html', 'demande-de-devis': 'devis.html', 'prise-de-rendez-vous': 'rendez-vous.html',
    'premibel-parquet-paris-voltaire': 'magasin.html?m=voltaire', 'premibel-paris-roquette': 'magasin.html?m=roquette', 'premibel-pantin-entrepot': 'magasin.html?m=pantin',
    'guide-achat-parquet': 'guide.html', 'types-parquet': 'guide.html?g=types-parquets', 'types-parquets': 'guide.html?g=types-parquets', 'types-pose': 'guide.html?g=types-pose',
    'types-piece': 'guide.html?g=types-piece', essences: 'guide.html?g=essences', motifs: 'guide.html?g=motifs-parquet', 'motifs-parquet': 'guide.html?g=motifs-parquet',
    teintes: 'guide.html?g=teintes', finitions: 'guide.html?g=finitions-parquet', 'finitions-parquet': 'guide.html?g=finitions-parquet', 'parquets-professionnels': 'guide.html?g=parquets-professionnels',
    blog: 'journal.html', 'astuces-conseils': 'journal.html',
  };
  const CAT_ALIAS = { chene: 'parquet-massif-chene' };
  /** premibel.fr/... → page équivalente de la maquette (null si pas d'équivalent évident) */
  const rewrite = (href) => {
    let u; try { u = new URL(href, 'https://www.premibel.fr/'); } catch { return null; }
    if (!/(^|\.)premibel\.fr$/.test(u.hostname)) return null;
    const segs = u.pathname.split('/').filter(Boolean);
    const path = segs.join('/');
    if (segs.length === 2 && /^\d+$/.test(segs[1])) return `produit.html?ref=${segs[1]}`; // fiche produit /<cat>/<réf>/
    if (ALIAS_POSTS[path]) return J.url({ slug: ALIAS_POSTS[path] });
    const s = segs[0] || '';
    if (POST_SLUGS.has(s)) return J.url({ slug: s });
    const s2 = s.replace(/-\d+$/, ''); if (POST_SLUGS.has(s2)) return J.url({ slug: s2 });
    if (s in PAGES) return PAGES[s];
    if (PB.cat(s)) return PB.catUrl(s);
    if (CAT_ALIAS[s]) return PB.catUrl(CAT_ALIAS[s]);
    return null;
  };
  const slugify = (s) => J.norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'section';

  const tpl = document.createElement('template');
  tpl.innerHTML = post.html;
  const root = tpl.content;
  // paragraphes vides / espaces
  $$('p', root).forEach((p) => { if (!p.textContent.trim() && !p.querySelector('img,iframe')) p.remove(); });
  // image en double avec le héros
  const firstFig = root.querySelector('figure');
  if (firstFig && firstFig.querySelector('img')?.getAttribute('src') === post.img && firstFig === root.firstElementChild) firstFig.remove();
  // visuels absents du site source (non téléchargeables) : retirés avant rendu
  const MISSING = ['assets/img/journal/design-sans-titre-1.webp'];
  $$('img', root).forEach((img) => { if (MISSING.includes(img.getAttribute('src'))) (img.closest('figure') || img).remove(); });
  $$('img', root).forEach((img) => {
    if (!img.getAttribute('alt')) img.setAttribute('alt', '');
    img.setAttribute('loading', 'lazy'); img.setAttribute('decoding', 'async');
    const fig = img.closest('figure'); if (fig) fig.classList.add('prose__fig');
  });
  // tableaux : conteneur défilant + nettoyage des espaces
  $$('table', root).forEach((t) => {
    const w = document.createElement('div'); w.className = 'prose__table'; w.tabIndex = 0; w.setAttribute('role', 'region'); w.setAttribute('aria-label', 'Tableau comparatif');
    t.replaceWith(w); w.appendChild(t);
    $$('th, td', t).forEach((c) => { c.innerHTML = c.innerHTML.trim(); });
    if (!t.querySelector('thead') && t.rows[0] && t.rows[0].cells.length > 1) {
      // 1re ligne en <strong> partout = en-tête
      const r = t.rows[0]; if ([...r.cells].every((c) => c.querySelector('strong') && c.textContent.trim() === c.querySelector('strong').textContent.trim())) r.classList.add('is-head');
    }
  });
  // vidéos YouTube : 16/9, sans cookies
  $$('iframe', root).forEach((f) => {
    const w = document.createElement('div'); w.className = 'prose__embed';
    const src = (f.getAttribute('src') || '').replace('www.youtube.com/embed', 'www.youtube-nocookie.com/embed');
    f.setAttribute('src', src); f.setAttribute('loading', 'lazy'); f.removeAttribute('width'); f.removeAttribute('height'); f.removeAttribute('frameborder');
    f.setAttribute('title', f.getAttribute('title') && !/YouTube video player/i.test(f.getAttribute('title')) ? f.getAttribute('title') : `Vidéo — ${post.title}`);
    f.setAttribute('allow', 'accelerometer; encrypted-media; gyroscope; picture-in-picture'); f.setAttribute('allowfullscreen', '');
    f.replaceWith(w); w.appendChild(f);
  });
  // liens
  $$('a[href]', root).forEach((a) => {
    const to = rewrite(a.getAttribute('href'));
    if (to) { a.setAttribute('href', to); a.removeAttribute('target'); a.removeAttribute('rel'); return; }
    if (/^https?:/.test(a.getAttribute('href'))) { a.target = '_blank'; a.rel = 'noopener'; }
  });
  // retours à la ligne superflus en fin de paragraphe
  $$('br', root).forEach((br) => { if (!br.nextSibling || (br.nextSibling.nodeType === 3 && !br.nextSibling.textContent.trim() && !br.nextSibling.nextSibling)) br.remove(); });
  // paragraphe d'ouverture entièrement en gras = réponse courte
  const firstP = root.querySelector('p');
  if (firstP && firstP.children.length === 1 && firstP.firstElementChild.tagName === 'STRONG' && firstP.textContent.trim() === firstP.firstElementChild.textContent.trim()) {
    firstP.classList.add('prose__answer');
  } else {
    // souvent le 2e paragraphe est la réponse courte (le 1er sert d'introduction)
    const p2 = $$('p', root).slice(0, 3).find((p) => p.children.length === 1 && p.firstElementChild.tagName === 'STRONG' && p.textContent.trim() === p.firstElementChild.textContent.trim() && p.textContent.length > 120);
    if (p2) p2.classList.add('prose__answer');
  }
  // typographie française dans les nœuds texte
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (n.parentElement && /^(SCRIPT|STYLE)$/.test(n.parentElement.tagName)) continue;
    n.textContent = n.textContent.replace(/'/g, '’').replace(/ ([:;?!»])/g, ' $1').replace(/« /g, '« ');
  }
  // sommaire : h2 (ou h2 + h3 si l'article a peu de h2)
  const h2s = $$('h2', root);
  const tocEls = h2s.length >= 3 ? h2s : $$('h2, h3', root);
  const used = new Set();
  tocEls.forEach((h) => {
    let id = slugify(h.textContent); while (used.has(id)) id += '-2'; used.add(id); h.id = id;
  });
  const toc = tocEls.length >= 3 ? tocEls.map((h) => ({ id: h.id, text: h.textContent.trim(), sub: h.tagName === 'H3' })) : [];

  /* ---------- Rendu ---------- */
  const tocHTML = toc.length ? `<ol class="atoc__list">${toc.map((t, i) => `<li class="${t.sub ? 'is-sub' : ''}"><a href="#${t.id}" data-toc="${t.id}"><span class="atoc__n">${String(i + 1).padStart(2, '0')}</span><span>${esc(t.text)}</span></a></li>`).join('')}</ol>` : '';
  const shareHTML = `<div class="ashare">
      <p class="ashare__label">Partager</p>
      <button class="ashare__btn" type="button" data-copy><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg><span data-copy-label>Copier le lien</span></button>
      <button class="ashare__btn" type="button" data-native-share hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V4M8 8l4-4 4 4"/><path d="M5 12v7h14v-7"/></svg><span>Partager…</span></button>
      <a class="ashare__btn" href="${PB_SITE.whatsapp ? `https://api.whatsapp.com/send/?text=${encodeURIComponent(`${post.title} — ${location.href}`)}` : '#'}" target="_blank" rel="noopener">${PB.I.wa.replace('<svg', '<svg class="is-fill" aria-hidden="true"')}<span>WhatsApp</span></a>
    </div>`;

  main.innerHTML = `
  <header class="ahero container">
    <nav class="crumbs" aria-label="Fil d’Ariane"><a href="index.html">Accueil</a><span aria-hidden="true">/</span><a href="journal.html">Journal</a>${th ? `<span aria-hidden="true">/</span><a href="journal.html?t=${th.key}">${esc(th.label)}</a>` : ''}</nav>
    <div class="ahero__meta reveal">
      ${th ? `<a class="ahero__theme" href="journal.html?t=${th.key}">${esc(th.label)}</a>` : ''}
      <span><time datetime="${post.date}">${esc(J.date(post.date))}</time></span>
      <span>${esc(J.readTime(post))}</span>
    </div>
    <h1 class="ahero__title split">${esc(title)}</h1>
  </header>
  <figure class="ahero__cover media-reveal"><img src="${esc(J.img(post))}" alt="" fetchpriority="high" decoding="async"></figure>

  <div class="abody container">
    <aside class="atoc" aria-label="Sommaire">
      ${toc.length ? `<details class="atoc__box" open><summary>Sommaire <span class="atoc__count">${toc.length} parties</span></summary>${tocHTML}</details>` : ''}
    </aside>
    <article class="prose aprose" data-prose></article>
    <aside class="aside-share">${shareHTML}</aside>
  </div>

  <section class="container aend">
    <div class="aend__row">
      <div><p class="aend__label">Publié dans</p>${th ? J.themeKeys(post.slug).map((k) => { const t = J.themeByKey(k); return `<a class="chip" href="journal.html?t=${k}">${esc(t.label)}</a>`; }).join(' ') : '<span class="muted">Journal</span>'}</div>
      ${shareHTML.replace('class="ashare"', 'class="ashare ashare--row"')}
    </div>
  </section>

  <section class="section arel" data-related hidden></section>

  <section class="container section--tight anext" aria-labelledby="anext-t">
    <div class="head-row"><h2 class="h2 split" id="anext-t">À lire <em>ensuite</em></h2><a class="link-arrow" href="journal.html">Tout le journal <span>→</span></a></div>
    <div class="jgrid" data-next></div>
  </section>

  <div class="section--tight">${PB.ctaBandHTML({ title: 'Une question sur votre projet ? <em>Parlons-en.</em>', text: 'Rendez-vous en showroom, devis gratuit ou conseil immédiat sur WhatsApp : nos experts vous orientent selon la pièce, le support et la pose envisagée.' })}</div>`;

  const prose = $('[data-prose]');
  prose.appendChild(root);
  // images manquantes : on retire proprement la figure
  $$('img', prose).forEach((img) => img.addEventListener('error', () => { (img.closest('figure') || img).remove(); if (window.ScrollTrigger) ScrollTrigger.refresh(); }, { once: true }));
  $('.ahero__cover img').addEventListener('error', function onErr() { this.src = 'assets/img/site/lames-droites.webp'; }, { once: true });

  /* ---------- Sommaire mobile replié ---------- */
  const tocBox = $('.atoc__box');
  const mqDesk = matchMedia('(min-width: 1081px)');
  const syncToc = () => { if (tocBox) tocBox.open = mqDesk.matches; };
  syncToc(); mqDesk.addEventListener('change', syncToc);
  if (tocBox) tocBox.addEventListener('click', (e) => { if (e.target.closest('a') && !mqDesk.matches) tocBox.open = false; });

  /* ---------- Progression de lecture + section active ---------- */
  const bar = $('[data-progress]');
  const progress = () => {
    const r = prose.getBoundingClientRect();
    const total = r.height - innerHeight * .6;
    const p = Math.max(0, Math.min(1, (-r.top + innerHeight * .25) / Math.max(1, total)));
    bar.style.transform = `scaleX(${p})`;
  };
  PB.onScroll(progress); addEventListener('scroll', progress, { passive: true }); addEventListener('resize', progress); progress();

  if (toc.length) {
    const links = new Map($$('[data-toc]').map((a) => [a.dataset.toc, a]));
    const heads = toc.map((t) => document.getElementById(t.id));
    let current = null;
    const setActive = () => {
      const y = innerHeight * .3; let id = null;
      for (const h of heads) { if (h.getBoundingClientRect().top - y <= 0) id = h.id; else break; }
      if (id === current) return; current = id;
      links.forEach((a, k) => { const on = k === id; a.classList.toggle('is-active', on); if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    };
    PB.onScroll(setActive); addEventListener('scroll', setActive, { passive: true }); setActive();
  }

  /* ---------- Partage ---------- */
  const copy = async (btn) => {
    const url = location.href;
    let ok = false;
    try { await navigator.clipboard.writeText(url); ok = true; } catch {
      const ta = document.createElement('textarea'); ta.value = url; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); try { ok = document.execCommand('copy'); } catch { ok = false; } ta.remove();
    }
    const lab = btn.querySelector('[data-copy-label]');
    if (ok) { lab.textContent = 'Lien copié'; btn.classList.add('is-done'); PB.toast('<span>Lien de l’article copié dans le presse-papiers.</span>'); setTimeout(() => { lab.textContent = 'Copier le lien'; btn.classList.remove('is-done'); }, 2200); }
    else PB.toast('<span>Copie impossible : sélectionnez l’adresse dans la barre du navigateur.</span>');
  };
  main.addEventListener('click', (e) => {
    const c = e.target.closest('[data-copy]'); if (c) { copy(c); return; }
    const s = e.target.closest('[data-native-share]'); if (s && navigator.share) navigator.share({ title: post.title, url: location.href }).catch(() => {});
  });
  if (navigator.share) $$('[data-native-share]').forEach((b) => { b.hidden = false; });

  /* ---------- À lire ensuite : même thème d'abord, puis chronologie ---------- */
  const idx = posts.indexOf(post);
  const keys = J.themeKeys(post.slug);
  const sameTheme = posts.filter((p) => p !== post && J.themeKeys(p.slug).some((k) => keys.includes(k)));
  const chrono = [...posts.slice(idx + 1), ...posts.slice(0, idx)];
  const next = [];
  [...sameTheme.slice(0, 2), ...chrono].forEach((p) => { if (next.length < 3 && !next.includes(p) && p !== post) next.push(p); });
  $('[data-next]').innerHTML = next.map((p, i) => J.card(p, 'sm', { i })).join('');

  /* ---------- Produits liés (mots-clés du titre → catégories) ---------- */
  const KEYS = [
    [/point de hongrie|hongrie/, 'point-de-hongrie'], [/batons? rompus?/, 'baton-rompu'], [/versailles/, 'versailles'],
    [/bambou/, 'parquet-bambou-massif'], [/terrasse/, 'lames-de-terrasse'], [/stratifie/, 'parquet-sol-stratifie'],
    [/flottant|contrecolle/, 'parquet-flottant'], [/massif/, 'parquet-massif'], [/sous-couche|phonique|acoustique|dinachoc/, 'sous-couche'],
    [/huile/, 'huile'], [/verni/, 'verni'], [/chene/, 'parquet-massif-chene'], [/anglaise/, 'lames-droites'],
    [/entretien|longevite/, 'finition-et-entretien'], [/salon/, 'parquet-salon'], [/intensif|resistant/, 'parquet-bureau-usage-commercial'],
    [/couleur|design|styles?|tendances/, 'naturel'], [/renovation/, 'parquet-flottant'], [/simple a poser|poser|pose/, 'parquet-sol-stratifie'],
  ];
  const nt = J.norm(post.title);
  const cats = [];
  KEYS.forEach(([re, c]) => { if (re.test(nt) && !cats.includes(c) && cats.length < 2) cats.push(c); });
  const fallback = !cats.length;
  if (fallback) cats.push('promotions');

  const relEl = $('[data-related]');
  PB.load('products').then(() => {
    const seen = new Set(); const list = [];
    const pools = cats.map((c) => PB.inCat(c).filter((p) => p.imgs && p.imgs.length));
    // alterne les catégories pour un mélange équilibré
    for (let i = 0; list.length < 8 && pools.some((pl) => pl[i]); i++) pools.forEach((pl) => { const p = pl[i]; if (p && !seen.has(p.sku) && list.length < 8) { seen.add(p.sku); list.push(p); } });
    if (!list.length) return;
    const c0 = PB.cat(cats[0]);
    relEl.hidden = false;
    relEl.innerHTML = `<div class="container head-row">
        <div><p class="eyebrow">${fallback ? 'Sélection du moment' : 'Dans cet article'}</p><h2 class="h2 split">${fallback ? 'Nos parquets <em>en promotion</em>' : `Les parquets <em>évoqués</em>`}</h2></div>
        <div class="arel__links">${cats.map((c) => PB.cat(c) ? `<a class="chip" href="${PB.catUrl(c)}">${esc(PB.cat(c).name)} <small class="muted">${PB.cat(c).count}</small></a>` : '').join('')}</div>
      </div>
      <div class="rail" data-rail><div class="rail__track">${list.map((p) => PB.productCard(p)).join('')}</div></div>
      <div class="container rail__ui"><div class="rail__progress"><span data-rp></span></div><div class="rail__arrows"><button class="round-btn" type="button" aria-label="Précédent" data-prev>${PB.I.arrowL}</button><button class="round-btn" type="button" aria-label="Suivant" data-nxt>${PB.I.arrow}</button></div>
      ${c0 ? `<a class="link-arrow" href="${PB.catUrl(cats[0])}">Voir les ${c0.count} références <span>→</span></a>` : ''}</div>`;
    PB.rail($('[data-rail]', relEl), { progress: $('[data-rp]', relEl), prev: $('[data-prev]', relEl), next: $('[data-nxt]', relEl) });
    PB.motionIn(relEl);
  });
});
