# PokémonFocus

Application de focus/productivité gamifiée : on lance une session de travail
minutée dans une région du monde Pokémon, et chaque minute écoulée donne une
chance d'attraper un Pokémon. Les captures remplissent un Pokédex personnel,
des statistiques hebdomadaires et un profil de dresseur partagé avec ses amis.

Ce projet est développé en **multi-agent** : plusieurs agents Claude Code
travaillent en parallèle, chacun sur sa branche, avec un rôle et un périmètre
précis. Ce README décrit le projet et les rôles ; **`CLAUDE.md`** contient
les consignes de travail des agents (workflow git automatique, règles par
rôle). Claude Code charge `CLAUDE.md` tout seul, qui importe ce README.

---

## Sommaire

1. [Organisation multi-agent](#1-organisation-multi-agent)
2. [Rôles des agents](#2-rôles-des-agents)
3. [Stack frontend et direction artistique](#3-stack-frontend-et-direction-artistique)
4. [Stack backend](#4-stack-backend)
5. [Lancer le projet](#5-lancer-le-projet)
6. [API](#6-api)
7. [Mécanique de capture](#7-mécanique-de-capture)
8. [Tests et lint](#8-tests-et-lint)
9. [Dépannage](#9-dépannage)

---

## 1. Organisation multi-agent

### Branches

| Branche     | Agent        | Touche au code ?        | Périmètre                                  |
| ----------- | ------------ | ----------------------- | ------------------------------------------ |
| `main`      | Architecte   | Non (sauf ce README)    | Questions d'archi, conseils, roadmap       |
| `frontend`  | Frontend     | Oui                     | `frontend/` uniquement                      |
| `backend`   | Backend      | Oui                     | `backend/` uniquement                       |
| `test`      | Testeur      | Oui (fichiers de test)  | `*.spec.ts`, `backend/test/`, config de test |
| `hardening` | Sécurité / clarté | Oui                | Tout le repo, par petits commits            |

`main` est la branche stable. Les autres branches partent de `main` et y
reviennent par merge. Une branche ne merge **jamais** directement dans
une autre branche d'agent : tout passe par `main`.

Les agents gèrent eux-mêmes leurs commits, leur synchro et leur livraison
(détails dans `CLAUDE.md`) :

```
début de tâche   pull origin/main → merge main dans sa branche
pendant          un commit par étape cohérente
fin de tâche     merge main → lint + tests → main avance en fast-forward
                 sur la branche → push de main et de la branche
```

Les conflits se résolvent toujours dans la branche de l'agent, jamais dans
`main`.

### Un agent = un dossier (git worktree)

Deux agents ne peuvent pas travailler dans le même dossier sur deux branches
différentes : un `git checkout` de l'un casserait le travail de l'autre. On
utilise donc un **worktree** par branche — un dossier séparé qui partage le
même dépôt git :

```sh
# depuis le dossier principal pokemonFocus/ (qui reste sur main)
git worktree add ../pokemonFocus-frontend  frontend
git worktree add ../pokemonFocus-backend   backend
git worktree add -b test      ../pokemonFocus-test      main
git worktree add -b hardening ../pokemonFocus-hardening main

git worktree list        # voir les worktrees
git worktree remove ../pokemonFocus-test   # supprimer un worktree
```

Puis on lance chaque agent dans son dossier :

```sh
cd ../pokemonFocus-frontend && claude
```

Chaque worktree a besoin de son propre `.env` (il n'est pas versionné) :
`cp ../pokemonFocus/.env ../pokemonFocus-frontend/.env`.

### Faire tourner plusieurs stacks en même temps

Docker Compose nomme le projet d'après le dossier, donc chaque worktree a ses
propres conteneurs **et sa propre base de données**. En revanche les ports
sont partagés : si deux worktrees font `make up` en même temps, décaler les
ports dans leur `.env` :

| Worktree    | `FRONT_PORT` | `BACK_PORT` | `DB_PORT` |
| ----------- | ------------ | ----------- | --------- |
| main        | 3000         | 4000        | 5432      |
| frontend    | 3001         | 4001        | 5433      |
| backend     | 3002         | 4002        | 5434      |
| test        | 3003         | 4003        | 5435      |
| hardening   | 3004         | 4004        | 5436      |

Le port de Prisma Studio (`5555`) est fixé dans `docker-compose.yml` : un seul
`make studio` à la fois.

### Règles communes à tous les agents

1. **Lire ce README et `CLAUDE.md`** avant toute modification.
2. **Rester dans son périmètre.** Un agent qui a besoin d'un changement hors
   de son périmètre ne le fait pas : il le note dans son résumé de fin de
   tâche pour que l'humain le transmette à l'agent concerné.
3. **Se synchroniser avec `main` souvent** (`git merge main`, jamais de
   rebase sur une branche poussée) pour limiter les conflits.
4. **Petits commits, messages clairs** (en français, à l'impératif :
   « ajoute la pagination du Pokédex »).
5. **Ne pas committer** `.env`, `node_modules`, `dist`, `.next`.
6. **Le contrat d'API vit dans ce README** ([section 6](#6-api)). Le backend
   en est la source de vérité : tout changement de route, de payload ou de
   réponse doit mettre à jour cette section dans le même commit.
7. **Lint et tests au vert** avant de rendre la main
   ([section 8](#8-tests-et-lint)).
8. **L'humain lance les agents** ; les agents livrent eux-mêmes dans `main`
   selon le protocole de `CLAUDE.md`, jamais avec des tests rouges.

---

## 2. Rôles des agents

### `main` — Architecte / conseiller

- Répond aux questions d'architecture : découpage des modules, modèle de
  données, flux front ↔ back, choix de librairies.
- Fait des revues de ce qui a été mergé et propose des améliorations.
- Tient une roadmap de features futures (idées : échanges de Pokémon entre
  amis, évolutions, badges d'arène, classement hebdo, mode hors-ligne…).
- **N'écrit pas de code applicatif.** Il peut modifier ce README (roadmap,
  conventions) et rédiger des plans que les autres agents exécutent.

### `frontend` — UI façon Pokémon HeartGold / SoulSilver

- Travaille uniquement dans `frontend/`.
- Garant de la direction artistique ([section 3](#3-stack-frontend-et-direction-artistique)).
- Consomme l'API telle que décrite en section 6. S'il lui manque une route,
  il le signale au lieu de la bricoler côté front.

### `backend` — API NestJS

- Travaille uniquement dans `backend/`.
- Propriétaire du schéma Prisma, des migrations et du contrat d'API.
- Met à jour la section 6 du README à chaque changement de contrat.

### `test` — Tests

- Écrit des tests unitaires (logique pure : capture, streak, titres…), des
  tests d'intégration des services, et des tests e2e de l'API.
- Ajoute des fichiers de test, **ne modifie pas le code applicatif**. S'il
  trouve un bug, il écrit le test qui le démontre (marqué `it.fails` ou
  `it.todo`) et le signale.
- Peut mettre en place un framework de test côté frontend (il n'y en a pas
  encore — Vitest + Testing Library recommandés).

### `hardening` — Sécurité, clarté, optimisation

- Sécurité : validation des entrées, contrôle d'accès (un utilisateur ne voit
  / modifie que ses données), cookies, CORS, rate limiting sur l'auth,
  secrets, dépendances vulnérables (`npm audit`).
- Clarté : noms, code mort, duplication, découpage des fonctions trop longues.
- Optimisation : requêtes Prisma (N+1, `select` ciblés, index), re-renders et
  taille du bundle côté front.
- **Ne change pas le comportement** visible : toute modification doit rester
  couverte par les tests de la branche `test` (merger `main` avant de
  commencer pour les récupérer).

### Pourquoi `test` et `hardening` sont deux branches distinctes

- **Les tests servent de filet au refactor.** Si le même agent écrit les
  tests et modifie le code, il a tendance à adapter les tests à son code au
  lieu de l'inverse. Séparés, les tests restent une vérification
  indépendante.
- **Peu de conflits côté `test`** : il ajoute surtout des fichiers nouveaux,
  il peut donc merger dans `main` souvent et vite.
- **`hardening` touche à tout** : c'est la branche la plus exposée aux
  conflits avec `frontend` et `backend`. La garder courte (une passe = un
  thème, ex. « contrôle d'accès des sessions »), la merger vite, puis repartir
  de `main`.
- Ordre conseillé : `test` merge d'abord → `hardening` merge `main` → refactor
  sous couverture de tests.

---

## 3. Stack frontend et direction artistique

### Stack

| Outil                     | Rôle                                                    |
| ------------------------- | ------------------------------------------------------- |
| **Next.js 16** (App Router) | Framework React, routing par dossiers dans `src/app`  |
| **React 19**              | UI                                                       |
| **TypeScript 5**          |                                                          |
| **Tailwind CSS 4**        | Styles ; config dans `src/app/globals.css` (`@theme`, `@utility`) |
| **shadcn/ui + Base UI**   | Composants de base dans `src/components/ui/`             |
| **TanStack Query 5**      | Cache et requêtes vers l'API (`src/lib/queries.ts`)      |
| **motion**                | Animations (transitions de page, sprites)                |
| **sonner**                | Toasts                                                    |
| **lucide-react**          | Icônes                                                    |
| **ESLint 9**              | Lint                                                      |

> ⚠️ Next.js 16 a des changements cassants par rapport aux versions connues
> des modèles. Lire `frontend/AGENTS.md` et la doc dans
> `frontend/node_modules/next/dist/docs/` avant d'écrire du code Next.

Organisation :

```
frontend/src/
  app/
    page.tsx, register/     connexion / inscription
    (app)/                  pages authentifiées (layout + template communs)
      home/                 accueil
      go-work/              choix de la région / du thème / de la durée
      working/              session en cours (timer, dresseur qui marche)
      result/[id]/          résultat et captures de la session
      pokemon/              Pokédex possédé
      custom/               thèmes de travail personnalisés
      profile/              profil dresseur, favoris, avatar
      friends/              amis et demandes
  components/               composants maison (shells, sprites, chart hebdo…)
  components/ui/            composants shadcn (ne pas réécrire à la main :
                            `make shadcn c="..."`)
  lib/
    api.ts                  client fetch (cookies inclus)
    queries.ts              hooks TanStack Query
    sprites.ts, cosmetics.ts, regions.ts, capture.ts, time.ts
public/
  pokemon/                  898 artworks de Pokémon (`<nom>.png`)
  sprites/                  trainers, pokemon-overworld, cosmetics, sheets
```

### Direction artistique : Pokémon HeartGold / SoulSilver (Nintendo DS)

L'interface imite les menus de l'écran tactile de HGSS. Tout ce qui est
ajouté doit s'y fondre.

- **Palette** (variables CSS dans `globals.css`, ne pas coder de couleurs en dur) :
  vert menu `--bg` `#18D384`, rouge `--red`, jaune `--yellow`, bleu `--blue`,
  chacun avec une variante `-dark` (bordures, ombres), `-light` et `-deep`
  (dégradés). Texte blanc `--text`, texte sombre dans les champs `--ink`.
- **Typo** : titres en **Pixelify Sans** (`font-heading`, pixel art), texte
  courant en **Figtree** (`font-sans`, lisible).
- **Texte blanc à ombre portée dure**, comme dans les jeux : utilities `txt`,
  `txt-yellow`, `txt-blue` (`text-shadow: 2px 2px 0`, sans flou).
- **Panneaux** : `panel` (dégradé vertical, bordure 3px foncée, liseré blanc
  intérieur, ombre pleine vers le bas) et `tile` pour les tuiles façon icônes
  du menu HGSS.
- **Boutons** : `btn-yellow` (action principale), `btn-blue` (secondaire),
  `btn-red` (danger / annuler). Relief par ombre pleine, pas d'ombre floue.
- **Fond** : dégradé vert + grille de points discrète.
- **Sprites** : pixel art (dresseurs, Pokémon overworld qui marchent, cosmétiques).
  Garder `image-rendering: pixelated` et des tailles en multiples entiers.
- **À éviter** : ombres floues, glassmorphism, coins très arrondis, couleurs
  hors palette, look « SaaS moderne ».

---

## 4. Stack backend

| Outil                   | Rôle                                                       |
| ----------------------- | ---------------------------------------------------------- |
| **NestJS 12** (ESM)     | Framework API : modules / controllers / services          |
| **TypeScript 6**        |                                                            |
| **Prisma 7**            | ORM, schéma et migrations (`backend/prisma/`)              |
| **PostgreSQL 17**       | Base de données (conteneur Docker)                         |
| **@nestjs/jwt**         | JWT signé avec `JWT_SECRET`, stocké en cookie **httpOnly** |
| **bcryptjs**            | Hash des mots de passe                                     |
| **class-validator**     | Validation des DTO (`ValidationPipe` global, `whitelist: true`) |
| **Vitest 4**            | Tests unitaires et e2e                                     |
| **oxlint**              | Lint (type-aware)                                          |

Organisation :

```
backend/
  prisma/
    schema.prisma         User, Pokemon, OwnedPokemon, Theme, WorkSession,
                          SessionCapture, Friendship
    migrations/           migrations SQL (ne jamais éditer une migration déjà mergée)
    seed.ts               seed du Pokédex depuis data/pokemon.json
  scripts/demo-trainers.ts  données de démo
  src/
    main.ts               bootstrap : cookies, CORS (FRONTEND_URL), ValidationPipe
    prisma/               PrismaService injectable
    auth/                 register / login / logout, guard JWT, décorateur @UserId
    users/                accès aux utilisateurs
    profile/              profil dresseur, titres, Pokédex possédé, favoris, avatar
    pokemon/              catalogue statique et régions
    themes/               thèmes de travail + objectifs hebdo
    sessions/             cycle de vie des sessions ; capture.ts = logique pure
    stats/                agrégats (minutes, sessions, captures) ; streak.ts = logique pure
    friends/              demandes et liste d'amis
    titles/               titres de dresseur débloquables
  test/                   tests e2e
```

Conventions :

- Un module Nest par domaine (`*.module.ts`, `*.controller.ts`,
  `*.service.ts`, `*.dto.ts`).
- La logique métier pure (tirages, calculs) vit dans des fichiers sans
  dépendance Nest/Prisma (`capture.ts`, `streak.ts`) pour être testable
  facilement.
- Toute route authentifiée récupère l'utilisateur via `@UserId()` et filtre
  ses requêtes Prisma par cet id.
- Changement de schéma → `make migrate name=...`, jamais de modification
  manuelle de la base.

---

## 5. Lancer le projet

Prérequis : Docker (avec `docker compose`) et `make`. Node n'est pas
nécessaire sur la machine hôte.

```sh
cp .env.example .env    # puis éditer JWT_SECRET
make up
```

- Frontend : http://localhost:3000
- Backend : http://localhost:4000
- PostgreSQL : `localhost:5432`

Au premier démarrage, le backend installe ses dépendances, génère le client
Prisma, applique les migrations et seed le Pokédex. Compter une à deux
minutes (`make logs` pour suivre). Le code est monté en volume : rechargement
à chaud sans rebuild.

### Variables d'environnement (`.env`)

| Variable            | Défaut         | Rôle                                  |
| ------------------- | -------------- | ------------------------------------- |
| `POSTGRES_USER`     | `pokemon`      | Utilisateur PostgreSQL                |
| `POSTGRES_PASSWORD` | `pokemon`      | Mot de passe PostgreSQL               |
| `POSTGRES_DB`       | `pokemonfocus` | Nom de la base                        |
| `FRONT_PORT`        | `3000`         | Port exposé du frontend               |
| `BACK_PORT`         | `4000`         | Port exposé de l'API                  |
| `DB_PORT`           | `5432`         | Port exposé de PostgreSQL             |
| `JWT_SECRET`        | `change-me`    | Clé de signature des JWT — à changer  |

`JWT_SECRET` est obligatoire (le backend refuse de démarrer sans).
`DATABASE_URL`, `PORT`, `FRONTEND_URL` et `NEXT_PUBLIC_API_URL` sont construits
par `docker-compose.yml`.

### Commandes Make

| Commande                      | Effet                                                     |
| ----------------------------- | --------------------------------------------------------- |
| `make up`                     | Build + lance db, backend et frontend en arrière-plan      |
| `make down`                   | Arrête les conteneurs                                      |
| `make re`                     | `down` puis `up`                                            |
| `make logs`                   | Suit les logs des trois services                            |
| `make migrate name=add_user`  | Crée et applique une migration Prisma                      |
| `make studio`                 | Prisma Studio sur http://localhost:5555                     |
| `make shadcn c="button card"` | Ajoute des composants shadcn au frontend                    |
| `make clean`                  | Arrête tout **et supprime les volumes** (base + node_modules) |

---

## 6. API

Contrat entre `frontend` et `backend` — **à tenir à jour par l'agent backend**.
Toutes les routes sont authentifiées par cookie JWT, sauf `POST /auth/register`
et `POST /auth/login`.
`POST /auth/register` et `POST /auth/login` sont limitées à 10 requêtes par
minute et par IP : au-delà, `429` avec un message à afficher tel quel.

| Méthode | Route                          | Rôle                                 |
| ------- | ------------------------------ | ------------------------------------ |
| POST    | `/auth/register`, `/auth/login`, `/auth/logout` | Authentification    |
| GET     | `/auth/me`                     | Utilisateur courant                  |
| GET     | `/me/profile`                  | Profil + statistiques                |
| PATCH   | `/me`                          | Met à jour titre, région, objectif   |
| GET     | `/me/titles`, `/me/pokemon`    | Titres disponibles, Pokédex possédé  |
| PUT     | `/me/favorites`                | Équipe de 6 favoris                  |
| GET     | `/pokemon`, `/pokemon/regions` | Catalogue et régions                 |
| GET/POST/PATCH/DELETE | `/themes[/:id]`  | Thèmes de travail                    |
| POST    | `/sessions`                    | Démarre une session                  |
| GET     | `/sessions`, `/sessions/active`, `/sessions/:id` | Historique et session en cours |
| POST    | `/sessions/:id/pause`, `/resume`, `/abandon`, `/complete` | Cycle de vie |
| POST    | `/sessions/simulate`           | Session instantanée (debug/équilibrage) |
| GET     | `/friends`, `/friends/requests` | Amis et demandes reçues             |
| POST    | `/friends/requests`, `/friends/requests/:id/accept` | Envoyer / accepter |
| DELETE  | `/friends/requests/:id`, `/friends/:userId` | Refuser / supprimer     |

---

## 7. Mécanique de capture

À la fin d'une session complétée, une tentative de capture est tirée pour
chaque minute planifiée. Paramètres dans `backend/src/sessions/capture.config.ts`
(provisoires, à équilibrer) :

- 8 % de chance par minute, minimum 3 captures par session terminée
- poids de tirage : normal `1`, légendaire `0.05`, mythique `0.02`
- un doublon fait monter le Pokémon d'un niveau (max 100)
- durée de session autorisée : 5 à 240 minutes

---

## 8. Tests et lint

```sh
docker compose exec backend npm test          # vitest (unitaires)
docker compose exec backend npm run test:e2e  # vitest (e2e)
docker compose exec backend npm run lint      # oxlint
docker compose exec frontend npm run lint     # eslint
```

Tests existants : `backend/src/sessions/capture.spec.ts`,
`backend/src/stats/streak.spec.ts`, `backend/test/app.e2e-spec.ts`.
Pas encore de tests frontend.

---

## 9. Dépannage

- **Port déjà utilisé** : changer `FRONT_PORT`, `BACK_PORT` ou `DB_PORT` dans
  `.env`, puis `make re` (voir le tableau des ports par worktree, section 1).
- **Erreur Prisma au démarrage** : la base n'était pas prête ou le schéma a
  changé — `make re`, ou `make clean && make up` pour repartir d'une base vide.
- **Le frontend ne voit pas l'API** : `NEXT_PUBLIC_API_URL` est injecté au
  build du conteneur ; après un changement de `BACK_PORT`, faire `make re`.
- **« branch is already checked out »** en créant un worktree : la branche
  est déjà ouverte dans un autre dossier (`git worktree list`).
