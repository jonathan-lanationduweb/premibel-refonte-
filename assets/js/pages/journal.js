/* ==========================================================================
   Journal & conseils — article à la une, filtres par thème, recherche, grille éditoriale
   ========================================================================== */
PB.ready(() => {
  const { $, $$, esc } = PB;
  const J = window.PBJ;
  const posts = [...(window.PB_POSTS || [])].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const featured = posts[0];

  const featureEl = $('[data-feature]'), grid = $('[data-grid]'), status = $('[data-status]');
  const themesEl = $('[data-themes]'), q = $('[data-q]'), moreWrap = $('[data-more-wrap]'), moreBtn = $('[data-more]');
  $('[data-count-label]').textContent = `${posts.length} articles · mis à jour le ${J.date(posts[0].date)}`;

  /* ---------- Article à la une ---------- */
  if (featured) {
    const th = J.themeOf(featured.slug);
    featureEl.innerHTML = `<article class="jfeature">
      <a class="jfeature__media media-reveal" href="${J.url(featured)}" tabindex="-1" aria-hidden="true"><img src="${esc(J.img(featured))}" alt="" fetchpriority="high" decoding="async"></a>
      <div class="jfeature__body">
        <p class="eyebrow">À la une${th ? ` · ${esc(th.label)}` : ''}</p>
        <h2 class="jfeature__title reveal"><a href="${J.url(featured)}">${esc(J.typo(J.titleOf(featured)))}</a></h2>
        <p class="jfeature__excerpt reveal">${esc(J.excerpt(featured, 260))}</p>
        <div class="jfeature__foot reveal">
          <span class="jfeature__meta">${esc(J.date(featured.date))}<i aria-hidden="true"></i>${esc(J.readTime(featured))}</span>
          <a class="btn btn--dark" href="${J.url(featured)}"><span>Lire l’article</span>${PB.I.arrow}</a>
        </div>
      </div>
    </article>`;
  }

  /* ---------- Thèmes (catégories WordPress réelles, seuls ceux qui ont des articles) ---------- */
  const counts = {};
  posts.forEach((p) => J.themeKeys(p.slug).forEach((k) => { counts[k] = (counts[k] || 0) + 1; }));
  const themes = J.themes.filter((t) => counts[t.key]);
  themesEl.innerHTML = `<button class="chip is-active" type="button" data-theme="" aria-pressed="true">Tous <small>${posts.length}</small></button>`
    + themes.map((t) => `<button class="chip" type="button" data-theme="${t.key}" aria-pressed="false">${esc(t.label)} <small>${counts[t.key]}</small></button>`).join('');

  /* ---------- État (synchronisé avec l'URL : ?t=theme&q=texte) ---------- */
  const state = { theme: '', q: '', shown: 12 };
  const initT = PB.qs('t'), initQ = PB.qs('q');
  if (initT && counts[initT]) state.theme = initT;
  if (initQ) { state.q = initQ; q.value = initQ; }

  const syncUrl = () => {
    const u = new URL(location.href);
    state.theme ? u.searchParams.set('t', state.theme) : u.searchParams.delete('t');
    state.q ? u.searchParams.set('q', state.q) : u.searchParams.delete('q');
    history.replaceState(null, '', u);
  };

  // Rythme éditorial : rangées de 12 colonnes qui alternent les gabarits
  const PATTERN = ['lg', 'md', 'sm', 'note', 'sm', 'md', 'lg', 'half', 'half', 'sm', 'sm', 'sm'];

  const filtered = () => {
    const terms = J.norm(state.q.trim()).split(/\s+/).filter(Boolean);
    return posts.filter((p) => (!state.theme || J.themeKeys(p.slug).includes(state.theme))
      && (!terms.length || terms.every((t) => J.norm(p.title).includes(t))));
  };

  const render = ({ animate = true } = {}) => {
    const active = !!(state.theme || state.q.trim());
    featureEl.hidden = active;
    let list = filtered();
    if (!active) list = list.filter((p) => p !== featured);
    const slice = list.slice(0, state.shown);

    $$('[data-theme]').forEach((b) => { const on = b.dataset.theme === state.theme; b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', on); });

    if (!list.length) {
      grid.innerHTML = `<div class="jempty"><p class="jempty__title">Aucun article ne correspond${state.q ? ` à « ${esc(state.q)} »` : ''}.</p><p class="muted">Essayez un autre mot-clé ou parcourez tous les thèmes.</p><button class="btn btn--line btn--sm" type="button" data-reset><span>Réinitialiser les filtres</span></button></div>`;
      status.textContent = 'Aucun résultat';
      moreWrap.hidden = true;
      return;
    }
    // Avec un filtre actif et peu de résultats, on évite les grands formats isolés
    const pat = active && list.length < 4 ? ['half', 'half', 'sm'] : PATTERN;
    grid.innerHTML = slice.map((p, i) => J.card(p, pat[i % pat.length], { i: i % 6 })).join('');
    const th = state.theme && J.themeByKey(state.theme);
    status.textContent = active ? `${list.length} article${list.length > 1 ? 's' : ''}${th ? ` · ${th.label}` : ''}${state.q ? ` · « ${state.q} »` : ''}` : '';
    moreWrap.hidden = list.length <= state.shown;
    if (!moreWrap.hidden) moreBtn.querySelector('span').textContent = `Afficher plus d’articles (${list.length - state.shown})`;
    if (animate) PB.motionIn(grid);
  };

  themesEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-theme]'); if (!b) return;
    state.theme = b.dataset.theme; state.shown = 12; syncUrl(); render();
    // fait défiler la liste en vue si l'utilisateur est plus bas
    const top = $('.jtools').getBoundingClientRect().top;
    if (top < 0) (PB.lenis ? PB.lenis.scrollTo($('.jlist'), { offset: -90 }) : $('.jlist').scrollIntoView());
  });
  let t;
  q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { state.q = q.value; state.shown = 12; syncUrl(); render(); }, 140); });
  $('[data-search-form]').addEventListener('submit', (e) => { e.preventDefault(); clearTimeout(t); state.q = q.value; syncUrl(); render(); });
  grid.addEventListener('click', (e) => {
    if (!e.target.closest('[data-reset]')) return;
    state.theme = ''; state.q = ''; q.value = ''; state.shown = 12; syncUrl(); render(); q.focus();
  });
  moreBtn.addEventListener('click', () => {
    const before = grid.children.length;
    state.shown += 12; render({ animate: false });
    PB.motionIn(grid);
    const next = grid.children[before]; if (next) next.querySelector('a')?.focus({ preventScroll: true });
  });

  /* ---------- Passerelle vers le guide d'achat ---------- */
  const G = (window.PB_SITE && PB_SITE.guides) || [];
  $('[data-guide-teaser]').innerHTML = `<div class="jguide">
    <div class="jguide__media media-reveal"><img src="assets/img/site/point-de-hongrie.webp" alt="Parquet en point de Hongrie" loading="lazy"></div>
    <div class="jguide__body">
      <p class="eyebrow">Guide d’achat</p>
      <h2 class="h2 split">Bien choisir <em>son parquet</em></h2>
      <p class="lead reveal">Explorez nos guides pour choisir le parquet idéal selon votre pièce, votre style, votre usage et vos envies.</p>
      <ol class="jguide__list reveal">${G.map((g, i) => `<li><a href="guide.html?g=${g.slug}"><span>${String(i + 1).padStart(2, '0')}</span>${esc(g.title)}</a></li>`).join('')}</ol>
      <a class="btn btn--dark reveal" href="guide.html"><span>Ouvrir le guide d’achat</span>${PB.I.arrow}</a>
    </div>
  </div>`;

  render({ animate: false });
});
