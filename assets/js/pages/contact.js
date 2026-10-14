/* ==========================================================================
   Page Contact — formulaire (validation inline, aucun envoi réseau),
   coordonnées directes, adresses.
   ?objet=information|devis|conseil|commande|pro pour présélectionner l'objet.
   ========================================================================== */
PB.ready(() => {
  const { $, $$, esc, I } = PB;
  const S = window.PBS, F = window.PBF;
  const SITE = window.PB_SITE || {};

  /* ---------- Coordonnées directes (depuis data/site.js) ---------- */
  if (SITE.phone) { $('[data-phone]').textContent = SITE.phone; $('[data-tel]').href = S.tel(SITE.phone); }
  if (SITE.email) { $('[data-email]').textContent = SITE.email; $('[data-mail]').href = `mailto:${SITE.email}`; }
  $('[data-wa]').href = SITE.whatsapp || '#';

  /* ---------- Adresses ---------- */
  $('[data-stores]').innerHTML = S.stores().map((s) => `
    <li class="ct-store reveal">
      <a class="ct-store__name" href="magasin.html?m=${s.slug}"><span class="ct-store__type">${esc(s.type)} · ${esc(s.city)}</span><b>${esc(s.name)}</b></a>
      <span class="ct-store__addr">${esc(s.address)}<br>${esc(s.zip)}</span>
      <span class="ct-store__st">${S.statusHTML(s)}</span>
      <a class="ct-store__tel" href="${S.tel(s.phone)}">${S.ICON.phone}<span>${esc(s.phone)}</span></a>
    </li>`).join('');

  /* ---------- Formulaire ---------- */
  const form = $('[data-contact]');
  F.bind(form);
  const hint = $('[data-subject-hint]'), order = $('[data-order]'), company = $('[data-company]');
  const HINTS = {
    devis: 'Pour un chiffrage détaillé (surfaces, pièces, type de parquet), vous pouvez aussi utiliser notre <a href="devis.html">formulaire de devis en ligne</a>.',
    commande: 'Indiquez si possible votre numéro de commande pour un suivi plus rapide.',
    pro: 'Vous êtes un professionnel&#8239;? Découvrez aussi notre <a href="pro.html">espace dédié aux professionnels</a>.',
  };
  const reveal = (el, on) => {
    if (on === !el.hidden) return;
    if (on) { el.hidden = false; if (PB.motion) gsap.fromTo(el, { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: .5, ease: 'expo.out' }); }
    else el.hidden = true;
  };
  const onSubject = () => {
    const v = (form.querySelector('input[name="objet"]:checked') || {}).value;
    const h = HINTS[v] || '';
    if (hint.innerHTML !== h) {
      if (PB.motion && h) { hint.innerHTML = h; gsap.fromTo(hint, { opacity: 0, y: -4 }, { opacity: 1, y: 0, duration: .5, ease: 'expo.out' }); }
      else hint.innerHTML = h;
    }
    reveal(order, v === 'commande');
    reveal(company, v === 'pro');
  };
  form.addEventListener('change', (e) => { if (e.target.name === 'objet') onSubject(); });
  const pre = (PB.qs('objet') || '').toLowerCase();
  const preInput = pre && form.querySelector(`input[name="objet"][value="${CSS.escape(pre)}"]`);
  if (preInput) preInput.checked = true;
  onSubject();

  /* Anti-spam : champ piège (honeypot). S'il est rempli, faux succès silencieux
     (on ne signale rien au robot) et rien n'est transmis. */
  const hp = $('[data-hp]', form);
  const isBot = () => !!hp && hp.value.trim() !== '';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isBot()) {
      form.dataset.spam = '1';
      F.success($('[data-form-wrap]'), { title: 'Merci, <em>c’est bien reçu.</em>', text: 'Votre demande a été transmise.' });
      return;
    }
    const bad = F.validateScope(form);
    const btn = form.querySelector('[type="submit"]');
    if (bad) { F.nudge(btn); F.focusEl(bad); return; }
    await F.busy(btn);
    const d = new FormData(form);
    const subj = (form.querySelector('input[name="objet"]:checked') || {}).dataset.label || '';
    F.success($('[data-form-wrap]'), {
      title: `Merci ${esc(d.get('prenom'))}, <em>c’est bien reçu.</em>`,
      text: `Votre demande «&#8239;${esc(subj)}&#8239;» a été transmise. Un conseiller Premibel Parquet vous recontactera dans les meilleurs délais à l’adresse ${esc(d.get('email'))}.`,
      extra: `<div class="acts"><a class="btn btn--line btn--sm" href="index.html"><span>Retour à l’accueil</span></a><a class="btn btn--dark btn--sm" href="${esc(SITE.whatsapp || '#')}" target="_blank" rel="noopener"><span>Une urgence&#8239;? WhatsApp</span>${I.arrow}</a></div>`,
    });
  });

  setInterval(() => $$('.ct-store').forEach((li, k) => { li.querySelector('.ct-store__st').innerHTML = S.statusHTML(S.stores()[k]); }), 60000);
});
