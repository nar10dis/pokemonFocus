# Instructions pour les agents Claude Code

Ce projet est développé par plusieurs agents en parallèle, un par branche,
chacun dans son propre git worktree. Le README ci-dessous décrit le projet,
la stack et les rôles ; ce fichier dit **comment travailler**.

@README.md

---

## 0. Qui suis-je ?

Au début de chaque conversation, lancer :

```sh
git branch --show-current
```

La branche détermine ton rôle (section 3). Si la branche n'est pas dans la
liste, demander à l'humain avant de faire quoi que ce soit.

Chemins utiles (ne pas les coder en dur, le projet peut être déplacé) :

```sh
MAIN_DIR=$(git worktree list --porcelain | head -1 | cut -d' ' -f2)   # worktree de main
BRANCH=$(git branch --show-current)
```

---

## 1. Git : ce que tu fais toi-même, automatiquement

Tu gères seul les commits, la synchro avec `main` et la livraison dans
`main`. L'humain ne fait que lancer les agents et relire.

### 1.1 Au début de chaque tâche : se synchroniser

```sh
git -C "$MAIN_DIR" pull --ff-only origin main   # récupère le main distant
git merge main                                   # intègre main dans ta branche
```

Si le merge a des conflits, les résoudre avant de commencer (voir 1.4).

### 1.2 Pendant la tâche : commiter souvent

- Un commit par étape cohérente (une fonctionnalité, un fix, un refactor).
  Pas de commit « WIP » géant en fin de tâche.
- Avant chaque commit : lint de la partie touchée au vert.
- `git add` des fichiers précis, jamais `git add -A` à l'aveugle : vérifier
  `git status` et ne jamais committer `.env`, `node_modules`, `dist`, `.next`,
  `*.tsbuildinfo`.
- Message en français, à l'impératif, préfixé par le rôle :

  ```
  front: ajoute l'écran de résultat de session
  back: ajoute la pagination de GET /sessions
  test: couvre le calcul de streak sur changement de semaine
  hardening: vérifie le propriétaire dans SessionsService.complete
  archi: ajoute la roadmap au README
  ```

### 1.3 En fin de tâche : livrer dans `main`

Quand la tâche demandée est terminée :

```sh
# 1. tout est commité
git status                                        # doit être propre

# 2. se remettre à jour
git -C "$MAIN_DIR" pull --ff-only origin main
git merge main                                    # conflits → 1.4

# 3. vérifier (section 2) : lint + tests au vert, sinon corriger et recommencer

# 4. avancer main sur ta branche (fast-forward uniquement)
git -C "$MAIN_DIR" merge --ff-only "$BRANCH"

# 5. publier
git -C "$MAIN_DIR" push origin main
git push -u origin "$BRANCH"
```

Si l'étape 4 échoue, c'est qu'un autre agent a livré entre-temps : revenir à
l'étape 2. Le `--ff-only` garantit que les conflits sont toujours résolus
**dans ta branche**, jamais dans `main`.

Si l'étape 4 échoue parce que le worktree de `main` a des modifications non
commitées, ne pas y toucher : prévenir l'humain.

### 1.4 Résoudre un conflit

- Garder le travail des deux côtés. Ne jamais écraser le code d'un autre
  agent pour faire passer le tien.
- Conflit dans ton périmètre : tu résous.
- Conflit hors de ton périmètre (ex. l'agent frontend en conflit dans
  `backend/`) : prendre la version de `main` (`git checkout --theirs <fichier>`
  pendant un `git merge main`), puis vérifier que ton code marche encore.
- Doute sérieux : `git merge --abort` et demander à l'humain.

### 1.5 Interdits

- `git push --force`, `git reset --hard`, `git rebase` sur une branche déjà
  poussée, `git checkout main` dans ton worktree (main vit dans `$MAIN_DIR`).
- Modifier des fichiers dans `$MAIN_DIR` à la main (seul l'architecte y
  travaille).
- Livrer dans `main` avec des tests ou un lint rouges.
- Supprimer une branche ou un worktree.
- Éditer une migration Prisma déjà présente dans `main`.

---

## 2. Vérifications avant de livrer

Depuis ton worktree, avec la stack lancée (`make up`) :

```sh
docker compose exec backend npm run lint
docker compose exec backend npm test
docker compose exec backend npm run test:e2e
docker compose exec frontend npm run lint
```

Lancer au minimum ce qui concerne la partie modifiée. Si la stack ne tourne
pas, la lancer ; si elle ne peut pas démarrer (port pris…), le dire dans le
résumé plutôt que livrer sans vérifier.

Chaque worktree a son `.env` avec ses propres ports (tableau dans le README,
section 1). Ne pas les changer.

---

## 3. Consignes par rôle

### `main` — Architecte

- Tu travailles dans `$MAIN_DIR`, directement sur `main`. Pas de livraison
  (1.3) : tu commites et pousses directement, **immédiatement** après chaque
  modification, pour que le worktree reste propre et que les autres agents
  puissent livrer.
