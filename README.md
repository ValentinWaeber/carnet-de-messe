# Maison du carnet

Première version locale d’un atelier de création de carnets de messe. L’application conserve le projet Next.js existant et propose un parcours complet : choix du modèle, composition, sauvegarde, feuilletage, projet transportable et PDF.

## Installation et lancement sous Windows

Utiliser Node.js 20.9 minimum (Node.js 24 utilisé pour les vérifications), npm et PowerShell, depuis le dossier du projet :

```powershell
npm.cmd ci
npx.cmd playwright install chromium
npm.cmd run dev
```

Ouvrir **http://localhost:3000**. Chromium est nécessaire pour les PDF et les tests navigateur. Son installation se fait une seule fois par version de Playwright ; elle peut demander quelques centaines de Mo et une connexion Internet. `npm.cmd run browser:install` est une commande équivalente.

Pour utiliser la version compilée :

```powershell
npm.cmd run build
npm.cmd run start
```

Ne pas utiliser un export statique de Next.js : `/api/pdf` a besoin d’un serveur Node.js capable de lancer Chromium.

## Utilisation

1. Choisir l’un des quinze modèles, ou partir d’un carnet vierge.
2. Choisir le format d’une **page fermée** : A5, A4, carré ou personnalisé.
3. Dans l’atelier, cliquer sur un bloc pour sélectionner ses propriétés ; le glisser pour le déplacer. Les poignées redimensionnent le cadre et la poignée supérieure le tourne.
4. Double-cliquer sur un texte, ou utiliser **Modifier le texte**. La saisie possède son propre historique Tiptap. Elle est sauvegardée pendant l’écriture ; **Annuler** dans ce dialogue restitue le texte précédent.
5. Dans **Éléments**, cliquer sur un bloc ou le glisser sur une page. Importer une image PNG, JPEG ou WebP, jusqu’à 8 Mo. Les images peuvent être ajustées ou recadrées dans leur cadre ; le redimensionnement conserve leur ratio.
6. Ajouter, dupliquer, supprimer et déplacer les pages depuis le panneau gauche. Les flèches et le glisser-déposer permettent de changer leur ordre.
7. **Aperçu** masque les outils et permet de feuilleter le carnet par les coins, au toucher, avec les boutons ou les touches fléchées.
8. **Exporter** propose le PDF, et une archive `.carnet.zip` qui contient le document éditable et toutes ses images. Cette archive se réimporte depuis l’accueil et crée un nouveau projet.

Les raccourcis de l’atelier sont `Ctrl+Z`, `Ctrl+Maj+Z` / `Ctrl+Y`, `Suppr` et `Échap`. Ils ne s’appliquent pas aux champs de saisie ni à l’éditeur de texte. Les champs numériques se valident avec **Entrée** ou en quittant le champ.

## Fonctionnalités réalisées

- Interface française, palette ivoire et sauge, icônes cohérentes, titres serif, accueil et galerie filtrable.
- Quinze modèles aux couvertures, compositions, typographies et ornements distincts. Les miniatures proviennent de leurs véritables pages. Les modèles produisent huit pages ; les carnets vierges en contiennent quatre.
- Éditeur avec livre central, doubles pages intérieures, couvertures seules, sélection, déplacement, taille, rotation, ordre des calques, verrouillage, duplication et suppression.
- Titres, paragraphes, lectures, chants, images, séparateurs et dix ornements SVG originaux locaux.
- Propriétés de police, taille en points, gras, italique, couleur, alignement, interligne et espacement des lettres. Mise en forme partielle en gras, italique et souligné dans Tiptap.
- Marges et repères magnétiques, centrage sur la page, changement explicite de format par mise à l’échelle uniforme.
- Historique de soixante opérations. Un déplacement ou une séance d’édition de texte constitue une opération complète.
- Sauvegarde temporisée (500 ms) en IndexedDB des documents et des images, états de sauvegarde, traitement des erreurs et quotas, réouverture, renommage, duplication et suppression confirmée des projets.
- Import/export ZIP avec manifeste JSON versionné, validation stricte et renouvellement des identifiants des projets et des images à l’import.
- Feuilletage StPageFlip isolé, ombres discrètes, pages souples, navigation tactile ; navigation sans animation avec `prefers-reduced-motion`.
- Panneaux escamotables et page unique sur téléphone, doubles pages sur ordinateur.
- Véritable PDF serveur Playwright/Chromium aux dimensions physiques du document, images et fonds inclus, texte sélectionnable, contrôles exclus. Les fonts et les images sont attendues avant l’impression.
- Alertes sur les éléments hors page, textes trop longs et images à faible définition. L’export PDF refuse les textes qui débordent plutôt que de les couper silencieusement.

