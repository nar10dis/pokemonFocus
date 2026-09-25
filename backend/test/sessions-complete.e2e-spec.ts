import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from './../src/app.module.js';
import { CAPTURE_CONFIG } from './../src/sessions/capture.config.js';
import { rollCaptures } from './../src/sessions/capture.js';
import { PrismaService } from './../src/prisma/prisma.service.js';
import { SessionsService } from './../src/sessions/sessions.service.js';

// on fixe les Pokémon tirés pour vérifier l'enregistrement des captures
vi.mock('./../src/sessions/capture.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./../src/sessions/capture.js')>()),
  rollCaptures: vi.fn(),
}));

describe('SessionsService.complete (intégration, base réelle)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let sessions: SessionsService;
  let userId: number;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    sessions = app.get(SessionsService);
    const suffix = `${process.pid}-${Date.now()}`;
    ({ id: userId } = await prisma.user.create({
      data: { email: `complete-${suffix}@test.local`, username: `cpl${suffix}`.slice(0, 20), password: 'x' },
    }));
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } });
    await app.close();
  });

  it('monte les niveaux des doublons, crée les nouveaux et enregistre les captures dans l’ordre', async () => {
    const [a, b, c] = await prisma.pokemon.findMany({ take: 3, orderBy: { id: 'asc' } });
    await prisma.ownedPokemon.createMany({
      data: [
        { userId, pokemonId: a.id, level: 5, captureCount: 5 },
        { userId, pokemonId: c.id, level: CAPTURE_CONFIG.maxLevel, captureCount: 3 },
      ],
    });
    // A déjà possédé, B nouveau capturé deux fois, C déjà au niveau max
    const [pa, pb, pc] = [
      { ...a, dropChance: 0.5, baseDropChance: 0.4 },
      { ...b, dropChance: 0.3, baseDropChance: 0.3 },
      { ...c, dropChance: 0.2, baseDropChance: 0.3 },
    ];
    vi.mocked(rollCaptures).mockReturnValue([pa, pb, pb, pc, pa]);
    const session = await prisma.workSession.create({
      data: { userId, region: a.region, plannedMinutes: 5, startedAt: new Date(Date.now() - 10 * 60_000) },
    });

    const result = await sessions.complete(userId, session.id);

    expect(result.status).toBe('COMPLETED');
    expect(result.streakDays).toBe(0);
    expect(
      result.captures.map((x) => [x.pokemonId, x.isNew, x.levelAfter, x.dropChance, x.baseDropChance]),
    ).toEqual([
      [a.id, false, 6, 0.5, 0.4],
      [b.id, true, 1, 0.3, 0.3],
      [b.id, false, 2, 0.3, 0.3],
      [c.id, false, CAPTURE_CONFIG.maxLevel, 0.2, 0.3],
      [a.id, false, 7, 0.5, 0.4],
    ]);
    const owned = await prisma.ownedPokemon.findMany({
      where: { userId },
      orderBy: { pokemonId: 'asc' },
      select: { pokemonId: true, level: true, captureCount: true },
    });
    expect(owned).toEqual([
      { pokemonId: a.id, level: 7, captureCount: 7 },
      { pokemonId: b.id, level: 2, captureCount: 2 },
      { pokemonId: c.id, level: CAPTURE_CONFIG.maxLevel, captureCount: 4 },
    ]);
  });

  it('refuse de terminer deux fois la même session', async () => {
    const [a] = await prisma.pokemon.findMany({ take: 1 });
    vi.mocked(rollCaptures).mockReturnValue([{ ...a, dropChance: 1, baseDropChance: 1 }]);
    const session = await prisma.workSession.create({
      data: { userId, region: a.region, plannedMinutes: 5, startedAt: new Date(Date.now() - 10 * 60_000) },
    });
    await sessions.complete(userId, session.id);
    await expect(sessions.complete(userId, session.id)).rejects.toThrow('Aucune session en cours');
  });
});
