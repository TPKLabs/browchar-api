import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { describe, it, beforeEach, expect } from '@jest/globals';
import type { Request } from 'express';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from './public.decorator';

const SECRET = 'test-only-secret-at-least-32-characters-long';
const OTHER_SECRET = 'otro-secreto-distinto-de-al-menos-32-chars';

/** Contexto mínimo: al guard sólo le importan headers y metadata. */
function contextWith(
  authorization?: string,
  metadata: Record<string, unknown> = {},
): { context: ExecutionContext; request: Request } {
  const request = { headers: { authorization } } as unknown as Request;

  const handler = () => undefined;
  Reflect.defineMetadata(IS_PUBLIC_KEY, metadata[IS_PUBLIC_KEY], handler);

  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => handler,
    getClass: () => class {},
  } as unknown as ExecutionContext;

  return { context, request };
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: JwtService;

  beforeEach(() => {
    jwtService = new JwtService({
      secret: SECRET,
      signOptions: { expiresIn: '1h' },
    });
    guard = new JwtAuthGuard(jwtService, new Reflector());
  });

  const validToken = () =>
    new JwtService({ secret: SECRET }).sign(
      { sub: 'user-1' },
      { expiresIn: '1h' },
    );

  describe('rutas públicas', () => {
    it('deja pasar sin token cuando el handler es @Public()', async () => {
      const { context } = contextWith(undefined, { [IS_PUBLIC_KEY]: true });

      await expect(guard.canActivate(context)).resolves.toBe(true);
    });

    it('no pone actor en una ruta pública', async () => {
      const { context, request } = contextWith(undefined, {
        [IS_PUBLIC_KEY]: true,
      });

      await guard.canActivate(context);

      expect(request.user).toBeUndefined();
    });
  });

  describe('rutas protegidas', () => {
    it('acepta un token válido y deja el actor en req.user', async () => {
      const { context, request } = contextWith(`Bearer ${validToken()}`);

      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(request.user).toEqual({ userId: 'user-1' });
    });

    it('rechaza cuando no hay header', async () => {
      const { context } = contextWith(undefined);

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    // El punto entero del guard: un token con la firma cambiada no vale, por
    // más que su payload diga lo que quiera.
    it('rechaza un token firmado con otro secreto', async () => {
      const forged = new JwtService({ secret: OTHER_SECRET }).sign(
        { sub: 'user-1' },
        { expiresIn: '1h' },
      );
      const { context, request } = contextWith(`Bearer ${forged}`);

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(request.user).toBeUndefined();
    });

    it('rechaza un token vencido', async () => {
      const expired = new JwtService({ secret: SECRET }).sign(
        { sub: 'user-1' },
        { expiresIn: '-1s' },
      );
      const { context } = contextWith(`Bearer ${expired}`);

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    // Un token sin firmar (alg: none) es el ataque clásico contra JWT.
    it('rechaza un token sin firma', async () => {
      const header = Buffer.from(
        JSON.stringify({ alg: 'none', typ: 'JWT' }),
      ).toString('base64url');
      const payload = Buffer.from(JSON.stringify({ sub: 'admin' })).toString(
        'base64url',
      );
      const { context } = contextWith(`Bearer ${header}.${payload}.`);

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('rechaza un token bien firmado pero sin sub usable', async () => {
      const noSub = new JwtService({ secret: SECRET }).sign(
        { notSub: 'user-1' },
        { expiresIn: '1h' },
      );
      const { context, request } = contextWith(`Bearer ${noSub}`);

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(request.user).toBeUndefined();
    });
  });

  describe('parseo del header Authorization', () => {
    // Aceptar el token pelado o cualquier esquema abriría la puerta a mandar
    // credenciales por otro mecanismo y que el guard las tome por buenas.
    it.each([
      ['sin esquema', (t: string) => t],
      ['esquema equivocado', (t: string) => `Basic ${t}`],
      ['minúscula', (t: string) => `bearer ${t}`],
      ['con partes de más', (t: string) => `Bearer ${t} extra`],
      ['sólo el esquema', () => 'Bearer'],
      ['vacío', () => ''],
    ])('rechaza un header %s', async (_label, build) => {
      const { context } = contextWith(build(validToken()));

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