## Architecture

| Dossier / fichier                       | Responsabilité                                                                      |
| --------------------------------------- | ----------------------------------------------------------------------------------- |
| `app/page.tsx` et `components/home.tsx` | Accueil, collection, projets locaux et création                                     |
| `app/atelier/[id]/page.tsx`             | Route de l’atelier ; paramètres asynchrones sous Suspense                           |
| `lib/document.ts`                       | Types, validation Zod, identifiants, unités et opérations physiques                 |
| `lib/templates.ts`                      | Quinze définitions et générateurs indépendants du moteur d’édition                  |
| `lib/render.ts`                         | **Un seul rendu HTML/CSS** pour les miniatures, l’éditeur, le feuilletage et le PDF |
| `lib/ornaments.ts`                      | Dessins SVG originaux sans ressources externes                                      |
| `lib/history.ts`                        | Historique immuable et opérations annuler/rétablir                                  |
| `components/editor/use-editor.ts`       | Chargement, historique, groupes de saisie et file de sauvegardes                    |
| `components/editor/`                    | Manipulation Moveable, édition Tiptap, pages et propriétés                          |
| `components/book-preview.tsx`           | Frontière unique du moteur de feuilletage StPageFlip                                |
| `lib/storage.ts`                        | IndexedDB, images persistantes et transactions d’import                             |
| `lib/images.ts`                         | Signatures PNG/JPEG/WebP, dimensions, limites et résolution d’impression            |
| `lib/archive.ts`                        | ZIP, manifeste validé et portabilité des images                                     |
| `app/api/pdf/route.ts`                  | Validation des entrées, Chromium et téléchargement PDF                              |
| `tests/`                                | Tests unitaires et parcours navigateur reproductibles                               |

Le schéma est en version **1**. Les positions, dimensions et marges sont en **millimètres** ; les tailles de texte sont en **points**. Les pages et blocs portent des UUID stables. Les images sont des blobs dans une table IndexedDB séparée, référencées par identifiant. Les URL de rendu sont reconstruites depuis ces blobs ; aucune sauvegarde ne dépend d’une URL blob temporaire.

Les tailles du DOM sont calculées à 96 px/pouce et le zoom est une transformation du parent : zoomer ne modifie pas le document. Un changement de format applique `min(nouvelle largeur / largeur, nouvelle hauteur / hauteur)` à la mise en page. Les limites techniques des tailles restent appliquées. Un ratio différent peut laisser de l’espace libre ; une vérification manuelle reste nécessaire.

L’éditeur et les API du navigateur sont des composants clients. Le moteur interactif est chargé sans SSR. La configuration Next.js 16.4 avec Cache Components est conservée : la route PDF utilise le runtime Node.js par défaut, sans configuration de segment incompatible.

### Export et validation

La route PDF n’accepte **ni HTML libre ni URL à visiter**. Elle reçoit un document validé et des images incorporées dont les signatures sont contrôlées. Les requêtes réseau du navigateur d’impression sont bloquées ; seules les données incorporées et les polices système sont utilisées. Les ressources Chromium sont fermées dans `finally`, même en cas d’erreur.

Limites : 80 pages, 80 blocs par page, 30 images, 8 Mo par image, 40 mégapixels par image et 10 000 px par côté. L’archive est limitée à 40 Mo comprimés et 60 Mo décomprimés. Le PDF accepte 40 Mo d’entrée et 28 Mo d’images au total, avec deux générations simultanées au maximum. Le document et les ressources sont revérifiés côté serveur.

Les polices Georgia, Arial et Times sont des polices système ; aucun appel Google Fonts ni image distante n’est nécessaire. Les exemples de textes sont des indications à remplacer et des phrases originales, pas des transcriptions de chants ou de lectures protégés.

