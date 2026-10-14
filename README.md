# Premibel Parquet — proposition de refonte du site

Proposition de nouveau site pour **[premibel.fr](https://www.premibel.fr)**, vendeur de parquets à Paris depuis 33 ans (showrooms Voltaire, Roquette et Balard, entrepôt à Pantin).

> **Maquette de démonstration** — le site actuel reste la référence. Les prix, produits, avis et contenus sont ceux du site en ligne au 12/10/2026 ; aucune commande, aucun formulaire n’est réellement envoyé.

**Voir la maquette en ligne :** https://jonathan-lanationduweb.github.io/premibel-refonte-/

---

## Pourquoi cette refonte ?

Le site actuel est riche : plus de 700 références, trois showrooms, un entrepôt, des guides, des promotions chaque mois… Mais cette richesse se retourne contre lui. **Il y a énormément d’informations, présentées toutes au même niveau**, et le visiteur peut vite s’y perdre : il ne sait plus par où commencer, ce qui est important, ni comment trouver le parquet qui lui correspond.

L’objectif de cette refonte est de **donner au site une nouvelle identité, capable de mettre Premibel en avant**, tout en le rendant **plus accessible et plus disponible pour tous ses visiteurs** — particuliers comme professionnels, sur ordinateur comme sur téléphone.

### Ce que nous avons constaté sur le site actuel

- **Trop d’informations d’un coup** : l’accueil empile les blocs, les bandeaux et les messages ; le regard ne sait pas où se poser.
- **Une hiérarchie peu claire** : les promotions, les conseils, les showrooms et les produits se concurrencent au lieu de se compléter.
- **Un parcours d’achat difficile** : trouver « le bon parquet » demande de connaître déjà le vocabulaire (massif, contrecollé, point de Hongrie, finitions…).
- **Une image qui ne reflète pas le niveau de l’entreprise** : 33 ans d’expertise et des showrooms parisiens méritent un site à la hauteur, plus moderne et plus élégant.
- **Une expérience mobile perfectible** : beaucoup de visiteurs consultent depuis leur téléphone, souvent depuis un chantier ou un showroom.
- **Des incohérences** : téléphones différents selon les pages, délais de livraison contradictoires, liens morts.

### Ce que la refonte apporte

- **Un site plus clair** : chaque page a un objectif, l’essentiel d’abord, le détail ensuite (repliable quand c’est utile). La fin de page a été divisée par plus de 4 sur mobile.
- **Une identité qui met Premibel en avant** : direction artistique sobre et chaleureuse, typographie éditoriale, belles photos du bois et des showrooms, rouge Premibel conservé en touche discrète, logo inchangé.
- **Un parcours guidé pour choisir son parquet** :
  - « Trouver mon parquet » : un configurateur en 4 étapes (motif, couleur, finition, produits) ;
  - un guide d’achat illustré et un quiz « Quel parquet pour moi ? » ;
  - un assistant Premibel (questions, conseiller, WhatsApp, rendez-vous) toujours accessible.
- **Une meilleure disponibilité** :
  - responsive pensé d’abord pour le téléphone ;
  - accessibilité (navigation clavier, contrastes, textes alternatifs, respect du réglage « réduire les animations ») ;
  - recherche instantanée sur les 783 produits (Ctrl + K) ;
  - informations pratiques visibles partout : horaires et statut « ouvert maintenant » des showrooms, carte des 4 adresses, délais de livraison, paiement en 2×, 3×, 4×.
- **Des fiches produits qui rassurent** : prix TTC et HT, stock, éco-participation, calculateur de surface en colis (chutes comprises), colle et sous-couche calculées automatiquement, ajout au devis.
- **Une bannière du mois simple à gérer** : un outil (`admin-bannieres.html`) pour programmer la promotion de chaque mois, avec aperçu ordinateur/mobile — sans toucher au code.
- **Tout le contenu du site actuel est conservé** : 783 produits, 99 catégories, 45 articles et astuces, 29 réalisations, vrais avis Google, pages légales, rétractation UE, bandeau cookies…

---

## Pages

Accueil · Catalogue (99 catégories, filtres) · Fiche produit · Panier et commande · Devis · Rendez-vous · Showrooms et fiches magasin · Contact · Notre histoire · Expertise · Engagements · Espace pro · Réalisations · Journal et articles · Guide d’achat · Livraison · Paiement · Comment commander · Pages légales · Mon compte · Plan du site · 404 · Outil bannières.

## Lancer en local

```bash
python -m http.server 8765
```

Puis ouvrir http://localhost:8765/.

## Changer la bannière du mois

1. Ouvrir `admin-bannieres.html`.
2. « + Nouvelle » : dates, textes, **parquet mis en avant**, image (bibliothèque ou visuel Canva, optimisé automatiquement).
3. Vérifier l’aperçu (ordinateur / mobile) et le planning sur 12 mois.
4. **Exporter bannieres.js** et remplacer `data/bannieres.js` (copier les images importées dans `assets/img/bannieres/`).

Tester une date : `index.html?date=2026-11-15`.

## Technique

Site statique en HTML, CSS et JavaScript, sans framework ni étape de compilation : rapide, léger, hébergeable partout.

| Dossier | Contenu |
| --- | --- |
| `*.html` | Les pages |
| `assets/css/base.css` | Design system (couleurs, typographie, composants, en-tête, pied de page) |
| `assets/js/core.js` | Socle commun : gabarit, menu, recherche, panier, animations |
| `assets/js/modules/` | Configurateur, assistant, rétractation (chargés à la demande) |
| `assets/{css,js}/pages/` | Styles et scripts propres à chaque page |
| `data/` | Produits, catégories, articles, adresses, avis, bannières |
| `assets/img/` | Images du site actuel, converties en WebP |

Animations : GSAP, ScrollTrigger, Lenis (inclus dans `assets/vendor/`). Carte : Leaflet + OpenStreetMap.

## Pour une mise en production

La maquette est conçue pour être intégrée au WordPress/WooCommerce existant, afin de garder commandes, clients et référencement :

- brancher le panier, le paiement (WooPayments, Alma, virement) et les comptes sur WooCommerce ;
- relier l’assistant à l’assistant IA et au chat conseiller (Chatwoot) déjà en place ;
- faire de l’outil bannières un écran du back-office ;
- conserver les adresses actuelles des pages et prévoir les redirections nécessaires.

## Points à valider avec Premibel

- Numéro du showroom Roquette (trois numéros différents sur le site actuel).
- Délais de livraison (24/48 h sur la page Livraison, 2 à 5 jours sur les fiches et la commande).
- Affichage des prix : TTC en premier dans la maquette, HT en premier sur le site actuel.
- Dates des prochaines opérations (dont la « Quinzaine du patron ») : les bannières de fin octobre à décembre sont des exemples.
- Remises par quantité annoncées dans les CGV : à confirmer avant intégration.
- Tarifs de livraison détaillés par zone et par poids.

---

Proposition réalisée par [La Nation du Web](https://lanationduweb.fr).
