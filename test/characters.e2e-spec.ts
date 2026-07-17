import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { Client } from 'pg';
import { FieldType } from '@tpklabs/browchar-contracts';
import { BRIDGE_FILE, type E2eBridge } from './e2e/bridge';

/**
 * e2e del flujo principal del MVP (DEV-149): POST /characters → GET listado →
 * GET detalle, más los caminos de error (400 / 404), contra el server real
 * levantado por el globalSetup (ver test/e2e/).
 *
 * Es black-box: le pegamos por HTTP con supertest. Los fixtures (cadena
 * System→Game→Playbook con un template mínimo de un TEXT required + un User
 * owner) se insertan con `pg` directo, no con Prisma: así el test controla
 * exactamente qué `values` son válidos y cuáles disparan el 400, sin cargar el
 * cliente Prisma dentro de jest.
 */
const bridge = JSON.parse(readFileSync(BRIDGE_FILE, 'utf-8')) as E2eBridge;

describe('Characters (e2e)', () => {
  const api = () => request(bridge.baseUrl);
  let db: Client;
  let ownerId: string;
  let playbookId: string;

  beforeAll(async () => {
    db = new Client({ connectionString: bridge.databaseUrl });
    await db.connect();

    const systemId = randomUUID();
    const gameId = randomUUID();
    playbookId = randomUUID();
    ownerId = randomUUID();

    const template = [
      {
        id: 'main',
        title: 'Main',
        fields: [
          {
            id: 'concept',
            label: 'Concept',
            type: FieldType.TEXT,
            required: true,
          },
        ],
      },
    ];

    await db.query('INSERT INTO "System" (id, key, name) VALUES ($1, $2, $3)', [
      systemId,
      `sys-${systemId}`,
      'Test System',
    ]);
    await db.query(
      'INSERT INTO "Game" (id, "systemId", key, name) VALUES ($1, $2, $3, $4)',
      [gameId, systemId, `game-${gameId}`, 'Test Game'],
    );
    await db.query(
      'INSERT INTO "Playbook" (id, "gameId", name, version, template) VALUES ($1, $2, $3, $4, $5::jsonb)',
      [playbookId, gameId, 'Test Playbook', 1, JSON.stringify(template)],
    );
    await db.query(
      'INSERT INTO "User" (id, email, "passwordHash") VALUES ($1, $2, $3)',
      [ownerId, `owner-${ownerId}@test.dev`, 'x'],
    );
  });

  afterAll(async () => {
    await db?.end();
  });

  it('crea un personaje, lo lista y devuelve su detalle', async () => {
    const createRes = await api()
      .post('/characters')
      .send({
        name: 'Aria',
        playbookId,
        ownerId,
        values: { concept: 'Caballero valiente' },
      })
      .expect(201);

    const created = createRes.body as { id: string; name: string };
    expect(created.id).toEqual(expect.any(String));
    expect(created.name).toBe('Aria');

    // GET /characters — el recién creado aparece en el listado (envelope
    // data/meta).
    const listRes = await api().get('/characters').expect(200);
    const list = listRes.body as {
      data: Array<{ id: string }>;
      meta: { total: number };
    };
    expect(list.meta.total).toBeGreaterThanOrEqual(1);
    expect(list.data.map((c) => c.id)).toContain(created.id);

    // GET /characters/:id — detalle con los values persistidos.
    const detailRes = await api().get(`/characters/${created.id}`).expect(200);
    const detail = detailRes.body as {
      id: string;
      values: Record<string, unknown>;
    };
    expect(detail.id).toBe(created.id);
    expect(detail.values).toEqual({ concept: 'Caballero valiente' });
  });

  it('rechaza con 400 los values inválidos para el template del Playbook', async () => {
    await api()
      .post('/characters')
      .send({ name: 'Sin concepto', playbookId, ownerId, values: {} })
      .expect(400);
  });

  it('rechaza con 400 un body que no cumple el schema (name vacío)', async () => {
    await api()
      .post('/characters')
      .send({ name: '', playbookId, ownerId, values: { concept: 'x' } })
      .expect(400);
  });

  it('devuelve 404 al pedir un personaje inexistente', async () => {
    await api().get('/characters/nonexistent-id').expect(404);
  });
});
