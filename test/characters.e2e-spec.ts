import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { Client } from 'pg';
import {
  FieldType,
  type Character,
  type CharacterListResponse,
} from '@tpklabs/browchar-contracts';
import { readBridgeFilePath, type E2eBridge } from './e2e/bridge';

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
const bridge = JSON.parse(
  readFileSync(readBridgeFilePath(), 'utf-8'),
) as E2eBridge;

// Forma wire esperada (contrato @tpklabs/browchar-contracts). Chequear el set
// exacto de claves atrapa que se caiga o aparezca un campo (ownerId, fechas,
// playbookVersion, enriquecimiento del listado, etc.), no solo los que miramos.
const CHARACTER_KEYS = [
  'id',
  'name',
  'ownerId',
  'values',
  'createdAt',
  'updatedAt',
  'deletedAt',
  'playbookId',
  'playbookVersion',
].sort();
const LIST_ITEM_KEYS = [...CHARACTER_KEYS, 'gameName', 'playbookName'].sort();

const VALUES = { concept: 'Caballero valiente' };

function expectIsoString(value: unknown): void {
  expect(typeof value).toBe('string');
  // Round-trip estricto: valida el contrato ISO 8601 exacto (Date.parse acepta
  // formatos más laxos que no son el wire que serializa la API).
  expect(new Date(value as string).toISOString()).toBe(value);
}

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
    // POST /characters — forma wire completa del Character creado.
    const createRes = await api()
      .post('/characters')
      .send({ name: 'Aria', playbookId, ownerId, values: VALUES })
      .expect(201);

    const created = createRes.body as Character;
    expect(Object.keys(created).sort()).toEqual(CHARACTER_KEYS);
    expect(typeof created.id).toBe('string');
    expect(created).toMatchObject({
      name: 'Aria',
      ownerId,
      playbookId,
      playbookVersion: 1, // lo fija el service desde la versión del Playbook
      values: VALUES,
      deletedAt: null,
    });
    expectIsoString(created.createdAt);
    expectIsoString(created.updatedAt);

    // GET /characters — envelope data/meta; el item viene enriquecido con
    // playbookName/gameName resueltos (DEV-60).
    const listRes = await api().get('/characters').expect(200);
    const list = listRes.body as CharacterListResponse;
    expect(Object.keys(list.meta).sort()).toEqual([
      'page',
      'pageSize',
      'total',
    ]);
    expect(list.meta).toMatchObject({ page: 1, pageSize: 20 });
    expect(typeof list.meta.total).toBe('number');
    expect(list.meta.total).toBeGreaterThanOrEqual(1);

    const item = list.data.find((c) => c.id === created.id);
    expect(item).toBeDefined();
    expect(Object.keys(item!).sort()).toEqual(LIST_ITEM_KEYS);
    expect(item).toMatchObject({
      id: created.id,
      name: 'Aria',
      ownerId,
      playbookId,
      playbookVersion: 1,
      playbookName: 'Test Playbook',
      gameName: 'Test Game',
      values: VALUES,
      deletedAt: null,
    });
    expectIsoString(item!.createdAt);

    // GET /characters/:id — misma forma wire que el create.
    const detailRes = await api().get(`/characters/${created.id}`).expect(200);
    const detail = detailRes.body as Character;
    expect(Object.keys(detail).sort()).toEqual(CHARACTER_KEYS);
    expect(detail).toMatchObject({
      id: created.id,
      name: 'Aria',
      ownerId,
      playbookId,
      playbookVersion: 1,
      values: VALUES,
      deletedAt: null,
    });
    expectIsoString(detail.createdAt);
    expectIsoString(detail.updatedAt);
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
      .send({ name: '', playbookId, ownerId, values: VALUES })
      .expect(400);
  });

  it('devuelve 404 al pedir un personaje inexistente', async () => {
    await api().get('/characters/nonexistent-id').expect(404);
  });
});
