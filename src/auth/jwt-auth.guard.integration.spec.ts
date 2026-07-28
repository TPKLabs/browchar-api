import type { Server } from 'node:http';
import { Controller, Get, INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { describe, it, beforeAll, afterAll, expect, jest } from '@jest/globals';
import request from 'supertest';
import { AuthModule } from './auth.module';
import { Public } from './public.decorator';

// AuthModule -> AuthService -> `@db` -> cliente Prisma real, que no inicializa
// bajo jest. `findUnique` devuelve null para que `/auth/login` llegue a su
// propio 401 de credenciales en vez de reventar contra un mock vacío.
jest.mock('@db', () => ({
  __esModule: true,
  default: { user: { findUnique: () => Promise.resolve(null) } },
}));

// `env.ts` valida al IMPORTARSE, así que setear `process.env` en un `beforeAll`
// llegaría tarde: el import de AuthModule ya habría explotado. El parseo de
// env tiene su propio spec (`config/env.spec.ts`); acá sólo hace falta una
// config válida para levantar el módulo.
jest.mock('@/config/env', () => ({
  env: {
    NODE_ENV: 'test',
    JWT_SECRET: 'test-only-secret-at-least-32-characters-long',
    JWT_EXPIRES_IN: '1h',
  },
}));

/**
 * Controllers sonda. Existen sólo en este test: hoy TODAS las rutas reales
 * están marcadas `@Public()` (characters todavía no scopea por dueño, ver
 * DEV-59/DEV-64), así que sin ellos no habría forma de comprobar que el guard
 * global efectivamente intercepta. Sin esto, un `APP_GUARD` mal registrado
 * pasaría desapercibido hasta que exista la primera ruta protegida de verdad.
 */
@Controller('probe')
class ProbeController {
  @Get('protected')
  protected() {
    return { ok: true };
  }

  @Public()
  @Get('open')
  open() {
    return { ok: true };
  }
}

describe('JwtAuthGuard (registrado globalmente)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  // `getHttpServer()` está tipado `any`; se captura una vez con su tipo real
  // para no arrastrar un unsafe-argument a cada llamada de supertest.
  let server: Server;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AuthModule],
      controllers: [ProbeController],
    }).compile();

    app = moduleRef.createNestApplication();
    jwtService = moduleRef.get(JwtService);
    await app.init();
    server = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('bloquea con 401 una ruta que no declara @Public()', async () => {
    await request(server).get('/probe/protected').expect(401);
  });

  it('deja pasar esa misma ruta con un token válido', async () => {
    const token = jwtService.sign({ sub: 'user-1' });

    await request(server)
      .get('/probe/protected')
      .set('Authorization', `Bearer ${token}`)
      .expect(200, { ok: true });
  });

  it('rechaza un token firmado con otro secreto', async () => {
    const forged = new JwtService({
      secret: 'otro-secreto-de-32-o-mas-chars-x',
    }).sign({ sub: 'user-1' }, { expiresIn: '1h' });

    await request(server)
      .get('/probe/protected')
      .set('Authorization', `Bearer ${forged}`)
      .expect(401);
  });

  it('deja pasar sin token una ruta @Public()', async () => {
    await request(server).get('/probe/open').expect(200, { ok: true });
  });

  // Las rutas reales de auth son públicas por necesidad: son las que se usan
  // PARA obtener un token, así que no pueden exigir uno.
  //
  // No alcanza con mirar el status: el guard y las credenciales inválidas
  // devuelven 401 los dos. Lo que distingue "el guard lo dejó pasar" es que el
  // error sea el del service y no el del guard.
  it('mantiene /auth/login accesible sin token', async () => {
    const response = await request(server)
      .post('/auth/login')
      .send({ email: 'no-existe@mail.com', password: 'cualquier-cosa' });

    // Forma default de Nest, no el envelope de DEV-120: `AllExceptionsFilter`
    // se registra en AppModule y este módulo de test sólo levanta AuthModule.
    const { message } = response.body as { message?: string };
    expect(message).toBe('Email o contraseña incorrectos');
    expect(message).not.toMatch(/[Tt]oken/);
  });
});
