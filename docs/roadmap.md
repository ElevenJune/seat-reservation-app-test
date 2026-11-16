# Feuille de route

Failles 1 et 2 ✅ (fusionnées dans `develop`). Tâches classées par valeur / effort.

## 1. Fonctionnalités

- [x] **Badge du panier, version contexte** (pédagogique) → `feature/cart-badge`, guide
      `docs/cart-badge.md`. Branche **jamais fusionnée seule** : base de la migration TanStack Query
      (ses commits sont dans l'historique de `develop` via cette migration).
- [x] **Badge du panier, version TanStack Query** → `feature/tanstack-query` (commit `b2edd8e`), créée
      **depuis `feature/cart-badge`**. Contexte supprimé, panier **et** réservés dans le cache, mutations
      qui invalident. Guide `docs/tanstack-query.md`, récap `docs/tanstack-query-recap.md`.
      **Fusionnée dans `develop`** (merge `02d4c0e`).
- [ ] **Compte à rebours du verrou** : `lockExpiresAt` (seulement si `isMine`) + constante
      serveur `LOCK_TTL_MS` (remplace le `10 * 60 * 1000` en dur)

## 2. Robustesse serveur

- [ ] **Course sur le quota** : `lockSeat` lit puis écrit → 2 requêtes simultanées peuvent
      dépasser 5 sièges. Utiliser `prisma.$transaction`
- [ ] **Modèle d'erreurs** : union discriminée (≈ `std::expected`) ou erreurs métier levées +
      un seul `setErrorHandler` ; codes HTTP justes (409 conflit, 404 introuvable)
- [ ] **Expiration des verrous** : remplacer le `preHandler` (`url.includes("seat")`, écriture
      à chaque GET) par une expiration calculée à la lecture ou un `setInterval`
- [ ] **Session** : cookie `httpOnly` signé, émis par le serveur
- [ ] **Tests** du `seatService` : quota, expiration, propriété

## 3. Architecture (le gros morceau)

- [ ] **`packages/contracts`** : DTO, routes et constantes partagés, sans dépendance à Prisma
  - routes définies une seule fois (aujourd'hui : `API_PATHS` côté serveur ≠ `appRoutes` côté client)
  - `SeatStatus` et `MAX_SEATS_PER_EVENT` (le `5` est écrit 4 fois) partagés
  - corriger le type `Date` côté client (c'est une `string` ISO sur le réseau)
- [ ] Découper `events.routes.ts` par ressource (`events`, `seats`, `me`) ; mêmes couches partout
      (routes → services → Prisma)

## 4. Client

- [x] **TanStack Query**, panier et réservés (`api/cart.ts`, `api/seats.ts`).
- [ ] **TanStack Query, sièges et événements** (**nouvelle branche**) : `Section.tsx` lit le cache,
      `refetchInterval` à la place du `setInterval`, clé paramétrée `['events', id, 'seats']` →
      **fabrique de clés** ; supprime le `updateSeats` à la main (callback `onSettled` de `Section`)
- [ ] **Erreurs** : `getApiErrorMessage` dans `Cart.tsx` au lieu de `"Error: " + error` ; un seul endroit
      pour le toast (`QueryCache.onError` **ou** intercepteur axios, pas les deux) ; `select` pour le décompte du badge
- [ ] **`<QueryState>`** : composant qui traite chargement / erreur / vide / contenu (le motif est écrit
      deux fois dans `Cart.tsx`) ; à rapprocher de `<CartItem>`
- [ ] `types/seat.ts` : retirer `Seat as SeatType`, le type de la **base**. Le client ne reçoit que
      des `PublicSeat`, et le retirer empêche à la compilation de refaire la faille 2. Personne ne l'utilise.
- [ ] Découper `Section.tsx` : `useEventSeats`, `useOverflow`, `<SeatMap>`
- [ ] Écouteur `resize` jamais retiré dans `Section.tsx` (que `StrictMode` va révéler)
- [ ] `Toolbar.tsx` : état dérivé recalculé au lieu de `useState` + `useEffect`
- [ ] `Cart.tsx` : extraire `<CartItem>` (JSX dupliqué)
- [ ] Router créé dans `App()` → au niveau du module
- [ ] `config.env` jamais lu par Vite → renommer en `.env`
- [ ] Classe `"undefined"` dans `RoundedButton` / `Loading`

## 5. Hygiène

- [ ] `schema.prisma` : `price` en centimes (`Int`), `@@unique([eventId, row, number])`,
      `lockedBy String?` au lieu de `""`
- [ ] Aligner les versions de Prisma (`@prisma/client` 6 vs adapter 7)
- [ ] `package.json` racine : déplacer `react-router-dom` dans le client, retirer `studio`
- [ ] **Build du serveur** : `"build": "tsc"` sans `outDir` ni `noEmit` → `tsc` écrirait chaque `.js`
      **à côté de son `.ts`**, dans `src/` (vérifié sur la config, jamais lancé). Ajouter
      `"outDir": "dist"` au `tsconfig`, `dist/` au `.gitignore`, puis vérifier que `pnpm build` ne
      touche plus `src/` et que le serveur démarre depuis `dist/` (`node dist/index.js`)
- [x] Déplacer `.git` de `apps/` à la racine (commit `1e1b6da`) : `pnpm-lock.yaml`, `package.json`
      racine, `pnpm-workspace.yaml` et `.vscode/` sont maintenant versionnés. Historique conservé
      (renommages `client/…` → `apps/client/…`).
- [x] `docs/` est versionné (commit `5897166`). Les **PDF de cours** restent volontairement **hors git**
      (non suivis, à ne pas committer)
- [ ] Les branches non fusionnées (`feature/cart-badge`) gardent les anciens chemins (`client/…`) ;
      supprimer `feature/tanstack-query` et `feature/cart-badge` si elles ne servent plus
- [ ] Traduire les commentaires restants en anglais

---

## Note : badge du panier — `useContext` ?

**`useContext` est la bonne intuition pour *partager*, mais pas le bon outil pour *ce qui est partagé*.**

- Le contexte ≈ `rootContext()->setContextProperty("cart", cartModel)` en QML : une valeur
  accessible à tout l'arbre sans la passer de parent en enfant. Les composants qui le lisent se
  re-rendent quand la valeur change (≈ `NOTIFY`).
- Mais le nombre de sièges est un **état serveur** : c'est la base qui fait foi. Avec un contexte
  « fait main », c'est à toi de le rafraîchir après chaque lock / unlock / réservation… et il
  devient faux quand un verrou expire côté serveur.
- **Ce que ferait un senior : TanStack Query.** Un `useQuery(["cart"])` dans la Toolbar *et* dans
  le panier ; chaque mutation fait `invalidateQueries(["cart"])` → tous les endroits qui
  l'utilisent se mettent à jour. Une requête, un cache, aucune synchronisation manuelle.
- Clin d'œil : `QueryClientProvider`… est lui-même un **contexte**. Tu ne te trompes pas de
  mécanisme, tu en écrirais une version simplifiée.

**Règle :**
- **Contexte** pour l'état *client* partagé : thème, session, préférences.
- **TanStack Query** pour l'état *serveur* : panier, sièges, événements.

**Chemin choisi : pédagogique.**
1. ✅ Contexte fait main (`CartProvider` + `useCart()` + `refresh()`) sur `feature/cart-badge`.
2. Observer les limites (cf. `docs/cart-badge.md`) : rafraîchissements oubliés, expiration,
   deux onglets, requêtes en double, pas de loading ni d'erreur, re-rendus inutiles.
3. ✅ Migrer vers TanStack Query sur `feature/tanstack-query` (depuis `feature/cart-badge`).
4. ✅ Fusionné dans `develop` (`02d4c0e`).

Le serveur n'a besoin de rien : `GET /cart` existe, le compte = `lockedSeats.length`.