## Vérifications

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run test:e2e
npm.cmd run build
npm.cmd run format:check
```

Les tests unitaires vérifient les unités, la validation, l’indépendance des modèles, les UUID de duplication, la mise à l’échelle, les débordements avec rotation, l’historique et l’échappement HTML. Les tests Chromium vérifient les parcours de création vierge et depuis modèle, la saisie, les mouvements à plusieurs zooms, la persistance d’image, la réouverture, les pages, le feuilletage, le ZIP avec image et les exports PDF. Les PDF sont lus avec `pdf-lib` pour vérifier leurs dimensions, leur pagination, les ressources image et la présence d’opérateurs de texte.

Les captures ordinateur et téléphone sont générées dans `test-results/` (non versionné), avec des traces pour les tests en échec. Playwright utilise `localhost`, comme le serveur Next.js existant ; il réutilise un serveur déjà lancé ou démarre celui du projet.

## Limites connues

- **Sauvegarde sur cet appareil et dans ce navigateur uniquement.** Utiliser toujours la même origine, par exemple `http://localhost:3000` : un autre port, `127.0.0.1`, un autre navigateur ou la navigation privée possède un stockage différent. Effacer les données du navigateur efface les carnets. Exporter régulièrement le ZIP ; attendre l’état **Enregistré** avant de fermer l’onglet.
- La sauvegarde à la fermeture ne peut pas être garantie en cas d’arrêt brutal du navigateur ou de l’ordinateur. Un message du navigateur prévient si des modifications ne sont pas encore enregistrées.
- Les polices disponibles sont volontairement limitées aux polices système. Leurs métriques peuvent varier d’une machine à l’autre ; vérifier le PDF final.
- Les textes ne se répartissent pas automatiquement entre plusieurs cadres ou pages. Le texte complet reste enregistré, même lorsqu’il déborde. La correction est manuelle.
- Les limites de stockage dépendent du navigateur. Les projets volumineux peuvent être moins fluides, et le PDF peut prendre plusieurs secondes.
- Le contrôle des images à 180 ppp signale une définition faible ; ce n’est pas un contrôle prépresse complet. Viser 300 ppp pour les photographies.
- Le PDF contient des pages simples dans l’ordre de lecture : **pas d’imposition en livret, pas de fonds perdus, pas de repères de coupe, pas de certification PDF/X**. Faire valider les réglages par l’imprimeur et imprimer à 100 %.
- Pour un nombre impair de pages, l’aperçu ajoute une page blanche virtuelle avant le dos afin de feuilleter correctement. Cette page virtuelle n’est pas ajoutée au document ni au PDF.
- Pas de comptes, synchronisation, paiement, collaboration ou recherche d’imprimeries dans cette version.
- L’audit npm du 11 octobre 2026 signale cinq alertes élevées dans la chaîne **de développement** `eslint-config-next → fast-glob → micromatch → braces`. L’avis [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) ne propose alors aucun correctif de `braces`. Le remplacement forcé par ESLint Next 14 suggéré par npm n’a pas été appliqué pour préserver Next.js 16.4. Aucun `npm audit fix --force` n’a été utilisé. Recontrôler l’audit lors des mises à jour.

## Prochaines étapes

1. Ajouter un dépôt serveur PostgreSQL des documents versionnés, sans modifier le modèle de document ni le moteur de rendu.
2. Ajouter les comptes et les autorisations, un import des projets locaux vers les comptes et une stratégie de résolution des conflits.
3. Stocker les images dans un stockage objet, en conservant leurs références stables ; prévoir quotas et tâches d’export PDF en file d’attente.
4. Ajouter les préférences d’impression, les fonds perdus et l’imposition en accord avec un imprimeur.
5. Introduire ensuite la recherche d’imprimeries, les devis et les tarifs négociés, avec des partenaires réels.

Documentation des intégrations : [Tiptap React](https://tiptap.dev/docs/editor/getting-started/install/react), [Moveable](https://daybrush.com/moveable/release/latest/doc/), [StPageFlip](https://github.com/Nodlik/StPageFlip), [Playwright PDF](https://playwright.dev/docs/api/class-page#page-pdf). Pour les conventions Next.js de cette version, lire les guides installés dans `node_modules/next/dist/docs/` avant modification.
