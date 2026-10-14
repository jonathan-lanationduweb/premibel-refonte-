/* ==========================================================================
   Paiement en plusieurs fois — simulateur Alma 2× / 3× / 4× (sans frais)
   Montant saisi TTC ; éligibilité affichée d'après premibel.fr :
   dès 200 € d'achat HT, jusqu'à 4 000 € selon les conditions Alma.
   ========================================================================== */
PB.ready(() => {
  const { $, $$, tweenNumber } = window.PBInfo;
  const root = $('.sim'); if (!root) return;

  const MIN_HT = 200, MAX = 4000, TVA = 1.2, MIN_TTC = MIN_HT * TVA;
  const input = $('[data-sim-input]'), range = $('[data-sim-range]'), elig = $('[data-sim-elig]');
  const plans = $$('.plan', root), big = $('[data-sched-big]'), cap = $('[data-sched-cap]'), bars = $('[data-bars]');
  const nf = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const money = (v) => `${nf.format(Math.max(0, v))} €`;
  let n = 3;

  /** Répartit le montant en n échéances au centime ; le reliquat va sur la première. */
  const split = (total, k) => {
    const cents = Math.round(total * 100), base = Math.floor(cents / k);
    return Array.from({ length: k }, (_, i) => (i === 0 ? cents - base * (k - 1) : base) / 100);
  };

  const buildBars = () => {
    bars.innerHTML = Array.from({ length: n }, (_, i) => `<div class="sbar"><span class="sbar__t">Échéance ${i + 1}</span><span class="sbar__track"><span></span></span><span class="sbar__v num" data-bar-v>—</span></div>`).join('');
    // animation d'entrée : la jauge cumulée se remplit
    requestAnimationFrame(() => requestAnimationFrame(() => $$('.sbar__track span', bars).forEach((s, i) => { s.style.transform = `scaleX(${(i + 1) / n})`; s.style.transitionDelay = `${i * 60}ms`; })));
  };

  const render = () => {
    const total = Math.max(0, parseFloat(String(input.value).replace(',', '.')) || 0);
    const ok = total >= MIN_TTC && total <= MAX;
    root.classList.toggle('is-ineligible', !ok);

    // cartes 2× / 3× / 4×
    plans.forEach((p) => tweenNumber($('[data-plan-v]', p), split(total, +p.dataset.n)[0], money, 650));
    const parts = split(total, n);
    tweenNumber(big, parts[0], (v) => money(v), 700);
    big.dataset.n = n;
    cap.textContent = `${n} échéances · total ${money(total)} · 0 € de frais`;
    $$('[data-bar-v]', bars).forEach((el, i) => tweenNumber(el, parts[i] || 0, money, 650));

    // message d'éligibilité
    elig.classList.toggle('is-warn', !ok && total > 0);
    if (total === 0) elig.textContent = 'Saisissez le montant de votre commande pour estimer vos échéances.';
    else if (total < MIN_TTC) elig.textContent = `Le paiement en plusieurs fois est possible dès 200 € d’achat HT, soit ${money(MIN_TTC)} TTC. Il vous manque ${money(MIN_TTC - total)}.`;
    else if (total > MAX) elig.textContent = 'Au-delà de 4 000 €, le paiement en plusieurs fois dépend des conditions Alma. Contactez-nous pour étudier votre commande.';
    else elig.textContent = 'Votre commande semble éligible : l’option Alma vous sera proposée au moment du paiement, sous réserve d’acceptation.';
  };

  const setRange = () => {
    const v = Math.min(+range.max, Math.max(0, parseFloat(input.value) || 0));
    range.value = v;
    range.style.setProperty('--p', `${(v / +range.max) * 100}%`);
  };

  const select = (k, focus) => {
    n = k;
    plans.forEach((p) => { const on = +p.dataset.n === k; p.setAttribute('aria-checked', on); p.tabIndex = on ? 0 : -1; if (on && focus) p.focus(); });
    buildBars(); render();
  };

  input.addEventListener('input', () => { setRange(); render(); });
  input.addEventListener('blur', () => { const v = parseFloat(input.value); input.value = Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0; setRange(); render(); });
  range.addEventListener('input', () => { input.value = range.value; setRange(); render(); });
  $$('[data-preset]').forEach((b) => b.addEventListener('click', () => { input.value = b.dataset.preset; setRange(); render(); }));
  plans.forEach((p) => p.addEventListener('click', () => select(+p.dataset.n)));
  // radiogroup : flèches gauche/droite
  $('[data-plans]').addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    e.preventDefault();
    const order = [2, 3, 4], i = order.indexOf(n) + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1);
    select(order[(i + 3) % 3], true);
  });

  setRange(); select(3);
});
