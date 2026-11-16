# Badge du panier — version « contexte » (pédagogique)

Branche : `feature/cart-badge` (depuis `develop`).
Objectif : afficher `Cart (3)` dans la Toolbar, puis **observer les limites** d'un contexte
fait main pour de l'état serveur, avant de migrer vers TanStack Query.

## Le modèle mental

| QML | React |
|---|---|
| `rootContext()->setContextProperty("cart", cartModel)` | `<CartContext value={...}>` |
| lire `cart.count` dans n'importe quel QML enfant | `useCart()` dans n'importe quel composant enfant |
| `NOTIFY` sur la propriété `count` | changement de `value` → **re-rendu** des composants qui la lisent |
| singleton QML : `import MyApp 1.0` puis `Cart.count` | `import { useCart }` puis `useCart().count` |

Deux différences avec QML :
- **Pas de réactivité fine.** Quand `value` change, chaque composant qui lit le contexte
  **réexécute toute sa fonction**, même s'il n'utilise que `refresh`.
- **Le contexte se trouve par position dans l'arbre** : le `Provider` le plus proche *au-dessus*.
  Sans `Provider`, on reçoit la valeur par défaut de `createContext` (`null` ici).

## Les trois pièces

| Pièce | Rôle | Équivalent Qt |
|---|---|---|
| `CartContext` | le canal, il ne stocke rien | le **nom** `"cart"` de `setContextProperty` |
| `CartProvider` | **possède** l'état (`count`), `refresh`, publie `value` | le `QObject` `CartModel` + l'appel `setContextProperty` |
| `useCart()` | **lit** le contexte, `throw` si `null` | lire `cart.count` en QML |

`AppLayout` ≈ `main.cpp` : il instancie le provider, mais ne possède rien.

**Le cas `null`** (« pas de Provider ») est traité une fois, dans `useCart`. Après le `throw`,
le type est réduit à `CartContextType`, donc plus besoin de `?.` chez les appelants.
Si l'erreur est levée, c'est pendant le rendu : elle remonte jusqu'à l'Error Boundary la plus
proche. Ici, c'est celle de `createBrowserRouter`, qui affiche « Unexpected Application Error! ».
C'est une erreur de programmation (≈ `Q_ASSERT`), on ne l'attrape pas.
Test : retirer temporairement `<CartProvider>` de `AppLayout`.

## v1 ✅ — commit `15a0fe4`

- [x] `context/cart-context.tsx` : `CartContext`, `CartProvider`, `count`, `refresh`
- [x] `types/cart.ts` : `CartContextType`
- [x] `AppLayout` : `<CartProvider>` autour de `Toolbar` + `main`
- [x] `Toolbar` affiche `Cart (n)`
- [x] `refresh()` après `toggleSeat` (Section), `removeSeat` et `bookSeats` (Cart)
- [x] `cancelSeat` : pas de `refresh`. Correct : un siège réservé n'est plus dans le panier.

**Ressenti :**
- 👍 Tout est défini au même endroit, et accessible de partout.
- 👎 Le `<CartProvider>` dans `AppLayout` : lourd s'il faut en ajouter un par contexte.
- 👎 Importer `CartContext` **et** `useContext` partout, plus les `?.`.

## v2 — améliorations

### Ergonomie (répond aux 👎) ✅ — commit `ed26981`

- [x] **Hook `useCart()`** avec `use(CartContext)` (API React 19) + `throw` si `null`.
      `Section`, `Cart` et `Toolbar` l'utilisent, sans `?.`.
- [x] `CartContextType` déplacé dans `cart-context.tsx`, `types/cart.ts` supprimé.
- [x] `CartProvider` en `function` avec des props typées (≈ `React.FC`, même résultat).
- [x] `CartContext` n'est plus exporté : `useCart` est l'API publique.
- [x] `<CartContext value={...}>` (React 19) au lieu de `.Provider`.
- [ ] (Plus tard, au 2ᵉ contexte) Un composant `AppProviders` qui empile tous les providers.

### Correction ✅ (en cours, pas encore commité)

- [x] **Chargement initial dans le provider** : `useEffect(() => { refresh(); }, [refresh])`.
      `Toolbar` n'appelle plus `refresh()`, c'est une vue pure.
- [x] **`refresh` stable** : `useCallback(async () => {...}, [])`. Fusionné avec `getUserCart`.
- [x] **`value` stable** : `const value = useMemo(() => ({ count, refresh }), [count, refresh])`.
- [x] Badge masqué à 0.
- [ ] (Optionnel) Une pastille CSS, et une espace dans `Cart (3)`.

