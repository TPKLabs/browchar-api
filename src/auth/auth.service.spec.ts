import { Test } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { jest, describe, it, beforeEach, expect } from '@jest/globals';
import { AuthService } from './auth.service';
import { hashPassword, verifyPassword } from './password-hasher';
import prisma from '@db';

jest.mock('@db', () => ({
  __esModule: true,
  default: {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

type AsyncMock = jest.Mock<(...args: any[]) => Promise<any>>;

const prismaMock = prisma as unknown as {
  user: { create: AsyncMock; findUnique: AsyncMock };
};

const input = { email: 'ana@mail.com', password: 'una-clave-larga' };

const mockUser = {
  id: 'user-1',
  email: 'ana@mail.com',
  createdAt: new Date(),
};

/** Error tal como lo tira Prisma ante violación de constraint único. */
const uniqueViolation = Object.assign(new Error('Unique constraint failed'), {
  code: 'P2002',
});

const JWT_TEST_SECRET = 'test-only-secret-at-least-32-characters-long';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: JWT_TEST_SECRET,
          signOptions: { expiresIn: '7d' },
        }),
      ],
      providers: [AuthService],
    }).compile();

    service = module.get(AuthService);
    jwtService = module.get(JwtService);
    jest.clearAllMocks();
    // Por defecto el email está libre; los casos de duplicado lo sobreescriben.
    prismaMock.user.findUnique.mockResolvedValue(null);
  });

  describe('register', () => {
    it('persists the user and returns it', async () => {
      prismaMock.user.create.mockResolvedValue(mockUser);

      await expect(service.register(input)).resolves.toEqual(mockUser);
      expect(prismaMock.user.create).toHaveBeenCalledTimes(1);
    });

    it('never stores the plaintext password', async () => {
      prismaMock.user.create.mockResolvedValue(mockUser);

      await service.register(input);

      const { data } = prismaMock.user.create.mock.calls[0][0] as {
        data: { email: string; passwordHash: string };
      };
      expect(data).not.toHaveProperty('password');
      expect(data.passwordHash).not.toBe(input.password);
      expect(data.passwordHash).toMatch(/^\$argon2id\$/);
    });

    it('stores a hash that verifies against the original password', async () => {
      prismaMock.user.create.mockResolvedValue(mockUser);

      await service.register(input);

      const { data } = prismaMock.user.create.mock.calls[0][0] as {
        data: { passwordHash: string };
      };
      await expect(
        verifyPassword(data.passwordHash, input.password),
      ).resolves.toBe(true);
    });

    it('selects only the public columns, never passwordHash', async () => {
      prismaMock.user.create.mockResolvedValue(mockUser);

      await service.register(input);

      const { select } = prismaMock.user.create.mock.calls[0][0] as {
        select: Record<string, boolean>;
      };
      expect(select).not.toHaveProperty('passwordHash');
      expect(select).toEqual({ id: true, email: true, createdAt: true });
    });

    it('throws ConflictException when the email is already taken', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.register(input)).rejects.toThrow(ConflictException);
    });

    // El hash es caro a propósito; en un endpoint sin auth, pagarlo para un
    // email que ya sabemos tomado es CPU regalada a quien quiera abusarlo.
    it('rejects a taken email without paying the hashing cost', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.register(input)).rejects.toThrow(ConflictException);
      expect(prismaMock.user.create).not.toHaveBeenCalled();
    });

    // La carrera que el findUnique no puede cerrar: otra request crea el mismo
    // email entre el chequeo y el insert. El índice de Postgres es el árbitro.
    it('still maps a P2002 race to ConflictException', async () => {
      prismaMock.user.create.mockRejectedValue(uniqueViolation);

      await expect(service.register(input)).rejects.toThrow(ConflictException);
    });

    it('rethrows unexpected persistence errors untouched', async () => {
      const boom = new Error('connection lost');
      prismaMock.user.create.mockRejectedValue(boom);

      await expect(service.register(input)).rejects.toThrow(boom);
    });
  });

  describe('login', () => {
    const password = 'la-clave-correcta';
    let storedUser: {
      id: string;
      email: string;
      createdAt: Date;
      passwordHash: string;
    };

    beforeEach(async () => {
      storedUser = { ...mockUser, passwordHash: await hashPassword(password) };
    });

    it('returns a signed token and the user on valid credentials', async () => {
      prismaMock.user.findUnique.mockResolvedValue(storedUser);

      const result = await service.login({ email: input.email, password });

      expect(result.user).toEqual(mockUser);
      expect(typeof result.accessToken).toBe('string');
      expect(result.expiresIn).toBeGreaterThan(0);
    });

    it('never leaks passwordHash in the response', async () => {
      prismaMock.user.findUnique.mockResolvedValue(storedUser);

      const result = await service.login({ email: input.email, password });

      expect(result.user).not.toHaveProperty('passwordHash');
      expect(JSON.stringify(result)).not.toContain(storedUser.passwordHash);
    });

    // El payload va firmado pero NO cifrado: cualquiera con el token lo lee.
    it('puts only the user id in the token payload, no PII', async () => {
      prismaMock.user.findUnique.mockResolvedValue(storedUser);

      const { accessToken } = await service.login({
        email: input.email,
        password,
      });
      const payload = jwtService.verify<Record<string, unknown>>(accessToken, {
        secret: JWT_TEST_SECRET,
      });

      expect(payload.sub).toBe(mockUser.id);
      expect(payload).not.toHaveProperty('email');
      expect(JSON.stringify(payload)).not.toContain(mockUser.email);
    });

    it('reports expiresIn consistent with the token own expiry', async () => {
      prismaMock.user.findUnique.mockResolvedValue(storedUser);

      const { accessToken, expiresIn } = await service.login({
        email: input.email,
        password,
      });
      const { exp, iat } = jwtService.decode<{ exp: number; iat: number }>(
        accessToken,
      );

      expect(expiresIn).toBe(exp - iat);
    });

    it('rejects a wrong password', async () => {
      prismaMock.user.findUnique.mockResolvedValue(storedUser);

      await expect(
        service.login({ email: input.email, password: 'la-clave-incorrecta' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejects an unknown email', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nadie@mail.com', password }),
      ).rejects.toThrow(UnauthorizedException);
    });

    // Distinguir los dos fallos permitiria averiguar que direcciones tienen
    // cuenta probando el endpoint de login.
    it('gives an identical error for unknown email and wrong password', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      const unknownEmail = await service
        .login({ email: 'nadie@mail.com', password })
        .catch((e: UnauthorizedException) => e);

      prismaMock.user.findUnique.mockResolvedValue(storedUser);
      const wrongPassword = await service
        .login({ email: input.email, password: 'incorrecta' })
        .catch((e: UnauthorizedException) => e);

      expect(unknownEmail).toBeInstanceOf(UnauthorizedException);
      expect(wrongPassword).toBeInstanceOf(UnauthorizedException);
      expect((unknownEmail as UnauthorizedException).message).toBe(
        (wrongPassword as UnauthorizedException).message,
      );
      expect((unknownEmail as UnauthorizedException).getStatus()).toBe(
        (wrongPassword as UnauthorizedException).getStatus(),
      );
    });

    // El mensaje generico no sirve si el tiempo de respuesta delata lo mismo:
    // sin el hash senuelo, el email inexistente vuelve sin pagar argon2.
    it('still verifies against a dummy hash when the email does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      const started = Date.now();
      await service
        .login({ email: 'nadie@mail.com', password })
        .catch(() => undefined);
      const unknownEmailMs = Date.now() - started;

      // Un lookup que corta antes de hashear responde en ~0ms; argon2 con los
      // parametros de OWASP cuesta ~20ms. El piso deja margen para maquinas
      // lentas sin volverse un test flaky.
      expect(unknownEmailMs).toBeGreaterThan(5);
    });
  });
});
