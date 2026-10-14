/* ==========================================================================
   Assistant Premibel (parité avec nation_assistant-gpt du site en ligne)
   - Panneau d'actions rapides : Trouver votre parquet, Discuter en ligne, Prendre rendez-vous,
     Parler à un conseiller, WhatsApp conseiller, Appeler.
   - Chat : 7 sujets de départ ; « Trouver un parquet » en 4 questions → produits réels (hors rupture) ;
     comparaison, prix, pose, entretien, livraison, passage à un conseiller.
   Maquette : en production, le chat est servi par l'assistant IA du site (wp-json/assistant-gpt/v1/chat)
   et le conseiller en direct par Chatwoot. Ici, les réponses sont calculées localement.
   ========================================================================== */
(() => {
  'use strict';
  const { esc, I } = PB;
  const S = window.PB_SITE || {};
  let root, log, mode = 'menu', quiz = null, lastFocus;
  const norm = (s) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  const TOPICS = ['Trouver un parquet', 'Comparer des produits', 'Question sur la pose', 'Entretien', 'Prix produit', 'Livraison', 'Parler à un conseiller'];
  const QUESTIONS = [
    ['piece', 'Pour quelle pièce ?', ['Salon', 'Chambre', 'Cuisine', 'Salle de bain', 'Escalier', 'Local pro', 'Je ne sais pas']],
    ['style', 'Quel style recherchez-vous ?', ['Chêne clair', 'Naturel', 'Foncé', 'Rustique', 'Moderne', 'Je ne sais pas']],
    ['usage', 'Quel usage ?', ['Passage faible', 'Passage normal', 'Passage fort', 'Animaux', 'Enfants', 'Pièce humide']],
    ['budget', 'Quel budget au m² ?', ['Économique', 'Moyen', 'Premium', 'Je ne sais pas']],
  ];

  /* ---------------- Recommandation (règles simples sur les données réelles) ---------------- */
  function recommend(a) {
    const has = (p, ...c) => c.some((x) => p.cats.includes(x));
    const rules = [
      (p) => p.unit === 'm²' && p.cats.includes('parquet') && p.stock?.in !== false && p.imgs.length,
      (p) => ({ Salon: has(p, 'parquet-salon'), Chambre: has(p, 'parquet-chambre'), Cuisine: has(p, 'parquet-pour-salles-de-bain-et-cuisines'), 'Salle de bain': has(p, 'parquet-pour-salles-de-bain-et-cuisines'), Escalier: has(p, 'parquet-massif'), 'Local pro': has(p, 'parquet-bureau-usage-commercial') }[a.piece] ?? true),
      (p) => ({ 'Chêne clair': has(p, 'clair', 'blanc'), Naturel: has(p, 'naturel'), Foncé: has(p, 'fonce', 'brun'), Rustique: /rustique/i.test(p.raw + (p.spec.Qualité || '')), Moderne: has(p, 'lames-droites') && has(p, 'blanc', 'gris', 'clair', 'naturel') }[a.style] ?? true),
      (p) => ({ 'Passage fort': has(p, 'verni') || has(p, 'parquet-bureau-usage-commercial'), Animaux: has(p, 'verni'), Enfants: has(p, 'verni'), 'Pièce humide': has(p, 'parquet-pour-salles-de-bain-et-cuisines') }[a.usage] ?? true),
      (p) => { const t = PB.ttc(p.price); return ({ Économique: t < 50, Moyen: t >= 50 && t < 90, Premium: t >= 90 }[a.budget] ?? true); },
    ];
    // assouplit les critères en partant du moins important si rien ne correspond
    for (let k = rules.length; k >= 2; k--) {
      const r = PB.products().filter((p) => rules.slice(0, k).every((f) => f(p)));
      if (r.length) return { list: r.sort((x, y) => PB.discount(y) - PB.discount(x)).slice(0, 6), relaxed: k < rules.length };
    }
    return { list: [], relaxed: true };
  }

  /* ---------------- Rendu ---------------- */
  const mini = (p) => `<a class="as__prod" href="${PB.productUrl(p)}"><img src="${esc(p.imgs[0] || PB.PLACEHOLDER)}" alt=""><span><b>${esc(p.name)}</b><small>${PB.money(PB.ttc(p.price))} TTC/${PB.unitLabel(p)}${PB.discount(p) ? ` · −${PB.discount(p)} %` : ''}</small></span></a>`;
  function say(html, who = 'bot') {
    const m = document.createElement('div'); m.className = `as__msg as__msg--${who}`; m.innerHTML = html; log.appendChild(m); PB.frTypo(m);
    if (window.gsap && !PB.reduce) gsap.from(m, { y: 12, opacity: 0, duration: .45, ease: 'expo.out' });
    log.scrollTop = log.scrollHeight;
  }
  const chips = (arr, kind) => `<div class="as__chips">${arr.map((t) => `<button type="button" class="chip" data-${kind}="${esc(t)}">${esc(t)}</button>`).join('')}</div>`;
  const typing = (fn, ms = 550) => { const t = document.createElement('div'); t.className = 'as__msg as__msg--bot as__typing'; t.innerHTML = '<i></i><i></i><i></i>'; log.appendChild(t); log.scrollTop = log.scrollHeight; setTimeout(() => { t.remove(); fn(); }, PB.reduce ? 0 : ms); };

  function menuView() {
    mode = 'menu';
    root.querySelector('.as__panel').innerHTML = `
      <header class="as__head"><span class="as__avatar">${I.chat}</span><div><b>Assistant Premibel</b><small>Conseil parquet, pose et entretien</small></div><button class="as__x" type="button" aria-label="Fermer" data-as-close>${I.close}</button></header>
      <div class="as__quick">
        <button type="button" data-as="configurateur"><span>${I.search}</span><b>Trouver votre parquet</b><small>Motif, couleur, finition</small></button>
        <button type="button" data-as="chat"><span>${I.chat}</span><b>Discuter en ligne</b><small>Questions sur nos produits</small></button>
        <a href="rendez-vous.html"><span>${I.store}</span><b>Prendre rendez-vous</b><small>En showroom ou par téléphone</small></a>
        <button type="button" data-as="conseiller"><span>${I.user}</span><b>Parler directement avec un conseiller</b><small>Réponse en direct</small></button>
        <a href="${esc(S.whatsapp)}" target="_blank" rel="noopener"><span>${I.wa}</span><b>WhatsApp conseiller</b><small>${esc(S.mobile || '')}</small></a>
        <a href="tel:+33147002510"><span><svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg></span><b>Appeler</b><small>${esc(S.phone || '')}</small></a>
      </div>`;
  }
  function chatView(intro = true) {
    mode = 'chat';
    root.querySelector('.as__panel').innerHTML = `
      <header class="as__head"><button class="as__back" type="button" aria-label="Retour aux actions" data-as="menu">${I.arrowL}</button><span class="as__avatar">${I.chat}</span><div><b>Assistant Premibel</b><small>Conseil parquet, pose et entretien</small></div><button class="as__new" type="button" data-as="new">Nouvelle discussion</button><button class="as__x" type="button" aria-label="Fermer" data-as-close>${I.close}</button></header>
      <div class="as__log" aria-live="polite"></div>
      <form class="as__form"><input type="text" placeholder="Posez votre question…" aria-label="Votre message" autocomplete="off"><button type="submit" aria-label="Envoyer">${I.arrow}</button></form>
      <p class="as__note">Maquette : en ligne, l’assistant IA et le chat conseiller (Chatwoot) répondent en temps réel.</p>`;
    log = root.querySelector('.as__log');
    if (intro) { say('Bonjour ! Je suis l’assistant Premibel. Comment puis-je vous aider ?'); say(chips(TOPICS, 'topic')); }
    setTimeout(() => root.querySelector('.as__form input').focus(), 80);
  }

  function topic(t) {
    say(esc(t), 'me');
    if (t === 'Trouver un parquet') { quiz = { i: 0, a: {} }; return typing(askQuiz); }
    if (t === 'Comparer des produits') return typing(compare);
    if (t === 'Question sur la pose') return typing(() => say(`Chaque pose a ses contraintes (flottante, collée, clouée, clipsée). Nos guides détaillent les étapes :<br><a href="guide.html?g=types-pose">Les types de pose →</a><br><a href="commande.html">Comment commander les accessoires →</a><br>Besoin d’un avis sur votre chantier ? ${chips(['Parler à un conseiller'], 'topic')}`));
    if (t === 'Entretien') return typing(() => { const post = (window.PB_POSTS || []).find((p) => /entretien/i.test(p.title)); say(`L’entretien dépend de la finition : un parquet huilé demande un entretien régulier, un parquet verni est plus simple à entretenir.<br><a href="guide.html?g=finitions-parquet">Les finitions →</a>${post ? `<br><a href="article.html?a=${esc(post.slug)}">${esc(post.title)} →</a>` : ''}<br><a href="${PB.catUrl('finition-et-entretien')}">Produits d’entretien →</a>`); });
    if (t === 'Prix produit') { mode = 'price'; return typing(() => say('Indiquez le nom ou la référence du produit (ex. « Colza » ou « CHENF36014 »).')); }
    if (t === 'Livraison') return typing(() => { const d = S.delivery || {}; say(`${esc(d.note || '')}<ul class="as__list">${(d.zones || []).map(([z, x]) => `<li>${esc(z)} : <b>${esc(x)}</b></li>`).join('')}</ul>Livraison gratuite dès 1 000 € HT en France métropolitaine, ou Click & Collect à l’entrepôt de Pantin.<br><a href="livraison.html">Conditions de livraison →</a>`); });
    if (t === 'Parler à un conseiller') return typing(handoff);
    return null;
  }
  function askQuiz() {
    const [, q, opts] = QUESTIONS[quiz.i];
    say(`<span class="as__step">${quiz.i + 1}/4</span> ${esc(q)}${chips(opts, 'answer')}`);
  }
  function answer(v) {
    say(esc(v), 'me');
    quiz.a[QUESTIONS[quiz.i][0]] = v; quiz.i += 1;
    if (quiz.i < QUESTIONS.length) return typing(askQuiz, 400);
    typing(() => {
      const { list, relaxed } = recommend(quiz.a);
      if (!list.length) { say('Je n’ai pas trouvé de produit correspondant. Un conseiller peut vous orienter.'); return handoff(); }
      say(`${relaxed ? 'Aucun produit ne coche tous vos critères ; voici les plus proches' : 'Voici une sélection adaptée à votre projet'} (produits en stock) :<div class="as__prods">${list.map(mini).join('')}</div>${chips(['Comparer des produits', 'Parler à un conseiller'], 'topic')}`);
      quiz.result = list;
    }, 800);
    return null;
  }
  function compare() {
    let rv = []; try { rv = JSON.parse(localStorage.getItem('pb-recent-v1')) || []; } catch { /* ignore */ }
    const pick = (quiz?.result || []).slice(0, 3).length ? quiz.result.slice(0, 3)
      : [...new Set([...rv, ...PB.cart.items().map((i) => i.sku)])].map(PB.bySku).filter((p) => p && p.unit === 'm²').slice(0, 3);
    if (pick.length < 2) { say('Consultez quelques fiches produits (ou lancez « Trouver un parquet ») puis revenez : je comparerai jusqu’à 3 parquets côte à côte.'); return; }
    const rows = [['Prix TTC', (p) => `${PB.money(PB.ttc(p.price))}/${PB.unitLabel(p)}`], ['Essence', (p) => p.spec.Essence], ['Finition', (p) => p.spec.Finition], ['Largeur', (p) => p.spec.Largeur], ['Épaisseur', (p) => p.spec.Épaisseur], ['Pose', (p) => p.spec.Pose], ['Chauffage au sol', (p) => p.spec['Chauffage au sol']], ['Stock', (p) => p.stock?.label || (p.stock?.in ? 'En stock' : 'Rupture')]];
    say(`<div class="as__cmp"><table><thead><tr><th></th>${pick.map((p) => `<th><a href="${PB.productUrl(p)}">${esc(p.name)}</a></th>`).join('')}</tr></thead><tbody>${rows.map(([l, f]) => `<tr><th>${l}</th>${pick.map((p) => `<td>${esc(f(p) || '—')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
  }
  function handoff() {
    say(`Un conseiller Premibel vous répond du lundi au samedi :<div class="as__handoff"><a class="btn btn--dark btn--sm" href="${esc(S.whatsapp)}" target="_blank" rel="noopener"><span>WhatsApp ${esc(S.mobile || '')}</span></a><a class="btn btn--line btn--sm" href="tel:+33147002510"><span>Appeler le ${esc(S.phone || '')}</span></a><a class="btn btn--line btn--sm" href="rendez-vous.html"><span>Prendre rendez-vous</span></a></div><small class="muted">Sur le site final, le chat bascule ici vers un conseiller en direct.</small>`);
  }
  function free(text) {
    say(esc(text), 'me');
    const q = norm(text).split(/\s+/).filter((w) => w.length > 2);
    typing(() => {
      if (mode === 'price' || /prix|tarif|combien|ref|chen|poin/i.test(text)) {
        const hits = PB.products().filter((p) => { const h = norm(`${p.name} ${p.sku}`); return q.length && q.every((w) => h.includes(w)); }).slice(0, 4);
        mode = 'chat';
        if (hits.length) return say(`Voici ce que j’ai trouvé :<div class="as__prods">${hits.map(mini).join('')}</div>`);
      }
      if (/livr|delai|click/i.test(norm(text))) return topic('Livraison');
      if (/conseill|humain|appel|telephone/i.test(norm(text))) return handoff();
      const posts = (window.PB_POSTS || []).filter((p) => q.some((w) => norm(p.title).includes(w))).slice(0, 3);
      const prods = PB.products().filter((p) => q.length && q.every((w) => norm(`${p.name} ${Object.values(p.spec).join(' ')}`).includes(w))).slice(0, 3);
      if (!posts.length && !prods.length) return say(`Je n’ai pas de réponse précise. ${chips(['Parler à un conseiller', 'Trouver un parquet'], 'topic')}`);
      return say(`${prods.length ? `Produits :<div class="as__prods">${prods.map(mini).join('')}</div>` : ''}${posts.length ? `Articles utiles :<ul class="as__list">${posts.map((p) => `<li><a href="article.html?a=${esc(p.slug)}">${esc(p.title)}</a></li>`).join('')}</ul>` : ''}`);
    });
  }

  function build() {
    root = document.createElement('div'); root.className = 'as';
    root.innerHTML = '<div class="as__panel" role="dialog" aria-modal="false" aria-label="Assistant Premibel"></div>';
    document.body.appendChild(root);
    root.addEventListener('click', (e) => {
      const a = e.target.closest('[data-as]');
      if (e.target.closest('[data-as-close]')) return close();
      if (a) {
        const v = a.dataset.as;
        if (v === 'configurateur') { close(); PB.configurateur.open(); }
        else if (v === 'chat' || v === 'new') { quiz = null; chatView(); }
        else if (v === 'conseiller') { chatView(false); say('Je vous mets en relation avec un conseiller.'); handoff(); }
        else if (v === 'menu') menuView();
        return null;
      }
      const t = e.target.closest('[data-topic]'); if (t) return topic(t.dataset.topic);
      const an = e.target.closest('[data-answer]'); if (an && quiz && quiz.i < QUESTIONS.length) return answer(an.dataset.answer);
      return null;
    });
    root.addEventListener('submit', (e) => { e.preventDefault(); const i = e.target.querySelector('input'); const v = i.value.trim(); if (!v) return; i.value = ''; free(v); });
    root.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }
  function open() {
    if (!root) build();
    lastFocus = document.activeElement;
    if (!root.classList.contains('is-open')) menuView();
    root.classList.add('is-open');
    PB.load('products', 'categories', 'posts').catch(() => {});
    setTimeout(() => root.querySelector('.as__panel button, .as__panel a')?.focus(), 80);
  }
  function close() { root.classList.remove('is-open'); if (lastFocus && lastFocus.focus) lastFocus.focus(); }

  if (!document.querySelector('link[href$="modules.css"]')) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'assets/css/modules.css'; document.head.appendChild(l); }
  window.PB_assistant = { open, close };
})();
