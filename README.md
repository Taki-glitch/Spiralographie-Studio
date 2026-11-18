# Spiralographie Studio V2 — Creative Edition

Application web autonome pour transformer des photographies en œuvres génératives à base de spirales et de courbes.

## Fonctionnalités V2

- Import JPG, PNG, WEBP et glisser-déposer.
- Cadrage carré : remplissage ou image entière.
- 7 styles génératifs :
  - Spirale continue : un chemin spiralé unique et continu.
  - Ondes concentriques : anneaux déformés par les valeurs de l'image.
  - Guilloché : plusieurs flux spiralés et motifs ondulants.
  - Topographie : lignes de niveau inspirées des cartes.
  - Rayonnement : faisceaux radiaux modulés.
  - Entrelacs : deux flux en opposition.
  - Courbes organiques : contours circulaires irréguliers.
- Réglages interactifs : tours, contraste, épaisseur, fidélité, rotation et adoucissement.
- Palette encre / support et inversion des valeurs.
- Aperçu de l'original, plein écran.
- Export PNG en 1000, 2000, 3000 ou 4000 px.
- Export SVG vectoriel redimensionnable.
- Aucun serveur, aucune API, aucune photo téléversée.

## Lancer le projet

Ouvrez `index.html` dans un navigateur moderne. Pour travailler avec un serveur local :

```bash
python -m http.server 8000
```

Puis visitez `http://localhost:8000`.

## Déployer sur GitHub Pages

1. Créez un dépôt `spiralographie-studio`.
2. Déposez les fichiers de ce projet à la racine.
3. Ouvrez **Settings → Pages**.
4. Choisissez **Deploy from a branch**, branche `main`, dossier `/ (root)`.
5. Enregistrez. GitHub Pages publiera l'application.

## Structure

```text
spiralographie-studio-v2/
├── index.html
├── style.css
├── app.js
├── README.md
└── LICENSE
```

## Notes techniques

- Le rendu est calculé dans le navigateur à partir d'une image réduite en niveaux de gris (600 × 600).
- Les tracés sont conservés sous forme de coordonnées vectorielles, puis dessinés dans le canvas ou sérialisés en SVG.
- Le mode « Spirale continue » construit un seul chemin continu. Les autres styles utilisent plusieurs chemins.
- Le SVG contient les tracés et le fond, pas la photographie d'origine.
- Le PNG haute résolution redessine les tracés à la résolution choisie.
- Les performances dépendent du navigateur et de l'appareil. Sur mobile, commencez avec 20 à 40 tours.
- La V2 est un outil artistique génératif : elle ne réalise pas une reconnaissance sémantique du visage ou des objets. La fidélité dépend du contraste de la photographie et des paramètres.

## Pistes V3

- Algorithme d'optimisation de densité avec simulation du dépôt d'encre.
- Trajectoire plotter avec contraintes de vitesse et de levée de stylo.
- Éditeur de points de départ et de centre de spirale.
- Plusieurs centres de spirale et compositions multi-échelles.
- Traitement en Web Worker et rendu progressif.
- Galerie de presets et sauvegarde locale des paramètres.
- Export G-code adapté à des traceurs précis (après définition du matériel).

## Licence

MIT.
