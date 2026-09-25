# Carnet d'apprentissage

Les choix d'architecture du projet et les concepts à retenir, expliqués
court. Tenu par l'agent architecte (branche `main`) à partir des « À
retenir » des autres agents — voir `CLAUDE.md` section 6.

**Dernière synthèse :** `6d993a7`

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
  l'URL et voir les données d'un autre. Les tests e2e le vérifient avec deux
  vrais comptes (`backend/test/access-control.e2e-spec.ts`).

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
- **À savoir aussi :**
  - **Seed ≠ migration** : la migration change la *structure* (colonnes), le
    seed les *données* de départ (le Pokédex de `pokemon.json`). Changer des
    raretés = éditer le JSON, pas le schéma.
  - **Colonne ajoutée après coup = nullable** : la migration ne peut pas
    deviner la valeur des anciennes lignes ; `null` veut dire « inconnu »
    (ex. `dropChance`).
  - **Prisma 7** : `migrate dev` ne régénère plus le client → lancer aussi
    `npx prisma generate`, sinon `PrismaClientValidationError`.
  - **Après un merge qui touche le schéma : `make re`.** Le rechargement à
    chaud ne voit pas les changements arrivés par git.

### Rate limiting
- **Quoi :** plafonner le nombre de requêtes d'une même IP sur une route
  (`/auth/login`, `/auth/register` : 10 par minute).
- **Pourquoi ici :** sans ça, on teste des milliers de mots de passe par
  minute.
- **Piège :** derrière un reverse proxy, sans `trust proxy`, toutes les
  requêtes ont l'IP du proxy et partagent le même quota.

### Problème N+1
- **Quoi :** faire une requête par élément d'une liste au lieu d'une seule
  pour toute la liste.
- **Pourquoi ici :** `SessionsService.complete` faisait une requête par
  Pokémon capturé, dans une transaction qui bloque les lignes pendant ce
  temps. Maintenant : tout lire, calculer en mémoire, écrire en bloc.
- **Piège :** invisible en dev avec 3 lignes, lent en prod avec 3 000.

### Dépendances vulnérables (`npm audit`)
- **Quoi :** `npm audit` compare les versions installées à une base de
  failles connues ; `overrides` (package.json) impose la version d'une
  dépendance indirecte.
- **Pourquoi ici :** 9 failles au départ, dont 5 dans un paquet inutilisé.
- **Piège :** `npm audit fix --force` proposait de rétrograder Prisma 7 → 6
  et aurait cassé le projet. Évaluer avant de corriger : une faille n'est
  grave que si le code vulnérable reçoit des données d'un attaquant.

### Le tirage des captures
- **Quoi :** chaque minute = un tirage à 8 % (loi binomiale : 60 min →
  4,8 captures en moyenne, avec beaucoup d'écart), puis un tirage *pondéré*
  du Pokémon (`poids = 101 − rareté`).
- **Pourquoi ici :** le minimum garanti (1 capture / 20 min) coupe les
  sessions frustrantes sans changer la moyenne ressentie ; le bonus de série
  alourdit les rares.
- **Piège :** un bonus n'est jamais gratuit : les chances font toujours
  100 %, alourdir les rares allège les communs. D'où un bonus affiché
  seulement quand il est positif.

---

## Tests

### Des tests déterministes
- **Quoi :** un test doit donner le même résultat à chaque exécution.
- **Pourquoi ici :** `rollCaptures` reçoit le générateur aléatoire en
  paramètre (injection) : le test lui donne une graine fixe, ou une suite
  de valeurs pour viser un Pokémon précis.
- **Piège :** un test « statistique » sous `Math.random` finit par échouer
  au hasard, et plus personne ne lui fait confiance.

### Un test qui ne peut pas échouer ne sert à rien
- **Quoi :** vérifier qu'un test *tombe* quand on casse le code (retirer le
  filtre `userId` fait tomber 5 tests de sécurité).
- **Pourquoi ici :** c'est la seule preuve qu'il protège quelque chose.
- **À savoir aussi :** `it.fails` documente un bug connu sans le corriger
  (pool vide) ; un **test de caractérisation** fige le comportement actuel
  *avant* un refactor ; tester **aux bornes** (pile au seuil, juste avant,
  cas vide), là où se cachent les confusions `>` / `≥`.

---

## Frontend

### Le front affiche, le back calcule
- **Quoi :** tout ce qui compte pour le jeu (durée, captures, chances) est
  calculé par le serveur ; le front ne fait que l'afficher.
- **Pourquoi ici :** la chance dépend du pool de la région et de la série au
  moment du tirage, seul le serveur la connaît. Et le JavaScript du
  navigateur peut être trafiqué ou mis en pause par le téléphone.
