import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AUTH_COOKIE } from './../src/auth/auth.constants.js';
import { createApp, deleteUsers, registerUser, type TestUser } from './helpers.js';

/**
 * Contrôle d'accès : un dresseur (alice) ne peut ni lire ni modifier les
 * données d'un autre (bob). Carol sert de tierce personne pour les amis.
 */
describe("Contrôle d'accès (e2e)", () => {
  let app: INestApplication<App>;
  let alice: TestUser;
  let bob: TestUser;
  let carol: TestUser;

  /** données de bob */
  let bobCompletedId: number;
  let bobRunningId: number;
  let bobThemeId: number;
  let bobPokemonId: number;

  const year = { from: '2000-01-01', to: '2100-01-01' };

  beforeAll(async () => {
    app = await createApp();
    alice = await registerUser(app, 'alice');
    bob = await registerUser(app, 'bob');
    carol = await registerUser(app, 'carol');

    const theme = await bob.agent
      .post('/themes')
      .send({ name: 'Maths', color: '#ff0000', emoji: '📐' })
      .expect(201);
    bobThemeId = theme.body.id;

    const done = await bob.agent.post('/sessions/simulate').send({ region: 'Kanto' }).expect(200);
    bobCompletedId = done.body.id;
    bobPokemonId = done.body.captures[0].pokemonId;

    const running = await bob.agent
      .post('/sessions')
      .send({ region: 'Kanto', plannedMinutes: 30, themeId: bobThemeId })
      .expect(201);
    bobRunningId = running.body.id;
  });

  afterAll(async () => {
    await deleteUsers(app, [alice, bob, carol]);
    await app.close();
  });

  describe('authentification', () => {
    it.each([
      ['get', '/auth/me'],
      ['get', '/me/profile'],
      ['patch', '/me'],
      ['get', '/me/pokemon'],
      ['put', '/me/favorites'],
      ['get', '/themes'],
      ['post', '/themes'],
      ['get', '/sessions/active'],
      ['post', '/sessions'],
      ['get', '/friends'],
      ['post', '/friends/requests'],
    ] as const)('%s %s sans cookie → 401', async (method, route) => {
      await request(app.getHttpServer())[method](route).expect(401);
    });

    it('un JWT signé avec une autre clé est refusé', async () => {
      // un attaquant qui forge un token au nom de bob sans connaître JWT_SECRET
      const forged = new JwtService({ secret: 'pas-la-bonne-cle' }).sign({ sub: bob.id });
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Cookie', `${AUTH_COOKIE}=${forged}`)
        .expect(401);
    });

    it("le mot de passe (même hashé) n'est jamais renvoyé", async () => {
      const me = await alice.agent.get('/auth/me').expect(200);
      expect(me.body).not.toHaveProperty('password');
      const profile = await alice.agent.get('/me/profile').expect(200);
      expect(JSON.stringify(profile.body)).not.toMatch(/password/i);
    });
  });

  describe('sessions', () => {
    it.each(['completed', 'running'] as const)(
      "GET /sessions/:id d'une session %s d'un autre → 404",
      async (which) => {
        const id = which === 'completed' ? bobCompletedId : bobRunningId;
        await alice.agent.get(`/sessions/${id}`).expect(404);
      },
    );

    it.each(['pause', 'resume', 'abandon', 'complete'])(
      "POST /sessions/:id/%s sur la session d'un autre → 404, sans effet",
      async (action) => {
        await alice.agent.post(`/sessions/${bobRunningId}/${action}`).expect(404);
        const s = await bob.agent.get(`/sessions/${bobRunningId}`).expect(200);
        expect(s.body.status).toBe('RUNNING');
      },
    );

    it("l'historique et la session active ne contiennent que ses propres sessions", async () => {
      const list = await alice.agent.get('/sessions').query(year).expect(200);
      expect(list.body).toEqual([]);
      const active = await alice.agent.get('/sessions/active').expect(200);
      expect(active.body).toEqual({});
    });

    it("démarrer une session avec le thème d'un autre → 404, aucune session créée", async () => {
      await alice.agent
        .post('/sessions')
        .send({ region: 'Kanto', plannedMinutes: 30, themeId: bobThemeId })
        .expect(404);
      const active = await alice.agent.get('/sessions/active').expect(200);
      expect(active.body).toEqual({});
    });
  });

  describe('thèmes', () => {
    it("GET /themes ne liste pas les thèmes d'un autre", async () => {
      const res = await alice.agent.get('/themes').expect(200);
      expect(res.body.map((t: { id: number }) => t.id)).not.toContain(bobThemeId);
    });

    it("PATCH /themes/:id d'un autre → 404, thème inchangé", async () => {
      await alice.agent.patch(`/themes/${bobThemeId}`).send({ name: 'Piraté' }).expect(404);
      const res = await bob.agent.get('/themes').expect(200);
      expect(res.body.find((t: { id: number }) => t.id === bobThemeId).name).toBe('Maths');
    });

    it("DELETE /themes/:id d'un autre → 404, thème conservé", async () => {
      await alice.agent.delete(`/themes/${bobThemeId}`).expect(404);
      const res = await bob.agent.get('/themes').expect(200);
      expect(res.body.map((t: { id: number }) => t.id)).toContain(bobThemeId);
    });

    it('un userId glissé dans le body est ignoré (création et modification)', async () => {
      const created = await alice.agent
        .post('/themes')
        .send({ name: 'Cadeau', color: '#00ff00', emoji: '🎁', userId: bob.id })
        .expect(201);
      expect(created.body.userId).toBe(alice.id);

      const patched = await alice.agent
        .patch(`/themes/${created.body.id}`)
        .send({ userId: bob.id })
        .expect(200);
      expect(patched.body.userId).toBe(alice.id);

      const bobThemes = await bob.agent.get('/themes').expect(200);
      expect(bobThemes.body.map((t: { id: number }) => t.id)).not.toContain(created.body.id);
    });
  });

  describe('profil', () => {
    it("GET /me/pokemon ne contient pas les Pokémon d'un autre", async () => {
      const res = await alice.agent.get('/me/pokemon').expect(200);
      expect(res.body).toEqual([]);
    });

    it("avatar avec un Pokémon capturé seulement par un autre → 400", async () => {
      await alice.agent.patch('/me').send({ avatarPokemonId: bobPokemonId }).expect(400);
    });

    it("favoris avec un Pokémon capturé seulement par un autre → 400", async () => {
      await alice.agent.put('/me/favorites').send({ pokemonIds: [bobPokemonId] }).expect(400);
      const bobCollection = await bob.agent.get('/me/pokemon').expect(200);
      expect(bobCollection.body.every((p: { favoriteSlot: null }) => p.favoriteSlot === null)).toBe(
        true,
      );
    });

    it('PATCH /me ignore id, email, username et password', async () => {
      await alice.agent
        .patch('/me')
        .send({ id: bob.id, email: 'vole@test.local', username: 'vole', password: 'x' })
        .expect(200);
      const me = await alice.agent.get('/auth/me').expect(200);
      expect(me.body).toMatchObject({ id: alice.id, email: alice.email, username: alice.username });
      const other = await bob.agent.get('/auth/me').expect(200);
      expect(other.body).toMatchObject({ id: bob.id, email: bob.email });
    });
  });

  describe('amis', () => {
    let requestId: number;

    beforeAll(async () => {
      await alice.agent.post('/friends/requests').send({ query: bob.username }).expect(201);
      const incoming = await bob.agent.get('/friends/requests').expect(200);
      requestId = incoming.body.incoming[0].id;
    });

    it('un tiers ne voit pas la demande', async () => {
      const res = await carol.agent.get('/friends/requests').expect(200);
      expect(res.body).toEqual({ incoming: [], outgoing: [] });
    });

    it('un tiers ne peut ni accepter ni refuser la demande', async () => {
      await carol.agent.post(`/friends/requests/${requestId}/accept`).expect(403);
      await carol.agent.delete(`/friends/requests/${requestId}`).expect(403);
    });

    it("l'expéditeur ne peut pas accepter sa propre demande", async () => {
      await alice.agent.post(`/friends/requests/${requestId}/accept`).expect(403);
      const res = await alice.agent.get('/friends').expect(200);
      expect(res.body).toEqual([]);
    });

    it('seul le destinataire accepte ; un tiers ne peut pas casser l’amitié', async () => {
      await bob.agent.post(`/friends/requests/${requestId}/accept`).expect(204);

      await carol.agent.delete(`/friends/${bob.id}`).expect(404);
      await carol.agent.delete(`/friends/${alice.id}`).expect(404);

      const friends = await alice.agent.get('/friends').expect(200);
      expect(friends.body.map((f: { id: number }) => f.id)).toEqual([bob.id]);
      const carolFriends = await carol.agent.get('/friends').expect(200);
      expect(carolFriends.body).toEqual([]);
    });

    it("la liste d'amis n'expose ni email ni mot de passe", async () => {
      const res = await alice.agent.get('/friends').expect(200);
      const json = JSON.stringify(res.body);
      expect(json).not.toContain(bob.email);
      expect(json).not.toMatch(/password|email/i);
    });
  });
});
