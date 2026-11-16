# Les modules du serveur — à quoi sert chacun

Notes issues du quiz sur `apps/server`. Analogies Qt/C++ entre parenthèses.

## Vue d'ensemble : une requête qui traverse la pile

```
navigateur ──HTTP──► Fastify ──(zod valide)──► handler ──► Prisma Client ──► adapter ──► better-sqlite3 ──► dev.db
                        │                                       ▲
                        └── pino : un log JSON par requête      └── types générés depuis schema.prisma
```

## Outils d'exécution vs outils de build

| Module | Quand il sert | Rôle |
|---|---|---|
| `fastify` | exécution | serveur HTTP et routeur (≈ `QHttpServer::route()`) |
| `@fastify/cors` | exécution | ajoute les en-têtes CORS aux réponses |
| `fastify-type-provider-zod` | exécution + compilation | branche Zod sur Fastify |
| `zod` | exécution | schémas : validation + types |
| `@prisma/client` | exécution | bibliothèque d'accès à la base |
| `@prisma/adapter-better-sqlite3` | exécution | traducteur Prisma ↔ driver |
| `better-sqlite3` | exécution | driver SQLite (addon natif, d'où `allowBuilds`) |
| `dotenv` | exécution | lit `.env` dans `process.env` |
| `prisma` (CLI) | build | `generate`, `migrate`, `studio` |
| `zod-prisma-types` | build | générateur de schémas Zod |
| `tsx` | dev | exécute le TypeScript sans compiler (≈ interpréteur à la volée) |
| `typescript` | build | vérifie les types (`tsc --noEmit`) |
| `@types/*` | build | déclarations de types (≈ fichiers `.h`) |
| `pino-pretty` | dev | met en forme les logs JSON |

## Fastify

Route = fonction appelable à distance (≈ `Q_INVOKABLE`). Le navigateur « appelle » `GET /cart`
comme on invoque une méthode. Axios côté client est l'appelant, pas le signal.

## CORS

Règle appliquée **par le navigateur**, pas par le serveur : une page chargée depuis l'origine A
n'a pas le droit de lire la réponse d'une origine B, sauf si B répond avec les bons en-têtes.
`@fastify/cors` ajoute ces en-têtes et répond au **preflight** (`OPTIONS`) que le navigateur envoie
avant les requêtes « non simples » (ici à cause de l'en-tête perso `x-session-id`).
Aujourd'hui `origin: true` autorise **tout le monde** : acceptable en dev, à restreindre ensuite.

## Logs : `pino` et `pino-pretty`

- `Fastify({ logger: true })` : Fastify **embarque pino** et logue chaque requête (reçue, terminée)
  sans rien écrire. Dans un handler : `request.log.info(...)` (le log est lié à l'identifiant de la requête).
- pino écrit du **JSON, une ligne par événement** (rapide, lisible par une machine).
- `tsx watch src/index.ts | pino-pretty` : le `|` envoie la sortie de gauche vers `pino-pretty`,
  qui la reformate pour un humain. Séparé, parce que la mise en forme coûte cher : en production
  on garde le JSON brut.

## dotenv

Lit un fichier `.env` et remplit `process.env` (≈ `QSettings` / variables d'environnement).
Pas de `.env` aujourd'hui : le code retombe sur `DATABASE_URL ?? "file:./prisma/dev.db"`.
Piège : le chemin de la base est défini à deux endroits (`schema.prisma` et `prisma.ts`).

## Zod, le provider, et le générateur

- **zod** : décrit ce qu'une route attend et renvoie. Sert à **valider à l'exécution** et à **déduire
  le type TS** (`z.infer`) : une seule définition pour les deux.
- **fastify-type-provider-zod** : Fastify valide nativement en JSON Schema (Ajv), pas en Zod.
  Le module est un **adaptateur** à deux niveaux :
  `withTypeProvider<ZodTypeProvider>()` (types, compilation) et
  `setValidatorCompiler` / `setSerializerCompiler` (validation, exécution).
- **zod-prisma-types** : générateur déclaré dans `schema.prisma`, lancé par `prisma generate`,
  qui produit `src/generated/zod/` à partir des modèles. Artefact **non versionné**
  (≈ sortie de `moc` / `protoc`).

## Prisma

- **`prisma` (CLI, devDependency)** : outil de build. `prisma generate` lance **tous** les
  générateurs ; `prisma migrate` / `db push` créent réellement les tables.
- **`schema.prisma`** : la description (modèles, relations). Ce n'est pas la base elle-même.
- **`@prisma/client`** : bibliothèque d'exécution. Le code **généré** dans `src/generated/prisma/`
  la rend sur mesure : `prisma.seat.findMany(...)` est typé selon **tes** modèles.
- Les types TS des modèles sont dans ce client généré ; les schémas Zod viennent, eux, du
  générateur `zod-prisma-types`.

## better-sqlite3 et l'adaptateur

Ce n'est **pas un MVC** (le M, le V et le C sont trois *rôles* d'une application) : c'est une
**pile de couches** qui s'appellent de haut en bas, chacune ne connaissant que la suivante.

### Le trajet de `prisma.seat.findMany({ where: { eventId } })`

```
ton code ─► Prisma Client ─► (moteur de requêtes) ─► adapter ─► better-sqlite3 ─► SQLite ─► dev.db
 objets TS    API typée          traduit en SQL        traduit      appelle la lib C     lit le fichier
```

1. **Prisma Client** (`@prisma/client` + code généré) : la seule couche que tu manipules.
   Le code généré connaît tes modèles (autocomplétion, résultat typé `Seat[]`). Il décrit
   l'intention, la fait traduire en **SQL + paramètres** (`SELECT … WHERE eventId = ?`), puis
   reconvertit les lignes brutes en objets typés (enum `SeatStatus`, dates).
2. **L'adaptateur** : Prisma veut fonctionner avec plusieurs bases (SQLite, PostgreSQL, MySQL…).
   Chaque **driver** a une API différente (synchrone ou asynchrone, types, transactions).
   L'adaptateur expose à Prisma une interface unique (« exécute ce SQL avec ces paramètres »,
   « ouvre une transaction ») et l'implémente avec le driver concret. Changer de base = changer
   d'adaptateur, sans toucher aux `findMany`. Il est branché dans `src/lib/prisma.ts` :
   on crée l'adaptateur avec l'URL de la base, puis on le passe au client.
3. **`better-sqlite3`** : le driver. Deux particularités :
   - **SQLite n'est pas un serveur** : c'est une bibliothèque C chargée dans le processus, qui lit
     un fichier. Pas de réseau, de port ni d'identifiants (≠ PostgreSQL).
   - C'est un **addon natif** (C++ compilé, qui embarque SQLite) : d'où l'autorisation
     `allowBuilds`, car l'installation télécharge ou compile du code natif. Son API est
     **synchrone** (`prepare().all()`), cohérente avec un simple fichier local.

### Équivalents Qt

| Couche | Rôle | Équivalent Qt |
|---|---|---|
| Prisma Client | API typée, requêtes de haut niveau | `QSqlQuery` + une couche ORM |
| `adapter-better-sqlite3` | traduit pour un driver précis | un plugin `QSqlDriver` |
| `better-sqlite3` | pilote le fichier SQLite (addon natif C++) | `libsqlite3` |

`new PrismaBetterSqlite3(...)` joue le rôle de `QSqlDatabase::addDatabase("QSQLITE")` : on choisit
le plugin de traduction, le reste du code ne change pas.

### Pourquoi trois paquets pour lire un fichier

Chaque couche résout un problème distinct : le code veut des objets typés sans écrire de SQL
(Prisma) ; Prisma ne veut pas dépendre d'une seule base (adaptateur) ; la base est un fichier à
ouvrir avec du code natif (driver). C'est aussi pourquoi l'écart de version Prisma 6 / adaptateur 7
est un vrai risque : l'interface entre les couches 1 et 2 est ce qui change d'une version majeure
à l'autre. (Le détail interne du contrat modifié par la 7 n'a pas été vérifié ; c'est un
raisonnement de principe.)

## `@types/better-sqlite3`

`better-sqlite3` est livré en JavaScript sans types. `@types/…` ne contient **aucun code** :
uniquement des déclarations pour le compilateur (≈ un `.h` pour une bibliothèque livrée en `.so`).
devDependency, car tout cela disparaît à l'exécution.
À observer : le paquet de types est en `^9`, la bibliothèque en `^13`.

## Versions : le piège Prisma 6 / adapter 7

- `^6.19.3` signifie `>= 6.19.3` **et `< 7.0.0`** : jamais de saut de version majeure.
  Le lockfile fige déjà les versions réelles installées.
- `@prisma/client` 6 et l'adapter 7 sont **le même produit**, publié ensemble. La 7 change
  d'architecture (adapters obligatoires) : mélanger les majeures est un risque.
- Règle utile : paquets **couplés = même version majeure** (voire exacte). Les paquets
  indépendants peuvent dériver librement. Déjà dans la roadmap (« Aligner les versions de Prisma »).

## Les types à l'exécution : C++ vs TypeScript

**C++.** `class Event` n'est pas stockée comme « patron » dans l'objet. Le compilateur s'en sert
pour calculer la **disposition mémoire** (décalage de chaque membre, `sizeof`) et les méthodes sont
compilées **une seule fois** dans la section code. À l'exécution, un `Event` est une suite d'octets
à une adresse. Seuls restent des restes volontaires : le `vptr` si la classe est polymorphe
(+ RTTI), ou le `QMetaObject` généré par `moc`.
Mais la **forme** reste garantie : un `Event*` pointe forcément sur une zone construite comme
un `Event`.

**TypeScript.** `tsc`, `tsx` et `vite` **effacent** les annotations : le JavaScript produit n'en
contient aucune. Et JavaScript n'a pas de disposition mémoire : un objet est un **dictionnaire**
(propriété → valeur) construit dynamiquement. `JSON.parse` renvoie n'importe quoi ; `as Event`
est un `reinterpret_cast` **sans aucune vérification**.

| | C++ | TypeScript |
|---|---|---|
| Le type pilote | la disposition mémoire | rien (effacé) |
| Une donnée externe | doit être désérialisée et vérifiée | idem, mais le compilateur ne te protège pas |
| La forme est garantie | par construction | seulement par ta vigilance, ou **Zod** |

D'où Zod : l'équivalent de ton code de désérialisation `QJsonObject → struct` avec contrôle
de chaque champ, généré à partir d'une description.
