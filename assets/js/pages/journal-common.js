/* ==========================================================================
   Journal — utilitaires partagés (journal.html + article.html)
   Dépend de : data/post-themes.js (window.PB_POST_THEMES), core.js (window.PB)
   API : window.PBJ
   ========================================================================== */
(() => {
  'use strict';
  const T = window.PB_POST_THEMES || { themes: [], bySlug: {} };
  const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* Un article source n'a pas d'image à la une : visuel neutre cohérent avec son sujet (chêne huilé). */
  const FALLBACK_IMG = { 'chene-huile-ou-verni': 'assets/img/journal/parquet-massif-chene-huile.webp' };
  const DEFAULT_IMG = 'assets/img/site/lames-droites.webp';
  /* Titre source mal typographié (tiret, accent, capitales) : correction d'affichage uniquement. */
  const TITLE_FIX = { 'sol-stratifie-choix-pose-entretien-prix': 'Sol stratifié : choix, pose, entretien, prix' };
  const titleOf = (p) => TITLE_FIX[p.slug] || p.title;

  const fmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const fmtShort = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric' });
  const norm = (s = '') => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  /** Typographie française : apostrophe courbe, espace insécable avant : ; ? ! */
  const typo = (s = '') => String(s)
    .replace(/'/g, '’')
    .replace(/\s+([:;?!»])/g, '\u00a0$1')
    .replace(/«\s+/g, '«\u00a0');

  /** Extrait propre : coupé au dernier mot entier, points de suspension. */
  const excerpt = (p, max = 180) => {
    let t = (p.excerpt || '').replace(/\s+/g, ' ').trim();
    if (t.length > max) t = t.slice(0, max);
    else if (/[.!?…]$/.test(t)) return typo(t);
    return typo(t.replace(/[\s,;:–-]+\S*$/, '').replace(/[,;:]$/, '')) + '…';
  };

  const themeOf = (slug) => {
    const k = (T.bySlug[slug] || [])[0];
    return T.themes.find((t) => t.key === k) || null;
  };

  const PBJ = window.PBJ = {
    themes: T.themes,
    themeKeys: (slug) => T.bySlug[slug] || [],
    themeOf,
    themeByKey: (k) => T.themes.find((t) => t.key === k) || null,
    date: (iso) => fmt.format(new Date(`${iso}T12:00:00`)),
    dateShort: (iso) => fmtShort.format(new Date(`${iso}T12:00:00`)),
    img: (p) => p.img || FALLBACK_IMG[p.slug] || DEFAULT_IMG,
    url: (p) => `article.html?a=${encodeURIComponent(p.slug)}`,
    norm, typo, excerpt, esc, titleOf,
    readTime: (p) => `${p.minutes || 1} min de lecture`,

    /** Carte d'article. variant : lg | md | sm | half | note | row */
    card(p, variant = 'sm', { eager = false, i = 0 } = {}) {
      const th = themeOf(p.slug);
      const meta = `<span class="jcard__meta">${th ? `<span class="jcard__theme">${esc(th.label)}</span>` : ''}<span>${esc(PBJ.date(p.date))}</span><span>${p.minutes || 1} min</span></span>`;
      if (variant === 'note') {
        return `<article class="jcard jcard--note reveal" style="--i:${i}">
          ${meta}
          <h3 class="jcard__title"><a href="${PBJ.url(p)}">${esc(typo(titleOf(p)))}</a></h3>
          <p class="jcard__excerpt">${esc(excerpt(p, 220))}</p>
          <span class="jcard__more" aria-hidden="true">Lire l’article <span>→</span></span>
        </article>`;
      }
      return `<article class="jcard jcard--${variant} reveal" style="--i:${i}">
        <div class="jcard__media"><img src="${esc(PBJ.img(p))}" alt="" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"></div>
        <div class="jcard__body">
          ${meta}
          <h3 class="jcard__title"><a href="${PBJ.url(p)}">${esc(typo(titleOf(p)))}</a></h3>
          ${variant === 'lg' || variant === 'half' ? `<p class="jcard__excerpt">${esc(excerpt(p, variant === 'lg' ? 200 : 150))}</p>` : ''}
        </div>
      </article>`;
    },
  };
})();