- **Piège :** recalculer « pour aller plus vite » côté front donne un
  chiffre faux, ou une faille.

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
- **À savoir aussi :** un composant à props (`<PokeButton color="red">`)
  plutôt que des classes recopiées : un bug se corrige à un seul endroit.
  Relief des boutons : une *bordure* basse reste nette dans les coins
  arrondis, une *box-shadow* décalée « décroche ».

### Logique pure dans `src/lib/`
- **Quoi :** les calculs d'affichage (`rarityTier`, `oddsLabel`,
  `streakBonusLabel`, `Intl.NumberFormat` pour « 1,8 % ») vivent hors des
  composants, sans React ni API.
- **Pourquoi ici :** testables avec de simples valeurs, réutilisables par le
  Pokédex.
- **Piège :** noyer ces calculs dans le JSX : impossible à tester, recopiés
  d'une page à l'autre.

### Animer sans re-rendre (motion values)
- **Quoi :** des valeurs animées que `motion` applique directement au DOM,
  sans passer par le state React (cartes qui s'inclinent vers la souris).
- **Pourquoi ici :** un `useState` mis à jour à chaque mouvement de souris
  re-rendrait des centaines de cartes des dizaines de fois par seconde.
- **Piège :** `rotateX`/`rotateY` sans perspective donnent une carte
  écrasée ; il faut `transformPerspective`.

### L'aléatoire dans l'interface
- **Quoi :** tirer une graine une fois (`useState(() => Math.random())`) et
  la rejouer ; mélanger avec Fisher-Yates.
- **Pourquoi ici :** un `Math.random()` dans le rendu change le tirage à
  chaque re-rendu (les silhouettes bougeaient à chaque clic).
- **Piège :** `sort(() => Math.random() - 0.5)` a l'air de mélanger mais
  biaise le résultat.

---

## Mise en production

### Dev et prod
- **Quoi :** le même code, lancé de deux façons : en dev (ton ordi, code
  rechargé à chaud, outils installés) et en prod (un serveur, code compilé
  et figé, image légère).
- **Pourquoi ici :** le Dockerfile a des étapes séparées (`dev`, `build`,
  `release`, `prod`) ; `docker-compose.prod.yml` assemble la prod.
- **Piège :** la prod est un *endroit* (un serveur), pas une branche : on
  déploie `main`, et on marque la version déployée avec un **tag**.

### Déployer, c'est remplacer
- **Quoi :** on fabrique la nouvelle version, l'étape `release` applique
  migrations + seed sur la base existante, puis les conteneurs sont
  remplacés.
- **Pourquoi ici :** le code est jetable, les données non : la base vit
  dans un volume qui survit aux déploiements.
- **Piège :** revenir à l'ancien code (rollback) ne ramène pas une colonne
  supprimée par une migration. D'où les sauvegardes, **testées** (une
  sauvegarde jamais restaurée n'est pas une sauvegarde).

### Reverse proxy (Caddy)
- **Quoi :** un seul point d'entrée qui envoie `/` au front et `/api` à
  l'API, et gère le HTTPS tout seul.
- **Pourquoi ici :** même domaine → le cookie JWT (`sameSite: lax`, `secure`
  en prod) est bien envoyé.
- **Piège :** voir la fiche Rate limiting (`trust proxy`).

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

### Un seul `.env`, des ports calculés
- **Quoi :** le Makefile lit la branche du worktree et en déduit les ports
  (`frontend` → 3001, 4001…) ; le `.env` est un lien symbolique vers celui du
  dossier principal.
- **Pourquoi ici :** avec des ports écrits à la main dans 5 fichiers `.env`,
  un oubli (le 5555 de Prisma Studio, codé en dur) empêchait les backends
  des worktrees de démarrer — et donc leurs frontends.
- **Piège :** `docker compose up` lancé à la main ignore le Makefile et
  reprend les ports de `main` : toujours `make up`.
- **Et la chaleur :** chaque stack = 3 conteneurs. `make up-back` pour les
  tests backend (sans Next), `make down` en fin de tâche. Les volumes ne
  consomment rien, ce sont les conteneurs allumés qui chauffent.

### Variable d'environnement vs `.env`
- **Quoi :** Docker Compose prend une variable du shell en priorité sur
  celle du `.env`.
- **Pourquoi ici :** c'est ce qui permet au Makefile d'imposer les ports.
- **Piège :** croire que modifier le `.env` suffit quand une variable du
  même nom traîne dans le shell.

### Permissions Claude Code par projet
- **Quoi :** `.claude/settings.json` autorise les commandes git du workflow
  (commit, merge, push) et interdit les dangereuses (force push,
  `reset --hard`, rebase).
- **Pourquoi ici :** les agents livrent seuls sans te demander à chaque
  commande, mais sans pouvoir détruire l'historique. Fichier versionné →
  tous les worktrees l'ont.
- **Piège :** une règle `allow` trop large (`Bash(git *)`) autoriserait aussi
  les commandes destructrices.
