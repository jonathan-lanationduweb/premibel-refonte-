/* ==========================================================================
   Fiche adresse — magasin.html?m=voltaire|roquette|balard|pantin
   Héros + galerie, coordonnées, horaires (jour courant), statut, carte,
   accès, services, avis Google, autres adresses.
   Slug inconnu → message puis redirection douce vers magasins.html
   ========================================================================== */
PB.ready(() => {
  const { $, $$, esc, I } = PB;
  const S = window.PBS;
  const root = $('[data-root]');
  const slug = (PB.qs('m') || '').toLowerCase();
  const s = S.bySlug(slug);

  /* ---------- Slug inconnu ---------- */
  if (!s) {
    document.title = 'Adresse introuvable — Premibel Parquet';
    root.innerHTML = `<section class="container ms-missing" role="status">
      <nav class="crumbs" aria-label="Fil d’Ariane"><a href="index.html">Accueil</a><span aria-hidden="true">/</span><a href="magasins.html">Showrooms &amp; entrepôt</a></nav>
      <p class="eyebrow">Adresse introuvable</p>
      <h1 class="h2">Cette adresse <em>n’existe pas</em> ou a changé.</h1>
      <p class="lead">Nous vous redirigeons vers la liste de nos showrooms et de notre entrepôt.</p>
      <div class="ms-missing__bar" aria-hidden="true"><span></span></div>
      <a class="btn btn--dark" href="magasins.html"><span>Voir toutes nos adresses</span>${I.arrow}</a>
    </section>`;
    const bar = $('.ms-missing__bar span');
    requestAnimationFrame(() => bar.classList.add('is-run'));
    setTimeout(() => { location.replace('magasins.html'); }, PB.reduce ? 4000 : 3200);
    return;
  }

  const isShowroom = s.type === 'Showroom';
  const rdv = !!s.rdv; // seul le showroom Voltaire prend des rendez-vous en ligne (PB_SITE.appointments)
  const rdvStore = S.stores().find((x) => x.rdv);
  const short = s.name.replace(/^(Showroom|Entrepôt)\s+/, '');
  document.title = `${s.name} (${s.city}) — Premibel Parquet`;
  const meta = $('meta[name="description"]');
  if (meta) meta.content = `${s.name} Premibel Parquet : ${s.address}, ${s.zip}. Téléphone ${s.phone}, horaires et itinéraire.`;

  const lead = isShowroom
    ? 'Chaque showroom vous permet de voir, toucher et comparer les différentes essences de bois, finitions et styles, afin de faire le meilleur choix pour votre intérieur.'
    : 'Nos entrepôts et points de retrait en Île-de-France vous garantissent une disponibilité rapide des produits en stock et un service de proximité.';

  const services = isShowroom ? [
    ['Conseil personnalisé', 'Nos équipes vous accueillent, particuliers comme professionnels, pour vous conseiller sur le choix de votre parquet.'],
    ['Voir, toucher, comparer', 'Essences de bois, finitions et styles présentés en showroom.'],
    rdv
      ? ['Rendez-vous avec un expert', 'Réservez un créneau d’une heure sur place, ou un rendez-vous par téléphone.', `rendez-vous.html?m=${s.slug}`]
      : ['Rendez-vous', `Pas de réservation en ligne pour ce showroom : appelez le ${s.phone}${rdvStore ? `, ou réservez au ${rdvStore.name}` : ''}.`, rdvStore ? `rendez-vous.html?m=${rdvStore.slug}` : null],
    ['Devis gratuit', 'Envoyez vos surfaces et vos envies, notre équipe vous répond rapidement.', 'devis.html'],
  ] : [
    ['Click & Collect', 'Commandez en ligne et retirez votre parquet à l’entrepôt.', 'livraison.html'],
    ['Disponibilité rapide', 'Des produits en stock pour un service de proximité en Île-de-France.'],
    ['Conseil sur place', 'Une question avant le retrait ? Appelez l’entrepôt avant de passer.'],
  ];

  const others = S.stores().filter((x) => x.slug !== s.slug);
  const imgs = s.imgs.length ? s.imgs : ['assets/img/site/salon.webp'];

  root.innerHTML = `
  <section class="page-hero container ms-hero">
    <nav class="crumbs" aria-label="Fil d’Ariane"><a href="index.html">Accueil</a><span aria-hidden="true">/</span><a href="magasins.html">Showrooms &amp; entrepôt</a><span aria-hidden="true">/</span><span>${esc(s.name)}</span></nav>
    <div class="ms-hero__grid">
      <div class="ms-hero__info">
        <p class="eyebrow">${esc(s.type)} · ${esc(s.city)}</p>
        <h1 class="h1 split">${esc(s.type)} <em>${esc(short)}</em></h1>
        <p class="lead reveal">${lead}</p>
        <div class="ms-coords reveal">
          <a class="ms-coords__addr" href="${esc(s.maps)}" target="_blank" rel="noopener">${S.ICON.pin}<span>${esc(s.address)}<br>${esc(s.zip)}</span></a>
          <a class="ms-coords__tel" href="${S.tel(s.phone)}" aria-label="Appeler le ${esc(s.name)} au ${esc(s.phone)}">${esc(s.phone)}</a>
          <div class="ms-coords__status" data-status>${S.statusHTML(s)}</div>
        </div>
        <div class="acts ms-hero__acts reveal">
          ${rdv ? `<a class="btn btn--dark magnetic" href="rendez-vous.html?m=${s.slug}"><span>Prendre rendez-vous</span>${I.arrow}</a>` : isShowroom ? `<a class="btn btn--dark magnetic" href="${S.tel(s.phone)}"><span>Appeler le showroom</span>${I.arrow}</a>` : `<a class="btn btn--dark magnetic" href="livraison.html"><span>Click &amp; Collect</span>${I.arrow}</a>`}
          <a class="act" href="${esc(s.maps)}" target="_blank" rel="noopener">${S.ICON.route}<span>Itinéraire</span></a>
          ${rdv || !isShowroom ? `<a class="act" href="${S.tel(s.phone)}">${S.ICON.phone}<span>Appeler</span></a>` : ''}
        </div>
      </div>
      <div class="ms-gal" data-gal aria-roledescription="carrousel" aria-label="Photos — ${esc(s.name)}">
        <div class="ms-gal__stage media-reveal">
          ${imgs.map((src, k) => `<img src="${esc(src)}" alt="${esc(s.name)} — photo ${k + 1} sur ${imgs.length}" ${k ? 'loading="lazy"' : 'fetchpriority="high"'} decoding="async" class="${k ? '' : 'is-on'}" draggable="false">`).join('')}
          ${imgs.length > 1 ? `<span class="ms-gal__count" aria-hidden="true"><b data-gal-i>1</b> / ${imgs.length}</span>` : ''}
        </div>
        ${imgs.length > 1 ? `<div class="ms-gal__thumbs" role="group" aria-label="Choisir une photo">${imgs.map((src, k) => `<button type="button" class="ms-gal__thumb${k ? '' : ' is-on'}" data-gal-to="${k}" aria-label="Photo ${k + 1}"${k ? '' : ' aria-current="true"'}><img src="${esc(src)}" alt="" loading="lazy"></button>`).join('')}</div>` : ''}
      </div>
    </div>
  </section>

  <section class="section--tight container ms-info">
    <div class="ms-info__col ms-info__hours reveal">
      <h2 class="ms-info__h">${S.ICON.clock}Horaires</h2>
      ${S.weekHTML(s)}
    </div>
    <div class="ms-info__col reveal">
      <h2 class="ms-info__h">${S.ICON.pin}Accès</h2>
      <p class="ms-info__addr">${esc(s.address)}<br>${esc(s.zip)}</p>
      ${s.access ? `<p class="ms-info__access">${S.ICON.metro}<span>${esc(s.access)}</span></p>` : ''}
      <p class="muted">Pour préparer votre venue, ouvrez l’itinéraire depuis votre position. Une question sur l’accès&#8239;? Appelez-nous au <a class="ms-link" href="${S.tel(s.phone)}">${esc(s.phone)}</a>.</p>
      <a class="link-arrow" href="${esc(s.maps)}" target="_blank" rel="noopener">Ouvrir l’itinéraire <span aria-hidden="true">→</span></a>
    </div>
    <div class="ms-info__col reveal">
      <h2 class="ms-info__h">${I.store.replace('<svg', '<svg aria-hidden="true"')}Services</h2>
      <ul class="ms-services">${services.map(([t, d, href]) => `<li>${href ? `<a href="${href}"><b>${t}</b><span>${d}</span><i aria-hidden="true">→</i></a>` : `<div><b>${t}</b><span>${d}</span></div>`}</li>`).join('')}</ul>
    </div>
  </section>

  <section class="container ms-map-sec" aria-label="Plan d’accès">
    <div class="pb-map ms-map media-reveal" data-map role="region" aria-label="Plan : ${esc(s.name)}, ${esc(s.address)}, ${esc(s.zip)}"><span class="pb-map__veil" data-veil>Chargement de la carte…</span></div>
  </section>

  ${s.review ? `<section class="section container">
    <div class="ms-review panel--ink on-dark reveal">
      <div class="ms-review__g" aria-hidden="true">${I.google}</div>
      <div>
        <p class="eyebrow">Votre avis compte</p>
        <h2 class="h3">Vous êtes passé par notre ${esc(s.type.toLowerCase())} ${esc(short)}&#8239;? <em>Dites-le-nous.</em></h2>
      </div>
      <a class="btn btn--light magnetic" href="${esc(s.review)}" target="_blank" rel="noopener"><span>Cliquez pour laisser un avis Google</span>${I.arrow}</a>
    </div>
  </section>` : '<div class="section--tight"></div>'}

  <section class="container" aria-label="Avis clients">${PB.reviewsHTML({ limit: 6 })}</section>

  <section class="section container ms-others" aria-labelledby="others-title">
    <div class="head-row"><div><p class="eyebrow reveal">Nos autres adresses</p><h2 class="h2 split" id="others-title">Ailleurs <em>en Île-de-France</em></h2></div><a class="link-arrow reveal" href="magasins.html">Toutes les adresses <span aria-hidden="true">→</span></a></div>
    <ul class="ms-others__list" role="list">${others.map((o) => `
      <li class="ms-other reveal">
        <a href="magasin.html?m=${o.slug}">
          <span class="ms-other__img"><img src="${esc(o.imgs[0])}" alt="" loading="lazy"></span>
          <span class="ms-other__type">${esc(o.type)} · ${esc(o.city)}</span>
          <b class="ms-other__name">${esc(o.name)}</b>
          <span class="ms-other__addr">${esc(o.address)}, ${esc(o.zip)}</span>
          ${S.statusHTML(o)}
        </a>
      </li>`).join('')}</ul>
  </section>`;

  /* ---------- Galerie : fondu + glisser ---------- */
  const gal = $('[data-gal]');
  const shots = $$('.ms-gal__stage img', gal), thumbs = $$('[data-gal-to]', gal), idx = $('[data-gal-i]', gal);
  let gi = 0;
  const goImg = (k) => {
    k = (k + shots.length) % shots.length; if (k === gi) return;
    shots[gi].classList.remove('is-on'); shots[k].classList.add('is-on');
    thumbs.forEach((t, j) => { t.classList.toggle('is-on', j === k); j === k ? t.setAttribute('aria-current', 'true') : t.removeAttribute('aria-current'); });
    gi = k; if (idx) idx.textContent = k + 1;
  };
  thumbs.forEach((t) => t.addEventListener('click', () => goImg(+t.dataset.galTo)));
  if (shots.length > 1) {
    const stage = $('.ms-gal__stage', gal);
    let x0 = null;
    stage.addEventListener('pointerdown', (e) => { x0 = e.clientX; });
    stage.addEventListener('pointerup', (e) => { if (x0 === null) return; const dx = e.clientX - x0; x0 = null; if (Math.abs(dx) > 40) goImg(gi + (dx < 0 ? 1 : -1)); });
    gal.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight') goImg(gi + 1); if (e.key === 'ArrowLeft') goImg(gi - 1); });
  }

  /* ---------- Plan (Leaflet + OpenStreetMap), chargé à l'approche ---------- */
  const mapEl = $('[data-map]'), veil = $('[data-veil]');
  const buildMap = (L) => {
    veil.hidden = true;
    const map = L.map(mapEl, { scrollWheelZoom: false, center: [s.lat, s.lng], zoom: 15 });
    S.tiles(L).addTo(map);
    map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
    map.on('click', () => map.scrollWheelZoom.enable());
    mapEl.addEventListener('mouseleave', () => map.scrollWheelZoom.disable());
    others.forEach((o) => { if (Number.isFinite(o.lat)) L.marker([o.lat, o.lng], { icon: S.pinIcon(L, o), title: o.name, alt: o.name, opacity: .55 }).addTo(map).bindPopup(`<b>${esc(o.name)}</b><br>${esc(o.address)}, ${esc(o.zip)}<br><a href="magasin.html?m=${o.slug}">Voir la fiche</a>`); });
    L.marker([s.lat, s.lng], { icon: S.pinIcon(L, s, true), title: s.name, alt: s.name, zIndexOffset: 1000 }).addTo(map)
      .bindPopup(`<b>${esc(s.name)}</b><br>${esc(s.address)}, ${esc(s.zip)}<br><a href="${esc(s.maps)}" target="_blank" rel="noopener">Itinéraire</a>`);
    addEventListener('resize', () => map.invalidateSize(), { passive: true });
  };
  const fail = () => { veil.hidden = false; veil.innerHTML = `La carte n’a pas pu être chargée.<br><small><a href="${esc(s.maps)}" target="_blank" rel="noopener">Ouvrir l’adresse dans Google Maps</a></small>`; };
  if (Number.isFinite(s.lat) && Number.isFinite(s.lng)) {
    const go = () => S.leaflet().then(buildMap).catch(fail);
    if ('IntersectionObserver' in window) { const io = new IntersectionObserver((en) => { if (en.some((e) => e.isIntersecting)) { io.disconnect(); go(); } }, { rootMargin: '400px' }); io.observe(mapEl); } else go();
  } else fail();

  setInterval(() => { const st = $('[data-status]'); if (st) st.innerHTML = S.statusHTML(s); }, 60000);
  $('.ms-hero')?.removeAttribute('aria-busy');
});
