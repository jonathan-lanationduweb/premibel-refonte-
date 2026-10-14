/* ==========================================================================
   Comment passer commande — étapes illustrées
   Desktop : scène collante dont le mini-écran change avec l'étape lue.
   Mobile : le mini-écran s'affiche sous chaque étape.
   Les mini-écrans sont décoratifs (aria-hidden) : lignes « squelette », aucun prix inventé.
   ========================================================================== */
PB.ready(() => {
  const { $, $$ } = window.PBInfo;
  const howto = $('[data-howto]'); if (!howto) return;
  const sk = (w) => `<i class="sk" style="width:${w}%"></i>`;
  const img = (f) => `style="background-image:url('assets/img/site/${f}.webp')"`;

  const MOCKS = [
    // 1. Catalogue
    `<div class="mock"><div class="mock__bar"><i></i><i></i><i></i></div>
      <div class="mock__chips"><span>Parquet massif</span><span>Flottant</span><span>Stratifié</span><span>Accessoires</span></div>
      <div class="mock__grid"><span ${img('chene')}></span><span ${img('point-de-hongrie')}></span><span ${img('parquet-miel')}></span><span ${img('parquet-clair')}></span><span ${img('dalles-de-versailles')}></span><span ${img('parquet-fonce')}></span></div></div>`,
    // 2. Produit → panier
    `<div class="mock"><div class="mock__bar"><i></i><i></i><i></i></div>
      <div class="mock__prod"><span ${img('point-de-hongrie')}></span><div>${sk(90)}${sk(60)}<div class="mock__row" style="border:0;padding-bottom:0"><span>Quantité</span><span class="mock__qty"><span>−</span><b>4</b><span>+</span></span></div></div></div>
      <div class="mock__btn">Ajouter au panier</div></div>`,
    // 3. Panier
    `<div class="mock"><div class="mock__bar"><i></i><i></i><i></i></div>
      <div class="mock__row"><span style="flex:1">${sk(80)}${sk(45)}</span><b>4 colis</b></div>
      <div class="mock__row"><span style="flex:1">${sk(70)}${sk(35)}</span><b>12 ml</b></div>
      <div class="mock__row"><span>Surfaces, quantités, prix</span><b>Vérifiés</b></div>
      <div class="mock__btn">Valider mon panier</div></div>`,
    // 4. Compte
    `<div class="mock"><div class="mock__bar"><i></i><i></i><i></i></div>
      <div class="mock__chips"><span>Connexion</span><span>Créer un compte</span></div>
      <div class="mock__field">Adresse e-mail</div><div class="mock__field">Mot de passe</div>
      <div class="mock__btn">Se connecter</div></div>`,
    // 5. Livraison
    `<div class="mock"><div class="mock__bar"><i></i><i></i><i></i></div>
      <div class="mock__opt is-sel"><i></i><span>Click &amp; Collect — Pantin</span><small>2 h</small></div>
      <div class="mock__opt"><i></i><span>Livraison à domicile</span><small>24/48 h IDF</small></div>
      <div class="mock__btn">Continuer</div></div>`,
    // 6. Paiement
    `<div class="mock"><div class="mock__bar"><i></i><i></i><i></i></div>
      <div class="mock__opt"><i></i><span>Carte bancaire</span></div>
      <div class="mock__opt"><i></i><span>Virement</span></div>
      <div class="mock__opt is-sel"><i></i><span>Alma</span><small>2× 3× 4×</small></div>
      <div class="mock__btn">Payer</div></div>`,
    // 7. Confirmation
    `<div class="mock"><div class="mock__bar"><i></i><i></i><i></i></div>
      <div class="mock__ok"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16.5 9.5"/></svg><b style="color:var(--ink)">Commande confirmée</b><span>Un e-mail de confirmation vous est envoyé.</span></div>
      ${sk(100)}${sk(70)}</div>`,
  ];

  const steps = $$('.hstep', howto);
  steps.forEach((s, i) => { const m = $('.hstep__mock', s); if (m) m.innerHTML = MOCKS[i] || ''; });

  const stage = $('[data-stage]'), nEl = $('[data-stage-n]'), bar = $('[data-stage-bar]');
  stage.insertAdjacentHTML('beforeend', MOCKS.join(''));
  const stageMocks = $$(':scope > .mock', stage);

  let current = -1;
  const activate = (i) => {
    if (i === current) return; current = i;
    steps.forEach((s, k) => s.classList.toggle('is-active', k === i));
    stageMocks.forEach((m, k) => m.classList.toggle('is-on', k === i));
    nEl.textContent = i + 1;
    bar.style.transform = `scaleX(${(i + 1) / steps.length})`;
  };
  howto.classList.add('is-live');
  activate(0);

  // Étape active = celle qui croise la ligne médiane de l'écran
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) activate(+e.target.dataset.step); });
  }, { rootMargin: '-45% 0px -50% 0px' });
  steps.forEach((s) => io.observe(s));
});
