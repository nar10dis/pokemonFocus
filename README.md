# PokémonFocus

Application de focus/productivité gamifiée : on lance une session de travail
minutée dans une région du monde Pokémon, et chaque minute écoulée donne une
chance d'attraper un Pokémon. Les captures alimentent un Pokédex personnel, des
statistiques hebdomadaires et un profil de dresseur partagé avec ses amis.

## Stack

| Partie   | Techno                                                                 |
| -------- | ---------------------------------------------------------------------- |
| Frontend | Next.js 16 (App Router), React 19, Tailwind 4, shadcn/base-ui, TanStack Query |
| Backend  | NestJS 12 (ESM), Prisma 7, JWT en cookie httpOnly, class-validator      |
| Base     | PostgreSQL 17                                                           |
| Infra    | Docker Compose + Makefile                                               |

## Prérequis

- Docker et le plugin Docker Compose (`docker compose`)
- `make`

Rien d'autre : Node n'est pas nécessaire sur la machine hôte, les dépendances
sont installées dans les conteneurs au démarrage.

## Lancer le projet

```sh
cp .env.example .env    # puis éditer JWT_SECRET
make up
```

- Frontend : http://localhost:3000
- Backend : http://localhost:4000
- PostgreSQL : `localhost:5432`

Au premier démarrage, le conteneur backend installe ses dépendances, génère le
client Prisma, applique les migrations et seed le Pokédex
(`backend/prisma/data/pokemon.json`). Comptez une à deux minutes avant que les
deux serveurs répondent — `make logs` permet de suivre l'avancement.

Le code est monté en volume : les modifications dans `backend/src` et
`frontend/src` sont rechargées à chaud, sans rebuild.

## Variables d'environnement

Définies dans `.env` à la racine (voir `.env.example`) :

| Variable            | Défaut         | Rôle                                  |
| ------------------- | -------------- | ------------------------------------- |
| `POSTGRES_USER`     | `pokemon`      | Utilisateur PostgreSQL                |
| `POSTGRES_PASSWORD` | `pokemon`      | Mot de passe PostgreSQL               |
| `POSTGRES_DB`       | `pokemonfocus` | Nom de la base                        |
| `FRONT_PORT`        | `3000`         | Port exposé du frontend               |
| `BACK_PORT`         | `4000`         | Port exposé de l'API                  |
| `DB_PORT`           | `5432`         | Port exposé de PostgreSQL             |
| `JWT_SECRET`        | `change-me`    | Clé de signature des JWT — à changer  |

`JWT_SECRET` est obligatoire : le backend refuse de démarrer sans (`src/main.ts`).
`DATABASE_URL`, `PORT`, `FRONTEND_URL` et `NEXT_PUBLIC_API_URL` sont construits
automatiquement par `docker-compose.yml`.

## Commandes Make

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

## Structure

```
backend/
  prisma/
    schema.prisma        modèles User, Pokemon, OwnedPokemon, Theme,
                         WorkSession, SessionCapture, Friendship
    data/pokemon.json    Pokédex de seed
  src/
    auth/       register/login/logout, guard JWT, cookie httpOnly
    profile/    profil dresseur, titres, Pokédex possédé, favoris
    pokemon/    catalogue statique et régions
    themes/     thèmes de travail personnalisés + objectifs hebdo
    sessions/   cycle de vie d'une session et logique de capture
    stats/      agrégats (minutes, sessions, captures, espèces)
    friends/    demandes d'amis et liste d'amis
frontend/
  src/app/(app)/   home, go-work, working, result/[id], pokemon, custom,
                   profile, friends
  src/components/  UI (chart hebdo, sprites, formulaires, shells)
  src/lib/         client API, requêtes TanStack Query, sprites, helpers
```

## API

Toutes les routes sont préfixées par `http://localhost:4000` et
authentifiées par cookie JWT, sauf `POST /auth/register` et `POST /auth/login`.

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

## Mécanique de capture

À la fin d'une session complétée, une tentative de capture est tirée pour chaque
minute planifiée. Les paramètres sont dans `backend/src/sessions/capture.config.ts`
(valeurs provisoires, à équilibrer) :

- 8 % de chance par minute, minimum 3 captures par session terminée
- poids de tirage : normal `1`, légendaire `0.05`, mythique `0.02`
- un doublon fait monter le Pokémon d'un niveau (max 100)
- durée de session autorisée : 5 à 240 minutes

## Tests et lint

```sh
docker compose exec backend npm test        # vitest
docker compose exec backend npm run test:e2e
docker compose exec backend npm run lint    # oxlint
docker compose exec frontend npm run lint   # eslint
```

## Dépannage

- **Port déjà utilisé** : changer `FRONT_PORT`, `BACK_PORT` ou `DB_PORT` dans
  `.env`, puis `make re`.
- **Erreur Prisma au démarrage** : la base n'était pas prête ou le schéma a
  changé — `make re`, ou `make clean && make up` pour repartir d'une base vide.
- **Le frontend ne voit pas l'API** : `NEXT_PUBLIC_API_URL` est injecté au build
  du conteneur ; après un changement de `BACK_PORT`, faire `make re`.
