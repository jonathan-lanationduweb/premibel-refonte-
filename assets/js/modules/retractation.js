/* ==========================================================================
   Formulaire de rétractation UE (parité avec eu-withdrawal-button-for-woocommerce du site en ligne)
   3 écrans : formulaire → confirmation → succès. Maquette : aucun envoi réseau.
   ========================================================================== */
(() => {
  'use strict';
  const { esc, I } = PB;
  const MOTIFS = ['J’ai changé d’avis', 'J’ai trouvé un meilleur prix ailleurs', 'Commandé par erreur', 'La livraison prend trop de temps', 'Le produit ne correspond pas aux attentes', 'Autre'];
  let root, lastFocus, data = {};

  const screens = {
    form: () => `<h2 class="rt__title" id="rt-title">Se rétracter de la commande</h2>
      <p class="rt__lead">En vertu du droit de l’UE, vous avez le droit de vous rétracter de votre achat en ligne dans un délai de 14 jours. Veuillez renseigner les informations ci-dessous.</p>
      <form class="rt__form" novalidate>
        <div class="field"><input id="rt-order" name="order" placeholder=" " required inputmode="numeric" value="${esc(data.order || '')}"><label for="rt-order">Numéro de commande *</label></div>
        <div class="field"><input id="rt-mail" name="email" type="email" placeholder=" " required autocomplete="email" value="${esc(data.email || '')}"><label for="rt-mail">Adresse e-mail *</label></div>
        <div class="field"><input id="rt-name" name="name" placeholder=" " required autocomplete="name" value="${esc(data.name || '')}"><label for="rt-name">Votre nom *</label></div>
        <div class="field"><select id="rt-reason" name="reason"><option value="">— Sélectionnez un motif —</option>${MOTIFS.map((m) => `<option ${data.reason === m ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select><label for="rt-reason">Motif de rétractation (facultatif)</label></div>
        <fieldset class="rt__contact"><legend>Méthode de contact préférée pour la confirmation *</legend>
          <div class="seg"><label><input type="radio" name="contact" value="E-mail" ${data.contact !== 'Téléphone' ? 'checked' : ''}><span>E-mail</span></label><label><input type="radio" name="contact" value="Téléphone" ${data.contact === 'Téléphone' ? 'checked' : ''}><span>Téléphone</span></label></div>
        </fieldset>
        <div class="field"><input id="rt-iban" name="iban" placeholder=" " autocomplete="off" value="${esc(data.iban || '')}"><label for="rt-iban">Compte bancaire (IBAN) pour le remboursement (facultatif)</label></div>
        <p class="rt__help">Laissez vide pour recevoir votre remboursement via le moyen de paiement initial. Renseignez ce champ uniquement si vous avez payé par carte ou si vous souhaitez que le remboursement soit envoyé sur un autre compte.</p>
        <button class="btn btn--dark btn--block" type="submit"><span>Continuer</span>${I.arrow}</button>
      </form>`,
    confirm: () => `<h2 class="rt__title" id="rt-title">Vous vous rétractez de la commande #${esc(data.order)}</h2>
      <dl class="rt__recap">
        <div><dt>Nom</dt><dd>${esc(data.name)}</dd></div><div><dt>E-mail</dt><dd>${esc(data.email)}</dd></div>
        <div><dt>Motif</dt><dd>${esc(data.reason || 'Non précisé')}</dd></div><div><dt>Confirmation par</dt><dd>${esc(data.contact)}</dd></div>
        <div><dt>Remboursement</dt><dd>${data.iban ? `IBAN ${esc(data.iban.replace(/\s/g, '').replace(/^(.{4}).*(.{4})$/, '$1 •••• $2'))}` : 'Moyen de paiement initial'}</dd></div>
      </dl>
      <div class="rt__actions"><button class="btn btn--line" type="button" data-rt-back><span>Retour</span></button><button class="btn btn--accent" type="button" data-rt-confirm><span>Confirmer la rétractation</span></button></div>`,
    done: () => `<div class="form-success">${I.check}<h2 class="rt__title" id="rt-title">Demande de rétractation soumise</h2>
      <p class="muted">Votre demande de rétractation a été soumise avec succès. Vous recevrez bientôt un e-mail de confirmation avec des instructions complémentaires.</p>
      <button class="btn btn--dark" type="button" data-rt-close><span>Fermer</span></button></div>
      <p class="rt__demo">Maquette : aucune donnée n’est envoyée.</p>`,
  };

  function show(name) {
    const body = root.querySelector('.rt__body');
    const paint = () => { body.innerHTML = screens[name](); PB.frTypo(body); const f = body.querySelector('input, button'); if (f) f.focus(); };
    if (window.gsap && !PB.reduce) gsap.to(body, { opacity: 0, y: -8, duration: .15, onComplete: () => { paint(); gsap.fromTo(body, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .45, ease: 'expo.out' }); } });
    else paint();
  }
  function validate(form) {
    let ok = true;
    form.querySelectorAll('.field input[required]').forEach((i) => {
      const v = i.checkValidity(); const f = i.closest('.field'); f.classList.toggle('is-error', !v);
      let e = f.querySelector('.field__err'); if (!v) { if (!e) { e = document.createElement('p'); e.className = 'field__err'; f.appendChild(e); } e.textContent = i.type === 'email' && i.value ? 'Adresse e-mail invalide.' : 'Ce champ est requis.'; } else if (e) e.remove();
      if (!v && ok) { i.focus(); ok = false; }
    });
    const iban = form.iban.value.replace(/\s/g, '');
    if (iban && !/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/i.test(iban)) { PB.toast('IBAN invalide : vérifiez le format (ex. FR76 …).'); form.iban.focus(); ok = false; }
    return ok;
  }

  function build() {
    root = document.createElement('div'); root.className = 'rt';
    root.innerHTML = `<div class="rt__scrim" data-rt-close></div><div class="rt__dialog" role="dialog" aria-modal="true" aria-labelledby="rt-title"><button class="rt__x" type="button" aria-label="Fermer" data-rt-close>${I.close}</button><div class="rt__body"></div></div>`;
    document.body.appendChild(root);
    root.addEventListener('click', (e) => {
      if (e.target.closest('[data-rt-close]')) close();
      else if (e.target.closest('[data-rt-back]')) show('form');
      else if (e.target.closest('[data-rt-confirm]')) { const b = e.target.closest('button'); b.disabled = true; b.innerHTML = '<span>Envoi de la rétractation…</span>'; setTimeout(() => show('done'), 700); }
    });
    root.addEventListener('submit', (e) => {
      e.preventDefault(); const f = e.target;
      if (!validate(f)) return;
      data = { order: f.order.value.trim().replace(/^#/, ''), email: f.email.value.trim(), name: f.name.value.trim(), reason: f.reason.value, contact: f.contact.value, iban: f.iban.value.trim() };
      const b = f.querySelector('[type=submit]'); b.disabled = true; b.innerHTML = '<span>Validation de la commande…</span>';
      setTimeout(() => show('confirm'), 600);
    });
    root.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }
  function open() {
    if (!root) build();
    lastFocus = document.activeElement; data = {};
    root.classList.add('is-open'); document.documentElement.style.overflow = 'hidden'; PB.lenis && PB.lenis.stop();
    show('form');
  }
  function close() {
    root.classList.remove('is-open'); document.documentElement.style.overflow = ''; PB.lenis && PB.lenis.start();
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  if (!document.querySelector('link[href$="modules.css"]')) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'assets/css/modules.css'; document.head.appendChild(l); }
  window.PB_retractation = { open, close };
})();
