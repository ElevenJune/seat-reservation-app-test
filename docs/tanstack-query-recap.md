# TanStack Query — récap de la migration (notes de cours)

Branche `feature/tanstack-query` (commit `b2edd8e`). Ce document sert à **retrouver l'idée** sans
relire toute la session. Le guide de route est dans `docs/tanstack-query.md`.

---

## 1. Le problème qu'on résout

Deux sortes d'état dans une app React :

| | État **client** | État **serveur** |
|---|---|---|
| Exemple | thème, onglet ouvert, champ en cours de saisie | panier, sièges, événements |
| Qui fait foi | le navigateur | **la base de données** |
| Peut devenir faux sans que tu le saches ? | non | **oui** (verrou expiré, autre onglet, autre utilisateur) |
| Outil | `useState`, contexte | **TanStack Query** |

Avec un contexte fait main, tu devais **toi-même** appeler `refresh()` après chaque action. Limites
observées, et ce qui les règle :

| Limite constatée | Réglée par |
|---|---|
| `refresh()` oublié → badge faux | l'invalidation est écrite **une fois**, dans la mutation |
| Expiration côté serveur ignorée | `refetchInterval` |
| Deux onglets désynchronisés | `refetchOnWindowFocus` (actif par défaut) |
| Deux `GET /cart` sur la page Cart | même clé = **une** requête |
| `0` indistinguable de « inconnu » | `isPending`, `isError` |

---

## 2. Les briques, en une table

| TanStack Query | Rôle | Équivalent Qt / QML |
|---|---|---|
| `QueryClient` | le **cache** : `clé → donnée` | un modèle C++ central, instancié une fois (≈ `static`) |
| `QueryClientProvider` | l'expose à tout l'arbre | `setContextProperty` |
| `useQuery({ queryKey, queryFn })` | **s'abonner** à une entrée, la remplir si absente | un binding sur une propriété du modèle |
| `queryKey` | l'**identifiant** de l'entrée | la clé d'un `QHash`, mais **hiérarchique** |
| `queryFn` | **comment** lire la donnée (appelle axios) | la requête que le modèle sait faire |
| `useMutation({ mutationFn })` | **une écriture** vers le serveur | un `Q_INVOKABLE` qui modifie le modèle |
| `invalidateQueries({ queryKey })` | « cette donnée a changé, relis-la » | `emit dataChanged()` |
| `isPending` / `isError` / `data` | l'**état** du binding | `status`/`error` d'un `XMLHttpRequest` ou d'un `Loader` |

**Le changement de posture :** avant, tu savais *quand* rafraîchir. Maintenant tu déclares *quelle
donnée* correspond à *quelle clé* et *quelle écriture* rend *quelle clé* périmée. Le refetch, le
dédoublonnage et la diffusion aux abonnés, c'est la bibliothèque.

**Ce qui reste différent de QML :** pas de suivi automatique des dépendances. La `queryKey` joue le
rôle du tableau de dépendances de `useEffect` : tout ce qui fait varier la requête doit y être.

---

## 3. Où vit quoi (l'architecture finale)

```
 main.tsx
   const queryClient = new QueryClient()      ← module-level : créé UNE fois (≈ static)
   <QueryClientProvider client={queryClient}> ← expose le cache à toute l'app
        <App/>

 api/axios.ts       transport (axios, intercepteur de toasts)
 api/cart.ts        CART_KEY, BOOKED_SEATS_KEY, SEATS_STATE  +  useCartContent(), useBookedSeats()   (LECTURES)
 api/seats.ts       lockSeat(), invalidateSeatState()        +  useLockSeat(), useBookSeat()          (ÉCRITURES)

 components/
   Toolbar.tsx  ─ useCartContent()                  (badge)
   Cart.tsx     ─ useCartContent(), useBookedSeats(), useLockSeat(), useBookSeat()
   Section.tsx  ─ useLockSeat()                     (+ updateSeats à la main : pont temporaire)
```

