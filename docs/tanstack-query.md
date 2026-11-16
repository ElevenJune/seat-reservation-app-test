# Migration vers TanStack Query

Branche : `feature/tanstack-query`, créée depuis `feature/cart-badge`. C'est **elle** qu'on fusionne dans `develop`.
Migration commitée dans `b2edd8e`. Le récap complet avec schémas : [`tanstack-query-recap.md`](tanstack-query-recap.md).

## 🎯 La destination

L'état serveur (panier, sièges réservés, puis sièges d'un événement) vit dans **un cache partagé**.
Les composants s'y **abonnent** ; les écritures déclarent **ce qu'elles ont rendu périmé** ; la
bibliothèque refetch et prévient les abonnés. À l'arrivée, `CartContext` n'existe plus, et aucun
composant n'appelle `apiClient.get` dans un `useEffect`.

**Pourquoi :** la version contexte (`docs/cart-badge.md`) a montré les limites d'un état serveur
fait main :

| Limite constatée | Ce qui la règle |
|---|---|
| `refresh()` oublié → badge faux | l'invalidation est écrite **une fois**, dans la mutation |
| Expiration côté serveur ignorée | `refetchInterval` |
| Deux onglets désynchronisés | `refetchOnWindowFocus` (actif par défaut) |
| Deux `GET /cart` sur la page Cart | même clé = **une** requête, **un** cache |
| `0` impossible à distinguer de « inconnu » | `isPending`, `isError` |
| Re-rendus de tous les consommateurs | seuls les abonnés à la clé ; avec `select`, seulement si le résultat sélectionné change |

## 🧠 Le modèle mental

| Qt / QML | TanStack Query |
|---|---|
| un modèle C++ central exposé une fois | `QueryClient` : un cache clé → donnée, exposé par **un seul** provider |
| un binding sur `cart.count` | `useQuery({ queryKey: ["cart"] })` : un **abonnement** à une entrée du cache |
| `emit dataChanged()` | `invalidateQueries({ queryKey: ["cart"] })` |
| un `Q_INVOKABLE` qui modifie le modèle | `useMutation` : une écriture, puis une invalidation |

**Le changement de posture :** avec le contexte, tu savais *quand* rafraîchir et tu le faisais.
Ici, tu déclares *quelle donnée* correspond à *quelle clé*, et *quelle écriture* rend *quelle clé*
périmée. Le reste (refetch, dédoublonnage, diffusion), c'est la bibliothèque.

**Ce qui reste différent de QML :** il n'y a toujours pas de suivi automatique des dépendances.
La `queryKey` joue le rôle du tableau de dépendances : tout ce qui fait varier la requête doit y être.

---

## ✅ Déjà fait (notes)

### Installation et reformatage
- `6ae6268` : reformatage Prettier de `cart-context.tsx`, isolé pour que le diff de migration ne
  contienne que du fond.
- `@tanstack/react-query` (dépendance) et `@tanstack/react-query-devtools` (**devDependency** :
  outil de dev, absent du bundle de prod).

### Le provider (dans `main.tsx`)
- `<QueryClientProvider client={queryClient}>` enveloppe toute l'application. C'est **le seul**
  provider pour tout l'état serveur : ton 👎 « un provider par contexte » disparaît.
- `<ReactQueryDevtools />` à l'intérieur : un panneau qui montre chaque clé du cache et son état
  (`fetching`, `fresh`, `stale`). C'est ta fenêtre sur ce qui se passe.
- **Le `QueryClient` est créé au niveau du module** (`const queryClient = new QueryClient()` avant
  `createRoot`), plus dans `App()`. Pourquoi : `App()` est une fonction de rendu, rappelée à chaque
  rendu ; un `QueryClient` créé dedans serait recréé, donc **le cache serait vidé**. Au niveau du
  module, il est évalué une seule fois à l'`import` (≈ un objet `static` créé avant `main()`) et
  vit aussi longtemps que la page. Il est passé au provider par la prop `client`.

### Étape 1 : le badge lit le cache
- **`api/cart.ts`** : le hook `useCartContent()` encapsule `useQuery` avec la clé `CART_KEY`. Le
  **transport** (`apiClient`, axios) reste séparé de la **requête** (clé + fonction de lecture) :
  si on change de bibliothèque HTTP, seule la `queryFn` bouge. On exporte le hook, pas son résultat.
- **`Toolbar.tsx`** : `const { data: content } = useCartContent()`, puis `content?.lockedSeats.length`.
  Le badge est `undefined` tant que la donnée n'est pas là, et `Cart` s'affiche seul : il se dégrade
  sans faire disparaître la barre (pas de `return` anticipé).

