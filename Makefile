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
	$(COMPOSE) exec backend npx prisma studio --port 5555 --browser none
shadcn:        ## make shadcn c="button card"
	$(COMPOSE) exec frontend npx shadcn@latest add $(c)

clean:         ## Supprime aussi la DB et les node_modules des volumes
	$(COMPOSE) down -v

.PHONY: up down logs re migrate studio shadcn clean