**Dépendance entre fichiers :** `seats.ts` importe les clés de `cart.ts`, jamais l'inverse. Les
écritures savent ce qu'elles changent ; les lectures ne connaissent pas les écritures.

---

## 4. Les trois rôles d'une écriture

C'est le point qui m'a demandé le plus de temps : **quel composant contient `useMutation` ?**
Réponse : **aucun**. La définition est dans `api/seats.ts`, les composants l'**appellent**.

```
 api/seats.ts  (DÉFINITIONS, aucun composant ici)
┌──────────────────────────────────────────────────────────────┐
│  ① lockSeat(...)         fonction pure : axios → serveur     │
│          ▲                                                   │
│          │ utilisée par                                      │
│  ② useLockSeat()         le hook = ton « SeatController »    │
│     │  enveloppe useMutation(① + invalidations)              │
│     │  retourne { mutate, isPending, isError }               │
└─────┼────────────────────────────────────────────────────────┘
      │ importé et APPELÉ par chaque composant qui en a besoin
      ├───────────────────────┬──────────────────────┐
      ▼                       ▼                      ▼
 ┌──────────┐           ┌──────────┐           ┌──────────┐
 │ Section  │           │  Cart    │           │ (autre)  │
 │ ③ const  │           │ ③ const  │           │          │
 │ lockSeat │           │ lockSeat │           │          │
 │ =useLock │           │ =useLock │           │          │
 │  Seat()  │           │  Seat()  │           │          │
 └────┬─────┘           └────┬─────┘           └──────────┘
      │ onClick → mutate()   │ onClick → mutate()
      └──────────┬───────────┘
                 ▼
        QueryClient (cache unique) ◄── invalidations faites par le HOOK, pas le composant
                 ▼ notifie les abonnés
        Toolbar, Cart, Section… (re-rendu)
```

> **La fonction sait *comment* parler au serveur, le hook sait *ce que ça change*, le composant
> sait *quand* le demander.**

- Le hook est un contrôleur **instancié par chaque vue** : chaque appel a son propre `isPending`.
  Ce qui est unique et partagé, c'est le **cache**.
- Un composant qui **ne déclenche rien** (la Toolbar) n'appelle pas `useLockSeat`.

---

## 5. Séquences (qui appelle qui)

### Lecture : la Toolbar s'abonne

```
 Toolbar        useQuery        QueryClient       queryFn+axios      Serveur
    │               │             (cache)               │               │
    │ useCartContent()            │                     │               │
    │──────────────►│             │                     │               │
    │               │ ["cart"] ?  │                     │               │
    │               │────────────►│                     │               │
    │               │  absent     │                     │               │
    │               │◄────────────│                     │               │
    │ isPending     │             │   lance queryFn     │               │
    │◄──────────────│─────────────┼────────────────────►│  GET /cart    │
    │               │             │                     │──────────────►│
    │               │             │                     │  { lockedSeats }
    │               │             │                     │◄──────────────│
    │               │             │ stocke ["cart"]     │               │
    │               │             │◄────────────────────│               │
    │ data (re-rendu, abonné)     │                     │               │
    │◄──────────────│◄────────────│                     │               │
```

### Écriture : un clic sur un siège

```
 Section       useMutation      axios         Serveur       QueryClient      Toolbar
    │ mutate({seatId,action})     │              │            (cache)         (abonné)
    │────────────────►│  POST lock│              │               │               │
    │                 │──────────►│─────────────►│               │               │
    │                 │           │      200 OK  │               │               │
    │                 │◄──────────┼──────────────│               │               │
    │                 │ onSuccess : invalidateSeatState()        │               │
    │                 │ invalidateQueries(["cart"]) + (["booked-seats"])         │
    │                 │─────────────────────────────────────────►│               │
    │                 │           │              │ « périmé » → refetch (abonnés)│
    │                 │           │◄─────────────┼───────────────│               │
    │                 │           │ { lockedSeats }              │               │
    │                 │           │──────────────┼──────────────►│ stocke        │
    │                 │           │              │               │──────────────►│
    │                 │           │              │               │ re-rendu, badge à jour
```

