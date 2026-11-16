# Notes : node, pnpm, exec, dlx, tsx…

*Session du 14/11/2026 — projet seat-booking-app*

## L'essentiel en trois lignes

1. `package.json` **déclare**, le lockfile **fige**, `node_modules` **réalise**.
2. `install` réalise ; `add` déclare, puis réalise.
3. `exec` = un outil **dans** le projet ; `dlx` = un outil **nulle part** ; un script = un alias qui a déjà `.bin` dans son `PATH`.

---

## 1. Qui fait quoi

| Outil | Rôle | Analogie |
|---|---|---|
| **node** | exécute le JavaScript : Vite, le serveur Fastify, les scripts. Le code **client** est exécuté par le **navigateur**, pas par node. | le runtime |
| **npm** | gestionnaire de paquets livré avec node (le défaut) | |
| **pnpm** | autre gestionnaire de paquets, même métier | `conan` ou `vcpkg` |

**Ce qui distingue pnpm de npm :**

- **Un seul exemplaire** de chaque version de paquet, dans un magasin global (`~/.local/share/pnpm/store`). Le `node_modules` de chaque projet contient des liens vers ces copies. C'est un cache partagé, pas un pool de threads : de la déduplication sur le disque.
- **Il est strict** : seuls les paquets **déclarés** sont visibles. npm laisse importer un paquet indirect, par hasard : c'est un `#include` qui compile parce qu'un autre header l'inclut.

---

## 2. Déclarer, figer, réaliser

| Fichier | Rôle | Dans git ? | Analogie |
|---|---|---|---|
| `package.json` | **déclare** les fourchettes de versions acceptables | oui | `conanfile.txt` |
| `pnpm-lock.yaml` | **fige** la version exacte de tout, dépendances indirectes comprises, avec une empreinte d'intégrité | **oui** | `conan.lock` |
| `node_modules/` | **réalise** : fabriqué à partir des deux | **non** | le dossier de build |

Tu peux supprimer `node_modules/` sans risque : `pnpm install` le recrée.

**Ce qu'il contient :**

