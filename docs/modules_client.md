# Notes : les modules du client

*Session du 13–14/11/2026 — projet seat-booking-app (`apps/client`)*

## Le plan d'ensemble

Il y a **deux familles** de modules :

| Famille | Où ça s'exécute | Modules |
|---|---|---|
| **Exécution** | dans le **navigateur** de l'utilisateur | `react`, `react-dom`, `react-router-dom`, `axios`, `@tanstack/react-query`, `react-hot-toast`, `react-zoom-pan-pinch` |
| **Outillage** | sur **ta machine**, jamais chez l'utilisateur | `vite`, `@vitejs/plugin-react`, `typescript`, `@types/*`, `oxlint`, `@tanstack/react-query-devtools`, `vite-plugin-terminal` |

**Les rôles ne se recouvrent pas :**

- `axios` **transporte** (comment parler au serveur) ;
- TanStack Query gère le **cycle de vie des données** (cache, périmé/frais, refetch) ;
- `react-router` gère l'**URL** ;
- `react-dom` **dessine**.

**Trois vérificateurs indépendants :**

| Outil | Ce qu'il fait |
|---|---|
| **Vite** | transforme (types et JSX vers JavaScript) **sans vérifier** |
| **`tsc`** | vérifie les **types** |
| **`oxlint`** | vérifie les **bonnes pratiques** |

---

## Les modules d'exécution

### `react` et `react-dom`

| Paquet | Rôle | Analogie Qt |
|---|---|---|
| `react` | décrit **quoi** afficher : composants, hooks, JSX, contexte. Il **ne sait rien du navigateur**. | l'arbre QML déclaratif |
| `react-dom` | le **moteur de rendu** : traduit cette description en vrais éléments du DOM | le backend de rendu (scene graph) |

Le même `react` sert avec `react-native` pour le mobile, qui est un autre moteur de rendu. C'est la raison de la séparation.

### `react-router-dom`

Il permet de **changer de « page » en changeant l'URL**, sans recharger quoi que ce soit : il utilise l'API `history.pushState` du navigateur, puis affiche le composant qui correspond à l'URL.

- **Sans lui** : chaque clic sur « Cart » rechargerait tout, comme une page web sans rapport avec la précédente.
- **Avec lui** : l'état React (et le cache TanStack) survit à la navigation.
- ⚠️ Il est dans le `package.json` **racine** au lieu du client (tâche de la roadmap).

### `axios`

Il centralise **à un seul endroit** la configuration des requêtes. Dans ce projet (`api/axios.ts`) :

- l'en-tête de session, ajouté par un **intercepteur de requête** ;
- les toasts d'erreur, déclenchés par un **intercepteur de réponse**.

**Pourquoi pas `fetch` ?** Les intercepteurs, et surtout : **`fetch` ne rejette pas sur un 404 ou un 500**, il ne rejette que sur une panne réseau, et il faut tester `response.ok` soi-même. `axios` rejette sur tout statut d'erreur. D'où l'inutilité du `if (!response) throw` dans la `queryFn`.

### `@tanstack/react-query`

Il résout un seul problème : **garder fraîche** une donnée qui vient du serveur.

**Il ne fait aucune requête HTTP lui-même** : il appelle ta `queryFn`, qui appelle `axios`.

| | Rôle | Analogie |
|---|---|---|
| `axios` | le **transport** | `QTcpSocket` |
| TanStack Query | le **cycle de vie de la donnée** : cache, partage entre composants, périmé/frais, refetch, invalidation | ton modèle de données |

*Voir le guide `docs/tanstack-query.md` pour la migration en cours.*

### `react-hot-toast`

Il affiche des **messages dans une petite bulle** (pas seulement des erreurs). Deux pièces :

