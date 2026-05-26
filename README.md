# Decky Offline Soluce

Plugin Decky Loader pour sauvegarder des pages de soluces et les relire hors ligne sur Steam Deck.

## Ce que fait cette V3

- colle une URL de soluce
- télécharge la page côté backend Python
- applique un extracteur ciblé pour **GameFAQs** et **RPGSoluce**, sinon fallback générique
- détecte des **sections** pour naviguer plus vite dans une longue FAQ
- suit automatiquement les **pages / chapitres suivants** quand un lien clair est détecté
- sauvegarde localement le guide dans l'espace runtime du plugin
- permet de relire, filtrer, ouvrir une section et supprimer les guides hors ligne

## Limites actuelles

- le chaînage multi-pages reste **conservateur** : il ne suit que les liens suivants jugés crédibles
- pas de rendu HTML riche ni images hors ligne
- pas encore de récupération automatique depuis le jeu Steam en cours
- extraction toujours dépendante de la structure HTML réelle du site
- pas encore de mode marque-page / progression de lecture

## Structure

- `src/index.tsx` : interface Decky
- `main.py` : backend Python Decky
- `plugin.json` : métadonnées Decky
- `package.json` : dépendances frontend
- `rollup.config.js` : build frontend
- `package_dist.py` : création d'un ZIP de distribution installable
- `INSTALLATION_UTILISATION.md` : tuto détaillé

## Build local

```bash
pnpm i
pnpm run build
python3 package_dist.py
```

Le ZIP installable sera créé dans `release/`.

## Données stockées

Le plugin utilise `decky.DECKY_PLUGIN_RUNTIME_DIR/guides/` pour stocker les guides téléchargés.
Chaque guide contient maintenant :

- le contenu fusionné
- la liste des pages importées
- les sections détectées

## Avertissement

Prévu pour un usage personnel hors ligne. La redistribution du contenu récupéré depuis des sites tiers est un autre sujet.
