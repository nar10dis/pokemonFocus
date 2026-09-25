# Carnet d'apprentissage

Les choix d'architecture du projet et les concepts à retenir, expliqués
court. Tenu par l'agent architecte (branche `main`) à partir des « À
retenir » des autres agents — voir `CLAUDE.md` section 6.

**Dernière synthèse :** `ffcea67`

Format de chaque fiche : **Quoi** · **Pourquoi ici** · **Piège**.

---

## Architecture générale

### Front et back séparés, dans un même repo
- **Quoi :** deux applis indépendantes (`frontend/` Next.js, `backend/`
  NestJS) qui communiquent en HTTP/JSON, rangées dans un seul dépôt git.
- **Pourquoi ici :** chacune a son rôle clair (affichage vs règles du jeu et
  données), et un seul repo permet de changer une route et l'écran qui
  l'utilise dans le même historique.
- **Piège :** le front ne doit jamais décider seul d'une règle métier. Les
  captures sont tirées **côté serveur** à la fin d'une session : si le front
  les calculait, n'importe qui pourrait tricher en modifiant le JavaScript.

### Docker Compose pour le dev
- **Quoi :** un fichier (`docker-compose.yml`) qui décrit les 3 services (db,
  backend, frontend) et les lance ensemble avec `make up`.
- **Pourquoi ici :** tout le monde a la même version de Node et de Postgres,
  sans rien installer sur sa machine.
- **Piège :** le code est monté en volume (rechargement à chaud), mais
  `node_modules` vit dans un volume Docker séparé. Après un changement de
  dépendances, `make re` (ou `make clean` si ça reste cassé).

### Le contrat d'API
- **Quoi :** la liste des routes, de ce qu'elles reçoivent et renvoient
  (README section 6).
- **Pourquoi ici :** front et back sont développés par deux agents
  différents ; le contrat est leur point de rendez-vous. Le backend en est
  le propriétaire.
- **Piège :** changer une réponse d'API sans mettre à jour le contrat casse
  le front en silence.

---

## Backend

### Modules NestJS (module / controller / service / dto)
- **Quoi :** chaque domaine (sessions, friends, themes…) a son dossier. Le
  *controller* reçoit la requête HTTP, le *service* contient la logique, le
  *DTO* décrit la forme des données attendues.
- **Pourquoi ici :** on sait toujours où chercher, et la logique (service)
  est séparée du transport (controller).
- **Piège :** mettre de la logique métier dans le controller. Il doit rester
  fin : lire la requête, appeler le service, renvoyer.

### Logique pure isolée
- **Quoi :** les calculs (tirage des captures `sessions/capture.ts`, série de
  jours `stats/streak.ts`) sont des fonctions sans NestJS ni base de données.
- **Pourquoi ici :** on peut les tester en une ligne, sans lancer de serveur
  ni de Postgres.
- **Piège :** le hasard. Pour tester un tirage, il faut pouvoir injecter le
  générateur aléatoire, sinon le test passe « parfois ».

### Validation des entrées (DTO + ValidationPipe)
- **Quoi :** `class-validator` vérifie chaque body reçu ; `whitelist: true`
  (`backend/src/main.ts`) supprime les champs non déclarés.
- **Pourquoi ici :** sans ça, un utilisateur pourrait envoyer
  `{ "level": 100 }` et modifier un champ qu'on ne voulait pas exposer.
- **Piège :** oublier le DTO sur une nouvelle route = aucune validation.

### Authentification : JWT dans un cookie httpOnly
- **Quoi :** à la connexion, le serveur signe un jeton (JWT) avec
  `JWT_SECRET` et le range dans un cookie que le JavaScript de la page ne
  peut pas lire (`httpOnly`, `backend/src/auth/auth.controller.ts:18`).
- **Pourquoi ici :** si une faille XSS injecte du JS dans la page, il ne peut
  pas voler le jeton. Côté front, `credentials: "include"` envoie le cookie
  à chaque appel.
- **Piège :** `JWT_SECRET` faible ou commité = n'importe qui peut fabriquer
  un jeton valide. Il reste dans `.env`, jamais dans git.

### Contrôle d'accès par `userId`
- **Quoi :** chaque requête Prisma filtre par l'utilisateur connecté
  (décorateur `@UserId()`).
- **Pourquoi ici :** être connecté ne suffit pas ; il faut vérifier que la
  session `/sessions/42` t'appartient.
- **Piège :** c'est la faille la plus courante (IDOR) : changer un id dans
  l'URL et voir les données d'un autre.

### Mots de passe hashés (bcrypt)
- **Quoi :** on stocke une empreinte irréversible du mot de passe, jamais le
  mot de passe lui-même.
- **Pourquoi ici :** si la base fuit, les mots de passe restent protégés.
- **Piège :** comparer avec `===` au lieu de `bcrypt.compare`.

