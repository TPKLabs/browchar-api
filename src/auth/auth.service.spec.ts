import { Test } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { jest, describe, it, beforeEach, expect } from '@jest/globals';
import { AuthService } from './auth.service';
import { verifyPassword } from './password-hasher';
import prisma from '@db';

jest.mock('@db', () => ({
  __esModule: true,
  default: {
    user: {
      create: jest.fn(),
    },
  },
}));

type AsyncMock = jest.Mock<(...args: any[]) => Promise<any>>;

const prismaMock = prisma as unknown as {
  user: { create: AsyncMock };
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

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [AuthService],
    }).compile();

    service = module.get(AuthService);
    jest.clearAllMocks();
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
      prismaMock.user.create.mockRejectedValue(uniqueViolation);

      await expect(service.register(input)).rejects.toThrow(ConflictException);
    });

    it('rethrows unexpected persistence errors untouched', async () => {
      const boom = new Error('connection lost');
      prismaMock.user.create.mockRejectedValue(boom);

      await expect(service.register(input)).rejects.toThrow(boom);
    });
  });
});