| Pièce | Rôle |
|---|---|
| `toast(...)` | une fonction qu'on peut appeler **de n'importe où**, même hors React (c'est ce que fait l'intercepteur d'`axios.ts`) |
| `<Toaster />` | le **seul composant** qui les affiche (dans `AppLayout`) |

**Sans `<Toaster />`**, `toast()` ne plante pas mais n'affiche **rien** : c'est un signal que personne n'écoute. Le drapeau `skipToast`, passé dans `Section`, coupe l'affichage pour une requête.

### `react-zoom-pan-pinch`

Un **composant tiers** prêt à l'emploi : il rend la zone des sièges zoomable et déplaçable, pour afficher plus que l'espace réellement disponible. Il applique une transformation CSS (translation et échelle) et gère les gestes souris et tactiles.

---

## Les modules d'outillage

### `vite`

Il fait **deux métiers**, et il est **indépendant de React** (on l'utilise aussi avec Vue, Svelte, Solid, ou du JavaScript simple) :

| Commande | Ce qu'il fait | Analogie Qt |
|---|---|---|
| `pnpm dev` | un **serveur de développement** : sert les fichiers à la demande, les transforme au vol, et fait du **HMR** (remplacement à chaud : tu modifies un fichier, le navigateur le remplace sans recharger) | le live reload de QML |
| `pnpm build` | **assemble** tout le projet en quelques fichiers statiques minifiés (le *bundle*), prêts à être déposés sur un serveur web | la compilation en release + `rcc` |

### `@vitejs/plugin-react`

Il ajoute à Vite ce qui est propre à React. Le principal est le **Fast Refresh** : quand tu modifies un composant, il est remplacé à chaud **en conservant ses `useState`**. Sans lui, la page se rechargerait entièrement à chaque modification, et tu perdrais ton état.

### `typescript` et `@types/*`

- **`tsc` vérifie les types.** Dans ce projet il ne produit rien (`--noEmit`). **Vite ne vérifie pas les types** : il les efface simplement. Une erreur de type n'empêche donc pas `pnpm dev` de tourner, d'où le `Ctrl+Shift+B`.
- **`@types/react`** : `react` est écrit en JavaScript et ne contient aucune information de type. `@types/react` les fournit, séparément. C'est l'équivalent des **fichiers `.h`** d'une bibliothèque dont tu n'as que le binaire.
- Certains paquets embarquent leurs propres types (`axios`, `@tanstack/react-query`) et n'ont donc pas de `@types/...`.

### `oxlint`

C'est un **linter**, pas un linker : l'équivalent de `clang-tidy` ou `cppcheck`.

**Comment il fonctionne :**

1. il **parse** le fichier en arbre syntaxique, comme un compilateur ;
2. il **parcourt** l'arbre en appliquant des **règles**, chacune cherchant un motif précis ;
3. il **signale** chaque occurrence, avec la position et une aide.

Il ne **compile pas** et n'**exécute pas** ton code. Il cherche des motifs, il ne prouve rien : il peut donc se tromper dans les deux sens.

**`tsc` et `oxlint` ne vérifient pas la même chose :** `tsc` vérifie que le code est **cohérent**, `oxlint` vérifie qu'il est **sain**.

**Un exemple C++ avec `clang-tidy`** (valide pour le compilateur, suspect pour l'outil) :

```cpp
std::string name = getName();
std::string copy = std::move(name);
std::cout << name.size();
```

```
main.cpp:3:15: warning: 'name' used after it was moved [bugprone-use-after-move]
```

**Un exemple de ce projet : la règle `react/rules-of-hooks`.** J'ai reproduit ton premier jet (un `useQuery` au niveau du module) dans un fichier temporaire. Voici ce qu'`oxlint` aurait dit :

```
error react-hooks(rules-of-hooks): React Hook "useQuery" cannot be called at the top level.
error react-hooks(rules-of-hooks): React Hook "useQuery" is called conditionally.
```

Il aurait donc attrapé l'erreur **à l'écriture**, au lieu d'un plantage au chargement.

**Mais il est passif** : il n'a rien empêché, parce qu'il ne tourne que si tu le lances. Il est lancé par `pnpm lint`, par `pnpm check` (et `Ctrl+Shift+B`), et en direct dans l'éditeur par l'extension **Oxc**.

**Ce qu'il signale à ce jour (8 avertissements, 0 erreur) :**

| Où | Règle | Ce que ça dit |
|---|---|---|
| `Section.tsx:59` | `exhaustive-deps` | le `useEffect` lit `navigate` sans le déclarer : risque de *stale closure* |
| `Toolbar.tsx:15` | `set-state-in-effect` | l'**état dérivé** : `setIsHome` dans un effet, à calculer pendant le rendu |
| `cart-context.tsx:40` | `set-state-in-effect` | même motif sur le chargement initial, sans gravité ici (disparaît avec TanStack Query) |
| `cart-context.tsx:20` | `only-export-components` | un fichier qui exporte un composant **et** un hook casse le Fast Refresh |
| `Section.tsx:24`, `EventSelector.tsx:18` | `no-empty-pattern` | `({})` comme paramètre de props vide : à retirer |
| `Section.tsx:33` | `no-irregular-whitespace` | un espace insécable collé dans le code |
| `EventSelector.tsx:27` | `immutability` | `updateEvents` est lu avant d'être déclaré |

### `@tanstack/react-query-devtools`

Un panneau qui montre le contenu du cache de TanStack Query : chaque clé et son état (`fetching`, `fresh`, `stale`). Il est en **`devDependencies`** parce que c'est un outil de développement : il est conçu pour ne rien afficher en production, mais le garder hors de `dependencies` le rend explicite.

### `vite-plugin-terminal`

Il redirige les `console.log` du **navigateur** vers **le terminal** où tourne `pnpm dev` (réglage `console: 'terminal'` dans `vite.config.ts`). Tes `console.log` de `EventSelector` s'affichent donc à côté des logs du serveur, sans ouvrir les DevTools du navigateur.

---

## Récapitulatif : qui fait quoi quand tu cliques sur « Cart »

1. **`react-router-dom`** change l'URL et choisit le composant à afficher, sans rechargement.
2. **`react`** exécute le composant, **`react-dom`** met à jour le DOM.
3. **`@tanstack/react-query`** regarde dans son cache si la donnée est fraîche ; sinon il appelle la `queryFn`.
4. **`axios`** envoie la requête, avec l'en-tête de session ajouté par l'intercepteur.
5. En cas d'erreur, l'intercepteur appelle **`toast()`**, et **`<Toaster />`** l'affiche.
