/* ==========================================================================
   Premibel — outils partagés « adresses » (magasins, magasin, contact, rendez-vous)
   Lecture seule de window.PB_SITE.stores : horaires, statut, créneaux, liens.
   API : window.PBS
   ========================================================================== */
(() => {
  'use strict';
  const SITE = window.PB_SITE || {};
  const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const NB = ' ';

  /* Liens « Laisser un avis Google » réels (fiches premibel.fr) */
  const REVIEW = {
    voltaire: 'https://search.google.com/local/writereview?placeid=ChIJIdxB3ftt5kcR3safLML7Low',
    roquette: 'https://search.google.com/local/writereview?placeid=ChIJ--tDQ_Rt5kcR71CJYZc7eaI',
    pantin: 'https://search.google.com/local/writereview?placeid=ChIJE4Rd60ts5kcR-LuTuZPgHSs',
  };

  const stores = () => (SITE.stores || []).map((s) => ({ ...s, imgs: s.imgs || [], review: REVIEW[s.slug] || null }));
  const bySlug = (slug) => stores().find((s) => s.slug === slug) || null;

  const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  const dayIdx = (d = new Date()) => (d.getDay() + 6) % 7;

  /** "10:00 – 13:00 · 14:30 – 18:30" → [[600,780],[870,1110]] */
  const ranges = (str) => {
    if (!str || /ferm/i.test(str)) return [];
    return str.split('·').map((r) => r.match(/(\d+):(\d+)\s*–\s*(\d+):(\d+)/)).filter(Boolean).map((m) => [+m[1] * 60 + +m[2], +m[3] * 60 + +m[4]]);
  };
  const dayRanges = (st, i) => (st.hours ? ranges(st.hours[i][1]) : null);

  /** 870 → "14 h 30" ; 600 → "10 h" */
  const fmtMin = (m) => { const h = Math.floor(m / 60), mm = m % 60; return `${h}${NB}h${mm ? `${NB}${String(mm).padStart(2, '0')}` : ''}`; };
  const fmtRanges = (rs) => (rs && rs.length ? rs.map(([a, b]) => `${fmtMin(a)} – ${fmtMin(b)}`).join(' · ') : 'Fermé');

  /** Statut détaillé : { open: true|false|null, label, detail } */
  function status(st, now = new Date()) {
    if (!st.hours) return { open: null, label: 'Horaires', detail: 'nous consulter par téléphone' };
    const today = dayIdx(now), mins = now.getHours() * 60 + now.getMinutes();
    const rs = dayRanges(st, today);
    const cur = rs.find(([a, b]) => mins >= a && mins < b);
    if (cur) {
      const soon = cur[1] - mins <= 30;
      return { open: true, soon, label: soon ? 'Ferme bientôt' : 'Ouvert', detail: `jusqu’à ${fmtMin(cur[1])}` };
    }
    const later = rs.find(([a]) => a > mins);
    if (later) return { open: false, label: 'Fermé', detail: `ouvre à ${fmtMin(later[0])}` };
    for (let k = 1; k <= 7; k++) {
      const i = (today + k) % 7, r = dayRanges(st, i);
      if (r.length) return { open: false, label: 'Fermé', detail: `ouvre ${k === 1 ? 'demain' : DAYS[i].toLowerCase()} à ${fmtMin(r[0][0])}` };
    }
    return { open: false, label: 'Fermé', detail: '' };
  }
  const statusHTML = (st, now) => {
    const s = status(st, now);
    const cls = s.open === null ? 'is-na' : s.open ? (s.soon ? 'is-soon' : 'is-open') : 'is-closed';
    return `<span class="st-pill ${cls}"><i aria-hidden="true"></i><b>${esc(s.label)}</b>${s.detail ? `<span> · ${esc(s.detail)}</span>` : ''}</span>`;
  };
  const todayHTML = (st) => (st.hours ? `Aujourd’hui : ${fmtRanges(dayRanges(st, dayIdx()))}` : 'Horaires : nous consulter');

  const weekHTML = (st) => {
    if (!st.hours) return '<p class="muted">Les horaires de ce showroom ne sont pas publiés en ligne : appelez-nous pour convenir d’un passage.</p>';
    const t = dayIdx();
    return `<table class="week"><caption class="sr-only">Horaires de la semaine</caption><tbody>${st.hours.map(([d, h], i) => {
      const rs = ranges(h);
      return `<tr class="${i === t ? 'is-today' : ''}${rs.length ? '' : ' is-off'}"${i === t ? ' aria-current="date"' : ''}><th scope="row">${esc(d)}${i === t ? ' <small>aujourd’hui</small>' : ''}</th><td>${fmtRanges(rs)}</td></tr>`;
    }).join('')}</tbody></table>`;
  };

  const tel = (p = '') => `tel:+33${p.replace(/\D/g, '').replace(/^0/, '')}`;

  /** Créneaux de rendez-vous (minutes) pour une date, à partir des horaires réels. */
  function slots(st, date, { step = 30, dur = 30, lead = 60 } = {}) {
    const rs = dayRanges(st, dayIdx(date));
    if (!rs) return null; // horaires inconnus
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const min = isToday ? now.getHours() * 60 + now.getMinutes() + lead : -1;
    const out = [];
    rs.forEach(([a, b]) => { for (let m = a; m + dur <= b; m += step) if (m >= min) out.push(m); });
    return out;
  }

  /* ----------------------------------------------------------------------
     Rendez-vous en ligne (window.PB_SITE.appointments — plages ≠ horaires d'ouverture)
     ---------------------------------------------------------------------- */
  const APPT = SITE.appointments || { types: [], duration: 60, step: 30, minNoticeHours: 24, hours: [] };
  /** Créneaux (minutes depuis minuit) d'une date : durée `duration`, départ toutes les `step` min,
      au plus tôt `minNoticeHours` après maintenant. */
  function apptSlots(date, now = new Date()) {
    const row = (APPT.hours || [])[dayIdx(date)];
    const rs = row ? ranges(row[1]) : [];
    const dur = APPT.duration || 60, step = APPT.step || 30;
    const earliest = now.getTime() + (APPT.minNoticeHours || 0) * 3600e3;
    const out = [];
    rs.forEach(([a, b]) => {
      for (let m = a; m + dur <= b; m += step) {
        const t = new Date(date); t.setHours(0, m, 0, 0);
        if (t.getTime() >= earliest) out.push(m);
      }
    });
    return out;
  }
  const apptOpenDay = (date) => { const row = (APPT.hours || [])[dayIdx(date)]; return !!(row && ranges(row[1]).length); };

  /* ----------------------------------------------------------------------
     Distances approximatives (recherche par code postal, sans géocodage réseau)
     Centres approximatifs : arrondissements de Paris, puis départements (préfectures).
     ---------------------------------------------------------------------- */
  const ARR = { 1: [48.8625, 2.3364], 2: [48.8683, 2.3428], 3: [48.863, 2.3601], 4: [48.8543, 2.3576], 5: [48.8445, 2.35], 6: [48.8491, 2.3328], 7: [48.8562, 2.3121], 8: [48.8727, 2.3125], 9: [48.877, 2.3375], 10: [48.8761, 2.3607], 11: [48.859, 2.38], 12: [48.84, 2.388], 13: [48.8283, 2.3622], 14: [48.8292, 2.3266], 15: [48.8401, 2.293], 16: [48.855, 2.27], 17: [48.8873, 2.3067], 18: [48.8925, 2.3484], 19: [48.8871, 2.3848], 20: [48.8634, 2.4012] };
  const DEP = { '01': [46.205, 5.226], '02': [49.564, 3.62], '03': [46.566, 3.333], '04': [44.092, 6.236], '05': [44.559, 6.079], '06': [43.71, 7.262], '07': [44.735, 4.599], '08': [49.773, 4.721], '09': [42.965, 1.607], 10: [48.297, 4.074], 11: [43.212, 2.353], 12: [44.35, 2.575], 13: [43.296, 5.37], 14: [49.182, -0.37], 15: [44.926, 2.44], 16: [45.648, 0.156], 17: [46.16, -1.151], 18: [47.081, 2.399], 19: [45.267, 1.77], 20: [42.3, 9.0], 21: [47.322, 5.041], 22: [48.514, -2.765], 23: [46.171, 1.871], 24: [45.184, 0.721], 25: [47.238, 6.024], 26: [44.933, 4.892], 27: [49.027, 1.151], 28: [48.444, 1.489], 29: [47.996, -4.097], 30: [43.837, 4.36], 31: [43.605, 1.444], 32: [43.646, 0.586], 33: [44.838, -0.579], 34: [43.611, 3.877], 35: [48.117, -1.678], 36: [46.811, 1.686], 37: [47.394, 0.685], 38: [45.188, 5.725], 39: [46.675, 5.555], 40: [43.894, -0.5], 41: [47.586, 1.335], 42: [45.44, 4.387], 43: [45.043, 3.885], 44: [47.218, -1.554], 45: [47.903, 1.909], 46: [44.448, 1.441], 47: [44.203, 0.616], 48: [44.518, 3.5], 49: [47.478, -0.563], 50: [49.116, -1.091], 51: [48.957, 4.365], 52: [48.111, 5.139], 53: [48.073, -0.77], 54: [48.692, 6.184], 55: [48.773, 5.16], 56: [47.658, -2.76], 57: [49.12, 6.176], 58: [46.99, 3.159], 59: [50.629, 3.057], 60: [49.43, 2.083], 61: [48.432, 0.091], 62: [50.291, 2.777], 63: [45.778, 3.087], 64: [43.295, -0.371], 65: [43.233, 0.078], 66: [42.699, 2.895], 67: [48.573, 7.752], 68: [48.079, 7.358], 69: [45.764, 4.836], 70: [47.623, 6.155], 71: [46.307, 4.828], 72: [48.006, 0.199], 73: [45.564, 5.918], 74: [45.899, 6.129], 75: [48.8566, 2.3522], 76: [49.443, 1.099], 77: [48.62, 2.93], 78: [48.8, 1.95], 79: [46.323, -0.459], 80: [49.894, 2.296], 81: [43.929, 2.148], 82: [44.018, 1.355], 83: [43.124, 5.928], 84: [43.949, 4.806], 85: [46.67, -1.426], 86: [46.58, 0.34], 87: [45.833, 1.262], 88: [48.172, 6.45], 89: [47.798, 3.567], 90: [47.64, 6.863], 91: [48.58, 2.3], 92: [48.84, 2.25], 93: [48.91, 2.47], 94: [48.78, 2.46], 95: [49.08, 2.17] };
  /** "75015" → { lat, lng, label } ; "93" → centre du département ; null si inconnu (ex. outre-mer). */
  function geoPostal(q) {
    const d = String(q).replace(/\s/g, '');
    if (!/^\d{2}(\d{3})?$/.test(d)) return null;
    if (/^75\d{3}$/.test(d)) {
      const n = d === '75116' ? 16 : +d.slice(3);
      if (ARR[n]) return { lat: ARR[n][0], lng: ARR[n][1], label: `Paris ${n}${n === 1 ? 'er' : 'e'}` };
    }
    const dep = d.slice(0, 2), c = DEP[dep] || DEP[+dep];
    return c ? { lat: c[0], lng: c[1], label: d.length === 2 ? `département ${dep}` : d } : null;
  }
  /** Distance à vol d'oiseau en km. */
  const distKm = (a, b) => {
    const R = 6371, r = Math.PI / 180;
    const dLa = (b.lat - a.lat) * r, dLo = (b.lng - a.lng) * r;
    const h = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLo / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };
  const fmtKm = (k) => (k < 10 ? `${k.toFixed(1).replace('.', ',')}${NB}km` : `${Math.round(k)}${NB}km`);

  /* ----------------------------------------------------------------------
     Carte Leaflet 1.9.4 (tuiles OpenStreetMap) — chargée à la demande
     ---------------------------------------------------------------------- */
  let leafletP = null;
  const addCss = (href, integrity) => {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href;
    if (integrity) { l.integrity = integrity; l.crossOrigin = ''; }
    document.head.appendChild(l);
  };
  const addJs = (src, integrity) => new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = src; s.async = true;
    if (integrity) { s.integrity = integrity; s.crossOrigin = ''; }
    s.onload = () => (window.L ? res(window.L) : rej(new Error('Leaflet absent')));
    s.onerror = () => { s.remove(); rej(new Error(`échec ${src}`)); };
    document.head.appendChild(s);
  });
  function leaflet() {
    if (window.L) return Promise.resolve(window.L);
    if (leafletP) return leafletP;
    addCss('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=');
    leafletP = addJs('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=')
      .catch(() => { addCss('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'); return addJs('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'); })
      .catch((e) => { leafletP = null; throw e; });
    return leafletP;
  }
  const isWarehouse = (s) => /entrep/i.test(s.type || '');
  /** Marqueur maison : goutte rouge (showroom) ou goutte encre carrée (entrepôt). */
  const pinIcon = (L, s, on = false) => L.divIcon({
    className: 'pb-pin-wrap',
    html: `<span class="pb-pin${isWarehouse(s) ? ' pb-pin--wh' : ''}${on ? ' is-on' : ''}"><i></i></span>`,
    iconSize: [34, 42], iconAnchor: [17, 40], popupAnchor: [0, -38],
  });
  const tiles = (L) => L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, subdomains: 'abc',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
  });

  /* Icônes fines (complément de PB.I) */
  const ICON = {
    phone: '<svg viewBox="0 0 24 24"><path d="M6.6 3.5h2.6l1.4 4.1-2 1.4a12 12 0 0 0 6.4 6.4l1.4-2 4.1 1.4v2.6a1.8 1.8 0 0 1-1.9 1.8A16.6 16.6 0 0 1 4.8 5.4a1.8 1.8 0 0 1 1.8-1.9z"/></svg>',
    pin: '<svg viewBox="0 0 24 24"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/></svg>',
    route: '<svg viewBox="0 0 24 24"><path d="M12 3l9 9-9 9-9-9z"/><path d="M9.5 13.5V11h5m-2-2l2 2-2 2"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
    mail: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4 7l8 6 8-6"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z"/></svg>',
    cal: '<svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg>',
    info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8v.01"/></svg>',
    metro: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M8 16V8l4 5 4-5v8"/></svg>',
    clip: '<svg viewBox="0 0 24 24"><path d="M20 11.5l-7.8 7.8a5 5 0 0 1-7.1-7.1l8.2-8.2a3.4 3.4 0 0 1 4.8 4.8l-8.1 8.1a1.7 1.7 0 0 1-2.4-2.4l7.4-7.4"/></svg>',
  };

  window.PBS = { stores, bySlug, DAYS, dayIdx, ranges, dayRanges, fmtMin, fmtRanges, status, statusHTML, todayHTML, weekHTML, tel, slots, ICON, esc,
    APPT, apptSlots, apptOpenDay, geoPostal, distKm, fmtKm, leaflet, pinIcon, tiles, isWarehouse };
})();
