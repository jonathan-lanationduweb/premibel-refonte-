/* ==========================================================================
   Prise de rendez-vous — aligné sur le site en ligne (Simply Schedule Appointments)
   1. formule : « Sur place — Showroom Paris Boulevard Voltaire » ou « Par téléphone »
   2. projet (facultatif) · 3. date & créneau · 4. coordonnées · 5. récapitulatif
   Créneaux : PB_SITE.appointments — durée 60 min, départ toutes les 30 min, dans les
   plages `hours` (≠ horaires d'ouverture), réservation au plus tard 24 h avant.
   Aucun envoi réseau.
   ?type=voltaire|telephone présélectionne la formule ; ?m=<showroom> idem (Voltaire),
   ou affiche un avis pour les showrooms sans réservation en ligne (Roquette, Balard).
   ========================================================================== */
PB.ready(() => {
  const { $, $$, esc, I } = PB;
  const S = window.PBS, F = window.PBF;
  const A = S.APPT;
  const form = $('[data-rdv]');
  const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const DSHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const DAYS_SHOWN = 21;
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const fromIso = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const longDate = (d) => `${S.DAYS[S.dayIdx(d)]} ${d.getDate() === 1 ? '1er' : d.getDate()} ${MONTHS[d.getMonth()]}`;
  const span = (m) => `${S.fmtMin(m)} – ${S.fmtMin(m + (A.duration || 60))}`;
  const durLabel = (A.duration || 60) % 60 ? `${A.duration} min` : `${(A.duration || 60) / 60} heure${A.duration > 60 ? 's' : ''}`;

  /* ---------- Formules (PB_SITE.appointments.types) ---------- */
  // Intitulés exacts du site en ligne (SSA) ; à défaut, ceux de data/site.js
  const LIVE_LABEL = { voltaire: 'Sur place — Showroom Paris Boulevard Voltaire', telephone: 'Par téléphone' };
  const types = (A.types || []).map(([key, label]) => {
    const store = S.bySlug(key);
    return {
      key, store, label: LIVE_LABEL[key] || label,
      // consignes affichées par le site en ligne après réservation
      info: store
        ? `Votre rendez-vous aura lieu au ${store.address.replace(/^(\d+\w?)\s+B/, '$1 b')}, ${store.zip}. Nous vous attendrons à l’heure convenue.`
        : 'Notre équipe vous contactera par téléphone à l’heure convenue pour votre rendez-vous.',
    };
  });
  const tVoltaire = types.find((t) => t.store);
  const fallbackImg = tVoltaire && tVoltaire.store.imgs[0] ? tVoltaire.store.imgs[0] : 'assets/img/site/premibel-magasin-voltaire.webp';
  const ICON_PHONE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 3.5h2.6l1.4 4.1-2 1.4a12 12 0 0 0 6.4 6.4l1.4-2 4.1 1.4v2.6a1.8 1.8 0 0 1-1.9 1.8A16.6 16.6 0 0 1 4.8 5.4a1.8 1.8 0 0 1 1.8-1.9z"/></svg>';

  $('[data-types]').innerHTML = types.map((t) => `
    <label class="opt opt--tile rv-type${t.store ? '' : ' rv-type--tel'}">
      <input type="radio" name="type" value="${esc(t.key)}" data-label="${esc(t.label)}">
      <span>
        <span class="rv-type__img">${t.store ? `<img src="${esc(t.store.imgs[0] || fallbackImg)}" alt="" loading="lazy">` : `<span class="rv-type__tel">${ICON_PHONE}</span>`}</span>
        <b>${esc(t.label)}</b>
        <small>${t.store ? `${esc(t.store.address)}, ${esc(t.store.zip)}${t.store.access ? ` · ${esc(t.store.access)}` : ''}` : 'Un conseiller vous appelle au numéro indiqué, à l’heure convenue.'}</small>
        <small class="rv-type__d">${S.ICON.clock}${durLabel}</small>
      </span>
    </label>`).join('');

  // Showrooms sans réservation en ligne sur le site actuel
  const noOnline = S.stores().filter((s) => s.type === 'Showroom' && !types.some((t) => t.key === s.slug));
  if (noOnline.length) {
    $('[data-others]').innerHTML = `<p class="rv-others__t">${noOnline.map((s) => esc(s.name)).join(' et ')}&#8239;: pas de réservation en ligne. Appelez directement le showroom pour convenir d’un passage.</p>
      <ul class="rv-others__l" role="list">${noOnline.map((s) => `<li><a class="act" href="${S.tel(s.phone)}">${S.ICON.phone}<span>${esc(s.name.replace(/^Showroom\s+/, ''))} · ${esc(s.phone)}</span></a></li>`).join('')}</ul>`;
  }

  const preKey = (PB.qs('type') || PB.qs('m') || '').toLowerCase();
  const preIn = preKey && form.querySelector(`input[name="type"][value="${CSS.escape(preKey)}"]`);
  if (preIn) preIn.checked = true;
  else {
    const askedStore = S.bySlug(preKey);
    if (askedStore && askedStore.type === 'Showroom') {
      const n = $('[data-notice]');
      n.innerHTML = `${S.ICON.info}<p>Le <b>${esc(askedStore.name)}</b> ne propose pas de réservation en ligne. Appelez-le au <a href="${S.tel(askedStore.phone)}">${esc(askedStore.phone)}</a>, ou réservez ci-dessous un rendez-vous${tVoltaire ? ` au ${esc(tVoltaire.store.name)}` : ''} ou par téléphone.</p>`;
      n.hidden = false;
    }
  }
  const type = () => types.find((t) => t.key === (form.querySelector('input[name="type"]:checked') || {}).value) || null;

  /* ---------- 3. Calendrier ---------- */
  const cal = $('[data-cal]');
  let built = false;
  function buildCal() {
    if (built) return;
    built = true;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const days = Array.from({ length: DAYS_SHOWN }, (_, k) => { const d = new Date(today); d.setDate(d.getDate() + k); return d; });
    const lead = S.dayIdx(days[0]);
    const m0 = MONTHS[days[0].getMonth()], m1 = MONTHS[days[days.length - 1].getMonth()];
    const yr = days[days.length - 1].getFullYear();
    const cells = days.map((d, k) => {
      const sl = S.apptSlots(d);
      const open = sl.length > 0;
      const showMonth = k === 0 || d.getDate() === 1;
      const why = open ? `${sl.length} créneau${sl.length > 1 ? 'x' : ''}` : S.apptOpenDay(d) ? 'réservation 24 h à l’avance' : 'pas de rendez-vous ce jour';
      return `<label class="cal__day${open ? '' : ' is-off'}${k === 0 ? ' is-today' : ''}"${k === 0 && lead ? ` style="grid-column-start:${lead + 1}"` : ''}>
        <input type="radio" name="day" value="${iso(d)}" ${open ? '' : 'disabled'} aria-label="${esc(`${longDate(d)} — ${why}`)}">
        <span><small>${DSHORT[S.dayIdx(d)]}</small><b>${d.getDate()}</b>${showMonth ? `<em>${MONTHS[d.getMonth()].slice(0, 4)}${MONTHS[d.getMonth()].length > 4 ? '.' : ''}</em>` : ''}${open ? '<i aria-hidden="true"></i>' : ''}</span>
      </label>`;
    }).join('');
    cal.innerHTML = `
      <div class="cal">
        <div class="cal__head"><b>${m0 === m1 ? m0 : `${m0} – ${m1}`} ${yr}</b><span class="muted">Heure de Paris · ${durLabel} par rendez-vous</span></div>
        <fieldset class="fgroup cal__fg" data-required data-msg="Choisissez une date.">
          <legend class="sr-only">Date du rendez-vous</legend>
          <div class="cal__dow" aria-hidden="true">${DSHORT.map((d) => `<span>${d}</span>`).join('')}</div>
          <div class="cal__grid">${cells}</div>
        </fieldset>
      </div>
      <div class="slots" data-slots aria-live="polite"></div>`;
    const first = cal.querySelector('input[name="day"]:not(:disabled)');
    if (!first) cal.insertAdjacentHTML('beforeend', '<p class="slots__empty">Aucun créneau disponible sur cette période&#8239;: appelez-nous au <a href="tel:+33147002510">01 47 00 25 10</a>.</p>');
    buildSlots();
    if (PB.motion) gsap.from($$('.cal__day', cal), { opacity: 0, y: 8, duration: .6, ease: 'expo.out', stagger: .014 });
  }

  function buildSlots(keepSlot) {
    const box = $('[data-slots]', cal); if (!box) return;
    const dv = (form.querySelector('input[name="day"]:checked') || {}).value;
    if (!dv) { box.innerHTML = '<p class="slots__empty">Sélectionnez un jour pour afficher les créneaux disponibles.</p>'; return; }
    const d = fromIso(dv);
    const sl = S.apptSlots(d);
    const am = sl.filter((m) => m < 13 * 60), pm = sl.filter((m) => m >= 13 * 60);
    const group = (title, arr) => (arr.length ? `<div class="slots__g"><p class="slots__t">${title}</p><div class="opts">${arr.map((m) => `<label class="opt slot"><input type="radio" name="slot" value="${m}" data-label="${esc(span(m))}" aria-label="${esc(`De ${span(m).replace(' – ', ' à ')}`)}"><span>${S.fmtMin(m)}<small>&nbsp;– ${S.fmtMin(m + (A.duration || 60))}</small></span></label>`).join('')}</div></div>` : '');
    box.innerHTML = `<fieldset class="fgroup" data-required data-msg="Choisissez un créneau horaire.">
      <legend class="slots__day">${longDate(d)}</legend>
      ${group('Matin', am)}${group('Après-midi', pm)}
    </fieldset>`;
    if (keepSlot) { const k = box.querySelector(`input[value="${keepSlot}"]`); if (k) k.checked = true; }
    if (PB.motion) gsap.from($$('.slot', box), { opacity: 0, y: 6, duration: .5, ease: 'expo.out', stagger: .015 });
  }

  /* ---------- Ticket latéral ---------- */
  const T = { img: $('[data-t-img]'), type: $('[data-t-type]'), project: $('[data-t-project]'), date: $('[data-t-date]'), tel: $('[data-t-tel]') };
  const pieces = () => F.picked(form, 'piece');
  const motif = () => (form.querySelector('input[name="motif"]:checked') || {}).value || '';
  const when = () => {
    const dv = (form.querySelector('input[name="day"]:checked') || {}).value, sv = (form.querySelector('input[name="slot"]:checked') || {}).value;
    if (!dv) return '';
    return `${longDate(fromIso(dv))}${sv ? `, de ${span(+sv).replace(' – ', ' à ')}` : ''}`;
  };
  const project = () => [pieces().join(', '), motif() && motif() !== 'Je ne sais pas encore' ? motif() : '', form.surface.value ? `${form.surface.value.replace('.', ',')} m²` : ''].filter(Boolean).join(' · ');
  function ticket() {
    const t = type();
    const set = (el, v) => { const nv = v || '—'; if (el.textContent !== nv) { el.textContent = nv; if (PB.motion) gsap.fromTo(el, { opacity: 0, y: 4 }, { opacity: 1, y: 0, duration: .45, ease: 'expo.out' }); } };
    set(T.type, t ? t.label : '');
    set(T.project, project());
    set(T.date, when());
    const img = t && t.store ? (t.store.imgs[0] || fallbackImg) : fallbackImg;
    if (!T.img.getAttribute('src').endsWith(img)) T.img.src = img;
    const phone = t && t.store ? t.store.phone : (window.PB_SITE || {}).phone || '01 47 00 25 10';
    T.tel.textContent = phone; T.tel.href = S.tel(phone);
  }

  /* ---------- 5. Récapitulatif ---------- */
  function recap() {
    const t = type(); const d = new FormData(form);
    const rows = [
      ['Formule', `${esc(t.label)}<small>${t.store ? `${esc(t.store.address)}, ${esc(t.store.zip)}` : 'Nous vous appelons au numéro indiqué'} · ${durLabel}</small>`, 0],
      ['Projet', project() ? esc(project()) : '<span class="muted">Non précisé</span>', 1],
      ['Date', `${esc(when())}<small>Heure de Paris</small>`, 2],
      ['Coordonnées', `${esc(d.get('nom'))}<small>${esc(d.get('email'))} · ${esc(d.get('tel'))}</small>`, 3],
    ];
    if (d.get('notes')) rows.push(['Notes', esc(d.get('notes')), 3]);
    $('[data-recap]').innerHTML = rows.map(([k, v, st]) => `<div><dt>${k}</dt><dd>${v}</dd><button type="button" class="recap__edit" data-goto="${st}" aria-label="Modifier : ${k}">Modifier</button></div>`).join('');
  }

  /* ---------- Parcours ---------- */
  F.bind(form);
  const st = F.stepper($('[data-stepper]', form), {
    onEnter(i) { if (i === 2) buildCal(); if (i === 4) recap(); },
  });
  form.addEventListener('change', (e) => {
    if (e.target.name === 'day') {
      buildSlots();
      const fg = e.target.closest('.fgroup'); if (fg) F.validateGroup(fg);
    }
    ticket();
  });
  form.addEventListener('input', (e) => { if (e.target.name === 'surface') ticket(); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (st.index < st.steps.length - 1) { st.steps[st.index].querySelector('[data-next]')?.click(); return; }
    const btn = form.querySelector('[type="submit"]');
    for (let k = 0; k < st.steps.length - 1; k++) {
      if (k === 2) buildCal();
      const bad = F.validateScope(st.steps[k]);
      if (bad) { F.nudge(btn); st.go(k); return; }
    }
    // le créneau a pu passer sous le délai de 24 h pendant la saisie
    const dv = form.querySelector('input[name="day"]:checked').value, sv = +form.querySelector('input[name="slot"]:checked').value;
    if (!S.apptSlots(fromIso(dv)).includes(sv)) {
      PB.toast('Ce créneau n’est plus réservable (24 h minimum à l’avance). Choisissez-en un autre.');
      built = false; buildCal(); st.go(2); return;
    }
    await F.busy(btn, 1100);
    const t = type(); const d = new FormData(form);
    $('[data-aside]').classList.add('is-done');
    const first = String(d.get('nom') || '').trim().split(/\s+/)[0];
    F.success(form, {
      title: `C’est noté${first ? `, ${esc(first)}` : ''}. <em>À bientôt.</em>`,
      text: `Votre rendez-vous «&#8239;${esc(t.label)}&#8239;» est demandé pour le <b>${esc(when().replace(/^./, (c) => c.toLowerCase()))}</b>. ${esc(t.info)} Une confirmation vous sera envoyée à ${esc(d.get('email'))}.`,
      extra: t.store
        ? `<dl class="recap fx-recap"><div><dt>Adresse</dt><dd>${esc(t.store.address)}, ${esc(t.store.zip)}${t.store.access ? `<small>${esc(t.store.access)}</small>` : ''}</dd></div><div><dt>Téléphone</dt><dd><a href="${S.tel(t.store.phone)}">${esc(t.store.phone)}</a></dd></div></dl>
          <div class="acts"><a class="act" href="${esc(t.store.maps)}" target="_blank" rel="noopener">${S.ICON.route}<span>Itinéraire</span></a><a class="btn btn--dark btn--sm" href="magasin.html?m=${t.store.slug}"><span>Voir la fiche du showroom</span>${I.arrow}</a></div>`
        : `<dl class="recap fx-recap"><div><dt>Nous vous appelons au</dt><dd>${esc(d.get('tel'))}</dd></div></dl>
          <div class="acts"><a class="btn btn--dark btn--sm" href="catalogue.html?c=parquet"><span>Parcourir nos parquets</span>${I.arrow}</a></div>`,
    });
  });

  ticket();
});
