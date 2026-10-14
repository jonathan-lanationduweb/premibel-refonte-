/* ==========================================================================
   Page « Nos showrooms et entrepôt »
   - Carte interactive unique (Leaflet 1.9.4 + tuiles OpenStreetMap, chargée à
     l'approche du viewport) avec les 4 adresses, légende showroom / entrepôt
   - Recherche « ville, code postal ou magasin » : filtre la liste et recentre la
     carte ; un code postal (ou un n° de département) trie par distance approximative
   - Chaque fiche : Voir sur la carte · Détails · Itinéraire · téléphone
   - Vidéo du showroom : lecture au clic (preload none)
   ?q=75015 pré-remplit la recherche ; ?m=balard centre la carte sur une adresse.
   ========================================================================== */
PB.ready(() => {
  const { $, $$, esc } = PB;
  const S = window.PBS;
  const stores = S.stores().filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng));
  const list = $('[data-list]'), mapEl = $('[data-map]'), veil = $('[data-veil]');
  const form = $('[data-search]'), input = $('#mg-q'), clear = $('[data-clear]'), status = $('[data-status]');
  const short = (s) => s.name.replace(/^(Showroom|Entrepôt)\s+/, '');
  const norm = (v) => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, ' ').trim();

  /* ---------- Liste ---------- */
  const rowHTML = (s, k) => `
    <li class="mg-row reveal${S.isWarehouse(s) ? ' is-wh' : ''}" data-slug="${s.slug}">
      <span class="mg-row__no" aria-hidden="true">${String(k + 1).padStart(2, '0')}</span>
      <div class="mg-row__main">
        <span class="mg-row__type"><span class="pb-pin pb-pin--mini${S.isWarehouse(s) ? ' pb-pin--wh' : ''}" aria-hidden="true"><i></i></span>${esc(s.type)} · ${esc(s.city)}<span class="mg-row__dist" data-dist></span></span>
        <h3 class="mg-row__name">${esc(short(s))}</h3>
        <p class="mg-row__addr">${esc(s.address)}<br>${esc(s.zip)}</p>
        ${s.access ? `<p class="mg-row__access">${S.ICON.metro}<span>${esc(s.access)}</span></p>` : ''}
      </div>
      <div class="mg-row__meta" data-meta>${S.statusHTML(s)}${s.hours ? `<span class="mg-row__today">${S.todayHTML(s)}</span>` : ''}</div>
      <div class="acts mg-row__acts">
        <button type="button" class="act act--map" data-fly aria-controls="mg-map">${S.ICON.pin}<span>Voir sur la carte</span></button>
        <a class="act" href="magasin.html?m=${s.slug}">${S.ICON.info}<span>Détails</span></a>
        <a class="act" href="${esc(s.maps)}" target="_blank" rel="noopener">${S.ICON.route}<span>Itinéraire<span class="sr-only"> vers ${esc(s.name)} (nouvel onglet)</span></span></a>
        <a class="act act--plain" href="${S.tel(s.phone)}">${S.ICON.phone}<span>${esc(s.phone)}</span></a>
      </div>
      <figure class="mg-row__thumb" aria-hidden="true"><img src="${esc(s.imgs[0] || 'assets/img/site/salon.webp')}" alt="" loading="lazy" decoding="async"></figure>
    </li>`;
  list.innerHTML = stores.map(rowHTML).join('');
  const rowOf = (slug) => list.querySelector(`.mg-row[data-slug="${slug}"]`);

  /* ---------- Carte ---------- */
  let L = null, map = null, you = null, current = null, mapFailed = false, lastQuery = '';
  const markers = {};
  const popupHTML = (s) => `<div class="mg-pop">
      <span class="mg-pop__type">${esc(s.type)} · ${esc(s.city)}</span>
      <b>${esc(s.name)}</b>
      <span>${esc(s.address)}, ${esc(s.zip)}</span>
      ${S.statusHTML(s)}
      <span class="mg-pop__acts"><a href="magasin.html?m=${s.slug}">Détails</a><a href="${esc(s.maps)}" target="_blank" rel="noopener">Itinéraire</a><a href="${S.tel(s.phone)}">${esc(s.phone)}</a></span>
    </div>`;
  const pad = () => (innerWidth < 600 ? [28, 28] : [56, 56]);
  const waitMap = (fn) => { arm(); const t = setInterval(() => { if (map) { clearInterval(t); fn(); } else if (mapFailed) clearInterval(t); }, 120); setTimeout(() => clearInterval(t), 8000); };

  function buildMap(Lf) {
    L = Lf;
    veil.hidden = true;
    map = L.map(mapEl, { scrollWheelZoom: false, zoomControl: true, attributionControl: true });
    S.tiles(L).addTo(map);
    map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
    stores.forEach((s) => {
      const m = L.marker([s.lat, s.lng], { icon: S.pinIcon(L, s), title: s.name, alt: s.name, riseOnHover: true, keyboard: true })
        .addTo(map)
        .bindPopup(popupHTML(s), { className: 'mg-popup', maxWidth: innerWidth < 600 ? 236 : 280, autoPanPadding: [24, 24] });
      m.on('click', () => activate(s.slug, { from: 'map' }));
      m.on('mouseover', () => rowOf(s.slug)?.classList.add('is-hover'));
      m.on('mouseout', () => rowOf(s.slug)?.classList.remove('is-hover'));
      markers[s.slug] = m;
    });
    map.fitBounds(L.latLngBounds(stores.map((s) => [s.lat, s.lng])), { padding: pad() });
    // molette : seulement après un clic dans la carte (ne capture pas le défilement de la page)
    map.on('click', () => map.scrollWheelZoom.enable());
    mapEl.addEventListener('mouseleave', () => map.scrollWheelZoom.disable());
    mapEl.classList.add('is-ready');
    paintMarkers();
    if (lastQuery) run(lastQuery);
  }
  const failMap = () => {
    mapFailed = true;
    mapEl.classList.add('is-failed');
    veil.hidden = false;
    veil.innerHTML = 'La carte n’a pas pu être chargée.<br><small>Les itinéraires restent disponibles sur chaque adresse.</small>';
  };
  let armed = false;
  function arm() { if (armed) return; armed = true; S.leaflet().then(buildMap).catch(failMap); }
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((en) => { if (en.some((e) => e.isIntersecting)) { arm(); io.disconnect(); } }, { rootMargin: '500px' });
    io.observe(mapEl);
  } else arm();

  function paintMarkers() {
    if (!map) return;
    stores.forEach((s) => {
      const m = markers[s.slug];
      m.setIcon(S.pinIcon(L, s, s.slug === current));
      m.setZIndexOffset(s.slug === current ? 1000 : 0);
    });
  }
  /** Met une adresse en avant (liste + marqueur). `fly` recentre la carte et ouvre la bulle. */
  function activate(slug, { fly = false, from = 'list' } = {}) {
    current = slug;
    $$('.mg-row', list).forEach((r) => r.classList.toggle('is-active', r.dataset.slug === slug));
    paintMarkers();
    if (from === 'map' && innerWidth > 980) {
      const r = rowOf(slug);
      if (r) { const b = r.getBoundingClientRect(); if (b.top < 80 || b.bottom > innerHeight) r.scrollIntoView({ block: 'nearest', behavior: PB.reduce ? 'auto' : 'smooth' }); }
    }
    if (!fly) return;
    const s = stores.find((x) => x.slug === slug);
    if (mapFailed) { window.open(s.maps, '_blank', 'noopener'); return; }
    const go = () => {
      map.flyTo([s.lat, s.lng], 15, { duration: PB.reduce ? 0 : 1.1, easeLinearity: .2 });
      map.once('moveend', () => markers[slug].openPopup());
    };
    // la carte doit être visible (mobile : elle est au-dessus de la liste)
    const r = mapEl.getBoundingClientRect();
    const off = r.top < 60 || r.bottom > innerHeight + 40;
    if (off) {
      const y = scrollY + r.top - (innerWidth < 980 ? 90 : 110);
      if (PB.lenis) PB.lenis.scrollTo(y, { duration: .9 }); else scrollTo({ top: y, behavior: PB.reduce ? 'auto' : 'smooth' });
    }
    if (map) setTimeout(go, off ? 450 : 0); else waitMap(go);
  }

  list.addEventListener('click', (e) => {
    const row = e.target.closest('.mg-row'); if (!row) return;
    if (e.target.closest('[data-fly]')) { activate(row.dataset.slug, { fly: true }); return; }
    if (e.target.closest('a')) return;
    activate(row.dataset.slug);
  });
  let hoverT;
  list.addEventListener('pointerover', (e) => {
    const row = e.target.closest('.mg-row'); if (!row || e.pointerType !== 'mouse' || row.dataset.slug === current) return;
    clearTimeout(hoverT); hoverT = setTimeout(() => activate(row.dataset.slug), 180);
  });
  list.addEventListener('pointerleave', () => clearTimeout(hoverT));

  /* ---------- Recherche ---------- */
  const flip = (fn) => {
    const rows = $$('.mg-row', list);
    const before = new Map(rows.map((r) => [r, r.getBoundingClientRect().top]));
    fn();
    if (!PB.motion) return;
    rows.forEach((r) => {
      if (r.hidden) return;
      const b = before.get(r), a = r.getBoundingClientRect().top;
      if (Math.abs(b - a) > 2) gsap.fromTo(r, { y: b - a }, { y: 0, duration: .8, ease: 'expo.out', clearProps: 'transform' });
    });
  };
  const setStatus = (html) => { status.innerHTML = html; status.classList.toggle('is-on', !!html); };

  function run(raw, { fit = true } = {}) {
    const q = String(raw || '').trim();
    lastQuery = q;
    clear.hidden = !q;
    const digits = q.replace(/\s/g, '');
    let shown = stores, dist = null, geo = null;

    if (!q) {
      setStatus('');
    } else if (/^\d{2}$|^\d{5}$/.test(digits)) {
      geo = S.geoPostal(digits);
      if (geo) {
        dist = Object.fromEntries(stores.map((s) => [s.slug, S.distKm(geo, s)]));
        shown = [...stores].sort((a, b) => dist[a.slug] - dist[b.slug]);
        const near = shown[0];
        setStatus(`Adresses triées par distance approximative depuis <b>${esc(geo.label)}</b>&#8239;: la plus proche est le <b>${esc(near.name)}</b>, à environ ${S.fmtKm(dist[near.slug])} à vol d’oiseau.`);
      } else {
        setStatus('Nos adresses se trouvent en Île-de-France. Pour une livraison ailleurs, consultez nos <a href="livraison.html">conditions de livraison</a>.');
      }
    } else {
      const toks = norm(q).split(/[\s,]+/).filter(Boolean);
      shown = stores.filter((s) => {
        const hay = norm([s.name, s.type, s.city, s.address, s.zip, s.slug, s.access].join(' '));
        return toks.every((t) => hay.includes(t));
      });
      setStatus(shown.length
        ? `${shown.length} adresse${shown.length > 1 ? 's' : ''} pour «&#8239;${esc(q)}&#8239;».`
        : `Aucune adresse ne correspond à «&#8239;${esc(q)}&#8239;». Essayez un code postal (ex. 75015, 93) ou <button type="button" class="mg-status__reset" data-reset>affichez toutes nos adresses</button>.`);
    }

    flip(() => {
      const set = new Set(shown.map((s) => s.slug));
      $$('.mg-row', list).forEach((r) => { r.hidden = !set.has(r.dataset.slug); });
      shown.forEach((s) => list.appendChild(rowOf(s.slug)));
      $$('.mg-row', list).forEach((r) => { if (r.hidden) list.appendChild(r); });
      $$('[data-dist]', list).forEach((d) => {
        const slug = d.closest('.mg-row').dataset.slug;
        d.textContent = dist ? ` · ≈ ${S.fmtKm(dist[slug])}` : '';
      });
    });
    if (shown.length) activate(shown[0].slug);

    if (!map) return;
    stores.forEach((s) => markers[s.slug].setOpacity(!q || shown.includes(s) ? 1 : .35));
    if (you) { you.remove(); you = null; }
    if (geo) {
      you = L.circleMarker([geo.lat, geo.lng], { radius: 7, color: '#1d1916', weight: 2, fillColor: '#faf7f2', fillOpacity: 1 })
        .addTo(map).bindTooltip(`Repère approximatif : ${geo.label}`, { direction: 'top', offset: [0, -6] });
    }
    if (!fit) return;
    map.closePopup();
    const dur = PB.reduce ? 0 : 1;
    if (geo) {
      const near = shown.slice(0, /^Paris/.test(geo.label) ? 2 : 1);
      map.flyToBounds(L.latLngBounds([[geo.lat, geo.lng], ...near.map((s) => [s.lat, s.lng])]), { padding: pad(), maxZoom: 14, duration: dur });
    } else if (shown.length === 1) {
      map.flyTo([shown[0].lat, shown[0].lng], 15, { duration: dur });
    } else if (shown.length) {
      map.flyToBounds(L.latLngBounds(shown.map((s) => [s.lat, s.lng])), { padding: pad(), maxZoom: 14, duration: dur });
    }
  }

  let typeT;
  input.addEventListener('input', () => {
    clearTimeout(typeT);
    const v = input.value.trim().replace(/\s/g, '');
    // pendant la saisie d'un code postal, on attend 2 ou 5 chiffres
    if (/^\d+$/.test(v) && !/^\d{2}$|^\d{5}$/.test(v)) { clear.hidden = false; return; }
    typeT = setTimeout(() => run(input.value), 260);
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault(); clearTimeout(typeT); run(input.value);
    if (innerWidth < 980) input.blur();
  });
  const reset = () => { input.value = ''; run(''); input.focus(); };
  clear.addEventListener('click', reset);
  status.addEventListener('click', (e) => { if (e.target.closest('[data-reset]')) reset(); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Escape' && input.value) { e.preventDefault(); reset(); } });

  const q0 = PB.qs('q'), m0 = PB.qs('m');
  if (q0) { input.value = q0; run(q0); }
  else if (m0 && stores.some((s) => s.slug === m0)) { activate(m0); waitMap(() => activate(m0, { fly: true })); }
  else activate(stores[0].slug);

  // Statuts rafraîchis chaque minute (liste + bulles)
  setInterval(() => {
    stores.forEach((s) => {
      const meta = rowOf(s.slug)?.querySelector('[data-meta]');
      if (meta) meta.innerHTML = `${S.statusHTML(s)}${s.hours ? `<span class="mg-row__today">${S.todayHTML(s)}</span>` : ''}`;
      if (markers[s.slug]) markers[s.slug].setPopupContent(popupHTML(s));
    });
  }, 60000);
  addEventListener('resize', () => { if (map) map.invalidateSize(); }, { passive: true });

  /* ---------- Vidéo ---------- */
  const fig = $('[data-video]'), video = $('video', fig), play = $('[data-play]', fig);
  play.addEventListener('click', () => {
    video.controls = true;
    fig.classList.add('is-playing');
    const p = video.play();
    if (p && p.catch) p.catch(() => { fig.classList.remove('is-playing'); });
    setTimeout(() => video.focus({ preventScroll: true }), 50);
  });
  video.addEventListener('ended', () => { fig.classList.remove('is-playing'); video.controls = false; video.load(); });

  /* ---------- Avis + bandeau ---------- */
  $('[data-reviews]').innerHTML = `<div class="head-row"><div><p class="eyebrow reveal">Ils sont venus en showroom</p><h2 class="h2 split">Ce que disent <em>nos clients</em></h2></div></div>${PB.reviewsHTML()}`;
  $('[data-cta]').outerHTML = PB.ctaBandHTML({
    title: 'Venez voir, <em>toucher, comparer.</em>',
    text: 'Prenez rendez-vous au showroom Voltaire ou par téléphone, ou envoyez-nous votre projet pour recevoir un devis.',
    img: 'assets/img/site/premibel-magasin-paris-11-voltaire.webp',
  });
});
