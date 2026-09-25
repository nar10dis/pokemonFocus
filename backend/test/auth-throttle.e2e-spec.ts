import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';
import { AUTH_THROTTLE } from './../src/auth/auth.constants.js';

describe('Rate limiting /auth (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  // body invalide : rejeté en 400 par la validation, sans toucher à la base,
  // mais le throttler (un guard) passe avant et compte quand même la tentative
  it.each(['/auth/login', '/auth/register'])('%s renvoie 429 au-delà de la limite', async (route) => {
    const server = app.getHttpServer();
    for (let i = 0; i < AUTH_THROTTLE.limit; i++) {
      await request(server).post(route).send({}).expect(400);
    }
    const res = await request(server).post(route).send({}).expect(429);
    expect(res.body.message).toBe('Trop de tentatives, réessaie dans une minute');
  });

  it("ne limite pas les routes d'auth hors login / register", async () => {
    const server = app.getHttpServer();
    for (let i = 0; i <= AUTH_THROTTLE.limit; i++) {
      await request(server).get('/auth/me').expect(401);
    }
  });
});
