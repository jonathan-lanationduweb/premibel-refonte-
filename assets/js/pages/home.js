/* Accueil */
PB.ready(() => {
  'use strict';
  const { $, $$, esc, I } = PB;
  const SITE = window.PB_SITE;

  /* ---------- Bannière du mois ---------- */
  const hero = $('[data-hero]');
  PBBanner.mount(hero, PB.banners.active());
  if (PB.motion) {
    gsap.to('[data-slides]', { yPercent: 12, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to(hero, { '--r-lg': '48px', ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
  }

  /* ---------- Ruban : défilement continu, accéléré par la vitesse de scroll ---------- */
  const ribbon = $('[data-ribbon]');
  ribbon.innerHTML += ribbon.innerHTML;
  if (!PB.reduce) {
    let x = 0, boost = 0, last = scrollY;
    const half = () => ribbon.scrollWidth / 2;
    PB.onScroll((y) => { boost = Math.min(14, Math.abs(y - last) * .35); last = y; });
    const loop = () => {
      boost *= .92; x -= .45 + boost;
      if (-x >= half()) x += half();
      ribbon.style.transform = `translate3d(${x}px,0,0)`;
      requestAnimationFrame(loop);
    };
    loop();
  }

  /* ---------- Vidéos ---------- */
  $$('[data-play]').forEach((btn) => {
    const card = btn.closest('.vcard'), v = card.querySelector('video');
    btn.addEventListener('click', () => {
      $$('.vcard video').forEach((o) => { if (o !== v) { o.pause(); o.closest('.vcard').classList.remove('is-playing'); } });
      v.controls = true; v.play(); card.classList.add('is-playing');
    });
    v.addEventListener('pause', () => { if (v.ended || v.currentTime === 0) card.classList.remove('is-playing'); });
  });

  /* ---------- Services ---------- */
  $('[data-services]').innerHTML = SITE.services.map(([l, h]) => `<li class="reveal"><a href="${h}">${esc(l)}</a></li>`).join('');
  $('[data-wa]').href = SITE.whatsapp; $('[data-wa]').target = '_blank'; $('[data-wa]').rel = 'noopener';

  /* ---------- Produits : onglets + rail ---------- */
  const BEST = ['POINF36005', 'POINF39026', 'CHENF36015', 'CHENF36014', 'CHENF36005_1'];
  const isFloor = (p) => p.unit === 'm²' && p.cats.includes('parquet');
  const sets = {
    promo: () => PB.inCat('promotions').filter((p) => p.imgs.length).sort((a, b) => PB.discount(b) - PB.discount(a)).slice(0, 14),
    best: () => {
      const base = BEST.map(PB.bySku).filter(Boolean);
      const more = PB.products().filter((p) => isFloor(p) && p.imgs.length > 1 && !BEST.includes(p.sku)).slice(0, 9);
      return [...base, ...more];
    },
    new: () => PB.products().filter((p) => isFloor(p) && p.imgs.length).sort((a, b) => b.id - a.id).slice(0, 14),
  };
  const links = { promo: ['Toutes les promotions', 'catalogue.html?c=promotions'], best: ['Tout le parquet', 'catalogue.html?c=parquet'], new: ['Tout le parquet', 'catalogue.html?c=parquet'] };
  const track = $('[data-track]'), ink = $('[data-ink]'), tabs = $$('[data-tab]'), tabLink = $('[data-tab-link]');
  $('[data-prev]').innerHTML = I.arrowL; $('[data-next]').innerHTML = I.arrow;
  const rail = PB.rail($('[data-rail]'), { progress: $('[data-progress]'), prev: $('[data-prev]'), next: $('[data-next]') });
  const moveInk = (b) => { ink.style.width = `${b.offsetWidth}px`; ink.style.transform = `translateX(${b.offsetLeft - 4}px)`; };
  const fill = (key, animate) => {
    track.innerHTML = sets[key]().map((p, i) => PB.productCard(p, { eager: i < 4 })).join('');
    tabLink.firstChild.textContent = `${links[key][0]} `; tabLink.href = links[key][1];
    rail.refresh();
    if (animate && PB.motion) gsap.fromTo(track.children, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: .9, stagger: .05, ease: 'expo.out' });
  };
  tabs.forEach((t) => t.addEventListener('click', () => {
    if (t.getAttribute('aria-selected') === 'true') return;
    tabs.forEach((o) => o.setAttribute('aria-selected', String(o === t))); moveInk(t);
    if (PB.motion) gsap.to(track.children, { opacity: 0, y: -12, duration: .22, stagger: .015, onComplete: () => fill(t.dataset.tab, true) });
    else fill(t.dataset.tab, false);
  }));
  fill('promo', false);
  requestAnimationFrame(() => moveInk(tabs[0]));
  addEventListener('resize', () => moveInk($('[data-tab][aria-selected="true"]')));
  if (PB.motion) gsap.from(track.children, { y: 60, opacity: 0, duration: 1.2, ease: 'expo.out', stagger: .06, scrollTrigger: { trigger: track, start: 'top 88%' } });

  /* ---------- Adresses ---------- */
  $('[data-stores]').innerHTML = PB.storesHTML();

  /* ---------- Motifs : fondu enchaîné + compteur de références ---------- */
  const imgA = $('[data-motif-a]'), imgB = $('[data-motif-b]'), mText = $('[data-motif-text]'), mLink = $('[data-motif-link]'), mCount = $('[data-motif-count]');
  let front = imgA, back = imgB;
  const setCount = (slug) => { const c = PB.cat(slug); mCount.textContent = c ? c.count : PB.inCat(slug).length; mLink.href = PB.catUrl(slug); };
  setCount('point-de-hongrie');
  $$('[data-motifs] button').forEach((btn) => btn.addEventListener('click', () => {
    if (btn.getAttribute('aria-selected') === 'true') return;
    $$('[data-motifs] button').forEach((b) => b.setAttribute('aria-selected', String(b === btn)));
    back.src = btn.dataset.img; back.alt = `Parquet ${btn.textContent.trim()}`; front.alt = '';
    setCount(btn.dataset.cat);
    if (PB.motion) {
      gsap.killTweensOf([front, back, mText]);
      gsap.set(back, { zIndex: 2 }); gsap.set(front, { zIndex: 1 });
      gsap.fromTo(back, { opacity: 1, scale: 1.14, clipPath: 'inset(100% 0 0 0)' }, { scale: 1, clipPath: 'inset(0% 0 0 0)', duration: 1.15, ease: 'expo.out' });
      gsap.to(mText, { opacity: 0, y: 8, duration: .2, onComplete: () => { mText.textContent = btn.dataset.text; gsap.to(mText, { opacity: 1, y: 0, duration: .5, ease: 'expo.out' }); } });
    } else { back.style.opacity = 1; front.style.opacity = 0; mText.textContent = btn.dataset.text; }
    [front, back] = [back, front];
  }));
  $('[data-guides]').innerHTML = SITE.guides.map((g) => `<a class="guide reveal" href="guide.html?g=${g.slug}"><small>${esc(g.kicker)}</small><b>${esc(g.title)}</b></a>`).join('');

  /* ---------- Réalisations : bande liée au scroll ---------- */
  const works = (window.PB_REALISATIONS || []).filter((r) => r.h >= r.w * .6).slice(0, 10);
  const row = $('[data-works]');
  row.innerHTML = works.map((r) => `<figure><img src="${esc(r.src)}" alt="${esc(r.title)}" loading="lazy"><figcaption>${esc(r.title)}</figcaption></figure>`).join('');
  if (PB.motion) {
    gsap.to(row, { x: () => -(row.scrollWidth - innerWidth * .92), ease: 'none', scrollTrigger: { trigger: '.works', start: 'top bottom', end: 'bottom top', scrub: .6, invalidateOnRefresh: true } });
    $$('img', row).forEach((img, i) => gsap.to(img, { scale: 1, xPercent: i % 2 ? 4 : -4, ease: 'none', scrollTrigger: { trigger: '.works', start: 'top bottom', end: 'bottom top', scrub: true } }));
  } else { row.parentElement.style.overflowX = 'auto'; }

  /* ---------- Avis Google ---------- */
  $('[data-reviews]').innerHTML = PB.reviewsHTML({ limit: 9 });

  /* ---------- Journal ---------- */
  const fmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  $('[data-posts]').innerHTML = (window.PB_POSTS || []).filter((a) => a.img).slice(0, 10).map((a) => `<a class="post" href="article.html?a=${esc(a.slug)}"><figure><img src="${esc(a.img)}" alt="" loading="lazy" draggable="false"></figure><span class="post__meta"><b>${a.minutes} min</b><span>${fmt.format(new Date(a.date))}</span></span><h3>${esc(a.title)}</h3></a>`).join('');
  PB.rail($('[data-posts-rail]'));

  /* ---------- Top recherches ---------- */
  $('[data-searches]').innerHTML = SITE.topSearches.map(([l, h], i) => `<a class="reveal" href="${h}">${esc(l)}<sup>${String(i + 1).padStart(2, '0')}</sup></a>`).join('');

  /* ---------- Simulateur Alma ---------- */
  const range = $('[data-pay-range]'), out = $('[data-pay-out]'), plans = $('[data-pay-plans]');
  const nf0 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
  const paint = () => {
    const v = +range.value; out.textContent = `${nf0.format(v)} €`;
    plans.innerHTML = [2, 3, 4].map((n) => `<div class="plan"><b>${n}×</b><span>${PB.money(v / n)}</span><small>${n} mensualités, sans frais</small></div>`).join('');
    range.style.background = `linear-gradient(90deg, var(--ink) ${(v - range.min) / (range.max - range.min) * 100}%, var(--bone-2) 0)`;
  };
  range.addEventListener('input', paint); paint();

  /* ---------- « Êtes-vous professionnel ? » : à 40 % de défilement, une fois par session (comme en ligne) ---------- */
  let proShown = false;
  try { proShown = sessionStorage.getItem('pb-pro-ask') === '1'; } catch { /* navigation privée */ }
  const askPro = () => {
    if (proShown) return; proShown = true;
    try { sessionStorage.setItem('pb-pro-ask', '1'); } catch { /* ignore */ }
    const s = document.createElement('div');
    s.className = 'prosheet'; s.setAttribute('role', 'dialog'); s.setAttribute('aria-label', 'Êtes-vous professionnel ?');
    s.innerHTML = `<button class="prosheet__x" aria-label="Fermer" data-pro-close>${I.close}</button>
      <p class="eyebrow">Espace professionnel</p><p class="prosheet__t">Êtes-vous <em>professionnel ?</em></p>
      <p class="prosheet__p">Architectes, décorateurs, artisans, hôtels : accédez à des tarifs dédiés et à un suivi adapté à vos chantiers.</p>
      <div class="prosheet__a"><a class="btn btn--dark btn--sm" href="compte.html?onglet=inscription&pro=1"><span>S’inscrire en tant que Pro</span>${I.arrow}</a><button class="btn btn--line btn--sm" data-pro-close><span>Continuer en tant que particulier</span></button></div>`;
    document.body.appendChild(s);
    requestAnimationFrame(() => s.classList.add('is-on'));
    s.addEventListener('click', (e) => { if (e.target.closest('[data-pro-close]')) { s.classList.remove('is-on'); setTimeout(() => s.remove(), 700); } });
  };
  PB.onScroll((y) => { if (!proShown && y > (document.documentElement.scrollHeight - innerHeight) * 0.4) askPro(); });
});
