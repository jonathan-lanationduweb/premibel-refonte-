/* ==========================================================================
   Gabarit des documents légaux : legal.html?p=cgv|mentions|confidentialite|retours
   Données : data/legal.js (window.PB_LEGAL, textes repris de premibel.fr)
   Sommaire collant avec suivi de lecture, barre de progression, navigation entre documents.
   ========================================================================== */
PB.ready(() => {
  const { $, $$, esc } = window.PBInfo;
  const L = window.PB_LEGAL || {};
  const ORDER = ['cgv', 'mentions', 'confidentialite', 'retours'].filter((k) => L[k]);
  if (!ORDER.length) return;
  const key = ORDER.includes(PB.qs('p')) ? PB.qs('p') : ORDER[0];
  const D = L[key];

  /* En-tête */
  document.title = `${D.title} — Premibel Parquet`;
  $('[data-legal-title]').textContent = D.title;
  $('[data-legal-crumb]').textContent = D.title;
  const words = D.blocks.reduce((n, b) => n + (Array.isArray(b[1]) ? b[1].join(' ') : b[1]).replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length, 0);
  const date = D.updated ? new Date(`${D.updated}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
  $('[data-legal-meta]').innerHTML = `${date ? `<span>Mise à jour le <b>${esc(date)}</b></span>` : ''}<span>Lecture ≈ ${Math.max(1, Math.round(words / 230))} min</span><span>${ORDER.indexOf(key) + 1} / ${ORDER.length}</span>`;

  /* Corps : blocs [balise, html] — html inline (strong, em, a, br) issu de l'extraction */
  const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/<[^>]+>/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  const used = new Set();
  const toc = [];
  const body = D.blocks.map(([tag, h]) => {
    if (tag === 'ul') return `<ul>${h.map((li) => `<li>${li}</li>`).join('')}</ul>`;
    if (tag === 'h2') {
      let id = slug(h) || 'section'; while (used.has(id)) id += '-b'; used.add(id);
      toc.push({ id, label: h.replace(/<[^>]+>/g, '') });
      return `<h2 id="${id}">${h}</h2>`;
    }
    if (tag === 'h3') return `<h3>${h}</h3>`;
    return `<p>${h}</p>`;
  }).join('');
  $('[data-legal-body]').innerHTML = body;

  /* Sommaires (desktop + mobile) */
  const tocHTML = toc.map((t) => `<li><a href="#${t.id}" data-toc-link="${t.id}">${esc(t.label)}</a></li>`).join('');
  $('[data-toc]').innerHTML = tocHTML;
  $('[data-toc-m]').innerHTML = tocHTML;
  if (!toc.length) { $('[data-toc-mobile]').hidden = true; $('.toc-label').hidden = true; }
  $('[data-toc-mobile]').addEventListener('click', (e) => { if (e.target.closest('a')) e.currentTarget.open = false; });

  /* Navigation entre documents */
  $('[data-docnav]').innerHTML = ORDER.map((k, i) => `<a href="legal.html?p=${k}"${k === key ? ' aria-current="page"' : ''}>${esc(L[k].title)}<span>0${i + 1}</span></a>`).join('');
  const i = ORDER.indexOf(key), prev = ORDER[(i - 1 + ORDER.length) % ORDER.length], next = ORDER[(i + 1) % ORDER.length];
  $('[data-pager]').innerHTML = `<a href="legal.html?p=${prev}"><small>Document précédent</small><b>${esc(L[prev].title)}</b></a><a href="legal.html?p=${next}"><small>Document suivant</small><b>${esc(L[next].title)}</b></a>`;
  $('[data-legal-src]').innerHTML = `Texte repris de premibel.fr. Une question ? Écrivez à <a href="mailto:vad@premibel.fr">vad@premibel.fr</a> ou appelez le <a href="tel:+33147002510">01 47 00 25 10</a>.`;

  /* Suivi de lecture : titre actif = dernier h2 passé sous la ligne de lecture */
  const heads = $$('[data-legal-body] h2');
  const links = $$('[data-toc] a');
  const tocBox = $('.legal__aside');
  let active = null;
  const setActive = (id) => {
    if (id === active) return; active = id;
    links.forEach((a) => a.classList.toggle('is-active', a.dataset.tocLink === id));
    const a = links.find((l) => l.dataset.tocLink === id);
    if (a && tocBox.scrollHeight > tocBox.clientHeight) {
      const r = a.getBoundingClientRect(), br = tocBox.getBoundingClientRect();
      if (r.top < br.top + 40 || r.bottom > br.bottom - 40) tocBox.scrollTo({ top: a.offsetTop - tocBox.clientHeight / 2, behavior: PB.reduce ? 'auto' : 'smooth' });
    }
  };
  const bar = $('[data-legal-progress]');
  const art = $('.legal__body');
  const onScroll = () => {
    const line = innerHeight * 0.3;
    let cur = heads[0] ? heads[0].id : null;
    for (const h of heads) { if (h.getBoundingClientRect().top <= line) cur = h.id; else break; }
    if (cur) setActive(cur);
    const r = art.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight * 0.5 - r.top) / Math.max(1, r.height - innerHeight * 0.3)));
    bar.style.transform = `scaleX(${p})`;
  };
  PB.onScroll(onScroll);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Ancre initiale éventuelle (#section) */
  if (location.hash) {
    const t = document.getElementById(location.hash.slice(1));
    if (t) setTimeout(() => (PB.lenis ? PB.lenis.scrollTo(t, { offset: -90, immediate: true }) : t.scrollIntoView()), 60);
  }
});
