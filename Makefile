COMPOSE = docker compose

up:            ## Lance tout (db + back + front)
	$(COMPOSE) up --build -d
down:
	$(COMPOSE) down
logs:
	$(COMPOSE) logs -f
re: down up

migrate:       ## make migrate name=add_user
	$(COMPOSE) exec backend npx prisma migrate dev --name $(name)
studio:        ## Prisma Studio sur http://localhost:5555
	# Prisma Studio se bind en dur sur 127.0.0.1 (pas d'option --hostname) : on le
	# relaie sur 0.0.0.0:5556, mappé sur le 5555 de l'hôte dans docker-compose.yml.
	# Studio doit rester en --port 5555 pour que sa vérification d'Origin passe.
	$(COMPOSE) exec -d backend npx prisma studio --port 5555 --browser none
	$(COMPOSE) exec -d backend socat TCP-LISTEN:5556,fork,reuseaddr TCP:127.0.0.1:5555
shadcn:        ## make shadcn c="button card"
	$(COMPOSE) exec frontend npx shadcn@latest add $(c)

clean:         ## Supprime aussi la DB et les node_modules des volumes
	$(COMPOSE) down -v

.PHONY: up down logs re migrate studio shadcn clean
