/* ==========================================================================
   Mon compte — aligné sur le site en ligne (/connexion/, /inscription/)
   - Connexion : e-mail, mot de passe, « Rester connecté », mot de passe oublié,
     « Continuer avec Google » (maquette), 4 avantages
   - Inscription en 2 étapes : identifiants (pro, civilité, nom, prénom, e-mail,
     mot de passe) puis informations (téléphone, naissance, adresse ; si pro :
     SIREN, SIRET, entreprise, APE, KBIS et pièce d'identité) + CGV
   - Espace client de DÉMONSTRATION après connexion / inscription simulée :
     tableau de bord, commandes (exemples marqués « démo »), mes devis
     (PB.devis.items()), adresses, informations, rétractation, déconnexion
   ?onglet=inscription|connexion (ou #inscription) ; ?espace=commandes|devis|adresses|informations
   Aucun envoi réseau : l'état de démonstration reste dans le navigateur.
   ========================================================================== */
PB.ready(() => {
  const { $, $$, esc, slideSeg } = window.PBInfo;
  const F = window.PBF;
  const I = PB.I;
  const auth = $('[data-auth]'), dash = $('[data-dash]');
  const tabs = $('[data-tabs]'); if (!tabs || !auth) return;

  /* ======================================================================
     État de démonstration (localStorage si « Rester connecté », sinon session)
     ====================================================================== */
  const KEY = 'pb-compte-demo-v1', USERS = 'pb-compte-demo-users-v1';
  const store = {
    get() { for (const s of [sessionStorage, localStorage]) { try { const v = JSON.parse(s.getItem(KEY)); if (v) return v; } catch { /* ignore */ } } return null; },
    set(v, remember) {
      try { (remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(v)); (remember ? sessionStorage : localStorage).removeItem(KEY); } catch { /* ignore */ }
    },
    update(patch) { const cur = store.get() || {}; const nv = { ...cur, ...patch }; store.set(nv, !!cur.remember); remember(nv); return nv; },
    clear() { try { sessionStorage.removeItem(KEY); localStorage.removeItem(KEY); } catch { /* ignore */ } },
  };
  // comptes créés pendant la démo (pour retrouver nom / prénom à la reconnexion)
  const users = () => { try { return JSON.parse(localStorage.getItem(USERS)) || {}; } catch { return {}; } };
  const remember = (u) => { if (!u.email) return; try { const all = users(); all[u.email.toLowerCase()] = { ...u, remember: undefined }; localStorage.setItem(USERS, JSON.stringify(all)); } catch { /* ignore */ } };

  /* ======================================================================
     Avantages (textes du site en ligne)
     ====================================================================== */
  const BI = {
    track: '<svg viewBox="0 0 24 24"><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.6"/><circle cx="17" cy="17.5" r="1.6"/></svg>',
    doc: '<svg viewBox="0 0 24 24"><path d="M7 3h7l4 4v14H7z"/><path d="M14 3v4h4M9.5 12h6M9.5 15.5h6"/></svg>',
    user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="3.6"/><path d="M5 20c1.3-3.4 4-5.2 7-5.2s5.7 1.8 7 5.2"/></svg>',
    lock: '<svg viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5M12 14.5v2.5"/></svg>',
  };
  const BENS = {
    login: { title: 'Tout pour gérer <em>vos achats.</em>', lead: '', items: [
      ['track', 'Suivi des commandes', 'Consultez l’état de vos commandes en temps réel.'],
      ['doc', 'Commandes et factures', 'Accédez à votre historique et vos documents.'],
      ['user', 'Informations enregistrées', 'Gagnez du temps lors de vos prochaines commandes.'],
      ['lock', 'Espace sécurisé', 'Vos données personnelles restent protégées.'],
    ] },
    signup: { title: 'Votre espace client <em>Premibel.</em>', lead: 'Commencez en moins d’une minute et découvrez tous les avantages de votre espace personnel.', items: [
      ['track', 'Suivi des commandes', 'Suivez vos achats en temps réel et connaissez l’état de vos livraisons.'],
      ['doc', 'Commandes et factures', 'Accédez à l’historique complet de vos achats et téléchargez vos factures.'],
      ['user', 'Gérer vos données', 'Mettez à jour vos informations personnelles et de livraison quand vous le souhaitez.'],
      ['lock', 'Espace sécurisé', 'Vos données personnelles restent protégées et confidentielles.'],
    ] },
  };
  const bensEl = $('[data-bens]'), bensTitle = $('[data-bens-title]'), bensLead = $('[data-bens-lead]');
  let bensFor = null;
  function paintBens(kind) {
    const b = BENS[kind === 'signup' ? 'signup' : 'login'];
    if (bensFor === b) return; bensFor = b;
    const html = b.items.map(([ic, t, d]) => `<li><span class="bens__i" aria-hidden="true">${BI[ic]}</span><span><b>${t}</b><small>${d}</small></span></li>`).join('');
    const apply = () => { bensTitle.innerHTML = b.title; bensLead.hidden = !b.lead; bensLead.textContent = b.lead; bensEl.innerHTML = html; };
    if (PB.motion && bensEl.children.length) {
      gsap.to([bensTitle, bensLead, ...bensEl.children], { opacity: 0, y: -6, duration: .2, stagger: .02, ease: 'power2.in', onComplete: () => { apply(); gsap.fromTo([bensTitle, bensLead, ...bensEl.children], { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .6, stagger: .05, ease: 'expo.out' }); } });
    } else apply();
  }

  /* ======================================================================
     Panneaux Connexion / Inscription / Mot de passe oublié
     ====================================================================== */
  const title = $('[data-acct-title]'), sub = $('[data-acct-sub]');
  const HEAD = {
    login: ['Connexion', 'Accédez à votre espace client, suivez vos commandes et factures en toute sécurité.'],
    signup: ['Créer mon compte', 'Quelques informations suffisent pour commencer.'],
    forgot: ['Un oubli, <em>ça arrive.</em>', 'Nous vous envoyons un lien pour choisir un nouveau mot de passe.'],
  };
  const show = (name) => {
    $$('[data-pane]').forEach((p) => { const on = p.dataset.pane === name; p.hidden = !on; p.classList.toggle('is-in', on); });
    title.innerHTML = HEAD[name][0]; sub.textContent = HEAD[name][1];
    paintBens(name);
  };
  const placeTabs = slideSeg(tabs, 'aria-selected');
  const tabBtns = $$('[role="tab"]', tabs);
  const selectTab = (key, focus) => {
    const btn = tabBtns.find((b) => b.dataset.tab === key) || tabBtns[0];
    tabBtns.forEach((b) => { const on = b === btn; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; });
    placeTabs(); show(btn.dataset.tab); if (focus) btn.focus();
    try { const u = new URL(location.href); u.searchParams.set('onglet', btn.dataset.tab === 'signup' ? 'inscription' : 'connexion'); u.hash = ''; history.replaceState(null, '', u); } catch { /* fichier local */ }
  };
  tabBtns.forEach((b) => b.addEventListener('click', () => selectTab(b.dataset.tab)));
  tabs.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const i = tabBtns.findIndex((b) => b.getAttribute('aria-selected') === 'true');
    selectTab(tabBtns[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabBtns.length) % tabBtns.length].dataset.tab, true);
  });
  $$('[data-go]').forEach((b) => b.addEventListener('click', () => { selectTab(b.dataset.go); scrollCard(); }));
  const scrollCard = () => { const c = $('.acct__card'); const r = c.getBoundingClientRect(); if (r.top < 0) { const y = scrollY + r.top - 100; if (PB.lenis) PB.lenis.scrollTo(y, { duration: .8 }); else scrollTo({ top: y, behavior: PB.reduce ? 'auto' : 'smooth' }); } };

  $('[data-forgot-open]').addEventListener('click', () => { show('forgot'); $('#fg-email').value = $('#li-email').value; $('#fg-email').focus(); });
  $('[data-forgot-close]').addEventListener('click', () => { show('login'); $('#li-email').focus(); });

  /* Afficher / masquer le mot de passe */
  $$('[data-pwd]').forEach((b) => b.addEventListener('click', () => {
    const input = $(`#${b.getAttribute('aria-controls')}`);
    const visible = input.type === 'password';
    input.type = visible ? 'text' : 'password';
    b.textContent = visible ? 'Masquer' : 'Afficher';
    b.setAttribute('aria-pressed', visible);
    input.focus({ preventScroll: true });
  }));

  /* Robustesse du mot de passe */
  const meter = $('[data-meter]'), meterL = $('[data-meter-l]');
  $('#su-pwd').addEventListener('input', (e) => {
    const v = e.target.value;
    let s = 0;
    if (v.length >= 8) s++;
    if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++;
    if (/\d/.test(v)) s++;
    if (/[^A-Za-z0-9]/.test(v) || v.length >= 14) s++;
    if (v.length < 8) s = Math.min(s, 1);
    meter.dataset.s = v ? s : 0;
    meterL.textContent = !v ? '8 caractères minimum.' : v.length < 8 ? `Encore ${8 - v.length} caractère${8 - v.length > 1 ? 's' : ''}.` : `${['Faible', 'Faible', 'Correct', 'Bon', 'Excellent'][s]} — mélangez majuscules, chiffres et symboles.`;
  });

  /* Bouton Google (maquette) */
  $$('[data-g-ico]').forEach((s) => { s.innerHTML = I.google; });

  /* ======================================================================
     Validation (socle PBF + règles pro SIREN / SIRET / APE)
     ====================================================================== */
  const PATTERNS = {
    siren: [(v) => /^\d{9}$/.test(v.replace(/\s/g, '')), 'Le SIREN comporte 9 chiffres — exemple : 123 456 789'],
    siret: [(v) => /^\d{14}$/.test(v.replace(/\s/g, '')), 'Le SIRET comporte 14 chiffres — exemple : 123 456 789 00012'],
    ape: [(v) => /^\d{2}\.?\d{2}[A-Za-z]$/.test(v.replace(/\s/g, '')), 'Code APE : 4 chiffres et 1 lettre — exemple : 4333Z'],
  };
  const setErr = (el, msg) => {
    const f = el.closest('.field');
    let e = f.querySelector(':scope > .field__err');
    if (!e) { e = document.createElement('p'); e.className = 'field__err'; e.id = `${el.id}-err`; e.setAttribute('aria-live', 'polite'); f.appendChild(e); }
    f.classList.toggle('is-error', !!msg); f.classList.toggle('is-valid', !msg && !!el.value.trim());
    if (msg) { el.setAttribute('aria-invalid', 'true'); el.setAttribute('aria-describedby', e.id); } else el.removeAttribute('aria-invalid');
    e.textContent = msg || '';
  };
  const checkPattern = (el) => {
    if (el.disabled || !el.dataset.pattern) return true;
    const v = el.value.trim();
    const [ok, msg] = PATTERNS[el.dataset.pattern];
    const good = !v || ok(v);
    setErr(el, good ? '' : msg);
    return good;
  };
  const validate = (scope) => {
    const bad = F.validateScope(scope);
    let first = bad;
    $$('[data-pattern]', scope).forEach((el) => { if (!checkPattern(el) && !first) first = el; });
    return first;
  };
  const deny = (btn, el) => { F.nudge(btn); F.focusEl(el); };

  $$('[data-form]').forEach((form) => {
    F.bind(form);
    form.addEventListener('focusout', (e) => { if (e.target.dataset && e.target.dataset.pattern && e.target.value) checkPattern(e.target); });
    form.addEventListener('input', (e) => { const el = e.target; if (el.dataset && el.dataset.pattern && el.getAttribute('aria-invalid')) checkPattern(el); });
  });

  /* ======================================================================
     Inscription : 2 étapes, champs pro, pièces justificatives
     ====================================================================== */
  const su = $('[data-form="signup"]');
  const suSteps = $$('[data-su-step]', su), suDots = $$('[data-su-dot]', su);
  const proToggle = $('[data-pro-toggle]', su), proBox = $('[data-pro-fields]', su);
  let suAt = 1;
  const goStep = (n) => {
    if (n === suAt) return;
    const from = suSteps[suAt - 1], to = suSteps[n - 1], dir = n > suAt ? 1 : -1;
    suAt = n;
    suDots.forEach((d) => { const k = +d.dataset.suDot; d.classList.toggle('is-current', k === n); d.classList.toggle('is-done', k < n); });
    const swap = () => { from.hidden = true; to.hidden = false; $('[data-su-title]', to).focus({ preventScroll: true }); scrollCard(); };
    if (PB.motion) {
      gsap.to(from, { opacity: 0, x: -24 * dir, duration: .22, ease: 'power2.in', onComplete: () => { swap(); gsap.fromTo(to, { opacity: 0, x: 24 * dir }, { opacity: 1, x: 0, duration: .6, ease: 'expo.out', clearProps: 'transform,opacity' }); gsap.set(from, { clearProps: 'transform,opacity' }); } });
    } else swap();
  };
  $('[data-su-next]', su).addEventListener('click', (e) => {
    const bad = validate(suSteps[0]);
    if (bad) { deny(e.currentTarget, bad); return; }
    goStep(2);
  });
  $('[data-su-prev]', su).addEventListener('click', () => goStep(1));

  const setPro = (on) => {
    proBox.classList.toggle('is-on', on); proBox.setAttribute('aria-hidden', !on);
    $$('[data-pro]', proBox).forEach((i) => { i.disabled = !on; if (!on && i.dataset.pattern) setErr(i, ''); });
    $('[data-signup-label]').textContent = on ? 'Créer mon compte pro' : 'Créer mon compte';
  };
  proToggle.addEventListener('change', () => setPro(proToggle.checked));
  setPro(proToggle.checked);

  // Dépôt de fichiers (interface seule, aucun envoi)
  const MAX = 10 * 1024 * 1024, OK = /\.(pdf|jpe?g|png)$/i;
  const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });
  const size = (b) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} Ko` : `${nf.format(b / 1024 / 1024)} Mo`);
  const files = { kbis: null, cni: null };
  $$('[data-drop]', su).forEach((drop) => {
    const key = drop.dataset.drop, input = $('input[type="file"]', drop), out = $(`[data-files="${key}"]`, su);
    const paint = () => {
      const f = files[key];
      const err = f && (!OK.test(f.name) ? 'format non accepté (PDF, JPG ou PNG)' : f.size > MAX ? 'fichier trop lourd (10 Mo max.)' : '');
      out.innerHTML = f ? `<li class="${err ? 'is-bad' : ''}"><span>${esc(f.name)}</span><small>${err || size(f.size)}</small><button type="button" data-rm-file aria-label="Retirer ${esc(f.name)}">${I.close}</button></li>` : '';
      drop.classList.toggle('has-file', !!f && !err);
    };
    const take = (list) => { if (list && list[0]) { files[key] = list[0]; paint(); } input.value = ''; };
    input.addEventListener('change', () => take(input.files));
    ['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); if (!input.disabled) drop.classList.add('is-over'); }));
    ['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove('is-over'); }));
    drop.addEventListener('drop', (e) => { if (!input.disabled && e.dataTransfer) take(e.dataTransfer.files); });
    out.addEventListener('click', (e) => { if (e.target.closest('[data-rm-file]')) { files[key] = null; paint(); } });
  });
  const badFiles = () => Object.values(files).some((f) => f && (!OK.test(f.name) || f.size > MAX));

  /* ======================================================================
     Envois simulés
     ====================================================================== */
  const busyGo = async (btn) => { await F.busy(btn, 900); };
  $('[data-form="login"]').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget, btn = $('[type="submit"]', form);
    const bad = validate(form); if (bad) { deny(btn, bad); return; }
    await busyGo(btn);
    const email = form.email.value.trim();
    const known = users()[email.toLowerCase()] || {};
    signIn({ ...known, email, via: 'email' }, form.remember.checked);
  });
  $('[data-form="forgot"]').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.currentTarget, btn = $('[type="submit"]', form);
    const bad = validate(form); if (bad) { deny(btn, bad); return; }
    await busyGo(btn);
    const email = esc(form.email.value.trim());
    form.innerHTML = `<div class="form-success acct-ok" role="status" tabindex="-1">${I.check}<h2 class="h3">Vérifiez votre boîte mail.</h2><p class="muted">Si un compte est associé à <b>${email}</b>, un lien de réinitialisation vous a été envoyé.</p><button class="btn btn--line" type="button" data-back-login><span>Retour à la connexion</span></button></div>`;
    form.firstElementChild.focus();
    $('[data-back-login]', form).addEventListener('click', () => location.reload());
  });
  su.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('[type="submit"]', su);
    if (suAt === 1) { $('[data-su-next]', su).click(); return; }
    const bad1 = validate(suSteps[0]); if (bad1) { goStep(1); return; }
    const bad = validate(suSteps[1]);
    if (bad) { deny(btn, bad); return; }
    if (badFiles()) { F.nudge(btn); PB.toast('Un justificatif n’est pas au bon format (PDF, JPG ou PNG, 10 Mo max.).'); return; }
    await busyGo(btn);
    const d = new FormData(su);
    const pro = proToggle.checked;
    const u = {
      email: String(d.get('email')).trim(), civ: d.get('civ'), first: String(d.get('first')).trim(), last: String(d.get('last')).trim(),
      tel: String(d.get('tel') || '').trim(), birth: d.get('birth') || '', address: String(d.get('address') || '').trim(), city: String(d.get('city') || '').trim(), cp: String(d.get('cp') || '').trim(),
      pro, company: pro ? String(d.get('company') || '').trim() : '', siren: pro ? String(d.get('siren') || '').trim() : '', siret: pro ? String(d.get('siret') || '').trim() : '', ape: pro ? String(d.get('ape') || '').trim().toUpperCase() : '',
      docs: pro ? Object.entries(files).filter(([, f]) => f).map(([k, f]) => ({ k, name: f.name })) : [],
      since: new Date().toISOString(), via: 'signup',
    };
    remember(u);
    signIn(u, false, true);
  });
  $$('[data-google]').forEach((b) => b.addEventListener('click', async () => {
    await F.busy(b, 700);
    PB.toast('Maquette : la connexion Google sera branchée sur le site final. Ouverture de l’espace de démonstration.');
    signIn({ email: 'client.demo@gmail.com', first: '', via: 'google' }, false);
  }));

  /* ======================================================================
     Espace client (démonstration)
     ====================================================================== */
  const SECTIONS = [
    ['bord', 'Tableau de bord', '<svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.5"/></svg>'],
    ['commandes', 'Commandes', '<svg viewBox="0 0 24 24"><path d="M5 8h14l-1.2 11.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/></svg>'],
    ['devis', 'Mes devis', BI.doc],
    ['adresses', 'Adresses', '<svg viewBox="0 0 24 24"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/></svg>'],
    ['informations', 'Informations', BI.user],
  ];
  const SLUG = { 'tableau-de-bord': 'bord', bord: 'bord', commandes: 'commandes', devis: 'devis', 'mes-devis': 'devis', adresses: 'adresses', informations: 'informations' };
  const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const fdate = (d) => `${d.getDate() === 1 ? '1er' : d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  let user = null, section = 'bord', orders = null;

  function signIn(u, rememberMe, fresh = false) {
    user = { ...u, remember: !!rememberMe };
    store.set(user, rememberMe);
    openDash(fresh ? 'bord' : null, true);
  }

  /** Commandes d'exemple construites sur de vrais produits du catalogue — clairement marquées « démo ». */
  async function demoOrders() {
    if (orders) return orders;
    await PB.load('products');
    const ps = PB.products().filter((p) => p.imgs && p.imgs.length && p.price && (!p.stock || p.stock.in !== false));
    const floor = ps.filter((p) => p.unit === 'm²' && p.pack);
    const acc = ps.filter((p) => p.unit !== 'm²');
    const pick = (arr, k) => arr[Math.min(arr.length - 1, k)];
    const day = (n) => { const d = new Date(); d.setHours(10, 0, 0, 0); d.setDate(d.getDate() - n); return d; };
    const line = (p, qty) => (p ? { p, qty, total: PB.ttc(p.price) * (p.pack && p.unit === 'm²' ? p.pack : 1) * qty } : null);
    const mk = (no, date, status, step, lines, mode) => { const ls = lines.filter(Boolean); return { no, date, status, step, lines: ls, mode, total: ls.reduce((s, l) => s + l.total, 0) }; };
    orders = [
      mk('DEMO-10482', day(6), 'Expédiée', 2, [line(pick(floor, 3), 6), line(pick(acc, 2), 2)], 'Livraison sur rendez-vous'),
      mk('DEMO-10317', day(41), 'Livrée', 3, [line(pick(floor, 11), 10)], 'Retrait à l’entrepôt de Pantin'),
    ].filter((o) => o.lines.length);
    return orders;
  }
  const STEPS = ['Commandée', 'Préparée', 'Expédiée', 'Livrée'];
  const money = (v) => PB.money(v);

  function openDash(want, animate) {
    user = user || store.get();
    if (!user) return;
    const first = user.first || '';
    auth.hidden = true; dash.hidden = false;
    const q = SLUG[(want || PB.qs('espace') || '').toLowerCase()];
    section = q || 'bord';
    dash.innerHTML = `
      <nav class="crumbs" aria-label="Fil d’Ariane"><a href="index.html">Accueil</a><span aria-hidden="true">/</span><span>Mon compte</span></nav>
      <div class="dash__head">
        <div>
          <p class="eyebrow">Espace client</p>
          <h1 class="h2" id="dash-title">Bonjour${first ? ` <em>${esc(first)}.</em>` : ' <em>et bienvenue.</em>'}</h1>
        </div>
        <p class="dash__demo" role="note"><span class="tag tag--demo">Démo</span>Espace client de démonstration&#8239;: commandes et documents fictifs, aucune donnée n’est envoyée.</p>
      </div>
      <div class="dash__grid">
        <nav class="dash__nav" aria-label="Espace client">
          <div class="dash__tabs" role="tablist" aria-orientation="vertical">
            ${SECTIONS.map(([k, t, ic]) => `<button type="button" role="tab" id="dt-${k}" aria-controls="dp-${k}" aria-selected="${k === section}" tabindex="${k === section ? 0 : -1}" data-sec="${k}"><span aria-hidden="true">${ic}</span>${t}${k === 'devis' ? '<b class="dash__count" data-devis-count></b>' : ''}</button>`).join('')}
          </div>
          <div class="dash__side">
            <button type="button" class="dash__link" data-retract><span aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 14l-5-5 5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg></span>Se rétracter d’une commande</button>
            <button type="button" class="dash__link" data-logout><span aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10"/></svg></span>Déconnexion</button>
          </div>
        </nav>
        <div class="dash__panels">${SECTIONS.map(([k]) => `<section class="dash__panel" id="dp-${k}" role="tabpanel" aria-labelledby="dt-${k}" tabindex="-1" data-panel-sec="${k}"${k === section ? '' : ' hidden'}></section>`).join('')}</div>
      </div>`;
    paintCount();
    renderSection(section);
    const tabsEl = $('.dash__tabs', dash);
    tabsEl.addEventListener('click', (e) => { const b = e.target.closest('[data-sec]'); if (b) go(b.dataset.sec); });
    tabsEl.addEventListener('keydown', (e) => {
      const keys = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
      if (!(e.key in keys)) return;
      e.preventDefault();
      const i = SECTIONS.findIndex(([k]) => k === section);
      go(SECTIONS[(i + keys[e.key] + SECTIONS.length) % SECTIONS.length][0], true);
    });
    $('[data-retract]', dash).addEventListener('click', () => PB.retractation.open());
    $('[data-logout]', dash).addEventListener('click', logout);
    dash.addEventListener('click', (e) => { const g = e.target.closest('[data-goto-sec]'); if (g) { e.preventDefault(); go(g.dataset.gotoSec, false, true); } });
    try { const u = new URL(location.href); u.searchParams.delete('onglet'); u.hash = ''; history.replaceState(null, '', u); } catch { /* ignore */ }
    if (animate) {
      scrollTo({ top: 0, behavior: 'auto' });
      if (PB.motion) gsap.from([...$$('.dash__head > *, .dash__nav, .dash__panel:not([hidden])', dash)], { opacity: 0, y: 18, duration: .9, stagger: .06, ease: 'expo.out', clearProps: 'transform,opacity' });
    }
  }

  function go(k, focusTab = false, focusPanel = false) {
    if (k === section) return;
    section = k;
    $$('[data-sec]', dash).forEach((b) => { const on = b.dataset.sec === k; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; if (on && focusTab) b.focus(); });
    $$('[data-panel-sec]', dash).forEach((p) => { p.hidden = p.dataset.panelSec !== k; });
    renderSection(k);
    const p = $(`[data-panel-sec="${k}"]`, dash);
    if (PB.motion) gsap.fromTo(p, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: .7, ease: 'expo.out', clearProps: 'transform,opacity' });
    if (focusPanel) p.focus({ preventScroll: true });
    if (innerWidth < 900) { const r = p.getBoundingClientRect(); if (r.top < 60 || r.top > innerHeight * .6) { const y = scrollY + r.top - 140; if (PB.lenis) PB.lenis.scrollTo(y, { duration: .7 }); else scrollTo({ top: y }); } }
    try { const u = new URL(location.href); u.searchParams.set('espace', k === 'bord' ? 'tableau-de-bord' : k); history.replaceState(null, '', u); } catch { /* ignore */ }
  }

  function logout() {
    store.clear(); user = null; orders = null;
    dash.hidden = true; dash.innerHTML = ''; auth.hidden = false;
    try { const u = new URL(location.href); u.searchParams.delete('espace'); u.searchParams.set('onglet', 'connexion'); history.replaceState(null, '', u); } catch { /* ignore */ }
    selectTab('login');
    PB.toast('Vous êtes déconnecté·e.');
    $('#li-email').focus({ preventScroll: true });
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }

  const paintCount = () => { const c = $('[data-devis-count]', dash); if (c) { const n = PB.devis.count(); c.textContent = n || ''; c.hidden = !n; } };
  document.addEventListener('pb:devis', () => { if (!dash.hidden) { paintCount(); if (section === 'devis' || section === 'bord') renderSection(section); } });

  /* ---------- Rendu des sections ---------- */
  const addrLine = (u) => [u.address, [u.cp, u.city].filter(Boolean).join(' ')].filter(Boolean);
  const fullName = (u) => [u.civ && u.civ !== 'Autre' ? (u.civ === 'Monsieur' ? 'M.' : 'Mme') : '', u.first, u.last].filter(Boolean).join(' ');

  async function renderSection(k) {
    const p = $(`[data-panel-sec="${k}"]`, dash); if (!p) return;
    const u = user;
    if (k === 'bord') {
      p.innerHTML = `<h2 class="dash__h">Tableau de bord</h2><div class="dash__cards" data-cards><div class="dcard dcard--skel" aria-hidden="true"></div></div>`;
      const os = await demoOrders().catch(() => []);
      const last = os[0], n = PB.devis.count(), adr = addrLine(u);
      $('[data-cards]', p).innerHTML = `
        ${last ? `<article class="dcard dcard--wide">
          <p class="dcard__k">Dernière commande <span class="tag tag--demo">Démo</span></p>
          <div class="dcard__order"><b>${esc(last.no)}</b><span class="muted">${fdate(last.date)} · ${money(last.total)}</span></div>
          ${trackHTML(last)}
          <a class="link-arrow" href="#" data-goto-sec="commandes">Voir mes commandes <span aria-hidden="true">→</span></a>
        </article>` : ''}
        <article class="dcard"><p class="dcard__k">Mes devis</p><p class="dcard__big">${n}</p><p class="muted">${n ? `produit${n > 1 ? 's' : ''} dans votre demande de devis` : 'Aucun produit dans votre demande de devis.'}</p><a class="link-arrow" href="#" data-goto-sec="devis">${n ? 'Voir mes devis' : 'Comment ça marche'} <span aria-hidden="true">→</span></a></article>
        <article class="dcard"><p class="dcard__k">Adresse principale</p>${adr.length ? `<p>${esc(fullName(u) || u.email)}<br>${adr.map(esc).join('<br>')}</p>` : '<p class="muted">Aucune adresse enregistrée.</p>'}<a class="link-arrow" href="#" data-goto-sec="adresses">${adr.length ? 'Gérer mes adresses' : 'Ajouter une adresse'} <span aria-hidden="true">→</span></a></article>
        ${u.pro ? `<article class="dcard"><p class="dcard__k">Compte professionnel</p><p><span class="st-tag is-wait">En attente de validation</span></p><p class="muted">La grille tarifaire professionnelle devient accessible après validation de votre compte.</p><a class="link-arrow" href="#" data-goto-sec="informations">Mes informations pro <span aria-hidden="true">→</span></a></article>` : ''}
        <article class="dcard dcard--ink on-dark"><p class="dcard__k">Besoin d’aide&#8239;?</p><p>Nos conseillers vous répondent au <a href="tel:+33147002510">01 47 00 25 10</a>.</p><div class="dcard__acts"><a class="btn btn--light btn--sm" href="rendez-vous.html"><span>Prendre rendez-vous</span>${I.arrow}</a><a class="link-arrow" href="contact.html">Nous écrire <span aria-hidden="true">→</span></a></div></article>`;
    }
    if (k === 'commandes') {
      p.innerHTML = '<h2 class="dash__h">Commandes</h2><div data-orders><div class="dcard dcard--skel" aria-hidden="true"></div></div>';
      const os = await demoOrders().catch(() => []);
      $('[data-orders]', p).innerHTML = `<p class="dash__note"><span class="tag tag--demo">Démo</span>Commandes d’exemple construites avec de vrais produits du catalogue, pour illustrer le suivi&#8239;: elles n’existent pas.</p>
        ${os.map((o) => `<article class="order">
          <header class="order__head">
            <div><p class="dcard__k">Commande <span class="tag tag--demo">Démo</span></p><b class="order__no">${esc(o.no)}</b></div>
            <dl class="order__meta"><div><dt>Date</dt><dd>${fdate(o.date)}</dd></div><div><dt>Total TTC</dt><dd>${money(o.total)}</dd></div><div><dt>Mode</dt><dd>${esc(o.mode)}</dd></div></dl>
          </header>
          ${trackHTML(o)}
          <ul class="order__lines" role="list">${o.lines.map((l) => `<li><a href="${PB.productUrl(l.p)}"><img src="${esc(l.p.imgs[0])}" alt="" loading="lazy"><span><b>${esc(l.p.name)}</b><small>Réf. ${esc(l.p.sku)} · ${l.p.unit === 'm²' && l.p.pack ? `${l.qty} colis (${String(+(l.p.pack * l.qty).toFixed(2)).replace('.', ',')} m²)` : `Qté ${l.qty}`}</small></span><em>${money(l.total)}</em></a></li>`).join('')}</ul>
          <footer class="order__foot"><button type="button" class="btn btn--line btn--sm" data-invoice="${esc(o.no)}"><span>Télécharger la facture</span></button><button type="button" class="text-btn" data-retract-order>Se rétracter de cette commande</button></footer>
        </article>`).join('') || '<p class="muted">Aucune commande pour le moment.</p>'}`;
      $$('[data-invoice]', p).forEach((b) => b.addEventListener('click', () => PB.toast('Démo : les factures seront téléchargeables depuis cet espace sur le site final.')));
      $$('[data-retract-order]', p).forEach((b) => b.addEventListener('click', () => PB.retractation.open()));
    }
    if (k === 'devis') {
      const items = PB.devis.items();
      p.innerHTML = `<h2 class="dash__h">Mes devis</h2><div data-devis-list>${items.length ? '<div class="dcard dcard--skel" aria-hidden="true"></div>' : ''}</div>`;
      const box = $('[data-devis-list]', p);
      if (!items.length) {
        box.innerHTML = `<div class="dempty"><p class="h3">Votre demande de devis <em>est vide.</em></p><p class="muted">Sur chaque fiche produit, ajoutez des références à votre devis avec leur surface&#8239;: elles s’affichent ici et vous pouvez envoyer la demande en une fois.</p><div class="dcard__acts"><a class="btn btn--dark btn--sm" href="catalogue.html?c=parquet"><span>Parcourir nos parquets</span>${I.arrow}</a><a class="link-arrow" href="devis.html">Demander un devis libre <span aria-hidden="true">→</span></a></div></div>`;
        return;
      }
      await PB.load('products').catch(() => {});
      box.innerHTML = `<ul class="order__lines dv-lines" role="list">${items.map((it) => {
        const pr = PB.bySku(it.sku);
        return `<li>${pr ? `<a href="${PB.productUrl(pr)}"><img src="${esc(pr.imgs[0] || PB.PLACEHOLDER)}" alt="" loading="lazy"><span><b>${esc(pr.name)}</b><small>Réf. ${esc(pr.sku)}${it.surface ? ` · ${esc(String(it.surface).replace('.', ','))} m²` : ' · surface à préciser'}</small></span></a>` : `<span class="dv-miss"><b>Référence ${esc(it.sku)}</b><small>Produit indisponible</small></span>`}<button type="button" class="dv-rm" data-dv-rm="${esc(it.sku)}" aria-label="Retirer ${esc(pr ? pr.name : it.sku)} du devis">${I.close}</button></li>`;
      }).join('')}</ul>
        <div class="dcard__acts"><a class="btn btn--dark btn--sm" href="devis.html"><span>Finaliser ma demande de devis</span>${I.arrow}</a><a class="link-arrow" href="catalogue.html?c=parquet">Ajouter des produits <span aria-hidden="true">→</span></a></div>`;
      $$('[data-dv-rm]', box).forEach((b) => b.addEventListener('click', () => PB.devis.remove(b.dataset.dvRm)));
    }
    if (k === 'adresses') {
      const adr = addrLine(u);
      p.innerHTML = `<h2 class="dash__h">Adresses</h2>
        <div class="dash__cards">
          ${['Adresse de facturation', 'Adresse de livraison'].map((t) => `<article class="dcard"><p class="dcard__k">${t}</p>${adr.length ? `<p>${esc(fullName(u) || u.email)}<br>${adr.map(esc).join('<br>')}${u.tel ? `<br>${esc(u.tel)}` : ''}</p>` : '<p class="muted">Aucune adresse enregistrée.</p>'}<button type="button" class="link-arrow" data-edit-addr>${adr.length ? 'Modifier' : 'Ajouter une adresse'} <span aria-hidden="true">→</span></button></article>`).join('')}
        </div>
        <form class="dform" data-addr-form hidden aria-label="Adresse">
          <h3 class="su-h">Adresse</h3>
          <div class="field"><input id="da-addr" name="address" type="text" placeholder=" " autocomplete="street-address" required data-msg="Indiquez l’adresse." value="${esc(u.address || '')}"><label for="da-addr">Adresse</label></div>
          <div class="fields-2">
            <div class="field"><input id="da-cp" name="cp" type="text" placeholder=" " autocomplete="postal-code" inputmode="numeric" maxlength="5" required data-rule="cp" data-msg="Indiquez le code postal." value="${esc(u.cp || '')}"><label for="da-cp">Code postal</label></div>
            <div class="field"><input id="da-city" name="city" type="text" placeholder=" " autocomplete="address-level2" required data-msg="Indiquez la ville." value="${esc(u.city || '')}"><label for="da-city">Ville</label></div>
          </div>
          <div class="dform__acts"><button class="btn btn--dark btn--sm" type="submit"><span>Enregistrer</span></button><button class="text-btn" type="button" data-cancel>Annuler</button></div>
        </form>`;
      const f = $('[data-addr-form]', p);
      F.bind(f);
      $$('[data-edit-addr]', p).forEach((b) => b.addEventListener('click', () => { f.hidden = false; if (PB.motion) gsap.fromTo(f, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: .6, ease: 'expo.out' }); $('#da-addr').focus(); }));
      $('[data-cancel]', f).addEventListener('click', () => { f.hidden = true; });
      f.addEventListener('submit', (e) => {
        e.preventDefault();
        const bad = F.validateScope(f); if (bad) { deny($('[type="submit"]', f), bad); return; }
        user = store.update({ address: f.address.value.trim(), cp: f.cp.value.trim(), city: f.city.value.trim() });
        PB.toast('Adresse enregistrée (démo).');
        renderSection('adresses');
      });
    }
    if (k === 'informations') {
      p.innerHTML = `<h2 class="dash__h">Informations</h2>
        <form class="dform" data-info-form aria-label="Mes informations">
          <fieldset class="fgroup">
            <legend>Civilité</legend>
            <div class="opts">${['Monsieur', 'Madame', 'Autre'].map((c) => `<label class="opt"><input type="radio" name="civ" value="${c}"${u.civ === c ? ' checked' : ''}><span>${c}</span></label>`).join('')}</div>
          </fieldset>
          <div class="fields-2">
            <div class="field"><input id="di-last" name="last" type="text" placeholder=" " autocomplete="family-name" required data-rule="name" data-msg="Indiquez votre nom." value="${esc(u.last || '')}"><label for="di-last">Nom</label></div>
            <div class="field"><input id="di-first" name="first" type="text" placeholder=" " autocomplete="given-name" required data-rule="name" data-msg="Indiquez votre prénom." value="${esc(u.first || '')}"><label for="di-first">Prénom</label></div>
          </div>
          <div class="fields-2">
            <div class="field"><input id="di-email" name="email" type="email" placeholder=" " autocomplete="email" required data-msg="Indiquez votre adresse e-mail." value="${esc(u.email || '')}"><label for="di-email">E-mail</label></div>
            <div class="field"><input id="di-tel" name="tel" type="tel" placeholder=" " autocomplete="tel" required data-rule="tel" data-msg="Indiquez votre numéro de téléphone." value="${esc(u.tel || '')}"><label for="di-tel">Téléphone</label></div>
          </div>
          <div class="field field--date dform__half"><input id="di-birth" name="birth" type="date" placeholder=" " autocomplete="bday" value="${esc(u.birth || '')}"><label for="di-birth">Date de naissance</label></div>
          ${u.pro ? `<h3 class="su-h">Informations professionnelles <span class="st-tag is-wait">En attente de validation</span></h3>
          <dl class="pro-dl">
            <div><dt>Entreprise</dt><dd>${esc(u.company || '—')}</dd></div><div><dt>SIREN</dt><dd>${esc(u.siren || '—')}</dd></div>
            <div><dt>SIRET</dt><dd>${esc(u.siret || '—')}</dd></div><div><dt>Code APE</dt><dd>${esc(u.ape || '—')}</dd></div>
            <div><dt>Justificatifs</dt><dd>${u.docs && u.docs.length ? u.docs.map((d) => esc(d.name)).join('<br>') : 'Aucun justificatif déposé'}</dd></div>
          </dl>` : ''}
          <div class="dform__acts"><button class="btn btn--dark btn--sm" type="submit"><span>Enregistrer les modifications</span></button><button class="text-btn" type="button" data-pwd-change>Modifier mon mot de passe</button></div>
        </form>`;
      const f = $('[data-info-form]', p);
      F.bind(f);
      $('[data-pwd-change]', f).addEventListener('click', () => PB.toast('Démo : un lien de changement de mot de passe sera envoyé par e-mail sur le site final.'));
      f.addEventListener('submit', (e) => {
        e.preventDefault();
        const bad = F.validateScope(f); if (bad) { deny($('[type="submit"]', f), bad); return; }
        user = store.update({ civ: (f.querySelector('input[name="civ"]:checked') || {}).value || u.civ, last: f.last.value.trim(), first: f.first.value.trim(), email: f.email.value.trim(), tel: f.tel.value.trim(), birth: f.birth.value });
        PB.toast('Informations mises à jour (démo).');
        const h = $('#dash-title'); if (h) h.innerHTML = `Bonjour${user.first ? ` <em>${esc(user.first)}.</em>` : ' <em>et bienvenue.</em>'}`;
      });
    }
    PB.frTypo(p);
  }

  function trackHTML(o) {
    return `<ol class="track" aria-label="Suivi : ${esc(o.status)}">${STEPS.map((s, i) => `<li class="${i < o.step ? 'is-done' : i === o.step ? 'is-current' : ''}"${i === o.step ? ' aria-current="step"' : ''}><i aria-hidden="true"></i><span>${s}</span></li>`).join('')}</ol>`;
  }

  /* ======================================================================
     Démarrage
     ====================================================================== */
  const onglet = (PB.qs('onglet') || '').toLowerCase();
  selectTab(onglet === 'inscription' || location.hash === '#inscription' ? 'signup' : 'login');
  if (store.get()) { user = store.get(); openDash(null, false); }
});