Ce qu'on en retient :
- **La Toolbar et la Section ne se connaissent pas** : elles ne communiquent que par le cache
  (≈ deux widgets qui passent par un modèle commun).
- **Un composant n'appelle jamais le serveur directement** : il y a toujours `queryFn` ou `mutationFn`.
- **L'invalidation est le seul pont** entre « j'ai écrit » et « les abonnés relisent ».

---

## 6. Les clés : le concept qui demande le plus de rigueur

### Ce n'est pas qu'une HashMap

Deux différences avec une `QHash` :
1. La clé est un **tableau**, comparé **par contenu** (deux `['cart']` distincts désignent la même
   entrée). L'ordre du tableau compte ; l'ordre des propriétés d'un objet dedans non.
2. On peut interroger **par préfixe**. Pense à une arborescence de chemins.

```
 ['events']                    ──► liste des événements
 ['events', 3]                 ──► l'événement 3
 ['events', 3, 'seats']        ──► sièges de l'événement 3
 ['events', 4, 'seats']        ──► sièges de l'événement 4
 ['cart']                      ──► panier
 ['booked-seats']              ──► sièges réservés

 invalidateQueries({ queryKey: ['events', 3] })  marque périmées les clés qui COMMENCENT par ça :
       ✔ ['events', 3]      ✔ ['events', 3, 'seats']
       ✘ ['events', 4, 'seats']   ✘ ['events']   ✘ ['cart']
```

C'est comme `rm -r events/3/` : un chemin désigne une branche.

### Les pièges rencontrés (tous **silencieux** : aucune erreur, juste une UI périmée)

| Piège | Pourquoi ça ne marche pas |
|---|---|
| `[CART_KEY]` alors que `CART_KEY = ['cart']` | on passe `[['cart']]` : un tableau dans un tableau ne commence pas par `['cart']` |
| `CART_KEY.concat(...BOOKED_SEATS_KEY)` | produit **une troisième** clé `['cart','booked-seats']` qui ne correspond à rien. Pour deux entrées → **deux** invalidations |
| `for (let key in tableau)` | `in` énumère les **indices** (`"0"`, `"1"`), pas les valeurs. Il faut `for…of` ou `map` |
| `as const` sur une variable | `as const` ne s'applique qu'à un **littéral** écrit sur place |
| Changer une clé de chaîne à tableau | casse tous ses usages sans erreur de compilation : `queryKey` accepte n'importe quel tableau |

### Conventions de la communauté
(Issues de la doc TanStack et des recommandations de son mainteneur « TkDodo » ; à revérifier si besoin.)

1. **Du général au précis**, comme un chemin : `['events']` → `['events', id]` → `['events', id, 'seats']`.
2. **La clé contient tout ce dont dépend la requête** (≈ tableau de dépendances de `useEffect`).
3. **Filtres dans un objet** en fin de clé : `['events', 'list', { status: 'open' }]`.
4. **Une fabrique de clés par domaine** (*query key factory*) plutôt que des littéraux dispersés :
   ```ts
   export const eventKeys = {
     all: ["events"] as const,
     detail: (id: string) => [...eventKeys.all, id] as const,
     seats: (id: string) => [...eventKeys.detail(id), "seats"] as const,
   };
   ```
5. En v5, l'helper **`queryOptions`** regroupe clé + `queryFn` pour les réutiliser partout.
6. **Une clé nomme une ressource serveur**, pas une vue : `['cart']`, pas `['cartCount']`
   (le nombre se dérive avec `select`).