- le JavaScript des bibliothèques, exécuté tel quel (pas de `.a`, pas d'édition de liens) ;
- les fichiers de types `.d.ts`, l'équivalent des `.h` ;
- pour certains paquets, un binaire natif (`.node`, l'équivalent d'un `.so`), par exemple `better-sqlite3`.

**Pourquoi il n'est pas dans git :** il est reproductible, énorme, et propre à ta plateforme (à cause des binaires natifs).

---

## 3. Les commandes

| Commande | Ce qu'elle fait | Modifie `package.json` ? |
|---|---|---|
| `pnpm install` | lit `package.json` et le lockfile, fabrique `node_modules` | non |
| `pnpm add axios` | ajoute la ligne dans `package.json`, met à jour le lockfile, installe | oui |
| `pnpm add -D x` | idem, mais dans `devDependencies` | oui |
| `pnpm remove x` | retire la dépendance | oui |

On tape `pnpm install` après un `git clone` ou un `git pull` qui a changé le `package.json`. On tape `pnpm add` quand **on** veut une nouvelle dépendance.

### Le piège de `-D`

`-D` range le paquet dans `devDependencies` : « nécessaire pour **fabriquer ou développer**, pas pour **exécuter** ».

> ⚠️ Les `devDependencies` servent **aussi au build** : sans `vite` ou `typescript`, `pnpm build` ne marche pas.
> La seule vraie différence : `pnpm install --prod` les **saute** (machine de production).

- **Client** : surtout une convention, puisque Vite assemble tout en fichiers statiques.
- **Serveur** : effet réel, puisque `tsx`, `typescript` et la CLI `prisma` sont inutiles en production.

---

## 4. Les versions

| Écriture | Accepte | Exemple dans le projet |
|---|---|---|
| `^5.107.1` | ≥ 5.107.1 **et** < 6.0.0 : mineures et correctifs, pas de version majeure | `@tanstack/react-query` |
| `~6.0.3` | ≥ 6.0.3 **et** < 6.1.0 : correctifs seulement | `typescript` |
| `^0.13.5` | cas particulier 0.x : < 0.14.0, car une 0.x peut casser à chaque mineure | `studio` |

---

## 5. Le workspace

`pnpm-workspace.yaml` déclare que `apps/*` sont les paquets d'**un seul monorepo**. Son équivalent est un `CMakeLists.txt` racine avec `add_subdirectory(apps/client)` et `add_subdirectory(apps/server)`.

- un seul lockfile, un seul magasin ;
- `pnpm --filter client add axios` cible **un** paquet ;
- `pnpm --parallel --filter "./apps/*" dev` les lance **tous** ;
- les paquets peuvent dépendre les uns des autres.

---

## 6. Les scripts

`pnpm dev` lit la clé `"scripts"` du `package.json` **du dossier courant** : c'est un alias.

| Où | `dev` fait |
|---|---|
| racine | `pnpm --parallel --filter "./apps/*" dev` : le `dev` de chaque app |
| client | `vite` |
| serveur | `tsx watch src/index.ts \| pino-pretty` (`pino-pretty` rend lisibles les logs JSON de Fastify) |

**Les vérifications :**

| Commande | Ce qu'elle fait |
|---|---|
| `pnpm typecheck` | `tsc` sur les deux apps : types seulement, rien n'est produit |
| `pnpm lint` | `oxlint` sur le client |
| `pnpm check` | les deux ci-dessus (`Ctrl+Shift+B` dans VS Code lance la tâche `check`) |

---

## 7. `exec` et `dlx` : où est l'exécutable ?

Un paquet installé dépose ses exécutables dans `node_modules/.bin/` (pour le client : `oxlint`, `tsc`, `tsserver`, `vite`). Ce dossier **n'est pas dans le `PATH`** du terminal.

```
$ tsc --version
tsc: command not found

$ pnpm exec tsc --version
Version 6.0.3
```

La première commande échoue parce que `.bin` n'est pas dans le `PATH`. La seconde marche parce que `pnpm exec` l'ajoute en tête **le temps de la commande**.

| Où | Comment | Pourquoi ça marche |
|---|---|---|
| un script du `package.json` | `"typecheck": "tsc --noEmit"` | pnpm ajoute `.bin` **automatiquement** |
| une commande ponctuelle | `pnpm exec tsc --noEmit` | `exec` l'ajoute pour cette commande |
| `.vscode/tasks.json` | `pnpm exec tsc -b --noEmit` | VS Code lance un shell sans ce `PATH` |

**L'intérêt :** on utilise la version **figée par le projet**, pas celle du système. C'est comme lancer l'outil du dossier de build plutôt que celui installé sur la machine.

| | Outil | Exemple |
|---|---|---|
| `pnpm exec <outil>` | **déjà installé** dans le projet | `pnpm exec tsc` |
| `pnpm dlx <outil>` | installé **nulle part** : téléchargé dans un dossier temporaire, exécuté, aucune trace dans les dépendances (≈ `npx`) | `pnpm dlx create-vite` |

---

## 8. `tsx`

Il **exécute du TypeScript directement** : il retire les types en mémoire et ne produit aucun fichier.

- **Il ne vérifie pas les types**, comme Vite. C'est pour ça que `pnpm typecheck` existe à part.
- **Différence avec `tsc`** : `tsc` vérifie les types (ici avec `--noEmit`, il ne produit rien).
- **`watch`** relance le **processus node** à chaque modification du fichier. Tout est rechargé, ce n'est pas un remplacement à chaud.

**Et en QML ?** Je n'ai pas d'équivalent officiel intégré dont je sois sûr. Les pistes : QmlLive, le hot reload de Felgo, ou un `QFileSystemWatcher` qui vide le cache de composants de l'engine. Différence notable : le HMR de Vite **conserve l'état** des composants, alors qu'un rechargement QML repart en général de zéro.

---

## 9. `allowBuilds` (dans `pnpm-workspace.yaml`)

Certains paquets exécutent un **script à l'installation** : compiler du C++ ou télécharger un binaire.

| Autorisés (`true`) | Pourquoi |
|---|---|
| `better-sqlite3` | compile le module natif de SQLite |
| `@prisma/client`, `@prisma/engines`, `prisma` | téléchargent le moteur de requêtes et génèrent le client |

Refusés (`false`) : `esbuild`, `msgpackr-extract`, `workerd`.

**Pourquoi un droit explicite :** ce script est du code arbitraire exécuté **avec tes droits** pendant `pnpm install`. C'est un vecteur d'attaque classique (la chaîne d'approvisionnement). pnpm les bloque donc par défaut, et tu autorises paquet par paquet.

---

## ⚠️ À corriger dans ce dépôt

Le dépôt git est dans `apps/`. Donc `pnpm-lock.yaml`, le `package.json` racine et `pnpm-workspace.yaml` sont **hors git** : personne ne peut reproduire ton installation en clonant.

→ Tâche de la roadmap : **déplacer `.git` à la racine**.