**À retenir :**
- **Le tableau de dépendances** = ce que l'effet (ou le memo) **lit**. React compare chaque
  élément avec `===` et relance s'il a changé. En QML, les dépendances d'un binding sont
  découvertes automatiquement ; en React, on les écrit soi-même (≈ faire ses `connect()` à la main).
  Une dépendance oubliée → *stale closure* (la lambda voit une valeur périmée).
- **Pourquoi l'identité change** : le corps du composant est réexécuté à chaque rendu, donc
  `() => …` et `{…}` sont de **nouveaux objets** (même contenu, autre adresse).
  - Sans `useCallback` : effet `[refresh]` → `GET` → `setCount` → nouveau `refresh` → effet relancé
    → `GET` de trop. Boucle **infinie** si l'état est un objet (`setCart(response.data)`).
  - Sans `useMemo` : nouveau `value` à chaque rendu du provider → tous les consommateurs se re-rendent.
- **Pourquoi ce n'est pas le défaut** : recréer est toujours *correct* (la fonction voit l'état
  courant). Mémoriser est une *optimisation*, qui exige de connaître les dépendances. React ne
  les voit pas (pas de `NOTIFY`). Le **React Compiler** (plugin de build ≈ `moc`) les ajoute automatiquement.
- **`useMemo(factory, deps)`** : on passe une **fonction** pour une évaluation paresseuse (≈ un
  cache `getOrCreate(key, lambda)`), et on **récupère la valeur de retour**. L'appeler sans stocker
  le résultat ne sert à rien.
- **Où vit l'état** : le rendu ≈ `paintEvent()` (ses locales meurent à la fin) ; la *fiber* ≈
  l'instance du widget. `useState` / `useMemo` / `useCallback` = « range ça dans un membre »,
  retrouvé par l'ordre d'appel des hooks (d'où : pas de hook dans un `if`, sauf `use`).

### Propreté

- [x] `refresh` et `getUserCart` fusionnés.
- [ ] Importer `GetUserCartResponse` via la façade `@server/constants/types`, comme ailleurs.
- [ ] Nommage : la variable `useCartContext` dans `useCart` → `ctx` (le préfixe `use` est réservé aux hooks).
- [ ] `Section.tsx` : le renommage `PublicSeat as SeatType` est hors sujet.

## Vérifier

- [ ] `pnpm typecheck` (ou `Ctrl+Shift+B`) → 0 erreur
- [ ] Recharger la page avec un siège déjà verrouillé → le badge affiche 1 **d'emblée**
- [ ] Verrouiller un siège → le badge passe à 1 **sans recharger**
- [ ] Le retirer depuis le panier → le badge baisse
- [ ] Réserver → le badge disparaît

## 🔍 Les limites à observer (le but de l'exercice)

Note ce que tu constates : ce sera ta liste de « pourquoi TanStack Query ».

- [ ] **Rafraîchissement oublié.** Retire un des `refresh()` : le badge devient faux, et rien ne
      te prévient. Chaque nouvelle action devra penser à l'appeler.
- [ ] **Expiration côté serveur.** Verrouille un siège, attends 10 min : le serveur libère le
      siège, le badge affiche toujours 1.
- [ ] **Deux onglets.** Même session (même `localStorage`), verrouille dans l'un : l'autre ne le sait pas.
- [ ] **Requêtes en double.** Sur la page Cart, `refresh()` *et* `getUserCart()` appellent tous
      les deux `GET /cart` (onglet Réseau). Deux sources pour la même donnée.
- [ ] **Pas d'état de chargement ni d'erreur.** `count` vaut 0 pendant le chargement, et reste 0
      si le serveur ne répond pas : impossible de distinguer « vide » de « inconnu ».
- [ ] **Re-rendus inutiles.** `Section` et `Cart` n'utilisent que `refresh`, mais se re-rendent
      à chaque changement de `count` (React DevTools → Profiler → « Highlight updates »).
- [ ] (Bonus) `StrictMode` en dev : deux `GET /cart` au démarrage. Normal, absent en production.

## Commits

- [x] `15a0fe4` First version of cartContext
- [x] `ed26981` Refactored to useCart
- [ ] Stabilité (`useCallback` / `useMemo`) + chargement initial dans le provider + badge masqué à 0
- [ ] Petits nettoyages (façade, nommage)
- [x] Vérifications faites. Cette branche n'a pas été fusionnée seule : ses commits sont entrés dans
  `develop` avec la migration TanStack Query (`02d4c0e`), qui a supprimé le contexte.
