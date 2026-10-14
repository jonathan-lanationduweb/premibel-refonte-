/* ==========================================================================
   Demande de devis parquet en ligne — parcours en 5 étapes (comme le site en ligne)
   1. Produits : catalogue intégré (recherche 3 caractères min., filtres Motif /
      Finition / Couleur avec compteurs, tri, pagination) + panneau « Produits
      ajoutés au devis » (surface par produit → colis calculés). Lit et écrit
      PB.devis : les ajouts faits depuis les fiches produit apparaissent ici.
   2. Informations · 3. Adresse · 4. Projet (+ pièces jointes, interface seule)
   5. Récapitulatif → succès. ?ref=SKU ajoute un produit. Aucun envoi réseau.
   ========================================================================== */
PB.ready(() => {
  const { $, $$, esc, I } = PB;
  const F = window.PBF, S = window.PBS;
  const SITE = window.PB_SITE || {};
  const form = $('[data-devis]');
  const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });
  const PER_PAGE = 12;
  const NO_IMG = /gescomo-no-image/;
  const imgOf = (p) => (p.imgs || []).find((s) => s && !NO_IMG.test(s)) || PB.PLACEHOLDER;
  const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const parseNum = (v) => { const n = parseFloat(String(v).replace(',', '.').replace(/[^\d.]/g, '')); return isFinite(n) && n > 0 ? Math.min(n, 100000) : 0; };
  /* Filtres du site en ligne (catégories du catalogue) */
  const FILTERS = [
    ['Motif', ['baton-rompu', 'point-de-hongrie', 'versailles', 'lames-droites']],
    ['Finition', ['huile', 'verni', 'brut']],
    ['Couleur', ['blanc', 'clair', 'gris', 'naturel', 'miel', 'cuivre', 'brun', 'fonce']],
  ];

  /* ---------- Aide latérale ---------- */
  $('[data-aside-wa]').href = SITE.whatsapp || '#';
  if (SITE.phone) { $('[data-aside-phone]').textContent = SITE.phone; if (S && S.tel) $('[data-aside-tel]').href = S.tel(SITE.phone); }

  /* ---------- Société : obligatoire si genre « Société » ---------- */
  const socHint = $('[data-soc-hint]');
  form.genre.addEventListener('change', () => {
    const on = form.genre.value === 'Société';
    form.societe.required = on;
    socHint.textContent = on ? '' : '(raison sociale, facultatif)';
    const lab = form.societe.nextElementSibling;
    lab.querySelector('.req')?.remove();
    if (on) lab.insertAdjacentHTML('beforeend', ' <span class="req" aria-hidden="true">*</span>');
    else if (form.societe.getAttribute('aria-invalid') === 'true') F.validateField(form.societe);
  });

  /* ---------- Code postal : information Île-de-France ---------- */
  const zone = $('[data-zone]');
  form.cp.addEventListener('input', () => {
    form.cp.value = form.cp.value.replace(/\D/g, '').slice(0, 5);
    const v = form.cp.value;
    const idf = /^(75|77|78|91|92|93|94|95)\d{3}$/.test(v);
    zone.innerHTML = v.length === 5 && idf ? `${PB.I.truck}<span>Chantier en Île-de-France&#8239;: expédition sous 2 à 5 jours, ou Click &amp; Collect gratuit à notre entrepôt de Pantin. <a href="livraison.html">Conditions</a></span>` : '';
  });

  /* ======================================================================
     1. Produits
     ====================================================================== */
  const cat = $('[data-cat]');
  const qIn = $('#dv-q'), sortSel = $('#dv-sort'), grid = $('[data-grid]', cat), pages = $('[data-pages]', cat), countEl = $('[data-pcount]', cat);
  const filtersEl = $('[data-filters]', cat), fToggle = $('[data-ftoggle]', cat), fCount = $('[data-fcount]', cat), fReset = $('[data-freset]', cat);
  const pickedEl = $('[data-picked]'), selEmpty = $('[data-sel-empty]'), selN = $('[data-sel-n]'), selTot = $('[data-sel-tot]'), selErr = $('[data-sel-err]'), selClear = $('[data-sel-clear]');
  const st = { q: '', sort: 'date-desc', page: 1, active: new Set() };
  let all = [];

  /* Colisage & unités */
  const isM2 = (p) => p.unit === 'm²' && p.pack > 0;
  const uLabel = (p) => (p.unit === 'm²' ? 'm²' : PB.unitLabel(p));
  const packed = (p) => p.pack > 0 && p.unit !== 'Pièce' && p.unit !== 'unité';
  const colisage = (p) => (packed(p) ? `${nf.format(p.pack)} ${uLabel(p)} / colis` : `vendu à l’unité`);
  /** Calcul colis : surface (m²) ou longueur/poids → ⌈valeur / colisage⌉ ; sinon quantité. */
  const calc = (p, v) => {
    if (!v) return null;
    if (packed(p)) { const n = Math.ceil(v / p.pack - 1e-9); return { n, txt: `${n} colis · ${nf.format(Math.round(n * p.pack * 100) / 100)} ${uLabel(p)} livrés` }; }
    const n = Math.ceil(v); return { n, txt: `${nf.format(n)} ${uLabel(p)}${n > 1 && uLabel(p) === 'pièce' ? 's' : ''}` };
  };
  const pickedItems = () => PB.devis.items().map((i) => ({ ...i, p: PB.bySku(i.sku) })).filter((i) => i.p);
  const parquetM2 = () => pickedItems().filter((i) => isM2(i.p)).reduce((n, i) => n + (+i.surface || 0), 0);
  const paintTot = () => { const m2 = parquetM2(); selTot.hidden = !m2; selTot.textContent = m2 ? `Surface totale sélectionnée : ${nf.format(m2)} m²` : ''; };

  function buildFilters() {
    filtersEl.innerHTML = FILTERS.map(([title, slugs]) => `<fieldset class="dv-fg"><legend>${title}</legend><div class="dv-fg__opts">${slugs.map((s) => {
      const c = PB.cat(s);
      return `<label class="dv-chip"><input type="checkbox" value="${s}" data-novalidate data-f><span>${esc(c ? c.name : s)} <i data-fc="${s}"></i></span></label>`;
    }).join('')}</div></fieldset>`).join('');
  }

  const matchQ = (p) => {
    if (st.q.length < 3) return true;
    const hay = p._dn || (p._dn = norm(`${p.name} ${p.raw || ''} ${p.sku}`));
    return st.q.split(/\s+/).every((t) => hay.includes(t));
  };
  /** Filtres : OU dans un groupe, ET entre groupes ; skipGroup sert aux compteurs à facettes. */
  const filtered = (skipGroup = -1) => all.filter((p) => matchQ(p) && FILTERS.every(([, slugs], g) => {
    if (g === skipGroup) return true;
    const on = slugs.filter((s) => st.active.has(s));
    return !on.length || on.some((s) => p.cats.includes(s));
  }));
  const SORTS = {
    'date-desc': (a, b) => b.id - a.id,
    'price-asc': (a, b) => a.price - b.price,
    'price-desc': (a, b) => b.price - a.price,
    'title-asc': (a, b) => a.name.localeCompare(b.name, 'fr'),
    'title-desc': (a, b) => b.name.localeCompare(a.name, 'fr'),
  };

  const cardHTML = (p) => {
    const inD = PB.devis.has(p.sku);
    const d = PB.discount(p);
    return `<li class="dv-card${inD ? ' is-in' : ''}" data-sku="${esc(p.sku)}">
      <a class="dv-card__img" href="${PB.productUrl(p)}" tabindex="-1" aria-hidden="true"><img src="${esc(imgOf(p))}" alt="" loading="lazy" decoding="async">${d ? `<span class="tag tag--promo">−${d} %</span>` : ''}</a>
      <div class="dv-card__body">
        <b class="dv-card__name">${esc(p.name)}</b>
        <span class="dv-card__ref">Réf. ${esc(p.sku)}</span>
        <span class="dv-card__pack">Colisage : ${esc(colisage(p))}</span>
        <span class="dv-card__price"><b>${PB.money(p.price)}</b> HT / ${esc(uLabel(p))}</span>
        <span class="dv-card__note">Prix final calculé sur le devis</span>
      </div>
      <div class="dv-card__acts">
        <button type="button" class="btn ${inD ? 'btn--line' : 'btn--dark'} btn--sm dv-card__add" data-dadd aria-pressed="${inD}"><span>${inD ? 'Ajouté — retirer' : 'Ajouter au devis'}</span></button>
        <a class="dv-card__view" href="${PB.productUrl(p)}">Voir le produit</a>
      </div>
    </li>`;
  };

  function pagerHTML(total) {
    const n = Math.ceil(total / PER_PAGE); if (n <= 1) return '';
    const cur = st.page, items = [];
    const add = (k) => items.push(k === cur ? `<span class="dv-page is-current" aria-current="page">${k}</span>` : `<button type="button" class="dv-page" data-page="${k}" aria-label="Page ${k}">${k}</button>`);
    let prev = 0;
    [...new Set([1, n, cur - 1, cur, cur + 1].filter((k) => k >= 1 && k <= n))].sort((a, b) => a - b).forEach((k) => { if (k - prev > 1) items.push('<span class="dv-page dv-page--gap" aria-hidden="true">…</span>'); add(k); prev = k; });
    return `<button type="button" class="dv-page dv-page--nav" data-page="${cur - 1}" ${cur === 1 ? 'disabled' : ''} aria-label="Page précédente">${PB.I.arrowL}</button>${items.join('')}<button type="button" class="dv-page dv-page--nav" data-page="${cur + 1}" ${cur === n ? 'disabled' : ''} aria-label="Page suivante">${PB.I.arrow}</button>`;
  }

  function renderList({ animate = true } = {}) {
    const list = filtered().sort(SORTS[st.sort] || SORTS['date-desc']);
    const n = Math.max(1, Math.ceil(list.length / PER_PAGE)); st.page = Math.min(st.page, n);
    const slice = list.slice((st.page - 1) * PER_PAGE, st.page * PER_PAGE);
    countEl.textContent = `${list.length} produit${list.length > 1 ? 's' : ''}`;
    grid.innerHTML = slice.length ? slice.map(cardHTML).join('') : '<li class="dv-grid__empty">Aucun produit ne correspond à votre recherche. <button type="button" data-freset2>Effacer la recherche et les filtres</button></li>';
    pages.innerHTML = pagerHTML(list.length);
    FILTERS.forEach(([, slugs], g) => { const base = filtered(g); slugs.forEach((s) => { const el = $(`[data-fc="${s}"]`, filtersEl); if (el) el.textContent = `(${base.filter((p) => p.cats.includes(s)).length})`; }); });
    const nAct = st.active.size;
    fCount.hidden = !nAct; fCount.textContent = nAct; fReset.hidden = !nAct && st.q.length < 3;
    if (animate && PB.motion) gsap.from(grid.children, { opacity: 0, y: 14, duration: .6, ease: 'expo.out', stagger: .025, clearProps: 'opacity,transform' });
  }

  /* ---------- Sélection (PB.devis) ---------- */
  let typing = false;
  function renderPicked() {
    const items = pickedItems();
    selN.textContent = items.length;
    selEmpty.hidden = !!items.length; selClear.hidden = !items.length;
    if (items.length) selErr.hidden = true;
    pickedEl.innerHTML = items.map(({ p, surface }) => {
      const c = calc(p, +surface || 0);
      return `<li class="dv-pick" data-sku="${esc(p.sku)}">
        <img src="${esc(imgOf(p))}" alt="" loading="lazy">
        <span class="dv-pick__t"><a href="${PB.productUrl(p)}">${esc(p.name)}</a><small>Réf. ${esc(p.sku)} · ${esc(colisage(p))}</small><small class="dv-pick__calc" data-calc>${c ? `→ ${esc(c.txt)}` : (isM2(p) ? 'Indiquez la surface souhaitée' : 'Indiquez la quantité')}</small></span>
        <span class="dv-pick__m2 field"><input type="text" inputmode="decimal" placeholder=" " value="${surface ? esc(String(surface).replace('.', ',')) : ''}" id="m2-${esc(p.sku)}" data-m2 data-novalidate aria-label="${isM2(p) ? 'Surface souhaitée en m²' : `Quantité en ${esc(uLabel(p))}`} pour ${esc(p.name)}"><label for="m2-${esc(p.sku)}">${isM2(p) ? 'm²' : esc(uLabel(p))}</label></span>
        <button type="button" class="dv-pick__rm" data-rm-pick aria-label="Retirer ${esc(p.name)} du devis">${I.close}</button>
      </li>`;
    }).join('');
    paintTot();
  }
  const syncCards = () => $$('.dv-card', grid).forEach((li) => {
    const on = PB.devis.has(li.dataset.sku), b = $('[data-dadd]', li);
    li.classList.toggle('is-in', on); b.setAttribute('aria-pressed', on);
    b.classList.toggle('btn--dark', !on); b.classList.toggle('btn--line', on);
    b.querySelector('span').textContent = on ? 'Ajouté — retirer' : 'Ajouter au devis';
  });
  document.addEventListener('pb:devis', () => { if (!typing) renderPicked(); syncCards(); });

  grid.addEventListener('click', (e) => {
    if (e.target.closest('[data-freset2]')) { resetAll(); return; }
    const b = e.target.closest('[data-dadd]'); if (!b) return;
    const sku = b.closest('[data-sku]').dataset.sku;
    if (PB.devis.has(sku)) { PB.devis.remove(sku); return; }
    PB.devis.add(sku);
    const li = pickedEl.querySelector(`[data-sku="${CSS.escape(sku)}"]`);
    if (li && PB.motion) gsap.from(li, { opacity: 0, y: 10, duration: .6, ease: 'expo.out', clearProps: 'opacity,transform' });
    if (PB.toast) { const p = PB.bySku(sku); PB.toast(`<img src="${esc(imgOf(p))}" alt=""><span><b>${esc(p.name)}</b><br>ajouté au devis</span><a href="#dv-sel-t">Surface</a>`); }
  });
  pickedEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-rm-pick]'); if (!b) return;
    const li = b.closest('li'), sku = li.dataset.sku;
    const done = () => PB.devis.remove(sku);
    if (PB.motion) gsap.to(li, { opacity: 0, x: -12, height: 0, marginTop: 0, paddingBlock: 0, duration: .45, ease: 'expo.out', onComplete: done }); else done();
  });
  let sT;
  pickedEl.addEventListener('input', (e) => {
    const m = e.target.closest('[data-m2]'); if (!m) return;
    const li = m.closest('li'), p = PB.bySku(li.dataset.sku), v = parseNum(m.value);
    const c = calc(p, v);
    $('[data-calc]', li).textContent = c ? `→ ${c.txt}` : (isM2(p) ? 'Indiquez la surface souhaitée' : 'Indiquez la quantité');
    clearTimeout(sT);
    sT = setTimeout(() => { typing = true; PB.devis.setSurface(p.sku, v || null); typing = false; paintTot(); }, 250);
  });
  selClear.addEventListener('click', () => PB.devis.clear());

  /* Recherche, tri, filtres, pages */
  let qT;
  qIn.addEventListener('input', () => { clearTimeout(qT); qT = setTimeout(() => { const v = norm(qIn.value.trim()); const eff = v.length >= 3 ? v : ''; if (eff === st.q) return; st.q = eff; st.page = 1; renderList(); }, 160); });
  qIn.addEventListener('keydown', (e) => { if (e.key === 'Enter') e.preventDefault(); });
  sortSel.addEventListener('change', () => { st.sort = sortSel.value; st.page = 1; renderList(); });
  filtersEl.addEventListener('change', (e) => {
    const c = e.target.closest('[data-f]'); if (!c) return;
    if (c.checked) st.active.add(c.value); else st.active.delete(c.value);
    st.page = 1; renderList();
  });
  function resetAll() { st.active.clear(); st.q = ''; qIn.value = ''; $$('[data-f]', filtersEl).forEach((c) => { c.checked = false; }); st.page = 1; renderList(); }
  fReset.addEventListener('click', resetAll);
  pages.addEventListener('click', (e) => {
    const b = e.target.closest('[data-page]'); if (!b || b.disabled) return;
    st.page = +b.dataset.page; renderList();
    const y = scrollY + cat.getBoundingClientRect().top - 110;
    if (PB.lenis) PB.lenis.scrollTo(y, { duration: .8 }); else scrollTo({ top: y, behavior: PB.reduce ? 'auto' : 'smooth' });
  });
  fToggle.addEventListener('click', () => {
    const open = fToggle.getAttribute('aria-expanded') !== 'true';
    fToggle.setAttribute('aria-expanded', open); filtersEl.classList.toggle('is-open', open);
    if (open && PB.motion) gsap.fromTo(filtersEl, { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: .5, ease: 'expo.out', clearProps: 'opacity,transform' });
  });

  PB.load('products', 'categories').then(() => {
    all = PB.products().filter((p) => p.price > 0 && !(p.stock && p.stock.in === false));
    const preRef = PB.qs('ref');
    if (preRef) { const p = PB.bySku(preRef) || PB.bySku(preRef.toUpperCase()); if (p && !PB.devis.has(p.sku)) PB.devis.add(p.sku); }
    buildFilters();
    renderPicked();
    renderList({ animate: false });
  });

  /* ---------- Pièces jointes (interface seule, aucun envoi) ---------- */
  const drop = $('[data-drop]'), fileIn = $('input[type="file"]', drop), filesEl = $('[data-files]');
  let files = [];
  const MAX = 10 * 1024 * 1024, OK = /\.(pdf|jpe?g|png)$/i;
  const size = (b) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} Ko` : `${nf.format(b / 1024 / 1024)} Mo`);
  const renderFiles = () => {
    filesEl.innerHTML = files.map((f, k) => {
      const err = !OK.test(f.name) ? 'format non accepté' : f.size > MAX ? 'fichier trop lourd (10 Mo max.)' : '';
      return `<li class="${err ? 'is-bad' : ''}"><span>${esc(f.name)}</span><small>${err || size(f.size)}</small><button type="button" data-rm-file="${k}" aria-label="Retirer ${esc(f.name)}">${I.close}</button></li>`;
    }).join('');
  };
  const addFiles = (list) => { files = files.concat([...list]).slice(0, 8); renderFiles(); fileIn.value = ''; };
  fileIn.addEventListener('change', () => addFiles(fileIn.files));
  ['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('is-over'); }));
  ['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove('is-over'); }));
  drop.addEventListener('drop', (e) => e.dataTransfer && addFiles(e.dataTransfer.files));
  filesEl.addEventListener('click', (e) => { const b = e.target.closest('[data-rm-file]'); if (b) { files.splice(+b.dataset.rmFile, 1); renderFiles(); } });
  const validFiles = () => files.filter((f) => OK.test(f.name) && f.size <= MAX);

  /* ---------- Récapitulatif ---------- */
  const val = (n) => (form.querySelector(`input[name="${n}"]:checked`) || {}).value || '';
  function recap() {
    const d = new FormData(form);
    const extra = [d.get('chauffage') ? 'chauffage au sol' : '', d.get('avant1980') ? 'logement construit avant 1980' : ''].filter(Boolean).join(', ');
    const rows = [
      ['Produits', pickedItems().map(({ p, surface }) => { const c = calc(p, +surface || 0); return `${esc(p.name)}<small>Réf. ${esc(p.sku)}${c ? ` · ${esc(nf.format(+surface))} ${isM2(p) ? 'm²' : esc(uLabel(p))} → ${esc(c.txt)}` : ' · surface à préciser'}</small>`; }).join(''), 0],
      ['Coordonnées', `${esc(d.get('genre'))} · ${esc(d.get('prenom'))} ${esc(d.get('nom'))}${d.get('societe') ? ` — ${esc(d.get('societe'))}` : ''}<small>${esc(d.get('email'))} · ${esc(d.get('tel'))}</small>`, 1],
      ['Chantier', `${esc(d.get('adresse'))}<small>${esc(d.get('cp'))} ${esc(d.get('ville'))}</small>`, 2],
      ['Projet', `${nf.format(parseFloat(String(d.get('surface')).replace(',', '.')))} m² · échéance : ${esc(d.get('echeance'))}<small>${[val('projet'), val('presta'), extra].filter(Boolean).map(esc).join(' · ') || '—'}</small>`, 3],
      ['Description', esc(d.get('description')), 3],
    ];
    const vf = validFiles();
    if (vf.length) rows.push(['Pièces jointes', vf.map((f) => `${esc(f.name)}<small>${size(f.size)}</small>`).join(''), 3]);
    $('[data-recap]').innerHTML = rows.map(([k, v, s]) => `<div><dt>${k}</dt><dd>${v}</dd><button type="button" class="recap__edit" data-goto="${s}" aria-label="Modifier : ${k}">Modifier</button></div>`).join('');
  }

  /* ---------- Parcours ---------- */
  F.bind(form);
  const needProducts = () => {
    if (PB.devis.count()) return true;
    selErr.hidden = false; selErr.textContent = 'Ajoutez au moins un produit à votre devis pour continuer.';
    if (PB.motion) gsap.fromTo(selErr, { y: -4, opacity: 0 }, { y: 0, opacity: 1, duration: .45, ease: 'expo.out' });
    const y = scrollY + $('[data-sel]').getBoundingClientRect().top - 120;
    if (PB.lenis) PB.lenis.scrollTo(y, { duration: .8 }); else scrollTo({ top: y, behavior: 'smooth' });
    return false;
  };
  const stp = F.stepper($('[data-stepper]', form), {
    beforeNext(i) { return i === 0 ? needProducts() : true; },
    onEnter(i) {
      // Projet : surface totale pré-remplie avec la somme des surfaces sélectionnées
      if (i === 3 && !form.surface.value) { const m2 = parquetM2(); if (m2) form.surface.value = Math.round(m2 * 100) / 100; }
      if (i === 4) recap();
    },
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (e.submitter && e.submitter.closest('.dv-cat')) return;
    if (stp.index < stp.steps.length - 1) { stp.steps[stp.index].querySelector('[data-next]')?.click(); return; }
    const btn = form.querySelector('[type="submit"]');
    if (!PB.devis.count()) { F.nudge(btn); stp.go(0); return; }
    for (let k = 1; k < stp.steps.length - 1; k++) {
      const bad = F.validateScope(stp.steps[k]);
      if (bad) { F.nudge(btn); stp.go(k); return; }
    }
    await F.busy(btn, 1200);
    const d = new FormData(form);
    const n = PB.devis.count();
    F.success(form, {
      title: `Merci ${esc(d.get('prenom'))}, <em>votre demande est partie.</em>`,
      text: `Notre équipe étudie votre projet (${n} produit${n > 1 ? 's' : ''}, ${nf.format(parseFloat(String(d.get('surface')).replace(',', '.')))} m²) et vous répond rapidement à l’adresse ${esc(d.get('email'))}.`,
      extra: `<div class="acts"><a class="btn btn--line btn--sm" href="catalogue.html?c=parquet"><span>Continuer à découvrir nos parquets</span></a><a class="btn btn--dark btn--sm" href="rendez-vous.html"><span>Prendre rendez-vous en showroom</span>${I.arrow}</a></div>`,
    });
    PB.devis.clear();
  });
});
