/* ==========================================================================
   Plan du site — pages statiques + arborescence du catalogue (data/categories.js),
   fiches showroom et guides (data/site.js), fiche produit d'exemple (data/products.js)
   ========================================================================== */
PB.ready(async () => {
  const { $, $$, esc } = window.PBInfo;
  const S = window.PB_SITE || {};
  const root = $('[data-sitemap]'); if (!root) return;
  const li = (href, label, extra = '') => `<li><a href="${esc(href)}">${esc(label)}${extra}</a></li>`;

  // Showrooms & entrepôt
  $('[data-stores] ul').insertAdjacentHTML('beforeend', (S.stores || []).map((s) => li(`magasin.html?m=${s.slug}`, s.name, ` <small>${esc(s.city)}</small>`)).join(''));
  // Guides
  $('[data-guides] ul').insertAdjacentHTML('beforeend', (S.guides || []).map((g) => li(`guide.html?g=${g.slug}`, g.title)).join(''));

  // Catalogue : une colonne par catégorie racine, enfants imbriqués
  await PB.load('categories');
  const C = PB.categories();
  const kids = {};
  Object.values(C).forEach((c) => (kids[c.parent] ||= []).push(c));
  const byName = (a, b) => a.name.localeCompare(b.name, 'fr');
  const tree = (slug, depth = 0) => {
    const k = (kids[slug] || []).slice().sort(byName);
    if (!k.length || depth > 4) return '';
    return `<ul>${k.map((c) => `<li><a href="${PB.catUrl(c.slug)}">${esc(c.name)}${c.count ? ` <small>${c.count}</small>` : ''}</a>${tree(c.slug, depth + 1)}</li>`).join('')}</ul>`;
  };
  const ORDER = ['parquet', 'accessoires', 'isolation', 'panneaux-muraux', 'promotions'];
  const roots = (kids.accueil || []).slice().sort((a, b) => (ORDER.indexOf(a.slug) + 1 || 99) - (ORDER.indexOf(b.slug) + 1 || 99));
  const rooms = (kids.null || []).filter((c) => !['racine', 'non-classe'].includes(c.slug)).sort(byName);
  const catBox = $('[data-cats]');
  const blocks = roots.map((r) => `<div class="smap"><h2><a href="${PB.catUrl(r.slug)}">${esc(r.name)}</a>${r.count ? ` <small>${r.count} produits</small>` : ''}</h2>${tree(r.slug) || `<ul>${li(PB.catUrl(r.slug), `Voir ${r.name.toLowerCase()}`)}</ul>`}</div>`).join('')
    + (rooms.length ? `<div class="smap"><h2>Par pièce</h2><ul>${rooms.map((c) => li(PB.catUrl(c.slug), c.name, c.count ? ` <small>${c.count}</small>` : '')).join('')}</ul></div>` : '');
  catBox.insertAdjacentHTML('afterend', blocks);
  $('[data-cats-count]').textContent = `${Object.keys(C).length - 3} catégories`;

  const count = () => { $('[data-plan-count]').textContent = $$('a', root).length; };
  count();
  PB.motionIn(root);

  // Fiche produit d'exemple : premier produit illustré du catalogue (chargé en tâche de fond)
  PB.load('products').then(() => {
    const p = PB.products().find((x) => x.imgs && x.imgs.length && x.cats.includes('parquet')) || PB.products()[0];
    const a = $('[data-example-product]');
    if (p && a) { a.href = PB.productUrl(p); a.innerHTML = `Fiche produit <small>${esc(p.name)}</small>`; }
  }).catch(() => {});
});
