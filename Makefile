COMPOSE = docker compose

# Ports calculés d'après la branche du worktree : chaque agent a sa stack sans
# collision, et un seul .env suffit (les worktrees le partagent par symlink).
# main → 3000/4000/5432/5555, frontend → 3001/4001/5433/5556, etc.
BRANCH := $(shell git branch --show-current)
OFFSET_main      := 0
OFFSET_frontend  := 1
OFFSET_backend   := 2
OFFSET_test      := 3
OFFSET_hardening := 4
OFFSET := $(or $(OFFSET_$(BRANCH)),0)

export FRONT_PORT  := $(shell echo $$((3000 + $(OFFSET))))
export BACK_PORT   := $(shell echo $$((4000 + $(OFFSET))))
export DB_PORT     := $(shell echo $$((5432 + $(OFFSET))))
export STUDIO_PORT := $(shell echo $$((5555 + $(OFFSET))))

up:            ## Lance tout (db + back + front)
	$(COMPOSE) up --build -d
	@$(MAKE) --no-print-directory urls
urls:          ## Affiche les adresses de la stack de ce worktree
	@echo "[$(BRANCH)] front http://localhost:$(FRONT_PORT) · api http://localhost:$(BACK_PORT) · db localhost:$(DB_PORT) · studio http://localhost:$(STUDIO_PORT)"
down:
	$(COMPOSE) down
logs:
	$(COMPOSE) logs -f
re: down up

migrate:       ## make migrate name=add_user
	$(COMPOSE) exec backend npx prisma migrate dev --name $(name)
studio:        ## Prisma Studio sur http://localhost:$(STUDIO_PORT)
	# Prisma Studio se bind en dur sur 127.0.0.1 (pas d'option --hostname) : on le
	# relaie sur 0.0.0.0:5556, mappé sur STUDIO_PORT de l'hôte dans docker-compose.yml.
	# Studio écoute sur STUDIO_PORT lui aussi pour que sa vérification d'Origin passe.
	$(COMPOSE) exec -d backend npx prisma studio --port $(STUDIO_PORT) --browser none
	$(COMPOSE) exec -d backend socat TCP-LISTEN:5556,fork,reuseaddr TCP:127.0.0.1:$(STUDIO_PORT)
shadcn:        ## make shadcn c="button card"
	$(COMPOSE) exec frontend npx shadcn@latest add $(c)

clean:         ## Supprime aussi la DB et les node_modules des volumes
	$(COMPOSE) down -v

# --- production (sur le serveur, avec un .env de prod : voir docker-compose.prod.yml)
PROD = $(COMPOSE) -f docker-compose.prod.yml -p pokemonfocus-prod

prod-up:       ## Build + migrations/seed + lance la stack de prod
	$(PROD) up --build -d
prod-down:
	$(PROD) down
prod-logs:
	$(PROD) logs -f
prod-backup:   ## Sauvegarde immédiate dans backups/
	$(PROD) exec -T backup sh -c 'pg_dump -Fc -f /backups/$$PGDATABASE-$$(date +%F-%H%M).dump'
	@ls -t backups | head -1
prod-restore:  ## make prod-restore file=backups/pokemonfocus-2026-09-25.dump (écrase la base !)
	@test -f "$(file)" || (echo "fichier introuvable : $(file)"; exit 1)
	$(PROD) stop backend
	$(PROD) exec -T backup sh -c 'pg_restore --clean --if-exists --no-owner -d $$PGDATABASE /backups/$(notdir $(file))'
	$(PROD) start backend

.PHONY: up urls down logs re migrate studio shadcn clean prod-up prod-down prod-logs prod-backup prod-restore
