# Spiralographie Studio V5 — Creative Edition

V5 construite à partir de l'architecture V4 fournie. Application autonome, sans dépendance ni service distant.

## Nouveautés V5

- **Contraste local adaptatif** : renforce les différences de luminosité autour des détails au lieu de se limiter à une modulation globale.
- **Renfort des contours** : calcul Sobel dans le Web Worker pour mieux faire ressortir les transitions (yeux, bouche, cheveux, silhouettes, reliefs selon l'image). Ce n'est pas une détection sémantique de visage ni un modèle d'IA.
- **Style multicentrique** : trois spirales superposées, utile pour des compositions de portrait et des motifs plus denses.
- **Préréglage Portrait détaillé** : active le multicentrique avec davantage de détail et de renfort des contours.
- **Export PLT/HPGL** : export de tracés pour les traceurs compatibles HPGL. Les dimensions et l'orientation doivent être vérifiées dans le logiciel du traceur avant impression.
- Les sept styles et fonctions V4 sont conservés.

## Fonctionnalités

- Import JPG, PNG, WEBP et glisser-déposer (30 Mo max).
- Sept styles historiques + multicentrique.
- Réglages de tours, contraste, épaisseur, fidélité, rotation, centre X/Y, adoucissement, détail local et contours.
- Préréglages Portrait, Paysage, Trait fin et Portrait détaillé.
- Comparaison original/création, plein écran, sauvegarde locale des réglages.
- Export PNG 1000/2000/3000/4000 px, SVG et PLT/HPGL.
- Traitement local dans le navigateur.

## Installation

Décompresser puis publier les fichiers à la racine du dépôt GitHub Pages. Pour tester localement, lancer `python -m http.server 8000`, puis ouvrir `http://localhost:8000`. Le Web Worker nécessite un serveur HTTP(S), pas l'ouverture directe en `file://`.

## Fichiers

- `index.html`
- `style.css`
- `app.js`
- `spiral-worker.js`
- `README.md`
- `LICENSE`

## Limites connues

- L'accentuation des contours est une analyse d'image classique (Sobel), pas une reconnaissance des yeux/nez/bouche. La qualité dépend de la photo, de sa lumière, du cadrage et des réglages.
- Le fichier HPGL utilise une zone de coordonnées normalisée 40 000 × 40 000 unités ; régler l'échelle et l'origine dans le logiciel du traceur. Aucun réglage spécifique à un modèle de machine n'est supposé.
- Les exports très grands et les photos complexes consomment de la mémoire.

## Licence

MIT.
