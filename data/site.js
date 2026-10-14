/* Données éditoriales du site (reprises de premibel.fr). Modifiables à la main. */
window.PB_SITE = {
  phone: '01 47 00 25 10',
  mobile: '06 52 46 02 00', // WhatsApp conseiller
  whatsapp: 'https://api.whatsapp.com/send/?phone=33652460200&text=Bonjour%2C%20j%E2%80%99ai%20besoin%20d%E2%80%99un%20conseil%20concernant%20un%20parquet%20Premibel.',
  email: 'contact@premibel.fr',
  emailVad: 'vad@premibel.fr',
  socials: {
    facebook: 'https://www.facebook.com/profile.php?id=61553843861032',
    pinterest: 'https://fr.pinterest.com/premibelfr/',
    tiktok: 'https://www.tiktok.com/@premibel_parquets',
    instagram: 'https://www.instagram.com/premibel.parquet/',
    linkedin: 'https://fr.linkedin.com/company/premibel-parquet',
  },
  /* Messages de la barre d'annonce (repris du site en ligne, cliquables).
     Le message de la bannière du mois (data/bannieres.js → annonce) s'ajoute en tête. */
  announces: [
    ['Payez en 2×, 3× ou 4× avec Alma jusqu’à 4 000 €, sans frais cachés', 'paiement.html'],
    ['Livraison gratuite dès 1 000 € HT d’achat en France métropolitaine', 'livraison.html'],
    ['Quinzaine du patron : jusqu’à −50 %', 'catalogue.html?c=promotions'],
    ['Click & Collect à l’entrepôt de Pantin', 'livraison.html'],
  ],
  usp: ['Paiement en 2×, 3× et 4× sans frais', 'Click & Collect disponible', 'Livraison offerte dès 1 000 € HT*', '+700 références en stock'],
  /* Délais (bandeau « Vos livraisons, à votre rythme » du site en ligne, fiches produit et commande) */
  delivery: {
    title: 'Vos livraisons, à votre rythme',
    text: 'Le transporteur vous contacte pour choisir avec vous le créneau le plus adapté.',
    zones: [['Île-de-France', '2 à 5 jours'], ['France', '5 à 8 jours'], ['Union européenne', 'environ 10 jours']],
    note: 'Expédition à partir de 2 à 5 jours selon votre adresse de livraison. Livraison sur rendez-vous.',
  },

  /* ---------------- Adresses (source : API /wp-json/custom/v1/magasins du site en ligne) ---------------- */
  stores: [
    {
      slug: 'voltaire', type: 'Showroom', name: 'Showroom Voltaire', city: 'Paris 11e',
      address: '78 Boulevard Voltaire', zip: '75011 Paris', phone: '01 47 00 25 10', lat: 48.860984, lng: 2.374455,
      access: 'Métro Saint-Ambroise (ligne 9)', rdv: true,
      hours: [['Lundi', '14:30 – 18:30'], ['Mardi', '10:00 – 13:00 · 14:30 – 18:30'], ['Mercredi', '10:00 – 13:00 · 14:30 – 18:30'], ['Jeudi', '10:00 – 13:00 · 14:30 – 18:30'], ['Vendredi', '10:00 – 13:00 · 14:30 – 18:30'], ['Samedi', '11:00 – 13:00 · 14:30 – 18:30'], ['Dimanche', 'Fermé']],
      imgs: ['assets/img/site/showroom-voltaire.webp', 'assets/img/site/premibel-magasin-voltaire.webp', 'assets/img/site/premibel-magasin-paris-11-voltaire.webp', 'assets/img/journal/parquet-de-qualite-a-petit-prix-chez-premibel-parquet-1.webp'],
      maps: 'https://www.google.com/maps/search/?api=1&query=Premibel+Parquet+78+Boulevard+Voltaire+75011+Paris',
      embed: 'https://www.google.com/maps?q=78+Boulevard+Voltaire+75011+Paris&output=embed',
      intro: 'Chaque showroom vous permet de voir, toucher et comparer les différentes essences de bois, finitions et styles, afin de faire le meilleur choix pour votre intérieur.',
    },
    {
      slug: 'roquette', type: 'Showroom', name: 'Showroom Roquette', city: 'Paris 11e',
      address: '170 Rue de la Roquette', zip: '75011 Paris', phone: '06 63 37 49 13', lat: 48.859071, lng: 2.386138,
      hours: [['Lundi', '14:30 – 18:30'], ['Mardi', '10:00 – 13:00 · 14:30 – 18:30'], ['Mercredi', '10:00 – 13:00 · 14:30 – 18:30'], ['Jeudi', '10:00 – 13:00 · 14:30 – 18:30'], ['Vendredi', '10:00 – 13:00 · 14:30 – 18:30'], ['Samedi', 'Fermé'], ['Dimanche', 'Fermé']],
      imgs: ['assets/img/site/showroom-roquette.webp', 'assets/img/journal/parquet-de-qualite-a-petit-prix-chez-premibel-parquet-1.webp'],
      maps: 'https://www.google.com/maps/search/?api=1&query=Premibel+170+Rue+de+la+Roquette+75011+Paris',
      embed: 'https://www.google.com/maps?q=170+Rue+de+la+Roquette+75011+Paris&output=embed',
      intro: 'Chaque showroom vous permet de voir, toucher et comparer les différentes essences de bois, finitions et styles, afin de faire le meilleur choix pour votre intérieur.',
    },
    {
      slug: 'balard', type: 'Showroom', name: 'Showroom Balard', city: 'Paris 15e',
      address: '38b Rue Balard', zip: '75015 Paris', phone: '06 61 17 12 12', lat: 48.842768, lng: 2.277402,
      hours: [['Lundi', 'Fermé'], ['Mardi', '10:00 – 13:00 · 14:30 – 18:30'], ['Mercredi', '10:00 – 13:00 · 14:30 – 18:30'], ['Jeudi', '10:00 – 13:00 · 14:30 – 18:30'], ['Vendredi', '10:00 – 13:00 · 14:30 – 18:30'], ['Samedi', '11:00 – 13:00 · 14:30 – 18:30'], ['Dimanche', 'Fermé']],
      imgs: ['assets/img/site/showroom-balard.webp'],
      maps: 'https://www.google.com/maps/search/?api=1&query=38b+Rue+Balard+75015+Paris',
      embed: 'https://www.google.com/maps?q=38b+Rue+Balard+75015+Paris&output=embed',
      intro: 'Nos équipes vous accueillent pour vous conseiller sur le choix de votre parquet parmi une large sélection de références.',
    },
    {
      slug: 'pantin', type: 'Entrepôt', name: 'Entrepôt Pantin', city: 'Pantin',
      address: '110 bis Av. du Général Leclerc, Bât. 5 RDC', zip: '93500 Pantin', phone: '09 84 25 90 89', lat: 48.899236, lng: 2.409169,
      hours: [['Lundi', '9:00 – 13:00 · 14:30 – 18:00'], ['Mardi', '9:00 – 13:00 · 14:30 – 18:00'], ['Mercredi', '9:00 – 13:00 · 14:30 – 18:00'], ['Jeudi', '9:00 – 13:00 · 14:30 – 18:00'], ['Vendredi', '9:00 – 13:00 · 14:30 – 18:00'], ['Samedi', '9:00 – 13:00 · 14:30 – 18:00'], ['Dimanche', 'Fermé']],
      imgs: ['assets/img/site/entrepot-pantin.webp', 'assets/img/site/premibel-parquet-pantin.webp', 'assets/img/site/premibel-pantin-entrepot.webp', 'assets/img/site/premibel-parquet-pantin-entrepot.webp'],
      maps: 'https://www.google.com/maps/search/?api=1&query=Premibel+110+bis+Avenue+du+G%C3%A9n%C3%A9ral+Leclerc+93500+Pantin',
      embed: 'https://www.google.com/maps?q=110+bis+Avenue+du+General+Leclerc+93500+Pantin&output=embed',
      intro: 'Nos entrepôts et points de retrait en Île-de-France vous garantissent une disponibilité rapide des produits en stock et un service de proximité.',
    },
  ],

  /* Rendez-vous (site en ligne : Simply Schedule Appointments) : sur place à Voltaire ou par téléphone,
     créneaux de 60 min toutes les 30 min, réservation au plus tard 24 h avant. */
  appointments: {
    types: [['voltaire', 'Sur place - Showroom Paris Boulevard Voltaire'], ['telephone', 'Par téléphone']],
    duration: 60, step: 30, minNoticeHours: 24,
    hours: [['Lundi', '14:30 – 19:00'], ['Mardi', '10:00 – 13:00 · 14:30 – 19:00'], ['Mercredi', '10:00 – 13:00 · 14:30 – 19:00'], ['Jeudi', '10:00 – 13:00 · 14:30 – 19:00'], ['Vendredi', '10:00 – 13:00'], ['Samedi', '11:00 – 13:00 · 14:30 – 19:30'], ['Dimanche', 'Fermé']],
  },

  /* ---------------- Avis Google (réels, widget Trustindex de premibel.fr) ---------------- */
  reviewsSummary: { label: 'Bien', count: 95, source: 'Google' },
  reviews: [
    { name: 'Marie-Noelle B', text: 'Formidable le vendeur Daniel et la vendeuse Esther sont professionnels et de bon conseil. Je recommande.' },
    { name: 'Gaétan C', text: 'Très bon fournisseur, j’achète mon parquet ici depuis des années notamment pour mes hôtels et j’en suis très content.' },
    { name: 'Pioli m', text: 'Excellent service et accompagnement personnalisé. Je recommande vivement Premibel Voltaire pour tous vos projets de parquet ! Cette entreprise parisienne se distingue par la qualité de ses conseils et son accompagnement personnalisé. Pour notre chantier à Arcachon, ils ont même pris en charge le transport gratuitement.' },
    { name: 'Maha b', text: 'Cela fait maintenant deux ans que j’ai été accompagnée par cette équipe exceptionnelle dans le cadre de mes travaux. Ils ont su me conseiller avec beaucoup de pertinence, sans jamais pousser à la vente. Je recommande les yeux fermés !' },
    { name: 'Jeremie L', text: 'J’ai acheté mon parquet (cumaru), très content du résultat, super qualité ! Bon service et arrangeant, je recommande !' },
    { name: 'Vincent G', text: 'Tous les parquets de mon domicile proviennent de chez Premibel (merbau, chêne de Madagascar, cumaru, stratifié) et sont d’excellente qualité. Le seul petit souci, lié à la pose, a été réglé avec une grande réactivité par leur SAV. Je recommande Premibel à 100 % !' },
    { name: 'Mikaëlle', text: 'Gammes de choix large. Parquets de qualité avec une sous-couche Dynachoc bien classée au niveau écologie. L’équipe met tout en œuvre pour satisfaire ses clients.' },
    { name: 'Philippe Z', text: 'Super équipe, top conseil.' },
    { name: 'Al L', text: 'Des solutions acoustiques uniques avec des performances très élevées, et toujours de bons conseils. J’ai utilisé plusieurs fois le système Dynachoc (patins + OSB + parquet) sans aucune nuisance pour l’appartement du dessous.' },
  ],

  /* ---------------- Recherches populaires ---------------- */
  topSearches: [
    ['Parquet massif', 'catalogue.html?c=parquet-massif'],
    ['Parquet exotique', 'catalogue.html?c=massif-en-bois-exotique'],
    ['Parquet bambou', 'catalogue.html?c=parquet-bambou-massif'],
    ['Sous-couches', 'catalogue.html?c=sous-couche'],
    ['Sol stratifié', 'catalogue.html?c=parquet-sol-stratifie'],
    ['Dalles de Versailles', 'catalogue.html?c=parquet-flottant-versailles'],
    ['Lames de terrasse', 'catalogue.html?c=lames-de-terrasse'],
    ['Point de Hongrie', 'catalogue.html?c=point-de-hongrie'],
  ],

  /* ---------------- Services ---------------- */
  services: [
    ['Devis gratuit en ligne et en showroom', 'devis.html'],
    ['Des experts disponibles 6j/7', 'contact.html'],
    ['Prise de rendez-vous avec nos experts', 'rendez-vous.html'],
    ['Livraison gratuite* ou Click & Collect', 'livraison.html'],
    ['Paiement jusqu’à 4× sans frais', 'paiement.html'],
    ['Espace dédié aux professionnels', 'pro.html'],
  ],

  /* ---------------- Guide d'achat ---------------- */
  guides: [
    { slug: 'types-parquets', title: 'Les types de parquet', kicker: 'Massif, contrecollé, stratifié' },
    { slug: 'types-pose', title: 'Les types de pose', kicker: 'Flottante, collée, clouée' },
    { slug: 'types-piece', title: 'Les types de pièce', kicker: 'Salon, cuisine, salle de bains' },
    { slug: 'essences', title: 'Les essences', kicker: 'Chêne, teck, bambou, exotiques' },
    { slug: 'motifs-parquet', title: 'Les motifs', kicker: 'Hongrie, bâton rompu, Versailles' },
    { slug: 'teintes', title: 'Les teintes', kicker: 'Clair, naturel, miel, foncé' },
    { slug: 'finitions-parquet', title: 'Les finitions', kicker: 'Huilé, verni, brut' },
    { slug: 'parquets-professionnels', title: 'Les parquets pour professionnels', kicker: 'Hôtels, bureaux, commerces' },
  ],

  /* ---------------- Méga-menu (arborescence du site en ligne) ----------------
     links : [libellé, slug de catégorie | 'configurateur' | URL .html, niveau (2 = sous-entrée)] */
  menu: [
    { label: 'Promotions', href: 'catalogue.html?c=promotions', accent: true },
    { label: 'Parquet', href: 'catalogue.html?c=parquet', cols: [
      { title: 'Parquet massif', link: 'parquet-massif', links: [
        ['Massif en chêne', 'parquet-massif-chene'], ['Chêne huilé', 'parquet-massif-chene-huile', 2], ['Chêne verni', 'parquet-massif-chene-verni', 2], ['Chêne brut pré-poncé', 'parquet-massif-chene-brut-pre-ponce', 2],
        ['Massif en bois exotique', 'massif-en-bois-exotique'], ['Exotique brut', 'plancher-massif-exotique-brut', 2], ['Exotique huilé', 'plancher-massif-exotique-huile', 2], ['Exotique verni', 'plancher-massif-exotique-verni', 2],
        ['Massif à motif', 'parquet-massif'], ['Point de Hongrie massif', 'point-de-hongrie-massif', 2], ['Bâton rompu massif', 'parquet-massif-baton-rompu', 2], ['Pont de bateau', 'parquet-massif-pont-de-bateau', 2],
        ['Bambou massif', 'parquet-bambou-massif'],
      ] },
      { title: 'Parquet flottant', link: 'parquet-flottant', links: [
        ['Flottant en chêne', 'parquet-flottant-en-chene'], ['Chêne huilé', 'parquet-flottant-chene-huile', 2], ['Chêne verni', 'parquet-flottant-chene-verni', 2], ['Chêne brut', 'parquet-flottant-chene-brut', 2],
        ['Flottant à motif', 'parquet-flottant'], ['Bâton rompu', 'parquet-flottant-baton-rompu', 2], ['Point de Hongrie', 'parquet-flottant-point-de-hongrie', 2], ['Versailles', 'parquet-flottant-versailles', 2],
        ['Flottant exotique', 'parquet-flottant-exotique'],
      ] },
      { title: 'Sol stratifié', link: 'parquet-sol-stratifie', links: [
        ['Collection Vieux Paris', 'collection-vieux-paris'], ['Collection Venise', 'collection-venise'], ['Collection Amsterdam', 'collection-amsterdam'], ['Collection Monaco', 'collection-monaco'],
        ['Collection Milan', 'collection-milan'], ['Collection Alexandrie', 'collection-alexandrie'], ['Collection Saint-Tropez', 'collection-saint-tropez'], ['Collection Dernière Chance', 'collection-derniere-chance'],
      ] },
      { title: 'Et aussi', links: [
        ['Lames de terrasse', 'lames-de-terrasse'], ['Bois exotique massif', 'lames-de-terrasse-en-bois-exotique-massif', 2], ['Composite', 'lames-de-terrasse-en-composite', 2], ['Accessoires terrasse', 'accessoire-lame-de-terrasse', 2], ['Saturateur', 'saturateur', 2],
        ['Salles de bain et cuisines', 'parquet-pour-salles-de-bain-et-cuisines'], ['Lots de fin de série', 'lots-de-fin-de-serie'],
      ] },
    ], feature: { configurateur: true, img: 'assets/img/site/point-de-hongrie.webp', title: 'Trouver mon parquet', text: 'Motif, couleur, finition : votre sélection en 4 étapes.' } },
    { label: 'Isolation', href: 'catalogue.html?c=isolation', cols: [
      { title: 'Sous-couche Dinachoc®', link: 'sous-couche', links: [['Sous-couche Dinachoc S801', 'sous-couche-dinachoc-s801'], ['Sous-couche Dinachoc S880 chantier', 'sous-couche-dinachoc-s880-chantier'], ['Sous-chape ciment', 'sous-chape-ciment']] },
      { title: 'Chape', links: [['Chape sèche thermo-acoustique', 'chape-seche-thermo-acoustique']] },
    ], feature: { cat: 'sous-couche', title: 'Sous-couches Dinachoc®', text: 'Isolation phonique et thermique sous parquet.' } },
    { label: 'Accessoires', href: 'catalogue.html?c=accessoires', cols: [
      { title: 'Plinthes & finitions', link: 'plinthe', links: [['Plinthe bois', 'plinthe-bois'], ['Plinthe MDF', 'plinthe-mdf'], ['Plinthe électrique', 'plinthe-electrique'], ['Quart de rond', 'quart-de-rond'], ['Barre de seuil', 'barre-de-seuil'], ['Nez de marche', 'nez-de-marche']] },
      { title: 'Colle', link: 'colle', links: [['Colle pour parquet', 'colle-pour-parquet'], ['Colles & mastics', 'colle-pour-isolation']] },
      { title: 'Traitements', link: 'finition-et-entretien', links: [['Vitrificateurs', 'vitrificateurs'], ['Huile-cire', 'huile-cire'], ['Huile de protection', 'huile-de-protection'], ['Nettoyants', 'nettoyants']] },
    ], feature: { cat: 'plinthe', title: 'Plinthes & finitions', text: 'Pour une pose impeccable jusqu’au dernier détail.' } },
    { label: 'Panneaux muraux', href: 'catalogue.html?c=panneaux-muraux' },
  ],
  /* Navigation de droite (en ligne : Astuces & Conseils, Contact, Devis › Prise de rendez-vous) */
  menuRight: [
    { label: 'Astuces & Conseils', href: 'journal.html' },
    { label: 'Contact', href: 'contact.html' },
    { label: 'Devis', href: 'devis.html', sub: [['Demande de devis', 'devis.html'], ['Prise de rendez-vous', 'rendez-vous.html'], ['Comment demander un devis', 'devis.html#video']] },
  ],
  /* Liens SEO du pied de page (comme en ligne) */
  footerSeo: [
    { title: 'Par couleur', links: [['Blanc', 'blanc'], ['Clair', 'clair'], ['Naturel', 'naturel'], ['Miel', 'miel'], ['Cuivre', 'cuivre'], ['Gris', 'gris'], ['Brun', 'brun'], ['Foncé', 'fonce']] },
    { title: 'Par motif', links: [['Lames droites', 'lames-droites'], ['Point de Hongrie', 'point-de-hongrie'], ['Bâton rompu', 'baton-rompu'], ['Versailles', 'versailles']] },
    { title: 'Largeur de lame', links: [['− 90 mm', '90mm'], ['90 – 120 mm', '90-120mm'], ['120 – 160 mm', '120-160mm'], ['160 – 200 mm', '160-200mm'], ['+ 200 mm', '200mm']] },
    { title: 'Finition', links: [['Huilé', 'huile'], ['Verni', 'verni'], ['Brut', 'brut']] },
    { title: 'Par essence', links: [['Chêne', 'chene'], ['Bambou', 'bambou'], ['Exotiques', 'exotique'], ['Classiques', 'classique']] },
  ],
};