### Migrations Prisma
- **Quoi :** chaque changement de `schema.prisma` produit un fichier SQL
  daté (`prisma/migrations/`) qui fait évoluer la base.
- **Pourquoi ici :** toutes les bases (la tienne, celle de chaque worktree,
  la prod un jour) passent par les mêmes étapes, dans le même ordre.
- **Piège :** modifier une migration déjà partagée. On en crée toujours une
  nouvelle.

---

## Frontend

### App Router de Next.js
- **Quoi :** l'arborescence de `src/app/` *est* le routage :
  `app/(app)/profile/page.tsx` → `/profile`. Les dossiers entre parenthèses
  groupent des pages sans apparaître dans l'URL.
- **Pourquoi ici :** le groupe `(app)` partage un layout qui renvoie vers la
  connexion si on n'est pas connecté (`frontend/src/app/(app)/layout.tsx`).
- **Piège :** cette redirection est du confort, pas de la sécurité : le
  vrai verrou est côté backend (guard JWT). Et Next 16 a changé des API :
  toujours vérifier la doc locale (`frontend/AGENTS.md`).

### TanStack Query
- **Quoi :** une librairie qui appelle l'API, met les réponses en cache et
  les rafraîchit (`src/lib/queries.ts`).
- **Pourquoi ici :** le profil ou le Pokédex s'affichent sur plusieurs pages
  sans être rechargés à chaque fois.
- **Piège :** après une modification (mutation), il faut *invalider* le cache
  concerné, sinon l'écran montre l'ancienne donnée.

### Design tokens (la DA HeartGold dans `globals.css`)
- **Quoi :** les couleurs et styles sont des variables (`--bg`, `--red`…) et
  des utilities Tailwind (`panel`, `btn-yellow`, `txt`).
- **Pourquoi ici :** changer une couleur à un seul endroit change tout le
  site, et chaque nouvel écran garde le style DS.
- **Piège :** écrire `#18D384` en dur dans un composant : la DA se fragmente.

---

## Git et travail multi-agent

### Une branche par rôle
- **Quoi :** `main` (stable, architecte), `frontend`, `backend`, `test`,
  `hardening`. Tout passe par `main`.
- **Pourquoi ici :** chaque agent avance sans marcher sur les autres, et
  `main` reste toujours fonctionnel.
- **Piège :** laisser une branche vivre longtemps sans récupérer `main` :
  les conflits s'accumulent.

### Worktrees
- **Quoi :** plusieurs dossiers de travail reliés au même dépôt, chacun sur
  sa branche (`../pokemonFocus-frontend`, …).
- **Pourquoi ici :** plusieurs agents peuvent travailler en même temps ; un
  commit fait dans un dossier est visible tout de suite dans les autres.
- **Piège :** déplacer les dossiers à la main casse les liens →
  `git worktree repair`. Et `.env` n'est pas partagé (pas versionné).

### Merge plutôt que rebase, livraison en fast-forward
- **Quoi :** un agent récupère `main` avec `git merge main`, puis avance `main`
  sur sa branche avec `merge --ff-only`.
- **Pourquoi ici :** `rebase` réécrit l'historique — dangereux sur une branche
  déjà poussée. Le `--ff-only` refuse la livraison si `main` a bougé :
  les conflits se règlent donc toujours dans la branche de l'agent.
- **Piège :** un worktree `main` avec des modifs non commitées bloque toutes
  les livraisons.

### Tests et refactor séparés (`test` / `hardening`)
- **Quoi :** un agent écrit les tests, un autre améliore le code.
- **Pourquoi ici :** celui qui modifie le code ne peut pas « arranger » les
  tests pour qu'ils passent ; les tests restent un vrai contrôle.
- **Piège :** refactorer une zone sans tests : on ne sait pas si on a cassé
  quelque chose.

### Ne pas versionner les fichiers générés
- **Quoi :** `.gitignore` exclut `node_modules`, `dist`, `.next`,
  `*.tsbuildinfo`, `.env`.
- **Pourquoi ici :** `tsconfig.build.tsbuildinfo` était commité ; il change à
  chaque build, ce qui salissait le worktree `main` et bloquait les
  livraisons. Il a été retiré du suivi.
- **Piège :** `.gitignore` n'agit pas sur un fichier déjà suivi : il faut
  aussi `git rm --cached <fichier>`.

### Permissions Claude Code par projet
- **Quoi :** `.claude/settings.json` autorise les commandes git du workflow
  (commit, merge, push) et interdit les dangereuses (force push,
  `reset --hard`, rebase).
- **Pourquoi ici :** les agents livrent seuls sans te demander à chaque
  commande, mais sans pouvoir détruire l'historique. Fichier versionné →
  tous les worktrees l'ont.
- **Piège :** une règle `allow` trop large (`Bash(git *)`) autoriserait aussi
  les commandes destructrices.