- Tu ne modifies que `README.md`, `CLAUDE.md` et des documents de conception
  (`docs/`). Aucun code applicatif.
- Tu réponds aux questions d'architecture en t'appuyant sur le code réel
  (lis-le, cite `fichier:ligne`).
- Tu tiens la section « Roadmap » du README : features futures, dette
  technique repérée, priorités. Pour chaque idée : le besoin, les branches
  concernées, une estimation de taille (S/M/L).
- Quand un changement touche plusieurs agents (ex. nouvelle route + nouvel
  écran), tu écris le plan découpé par branche pour que l'humain le
  distribue.

### `frontend` — UI HeartGold / SoulSilver

- Périmètre : `frontend/` uniquement.
- Lire `frontend/AGENTS.md` : Next.js 16 a des changements cassants, vérifier
  la doc dans `frontend/node_modules/next/dist/docs/` avant d'utiliser une API
  Next.
- Respecter la DA (README section 3) : couleurs via les variables CSS de
  `globals.css`, `font-heading` pour les titres, utilities `panel`, `tile`,
  `btn-yellow|blue|red`, `txt*`, sprites en `[image-rendering:pixelated]`.
  Une nouvelle utility visuelle va dans `globals.css`, pas en classes
  répétées partout.
- Appels API uniquement via `src/lib/api.ts` et des hooks dans
  `src/lib/queries.ts`.
- Composants shadcn : `make shadcn c="..."`, ne pas les écrire à la main.
- Besoin d'une route ou d'un champ qui n'existe pas : ne pas le simuler côté
  front, le noter dans le résumé final pour l'agent backend.

### `backend` — API NestJS

- Périmètre : `backend/` + la section « API » du README.
- Un module par domaine (`module` / `controller` / `service` / `dto`).
  Logique métier pure dans des fichiers sans Nest ni Prisma (comme
  `capture.ts`, `streak.ts`).
- Toute route authentifiée utilise `@UserId()` et filtre ses requêtes Prisma
  par cet id. Tout body passe par un DTO `class-validator`.
- Changement de schéma : `make migrate name=<nom_explicite>`, et committer la
  migration générée avec le schéma.
- Tout changement de contrat (route, payload, réponse) met à jour le tableau
  API du README **dans le même commit**, et le résumé final le signale pour
  l'agent frontend.

### `test` — Tests

- Périmètre : fichiers `*.spec.ts`, `backend/test/`, configs Vitest, et la
  mise en place des tests frontend (Vitest + Testing Library) si demandé.
- **Ne modifie pas le code applicatif.** Un bug trouvé = un test qui le
  prouve, marqué `it.fails(...)` avec un commentaire qui explique le bug, et
  une ligne dans le résumé final.
- Priorités : logique pure (capture, streak, titres) → services (avec une
  base de test) → e2e des routes, en particulier le contrôle d'accès (un
  utilisateur ne peut pas lire / modifier les sessions, thèmes, amis d'un
  autre).
- Tests déterministes : pas d'aléatoire non maîtrisé (injecter ou mocker le
  RNG), pas de dépendance à l'heure réelle (fake timers).
- Livrer souvent : tes commits touchent peu de fichiers existants, ils
  entrent dans `main` sans conflit.

### `hardening` — Sécurité, clarté, optimisation

- Périmètre : tout le repo, mais **une passe = un seul thème**, livrée dès
  qu'elle est finie (branche courte = peu de conflits).
- **Aucun changement de comportement visible.** Commencer par `git merge main`
  pour récupérer les tests de l'agent `test`. Si la zone que tu touches n'est
  pas testée, le signaler et rester prudent.
- Checklist sécurité : contrôle d'accès par `userId` sur chaque requête
  Prisma, DTO sur tous les bodies/params, cookie JWT (`httpOnly`, `sameSite`,
  `secure` en prod), CORS, rate limiting sur `/auth/*`, messages d'erreur qui
  ne fuient rien, `npm audit`, secrets hors du code.
- Clarté : noms explicites, fonctions courtes, suppression du code mort et
  des duplications, commentaires seulement là où le « pourquoi » n'est pas
  évident.
- Optimisation : requêtes Prisma (N+1, `select` ciblés, index manquants via
  migration), re-renders et poids du bundle côté front.
- Toucher à `frontend/` ou `backend/` = zone d'un autre agent : garder les
  diffs minimaux et ciblés pour limiter les conflits.

---

## 4. Résumé de fin de tâche

Terminer chaque tâche par un résumé court pour l'humain :

- ce qui a été fait (et livré dans `main` ou non, avec le hash du commit) ;
- ce qui n'a pas pu être vérifié ;
- **les demandes pour les autres agents**, sous la forme
  `→ backend : ajouter GET /sessions/:id/captures (utilisé par l'écran résultat)`.
