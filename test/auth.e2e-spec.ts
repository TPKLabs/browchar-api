import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { JwtService } from '@nestjs/jwt';
import { Client } from 'pg';
import request from 'supertest';
import type {
  ApiErrorResponse,
  AuthLoginResponse,
} from '@tpklabs/browchar-contracts';
import { hashPassword } from '../src/auth/password-hasher';
import { readBridgeFilePath, type E2eBridge } from './e2e/bridge';
import { E2E_JWT_SECRET } from './e2e/server';

const bridge = JSON.parse(
  readFileSync(readBridgeFilePath(), 'utf-8'),
) as E2eBridge;

describe('Auth login (e2e)', () => {
  const api = () => request(bridge.baseUrl);
  const password = 'e2e-password-correcta';
  const userId = randomUUID();
  const email = `auth-${userId}@test.dev`;
  const corruptUserId = randomUUID();
  const corruptEmail = `auth-corrupt-${corruptUserId}@test.dev`;
  let db: Client;

  beforeAll(async () => {
    db = new Client({ connectionString: bridge.databaseUrl });
    await db.connect();

    await db.query(
      'INSERT INTO "User" (id, email, "passwordHash") VALUES ($1, $2, $3), ($4, $5, $6)',
      [
        userId,
        email,
        await hashPassword(password),
        corruptUserId,
        corruptEmail,
        'malformed-stored-hash',
      ],
    );
  });

  afterAll(async () => {
    await db?.query('DELETE FROM "User" WHERE id = ANY($1)', [
      [userId, corruptUserId],
    ]);
    await db?.end();
  });

  it('devuelve 200, el usuario y un JWT firmado con sólo sub/iat/exp', async () => {
    const response = await api()
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    const body = response.body as AuthLoginResponse;

    expect(Object.keys(body).sort()).toEqual([
      'accessToken',
      'expiresIn',
      'user',
    ]);
    expect(body.expiresIn).toBeGreaterThan(0);
    expect(body.user).toMatchObject({ id: userId, email });
    expect(typeof body.user.createdAt).toBe('string');

    const jwt = new JwtService({
      secret: process.env.JWT_SECRET ?? E2E_JWT_SECRET,
    });
    const payload = jwt.verify<Record<string, unknown>>(body.accessToken);

    expect(Object.keys(payload).sort()).toEqual(['exp', 'iat', 'sub']);
    expect(payload.sub).toBe(userId);
  });

  it('devuelve el mismo 401 para password incorrecta y email inexistente', async () => {
    const wrongPassword = await api()
      .post('/auth/login')
      .send({ email, password: 'incorrecta' })
      .expect(401);
    const unknownEmail = await api()
      .post('/auth/login')
      .send({ email: `unknown-${randomUUID()}@test.dev`, password })
      .expect(401);

    expect(wrongPassword.body).toEqual(unknownEmail.body);
    expect(wrongPassword.body).toEqual({
      statusCode: 401,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Email o contraseña incorrectos',
      },
    } satisfies ApiErrorResponse);
  });

  it('trata un hash almacenado corrupto como credencial inválida', async () => {
    const response = await api()
      .post('/auth/login')
      .send({ email: corruptEmail, password })
      .expect(401);

    expect(response.body).toEqual({
      statusCode: 401,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Email o contraseña incorrectos',
      },
    } satisfies ApiErrorResponse);
  });

  it('rechaza con 400 un body que no cumple el contrato', async () => {
    const response = await api()
      .post('/auth/login')
      .send({ email, password: '' })
      .expect(400);
    const body = response.body as ApiErrorResponse;

    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(
      body.error.details?.some((detail) => detail.field === 'password'),
    ).toBe(true);
  });
});
