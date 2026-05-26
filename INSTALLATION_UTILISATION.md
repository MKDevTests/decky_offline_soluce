# Offline Soluce V10 — Installation / utilisation

## Ce que fait cette version

La V10 abandonne l’idée absurde de dépendre des raccourcis Steam pour deviner tes jeux rétro.

Elle fonctionne maintenant comme ça :

1. elle détecte des **sources de scan**
   - `Emulation/roms` sur l’interne
   - `Emulation/roms` sur SD / stockage externe
   - `Games` sur l’interne
   - `Games` sur SD / stockage externe
2. tu **actives / désactives** les sources voulues
3. tu lances un **scan local**
4. tu obtiens une **bibliothèque unifiée**
5. tu choisis un jeu
6. le plugin cherche des soluces sur :
   - GameFAQs
   - RPGSoluce
   - Neoseeker
   - StrategyWiki
7. tu importes la soluce
8. tu la lis **hors ligne** avec reprise de lecture et marque-page

---

## Points importants

- pas besoin de clavier pour l’usage principal
- la catégorie `Games` est traitée comme une bibliothèque de **jeux PC / non-Steam**
- les ROMs sont regroupées par jeu avec déduplication basique
- priorité au support rétro / PS2 / EmuDeck-like

---

## Workflow utilisateur conseillé

### 1. Vue `SOURCES`
- vérifie les dossiers détectés
- active ceux que tu veux scanner
- lance `Rescanner les dossiers activés`

### 2. Vue `LIBRARY`
- filtre par type / stockage / plateforme
- sélectionne le jeu voulu
- si un guide est déjà lié, tu peux l’ouvrir directement
- sinon, passe à la vue recherche

### 3. Vue `SEARCH`
- choisis le site
- lance la recherche
- parcoure les résultats
- importe le résultat voulu

### 4. Vue `GUIDES`
- ouvre un guide importé
- navigue entre sections
- ajuste la taille du texte
- pose un marque-page
- reprends plus tard hors ligne

---

## Rebuild rapide

Dans le dossier source du plugin :

```powershell
pnpm i
pnpm run build
py .\package_dist.py
```

ZIP attendu :

```text
release\decky-offline-soluce-v0.10.0.zip
```

---

## Réinstallation Decky

Le plus simple reste :

1. builder le ZIP
2. l’héberger en HTTP local depuis ton PC
3. l’installer dans Decky via URL ZIP

Exemple :

```powershell
cd .\release
py -m http.server 8000
```

Puis dans Decky, installer avec une URL du type :

```text
http://IP_DE_TON_PC:8000/decky-offline-soluce-v0.10.0.zip
```