### Leçons du premier jet
Premier essai : `export const { data, isPending, error } = useQuery(...)` au niveau du module.

- **Un hook s'appelle pendant le rendu d'un composant**, ou dans un autre hook. Au niveau du
  module, il s'exécute une seule fois à l'`import`, sans fiber ni provider → erreur.
- **Même si ça marchait, la valeur serait figée.** Une `const` exportée est une copie faite une
  fois, sans `NOTIFY`. Ce qu'on exporte, c'est **le hook** ; chaque composant l'appelle et s'abonne.
- **« Accessible de partout »** = un cache partagé + des abonnements, pas une variable partagée.
- **Une clé nomme la donnée serveur**, pas une vue dérivée : `["cart"]` plutôt que `["cartCount"]`.
- **axios rejette déjà** sur erreur réseau ou 4xx/5xx : inutile de tester `if (!response)`.

### Étape 2 : les écritures passent par des hooks
- **Trois rôles, trois endroits** : la fonction sait *comment* parler au serveur (`lockSeat`, axios),
  le hook sait *ce que ça change* (`useLockSeat` : `useMutation` + invalidation), le composant sait
  *quand* le demander (`mutate`). Aucun composant ne « contient » `useMutation` : il appelle le hook.
- **`useMutation` n'est valable que dans un composant ou un hook** (comme `useQuery`) ; le client
  vient de `useQueryClient()`.
- **Signature : `mutationFn(variables) => Promise`**, **un seul** paramètre → un objet pour
  `{ seatId, action }`. Le 2e argument de `mutate` porte des options **propres à l'appel**.
- **Une invalidation partagée** : `useLockSeat` et `useBookSeat` gardent chacun leur `mutationFn`
  (deux actions, deux signatures, donc **on ne les fusionne pas**) mais appellent la même
  `invalidateSeatState(queryClient)`, qui parcourt `SEATS_STATE` (la liste des clés, rangée à côté
  des clés dans `cart.ts`). Une nouvelle clé = une ligne, à un seul endroit.
- **`Promise.all` + `return`** dans `onSuccess` : sinon la mutation se termine avant la fin des
  refetch et `isPending` retombe trop tôt. Un tableau de promesses n'est pas une promesse.
- **Callback du hook vs de l'appel** : ce qui doit arriver quoi qu'il arrive va dans le hook ; ce
  qui ne concerne que l'écran (`updateSeats`) va à l'appel, en `onSettled` (pas `onSuccess`) pour
  se remettre d'accord avec le serveur même après un échec.
- **`Section.tsx`** : `lockSeat.mutate({ seatId, action }, { onSettled: () => updateSeats(eventId) })`.
  **Pont temporaire** : `updateSeats` relit à la main des sièges qui sont encore un `useState`.

### Étape 3 : la page Cart lit le cache
- `Cart.tsx` n'a plus ni `useState` pour les données, ni `useEffect` de chargement.
- **Les sièges réservés sont une 2e ressource** (`BOOKED_SEATS_KEY`, `useBookedSeats()`), pas « la même
  requête rappelée » : même type de réponse (`GetUserCartResponse`), endpoint différent.
- **Pourquoi la mettre dans le cache** : pas pour la partager (un seul lecteur), mais parce que
  **deux actions la modifient** (`book`, `cancel`). La mutation déclare « ça a changé » une fois, au
  lieu que chaque appelant relance la lecture.
- **États écrits sans ternaires imbriqués** : une fonction `renderCart()` / `renderBookedSeats()` avec
  `if (isPending) … if (isError) … if (vide) … return list`. Garder l'objet de requête entier pour
  que TypeScript réduise le type de `data`. « Cart is empty » ne s'affiche plus pendant le chargement.

### Les clés : pièges rencontrés (tous silencieux)
| Piège | Cause |
|---|---|
| `[CART_KEY]` avec `CART_KEY = ['cart']` | `[['cart']]` ne commence pas par `['cart']` : rien n'est invalidé |
| `CART_KEY.concat(...BOOKED_SEATS_KEY)` | crée **une 3e clé** inexistante ; 2 entrées = 2 invalidations |
| `for (let key in tableau)` | `in` énumère les indices (`"0"`), pas les valeurs : `for…of` / `map` |
| `as const` sur une variable | ne s'applique qu'à un littéral ; sert à figer la **définition** des clés |

