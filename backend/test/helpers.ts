import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

/** app Nest configurée comme dans main.ts (cookies + validation) */
export async function createApp() {
  const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleFixture.createNestApplication<INestApplication<App>>();
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  return app;
}

export type TestUser = {
  id: number;
  username: string;
  email: string;
  /** client HTTP qui garde le cookie de session */
  agent: ReturnType<typeof request.agent>;
};

let counter = 0;

/**
 * Inscrit un dresseur au nom unique (la base de test est gardée entre deux runs).
 * ⚠️ /auth/register est limitée (AUTH_THROTTLE) : pas plus de 10 inscriptions par app.
 */
export async function registerUser(app: INestApplication<App>, prefix: string): Promise<TestUser> {
  const suffix = `${Date.now().toString(36)}${counter++}`;
  const username = `${prefix}_${suffix}`.slice(0, 20);
  const email = `${username}@test.local`;
  const agent = request.agent(app.getHttpServer());
  const res = await agent
    .post('/auth/register')
    .send({ username, email, password: 'motdepasse123' })
    .expect(201);
  return { id: res.body.id, username, email, agent };
}

/** supprime les dresseurs créés (cascade sur sessions, thèmes, Pokémon, amitiés) */
export async function deleteUsers(app: INestApplication<App>, users: TestUser[]) {
  const prisma = app.get(PrismaService);
  await prisma.user.deleteMany({ where: { id: { in: users.map((u) => u.id) } } });
}