**Décision prise ici :** deux clés fixes, donc **pas de fabrique pour l'instant**. Elle devient utile à
la première clé **paramétrée** (sièges d'un événement, étape 5).

---

## 7. La signature d'une mutation

```
mutationFn: (variables: TVariables) => Promise<TData>
mutate(variables, { onSuccess, onError, onSettled })   // 2e argument = options POUR CET APPEL
```

- **Un seul paramètre.** Deux valeurs (`seatId`, `action`) → un objet. TanStack doit pouvoir stocker
  et rejouer « les arguments de l'appel » (retries, devtools). ≈ un slot qui ne prend qu'un `QVariant`.
- `useBookSeat` n'a **pas de variables** : `mutationFn: () => POST bookSeats`.
- **Ne pas fusionner `lock` et `book`** : deux actions, deux signatures. Ce qui se partage, c'est
  l'**invalidation** (`invalidateSeatState`), pas la mutation. Un `emit seatsChanged()` se factorise
  dans une méthode privée, pas en fusionnant deux slots.

### L'invalidation partagée

```ts
function invalidateSeatState(queryClient: QueryClient) {
  const promises = SEATS_STATE.map((key) =>
    queryClient.invalidateQueries({ queryKey: key }),
  );
  return Promise.all(promises);
}
// useLockSeat et useBookSeat : onSuccess: () => invalidateSeatState(queryClient)
```

Pièges levés en chemin :
- **Un tableau de promesses n'est pas une promesse.** `await` sur un tableau rend le tableau tout de
  suite. Il faut `Promise.all(...)`. Sinon la mutation se termine **avant** la fin des refetch, et
  `isPending` retombe trop tôt (le bouton se réactive avant que les listes soient à jour).
- **Sans `return` dans `onSuccess`**, même effet : la promesse n'est pas attendue.
- **Nommer l'intention** : un nom décrivant les clés d'aujourd'hui (`…CartAndSeats`) devient faux
  quand on en ajoute une. D'où un nom par intention (`invalidateSeatState`) et la liste des clés
  rangée **à côté des clés** (`SEATS_STATE` dans `cart.ts`).

### Callback du hook ou de l'appel ?

| | Où | Exemple |
|---|---|---|
| Doit arriver **quoi qu'il arrive** | dans le **hook** | invalider le panier |
| Ne concerne que **cet écran** | à l'**appel** de `mutate` | relancer `updateSeats` (état local) |

Le callback du hook s'exécute d'abord ; ceux de l'appel **sautent si le composant est démonté**.
`onSettled` plutôt que `onSuccess` pour rafraîchir une liste locale : après un **échec** (siège
pris, quota), l'écran doit aussi se remettre d'accord avec le serveur.
`mutate` gère l'erreur pour toi (`isError`) ; `mutateAsync` renvoie une promesse qui **rejette**
(à `catch`).

---

## 8. Les erreurs : un état, pas une exception

Avant, un `try/catch` autour d'un `await`. Maintenant `useQuery` renvoie un **objet d'état** relu à
chaque rendu.

| Champ | Sens |
|---|---|
| `isPending` | pas encore de donnée (premier chargement) |
| `isError` / `error` | le dernier fetch a échoué ; `error` = ce que la `queryFn` a levé (erreur axios) |
| `data` | la dernière donnée **réussie**, ou `undefined` |

**Trois endroits pour traiter l'erreur :**
1. **Dans le composant**, pour ce qu'il doit afficher (le badge se dégrade seul).
2. **Globalement**, une fois, sur le `QueryClient` (option `onError` du `QueryCache`) : toast, journal.
3. **Barrière d'erreur** (`throwOnError` + error boundary) quand une page n'a plus de sens sans sa donnée.

**Pièges :**
- **Une erreur n'efface pas `data`** : refetch en échec avec une donnée en cache → `isError` **et**
  `data` définis. Choix produit : cacher la liste ou la garder et signaler.
- **3 tentatives par défaut** : l'erreur n'apparaît qu'après quelques secondes (`retry`).
- **Toast en double** : l'intercepteur axios en affiche déjà un ; un `onError` global en ajouterait un
  second (voire un par tentative). Choisir un seul endroit.

### Écrire les états sans ternaires imbriqués

```tsx
function renderCart() {
  if (cartQuery.isPending) return <i>Loading...</i>;
  if (cartQuery.isError)   return <i>{getApiErrorMessage(cartQuery.error)}</i>;
  if (cartQuery.data.lockedSeats.length === 0) return <i>Cart is empty</i>;
  return list;
}
```

Garder l'objet de requête entier (`const cartQuery = useCartContent()`) : TypeScript **réduit le type**
(≈ `match` en Rust) et `data` n'est plus `undefined` après les deux premiers `if`. Quand la forme
apparaît **deux fois** (panier, réservés), c'est la duplication qui désigne le composant à extraire
(`<QueryState>`). Alternative « état de l'art » : `useSuspenseQuery` + `<Suspense>` + `ErrorBoundary`.

---

## 9. Pourquoi mettre `bookedSeats` dans le cache ?

**Idée fausse :** le cache servirait à *partager* entre composants. `bookedSeats` n'est lu que par `Cart`.

**Le vrai gain : qui doit être prévenu quand ça change.** Deux actions modifient les réservés
(`book`, `cancel`). Sans cache, chacune doit relancer la lecture à la main (le `refresh()` oublié du
contexte, déplacé). Avec le cache, la mutation déclare « ça a changé » **une fois**, et on a gratuitement
chargement, erreur, et ancienne donnée affichée tout de suite au retour sur la page.

**Section** (tous les sièges d'un événement) et **Cart** (les sièges d'un utilisateur) sont deux **vues
de la même table**. TanStack ne les relie pas : ce sont deux entrées indépendantes. C'est à la mutation de
lister **toutes** les clés touchées. Ressenti à la fin : *« je n'ai qu'à ajouter une clé à invalider
plutôt que de savoir où placer un refresh »*.

---

## 10. Dette connue (à ne pas oublier)

- **`Section.tsx` est à cheval sur deux mondes** : `updateSeats` relit à la main des sièges qui sont
  encore un `useState` (et un `setInterval` maison). Les mettre dans le cache = étape 5 (clé paramétrée
  `['events', id, 'seats']`, `refetchInterval`), et ce callback disparaîtra.
- **`<CartItem>`** : le JSX de la liste du panier et des réservés est dupliqué.
- Le `select` pour dériver le décompte du badge n'est pas fait (le calcul est dans la Toolbar).

---

## 11. Au passage : le dépôt git déplacé à la racine

Le dépôt vivait dans `apps/` : `pnpm-lock.yaml`, le `package.json` racine, `pnpm-workspace.yaml` et
`.vscode/` étaient **hors git** (installation non reproductible en clonant).

Procédure suivie (aucune réécriture d'historique) :
1. commiter la migration dans l'ancien dépôt (`b2edd8e`) ;
2. **sauvegarder** `.git` ;
3. `mv apps/.git ./.git`, ajouter un `.gitignore` racine ;
4. `git add -u` (modifs et suppressions des fichiers suivis) puis `git add` explicite des nouveaux ;
5. commit `1e1b6da` : git détecte des **renommages** (`client/…` → `apps/client/…`), donc
   `git log --follow` retrouve l'historique ; branches et `origin` conservés.

Rien n'est suivi par défaut dans `docs/` ni les PDF : décision à prendre. Les autres branches gardent
les anciens chemins jusqu'à leur fusion.

---

## 12. Checklist pour retrouver le réflexe

Pour toute **nouvelle donnée serveur** :
1. Quelle **clé** la nomme ? (une ressource, pas une vue ; du général au précis ; tout ce dont elle dépend)
2. Un **hook de lecture** dans `api/<domaine>.ts` ; exporter le hook, jamais son résultat.
3. Côté composant : garder l'objet de requête, traiter `isPending` / `isError` / vide / contenu.

Pour toute **nouvelle action** :
1. Une fonction de transport (axios) + un hook `useMutation` (un seul paramètre `variables`).
2. **Quelles données du serveur changent ?** → ajouter leurs clés à la liste invalidée (et rien d'autre).
3. `Promise.all` + `return` dans `onSuccess` pour que `isPending` dure jusqu'au refetch.
4. Un callback à l'appel **seulement** si c'est propre à l'écran (`onSettled`).

Pour **vérifier** : devtools (la fleur en bas de l'écran) — l'entrée doit passer en *stale* puis *fetching*
après l'action. Une clé qui ne correspond à rien ne fait **rien**, sans erreur.
