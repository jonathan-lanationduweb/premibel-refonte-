/* Outil de gestion des bannières mensuelles de l'accueil.
   Brouillon dans localStorage ('pb-bannieres-brouillon') → aperçu (index.html?apercu=1) → export de data/bannieres.js */
PB.ready(() => {
  'use strict';
  const { $, $$, esc } = PB;
  const KEY = 'pb-bannieres-brouillon';
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const DAY = 864e5;
  const today = PB.today();
  const fmtShort = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });

  /* ---------------- État ---------------- */
  let list;
  try { list = JSON.parse(localStorage.getItem(KEY)); } catch { list = null; }
  if (!Array.isArray(list)) list = clone(window.PB_BANNIERES || []);
  let sel = (list.find((b) => !b.permanente && b.debut <= today && today <= b.fin) || list[0] || {}).id;
  const cur = () => list.find((b) => b.id === sel);

  const stateEl = $('[data-state]');
  let saveT;
  const save = () => {
    stateEl.classList.add('is-dirty'); stateEl.textContent = 'Enregistrement…';
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      try { localStorage.setItem(KEY, JSON.stringify(list)); stateEl.classList.remove('is-dirty'); stateEl.textContent = 'Brouillon enregistré'; }
      catch { stateEl.textContent = 'Stockage plein : réduisez les images'; }
      refreshPreview();
    }, 350);
  };

  const status = (b) => {
    if (b.permanente) return ['Permanente', 'status--perm'];
    if (b.debut <= today && today <= b.fin) return ['En ligne', 'status--live'];
    if (b.debut > today) return ['Programmée', 'status--next'];
    return ['Terminée', ''];
  };
  const label = (b) => b.titre || (b.alt || '').split(/ — |\. /)[0] || 'Sans titre';

  /* ---------------- Liste ---------------- */
  const listEl = $('[data-list]');
  const renderList = () => {
    const sorted = [...list].sort((a, b) => (a.permanente ? 1 : 0) - (b.permanente ? 1 : 0) || (a.debut || '').localeCompare(b.debut || ''));
    listEl.innerHTML = sorted.map((b) => {
      const [s, c] = status(b);
      return `<li class="bitem${b.id === sel ? ' is-sel' : ''}" data-id="${esc(b.id)}" tabindex="0"><img src="${esc(b.image || '')}" alt=""><div><b>${esc(label(b))}</b><small>${b.permanente ? 'Si aucune autre n’est active' : `${fmtShort.format(parse(b.debut))} → ${fmtShort.format(parse(b.fin))}`} · ${b.mode === 'image' ? 'Image' : 'Composée'}</small></div><span class="status ${c}">${s}</span></li>`;
    }).join('');
  };
  listEl.addEventListener('click', (e) => { const li = e.target.closest('[data-id]'); if (li) select(li.dataset.id); });
  listEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const li = e.target.closest('[data-id]'); if (li) select(li.dataset.id); } });

  /* ---------------- Planning 12 mois ---------------- */
  const planEl = $('[data-plan]'), gapsEl = $('[data-gaps]');
  const renderPlan = () => {
    const t = parse(today);
    const start = new Date(t.getFullYear(), t.getMonth(), 1);
    const end = new Date(t.getFullYear(), t.getMonth() + 12, 1);
    const span = (end - start) / DAY;
    const pct = (d) => Math.max(0, Math.min(100, ((d - start) / DAY / span) * 100));
    const months = Array.from({ length: 12 }, (_, i) => new Date(start.getFullYear(), start.getMonth() + i, 1));
    const dated = list.filter((b) => !b.permanente && b.debut && b.fin).sort((a, b) => a.debut.localeCompare(b.debut));
    // couloirs sans chevauchement
    const lanes = [];
    const placed = dated.map((b) => {
      const s = parse(b.debut), e = new Date(parse(b.fin).getTime() + DAY);
      let lane = lanes.findIndex((l) => l <= s); if (lane < 0) { lane = lanes.length; lanes.push(e); } else lanes[lane] = e;
      return { b, s, e, lane };
    });
    // trous (jours sans bannière datée) à partir d'aujourd'hui
    const gaps = []; let gs = null;
    for (let d = new Date(t); d < end; d = new Date(d.getTime() + DAY)) {
      const k = iso(d), covered = dated.some((b) => b.debut <= k && k <= b.fin);
      if (!covered && !gs) gs = new Date(d);
      if (covered && gs) { gaps.push([gs, d]); gs = null; }
    }
    if (gs) gaps.push([gs, end]);
    const laneH = 32;
    planEl.innerHTML = months.map((m) => `<div class="plan__month${m.getMonth() === t.getMonth() && m.getFullYear() === t.getFullYear() ? ' is-now' : ''}">${m.toLocaleDateString('fr-FR', { month: 'short', year: m.getMonth() === 0 || m === months[0] ? '2-digit' : undefined })}</div>`).join('')
      + `<div class="plan__lanes" style="height:${Math.max(1, lanes.length) * laneH + 10}px">
        ${gaps.map(([a, b]) => `<span class="plan__gap" style="left:${pct(a)}%;width:${pct(b) - pct(a)}%;top:4px;height:${Math.max(1, lanes.length) * laneH - 6}px" title="Aucune bannière programmée : la bannière permanente s’affiche"></span>`).join('')}
        ${placed.map(({ b, s, e, lane }) => `<button type="button" class="plan__bar${b.mode === 'image' ? ' is-image' : ''}${b.id === sel ? ' is-sel' : ''}${b.fin < today ? ' is-past' : ''}" data-id="${esc(b.id)}" style="left:${pct(s)}%;width:${Math.max(.8, pct(e) - pct(s))}%;top:${4 + lane * laneH}px" title="${esc(label(b))}">${esc(label(b))}</button>`).join('')}
        <span class="plan__today" style="left:${pct(t)}%"></span>
      </div>`;
    const days = gaps.reduce((n, [a, b]) => n + Math.round((b - a) / DAY), 0);
    const next = gaps[0];
    gapsEl.classList.toggle('is-ok', !gaps.length);
    gapsEl.textContent = gaps.length
      ? `${days} jour${days > 1 ? 's' : ''} sans bannière dans les 12 prochains mois — prochain trou à partir du ${next[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} (la bannière permanente prendra le relais).`
      : 'Les 12 prochains mois sont couverts.';
  };
  planEl.addEventListener('click', (e) => { const b = e.target.closest('[data-id]'); if (b) select(b.dataset.id); });

  /* ---------------- Formulaire ---------------- */
  const form = $('[data-form]');
  const F = (n) => form.elements[n];
  const showWhen = () => {
    const b = cur(); if (!b) return;
    $$('[data-when]', form).forEach((el) => {
      const w = el.dataset.when;
      el.hidden = (w === 'compose' && b.mode === 'image') || (w === 'image' && b.mode !== 'image') || (w === 'dated' && b.permanente);
    });
    $$('[data-count-for]', form).forEach((c) => { const f = F(c.dataset.countFor); c.textContent = `${f.value.length}/${f.maxLength}`; });
  };
  const fill = () => {
    const b = cur(); if (!b) { form.hidden = true; return; } form.hidden = false;
    form.querySelector(`[name=mode][value=${b.mode === 'image' ? 'image' : 'compose'}]`).checked = true;
    F('permanente').checked = !!b.permanente;
    ['debut', 'fin', 'surtitre', 'accroche', 'titre', 'texte', 'alt', 'lien', 'annonce'].forEach((k) => { F(k).value = b[k] || ''; });
    F('ctaLabel').value = b.cta?.label || ''; F('ctaHref').value = b.cta?.href || '';
    renderImg(); renderProduct(); showWhen();
  };
  form.addEventListener('input', (e) => {
    const b = cur(); if (!b || e.target.matches('[data-psearch], [data-file], [data-file-mobile]')) return;
    b.mode = form.querySelector('[name=mode]:checked').value;
    b.permanente = F('permanente').checked || undefined;
    if (b.permanente) list.forEach((o) => { if (o !== b) delete o.permanente; });
    ['debut', 'fin', 'surtitre', 'accroche', 'titre', 'texte', 'alt', 'lien', 'annonce'].forEach((k) => { const v = F(k).value.trim(); if (v) b[k] = v; else delete b[k]; });
    if (b.permanente) { delete b.debut; delete b.fin; } else if (!b.debut) { b.debut = today; b.fin = today; F('debut').value = today; F('fin').value = today; }
    if (b.fin && b.debut && b.fin < b.debut) { b.fin = b.debut; F('fin').value = b.fin; PB.toast('La date de fin ne peut pas précéder le début.'); }
    const cl = F('ctaLabel').value.trim(), ch = F('ctaHref').value.trim();
    if (cl || ch) b.cta = { label: cl || 'Découvrir', href: ch || 'catalogue.html?c=promotions' }; else delete b.cta;
    showWhen(); renderList(); renderPlan(); save();
  });

  /* Raccourcis de dates */
  const quick = $('[data-quick]');
  const t0 = parse(today);
  const monthRange = (k) => { const s = new Date(t0.getFullYear(), t0.getMonth() + k, 1); const e = new Date(t0.getFullYear(), t0.getMonth() + k + 1, 0); return [iso(s), iso(e)]; };
  const Q = [
    ['Ce mois-ci', () => monthRange(0)],
    ['Mois prochain', () => monthRange(1)],
    ['Dans 2 mois', () => monthRange(2)],
    ['15 jours dès aujourd’hui', () => [today, iso(new Date(t0.getTime() + 14 * DAY))]],
  ];
  quick.innerHTML = Q.map(([l], i) => `<button type="button" data-q="${i}">${l}</button>`).join('');
  quick.addEventListener('click', (e) => {
    const q = e.target.closest('[data-q]'); if (!q) return;
    const [s, en] = Q[+q.dataset.q][1](); F('debut').value = s; F('fin').value = en;
    const b = cur(); if (b && !b.surtitre) { F('surtitre').value = `Du ${parse(s).getDate() === 1 ? '1er' : parse(s).getDate()} au ${parse(en).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`; }
    form.dispatchEvent(new Event('input'));
  });

  /* ---------------- Produit mis en avant ---------------- */
  const pcur = $('[data-pcurrent]'), pq = $('[data-psearch]'), pres = $('[data-presults]'), ponly = $('[data-ponlypromo]');
  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const renderProduct = () => {
    const p = cur()?.produit && PB.bySku(cur().produit);
    pcur.innerHTML = p ? `<div class="pchip"><img src="${esc(p.imgs[0] || PB.PLACEHOLDER)}" alt=""><div><b>${esc(p.name)}</b><small>Réf. ${esc(p.sku)} · ${PB.money(PB.ttc(p.price))} TTC${PB.discount(p) ? ` · −${PB.discount(p)} %` : ''}</small></div><button type="button" data-punset>Retirer</button></div>` : '<p class="muted small" style="margin:0">Aucun produit : la bannière s’affichera sans carte produit.</p>';
  };
  const searchProducts = () => {
    const q = norm(pq.value.trim());
    let r = PB.products().filter((p) => p.imgs.length && (!ponly.checked || p.cats.includes('promotions')));
    if (q) r = r.filter((p) => norm(`${p.name} ${p.sku}`).includes(q));
    r.sort((a, b) => PB.discount(b) - PB.discount(a));
    pres.innerHTML = r.slice(0, 30).map((p) => `<button type="button" class="pres" data-sku="${esc(p.sku)}"><img src="${esc(p.imgs[0])}" alt=""><span>${esc(p.name)}<br><small class="muted">${esc(p.sku)} · ${PB.money(PB.ttc(p.price))}</small></span>${PB.discount(p) ? `<em>−${PB.discount(p)} %</em>` : ''}</button>`).join('') || '<p class="muted small">Aucun résultat.</p>';
  };
  pq.addEventListener('input', searchProducts); ponly.addEventListener('change', searchProducts);
  pres.addEventListener('click', (e) => { const b = e.target.closest('[data-sku]'); if (!b) return; cur().produit = b.dataset.sku; renderProduct(); save(); });
  pcur.addEventListener('click', (e) => { if (e.target.closest('[data-punset]')) { delete cur().produit; renderProduct(); save(); } });

  /* ---------------- Images ---------------- */
  const imgPrev = $('[data-imgpreview]'), imgHint = $('[data-imghint]');
  const renderImg = () => {
    const b = cur();
    imgPrev.innerHTML = b?.image ? `<img src="${esc(b.image)}" alt="">` : '';
    imgHint.textContent = b?._fichier ? `Image importée : ${b._fichier} (optimisée en WebP). À l’export, elle sera téléchargée pour être copiée dans assets/img/bannieres/.` : (b?.mode === 'image' ? 'Format conseillé : 2048 × 800 px (bannière Canva).' : 'Photo d’ambiance large, sujet à droite : le texte s’affiche à gauche.');
  };
  /** Optimise une image importée : redimensionne (2400 px max) et convertit en WebP. */
  const optimise = (file, max = 2400) => new Promise((res, rej) => {
    const url = URL.createObjectURL(file); const im = new Image();
    im.onload = () => {
      const s = Math.min(1, max / im.naturalWidth); const c = document.createElement('canvas');
      c.width = Math.round(im.naturalWidth * s); c.height = Math.round(im.naturalHeight * s);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      res(c.toDataURL('image/webp', .82));
    };
    im.onerror = rej; im.src = url;
  });
  const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\.[a-z0-9]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  $('[data-file]').addEventListener('change', async (e) => {
    const f = e.target.files[0]; if (!f) return;
    const b = cur(); b.image = await optimise(f); b._fichier = `${slug(f.name)}.webp`;
    renderImg(); renderList(); save(); e.target.value = '';
  });
  $('[data-file-mobile]').addEventListener('change', async (e) => {
    const f = e.target.files[0]; if (!f) return;
    const b = cur(); b.imageMobile = await optimise(f, 1200); b._fichierMobile = `${slug(f.name)}-mobile.webp`;
    PB.toast('Version mobile ajoutée'); save(); e.target.value = '';
  });

  // Bibliothèque : toutes les images connues du site
  const dlg = $('[data-libdlg]'), grid = $('[data-libgrid]'), lq = $('[data-libq]');
  const libImgs = () => {
    const set = new Set();
    (window.PB_BANNIERES || []).forEach((b) => b.image && !b.image.startsWith('data:') && set.add(b.image));
    ['assets/img/bannieres/Bannieres-Homepage-6.png', 'assets/img/bannieres/Bannieres-Homepage-79.png', 'assets/img/bannieres/Bannieres-Homepage-7.jpg', 'assets/img/bannieres/Site-internet-Premibel-10.jpg'].forEach((s) => set.add(s));
    Object.values(window.PB_SITE_IMAGES || {}).flat().forEach((i) => set.add(i.src));
    (window.PB_POSTS || []).forEach((p) => p.img && set.add(p.img));
    (window.PB_REALISATIONS || []).forEach((r) => set.add(r.src));
    Object.values(PB.categories()).forEach((c) => c.img && set.add(c.img));
    return [...set];
  };
  const renderLib = () => {
    const q = norm(lq.value.trim());
    grid.innerHTML = libImgs().filter((s) => !q || norm(s).includes(q)).map((s) => `<button type="button" data-src="${esc(s)}" title="${esc(s.split('/').pop())}"><img src="${esc(s)}" alt="" loading="lazy"></button>`).join('');
  };
  $('[data-lib]').addEventListener('click', () => { renderLib(); dlg.showModal(); lq.focus(); });
  $('[data-libclose]').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  lq.addEventListener('input', renderLib);
  grid.addEventListener('click', (e) => {
    const b = e.target.closest('[data-src]'); if (!b) return;
    const ban = cur(); ban.image = b.dataset.src; delete ban._fichier; renderImg(); renderList(); save(); dlg.close();
  });

  /* ---------------- Ajouter / dupliquer / supprimer ---------------- */
  const uid = (base) => { let id = slug(base) || 'banniere'; let i = 2; while (list.some((b) => b.id === id)) id = `${slug(base)}-${i++}`; return id; };
  $('[data-new]').addEventListener('click', () => {
    const [s, e] = monthRange(1);
    const mois = parse(s).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    const promo = PB.inCat('promotions').filter((p) => p.imgs.length).sort((a, b) => PB.discount(b) - PB.discount(a))[0];
    const b = { id: uid(mois), mode: 'compose', debut: s, fin: e, surtitre: `Tout le mois de ${parse(s).toLocaleDateString('fr-FR', { month: 'long' })}`, accroche: 'Le parquet du mois', titre: promo ? promo.name.split(' ').slice(0, 2).join(' ') : 'Nouveauté', texte: '', image: 'assets/img/journal/tout-savoir-sur-le-parquet-massif.webp', produit: promo?.sku, cta: promo ? { label: 'J’en profite', href: PB.productUrl(promo) } : { label: 'Découvrir', href: 'catalogue.html?c=promotions' }, annonce: '' };
    list.push(b); select(b.id); save();
    F('titre').focus();
  });
  $('[data-dup]').addEventListener('click', () => {
    const b = clone(cur()); b.id = uid(`${b.id}-copie`); delete b.permanente;
    if (b.debut) { const [s, e] = monthRange(1); b.debut = s; b.fin = e; } else { b.debut = today; b.fin = today; }
    list.push(b); select(b.id); save();
  });
  $('[data-del]').addEventListener('click', () => {
    const b = cur(); if (!b) return;
    if (b.permanente) { PB.toast('Gardez une bannière permanente : elle s’affiche quand aucune autre n’est programmée.'); return; }
    if (!confirm(`Supprimer la bannière « ${label(b)} » ?`)) return;
    list = list.filter((x) => x !== b); sel = list[0]?.id; renderAll(); save();
  });
  $('[data-reset]').addEventListener('click', () => {
    if (!confirm('Abandonner le brouillon et revenir au fichier publié (data/bannieres.js) ?')) return;
    localStorage.removeItem(KEY); list = clone(window.PB_BANNIERES || []); sel = list[0]?.id; renderAll(); refreshPreview();
  });

  /* ---------------- Export ---------------- */
  const HEADER = `/* ==========================================================================
   BANNIÈRES MENSUELLES — page d'accueil
   Généré par l'outil admin-bannieres.html le ${new Date().toLocaleDateString('fr-FR')}.
   Chaque bannière s'affiche automatiquement entre \`debut\` et \`fin\` inclus.
   Si plusieurs sont actives, elles défilent ; sinon la bannière permanente s'affiche.
   Aperçu d'une date : index.html?date=AAAA-MM-JJ
   ========================================================================== */
`;
  const download = (name, href) => { const a = document.createElement('a'); a.href = href; a.download = name; document.body.appendChild(a); a.click(); a.remove(); };
  $('[data-export]').addEventListener('click', () => {
    const out = clone(list).map((b) => {
      if (b._fichier && b.image?.startsWith('data:')) { download(b._fichier, b.image); b.image = `assets/img/bannieres/${b._fichier}`; }
      if (b._fichierMobile && b.imageMobile?.startsWith('data:')) { download(b._fichierMobile, b.imageMobile); b.imageMobile = `assets/img/bannieres/${b._fichierMobile}`; }
      delete b._fichier; delete b._fichierMobile;
      Object.keys(b).forEach((k) => (b[k] === undefined || b[k] === '') && delete b[k]);
      return b;
    });
    const txt = `${HEADER}window.PB_BANNIERES = ${JSON.stringify(out, null, 2)};\n`;
    download('bannieres.js', URL.createObjectURL(new Blob([txt], { type: 'text/javascript' })));
    navigator.clipboard?.writeText(txt).catch(() => {});
    PB.toast('<span><b>bannieres.js exporté</b><br>Remplacez data/bannieres.js par ce fichier.</span>', 5200);
  });

  /* ---------------- Aperçu ---------------- */
  const frame = $('[data-frame]'), wrap = $('[data-frame-wrap]'), stage = $('[data-stage]'), openLink = $('[data-open-preview]');
  let device = 'desktop';
  const DEV = { desktop: [1440, 900], mobile: [390, 844] };
  const fit = () => {
    const [w, h] = DEV[device]; const r = stage.getBoundingClientRect();
    const s = Math.min((r.width - 32) / w, (r.height - 32) / h, 1);
    wrap.style.width = `${w}px`; wrap.style.height = `${h}px`;
    wrap.style.transform = `translate(-50%, -50%) scale(${s})`;
    wrap.classList.toggle('is-mobile', device === 'mobile');
  };
  const previewUrl = () => { const b = cur(); if (!b) return 'index.html'; const d = b.permanente ? today : (b.debut <= today && today <= b.fin ? today : b.debut); return `index.html?apercu=1&banniere=${encodeURIComponent(b.id)}&date=${d}`; };
  function refreshPreview() {
    const src = previewUrl(); openLink.href = src;
    frame.src = `${src}&v=${Date.now()}`; // navigation forcée (évite qu'un reload relance l'ancienne URL)
  }
  $$('[data-device]').forEach((b) => b.addEventListener('click', () => { device = b.dataset.device; $$('[data-device]').forEach((o) => o.setAttribute('aria-pressed', String(o === b))); fit(); }));
  addEventListener('resize', fit);

  /* ---------------- Sélection ---------------- */
  function select(id) { sel = id; renderList(); renderPlan(); fill(); searchProducts(); refreshPreview(); }
  function renderAll() { renderList(); renderPlan(); fill(); searchProducts(); }

  renderAll(); fit(); refreshPreview();
});
