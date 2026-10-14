/* ==========================================================================
   BANNIÈRES MENSUELLES — page d'accueil
   --------------------------------------------------------------------------
   Chaque mois, ajoutez une entrée (ou utilisez l'outil admin-bannieres.html
   qui génère ce fichier). La bannière s'affiche automatiquement entre
   `debut` et `fin` inclus. Si plusieurs sont actives, elles défilent.
   Si aucune n'est active, la bannière `permanente: true` prend le relais.

   mode "compose" : bannière construite par le site (texte net, responsive,
                    produit en promotion mis en avant, compte à rebours).
   mode "image"   : votre visuel Canva tel quel (+ version mobile optionnelle).

   Aperçu d'une date : index.html?date=2026-11-15
   ========================================================================== */
window.PB_BANNIERES = [
  {
    id: 'saison-octobre-2026',
    mode: 'compose',
    debut: '2026-10-01',
    fin: '2026-10-13',
    surtitre: 'Du 1er au 13 octobre',
    accroche: 'Le bois dans sa plus belle',
    titre: 'Saison',
    texte: 'Des remises exclusives sur nos parquets aux teintes chaleureuses.',
    image: 'assets/img/journal/reconnaitre-la-bonne-qualite-dun-parquet.webp',
    produit: 'CHENF36005_1',
    cta: { label: 'Découvrir les offres', href: 'catalogue.html?c=promotions' },
    annonce: 'Saison du bois — remises exclusives jusqu’au 13 octobre',
  },
  {
    id: 'motifs-octobre-2026',
    mode: 'compose',
    debut: '2026-10-14',
    fin: '2026-10-31',
    surtitre: 'Jusqu’au 31 octobre',
    accroche: 'Les motifs d’exception',
    titre: 'Point de Hongrie',
    texte: 'Le chevron des intérieurs parisiens, jusqu’à −39 % sur une sélection.',
    image: 'assets/img/journal/parquet-en-point-de-hongrie.webp',
    produit: 'POINF39026',
    cta: { label: 'Voir la sélection', href: 'catalogue.html?c=point-de-hongrie' },
    annonce: 'Point de Hongrie : jusqu’à −39 % jusqu’au 31 octobre',
  },
  {
    id: 'novembre-2026',
    mode: 'compose',
    debut: '2026-11-01',
    fin: '2026-11-30',
    surtitre: 'Tout le mois de novembre',
    accroche: 'Le parquet du mois',
    titre: 'Chêne Colza',
    texte: 'Notre contrecollé best-seller à prix exceptionnel : −61 % sur le Chêne Colza 150×15.',
    image: 'assets/img/journal/tout-savoir-sur-le-parquet-massif.webp',
    produit: 'CHENF36014',
    cta: { label: 'J’en profite', href: 'produit.html?ref=CHENF36014' },
    annonce: 'Parquet du mois : Chêne Colza à −61 %',
  },
  {
    id: 'exemple-visuel-canva',
    mode: 'image',
    debut: '2026-12-01',
    fin: '2026-12-31',
    image: 'assets/img/bannieres/Bannieres-Homepage-6.png',
    imageMobile: '',
    alt: 'Saison — Le bois dans sa plus belle saison. Remises exclusives sur nos parquets aux teintes chaleureuses.',
    lien: 'catalogue.html?c=promotions',
    annonce: 'Exemple : bannière en image (visuel Canva)',
  },
  {
    id: 'permanente',
    permanente: true,
    mode: 'compose',
    surtitre: 'Créateur de tendances depuis 33 ans',
    accroche: 'Parquets massifs, contrecollés',
    titre: 'Premibel',
    texte: '+700 références en stock, deux showrooms à Paris 11e et un entrepôt à Pantin.',
    image: 'assets/img/site/site-internet-premibel-10.webp',
    produit: 'POINF36005',
    cta: { label: 'Explorer le catalogue', href: 'catalogue.html?c=parquet' },
    annonce: 'Paiement en 2×, 3× et 4× sans frais · Click & Collect disponible',
  },
];