Une clé est comparée **par contenu** et peut être interrogée **par préfixe** (arborescence de chemins,
`['events', 3]` invalide aussi `['events', 3, 'seats']`). Pas de fabrique de clés pour deux clés fixes ;
elle devient utile à la première clé **paramétrée** (étape 5).

### Étape 4 : le contexte a disparu
- `cart-context.tsx` supprimé, `<CartProvider>` retiré de `AppLayout`, plus aucun import. Rien ne casse.

### Au passage : dépôt git déplacé à la racine
- Le dépôt vivait dans `apps/`, donc `pnpm-lock.yaml`, le `package.json` racine, `pnpm-workspace.yaml`
  et `.vscode/` étaient hors git. Déplacé sans réécrire l'historique (commit `1e1b6da`, 61 renommages
  détectés, `git log --follow` fonctionne). Détail dans le récap, section 11.

---

## 📍 Où tu en es

**La migration est terminée et commitée** (`b2edd8e`) : typecheck sans erreur, oxlint sans
avertissement dans les fichiers de la branche (les 6 restants datent d'avant). Plus de contexte, plus
de `refresh()` nulle part.

Il ne reste que des **finitions** et une **dette assumée**.

**Finitions (facultatives, petites) :**
- Messages d'erreur : `"Error: " + error` affiche l'objet brut. `getApiErrorMessage` existe déjà.
- `select` sur `useCartContent` pour dériver le décompte du badge à côté de la requête.
- Ligne commentée restante dans `Cart.tsx`, `mutate(undefined)`, test `hidden` du bouton « Réserver »
  qui recalcule `lockedSeats.length`.
- Où afficher l'erreur : un toast global sur le `QueryCache` ou l'intercepteur axios, **un seul** des deux.

**Dette assumée :**
- `Section.tsx` est à cheval sur deux mondes (`updateSeats` à la main). C'est l'étape 5, qui mérite
  **sa propre branche** : clés paramétrées, `refetchInterval` à la place du `setInterval` maison.

## 🧭 La route

### Avant de fusionner : valider la branche

Reprends le tableau « Limite constatée » et **teste chaque ligne** dans le navigateur (voir la section
suivante). Si tout passe, relire le diff dans git-cola, puis fusionner `feature/tanstack-query` dans `develop`.

Repères :
- Les autres branches gardent les anciens chemins (`client/…` au lieu de `apps/client/…`) : la
  fusion verra des renommages. Que se passe-t-il si `develop` a bougé entre-temps ?

### (Optionnel, autre branche) Étape 5 — Les sièges d'un événement

**État visé :** `Section.tsx` lit les sièges dans le cache, et le `setInterval` maison disparaît.

Repères :
- La clé dépend de l'événement : comment l'exprimer ? C'est le moment de la **fabrique de clés**.
- Verrouiller un siège change **trois** données serveur (panier, réservés, sièges de l'événement) :
  qui doit connaître cette liste ?
- Que deviennent `timerRef`, le nettoyage de l'intervalle et le faux `setTimeout` de chargement ?
- Le callback `onSettled` de `Section` doit-il survivre ?

---

## 🏁 Comment savoir que tu es arrivé

- `pnpm typecheck` (ou `Ctrl+Shift+B`) → 0 erreur. ✅
- Badge juste au chargement, après chaque action, **sans aucun `refresh()`** dans le code.
- Page Cart : **un seul** `GET /cart` dans l'onglet Réseau, et le badge toujours d'accord avec la liste.
- Réserver : le panier se vide et les réservés se remplissent, sans recharger. Annuler : idem.
- Deux onglets : verrouiller dans l'un, revenir sur l'autre → à jour.
- Serveur coupé : l'erreur se voit au lieu d'un `0` silencieux.
- Reprends le tableau « Limite constatée » en haut : chaque ligne doit être réglée.

## 🔍 La contrepartie, à observer en route

- `staleTime` vaut 0 par défaut : chaque montage ou retour sur l'onglet refetch. Essaie une autre valeur et compare.
- 3 nouvelles tentatives par défaut en cas d'erreur : l'erreur arrive après plusieurs secondes.
- L'intercepteur de toast d'axios se déclenche-t-il à chaque tentative ?

## Commits

- [x] `6ae6268` Reformatage de `cart-context.tsx`
- [x] `b2edd8e` Migrate cart state to TanStack Query (provider, lectures, mutations, contexte supprimé)
- [x] `1e1b6da` Move repository root up one level
- [ ] Relecture du diff dans git-cola, tests des limites, puis fusion dans `develop`
