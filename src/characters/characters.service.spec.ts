import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { jest, describe, it, beforeEach, expect } from '@jest/globals';
import { CharactersService } from './characters.service';
import prisma from '@db';

jest.mock('@db', () => ({
  __esModule: true,
  default: {
    playbook: {
      findUnique: jest.fn(),
    },
    character: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
    },
  },
}));

type AsyncMock = jest.Mock<(...args: any[]) => Promise<any>>;

const prismaMock = prisma as unknown as {
  playbook: { findUnique: AsyncMock };
  character: {
    create: AsyncMock;
    findMany: AsyncMock;
    findFirst: AsyncMock;
    count: AsyncMock;
  };
};

const mockPlaybook = { id: 'pb-1', version: 2 };

const mockCharacter = {
  id: 'char-1',
  name: 'Dusk',
  ownerId: 'user-1',
  playbookId: 'pb-1',
  playbookVersion: 2,
  values: { moves: [] },
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

describe('CharactersService', () => {
  let service: CharactersService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [CharactersService],
    }).compile();

    service = module.get(CharactersService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    const input = {
      name: 'Dusk',
      playbookId: 'pb-1',
      ownerId: 'user-1',
      values: { moves: [] },
    };

    it('throws NotFoundException when playbook does not exist', async () => {
      prismaMock.playbook.findUnique.mockResolvedValue(null);

      await expect(service.create(input)).rejects.toThrow(NotFoundException);
      expect(prismaMock.character.create).not.toHaveBeenCalled();
    });

    it('persists character with playbookVersion from resolved playbook', async () => {
      prismaMock.playbook.findUnique.mockResolvedValue(mockPlaybook);
      prismaMock.character.create.mockResolvedValue(mockCharacter);

      const result = await service.create(input);

      expect(prismaMock.character.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            playbookId: 'pb-1',
            playbookVersion: 2,
          }),
        }),
      );
      expect(result).toEqual(mockCharacter);
    });
  });

  describe('findAll', () => {
    beforeEach(() => {
      prismaMock.character.findMany.mockResolvedValue([mockCharacter]);
      prismaMock.character.count.mockResolvedValue(1);
    });

    it('returns paginated envelope with defaults when no query params', async () => {
      const result = await service.findAll({});

      expect(result).toEqual({
        data: [mockCharacter],
        meta: { page: 1, pageSize: 20, total: 1 },
      });
    });

    it('passes playbookId filter to prisma', async () => {
      await service.findAll({ playbookId: 'pb-1' });

      expect(prismaMock.character.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ playbookId: 'pb-1' }),
        }),
      );
    });

    it('passes gameId filter via playbook relation', async () => {
      await service.findAll({ gameId: 'game-1' });

      expect(prismaMock.character.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ playbook: { gameId: 'game-1' } }),
        }),
      );
    });

    it('passes case-insensitive name search', async () => {
      await service.findAll({ search: 'dusk' });

      expect(prismaMock.character.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: { contains: 'dusk', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('applies skip/take based on page and pageSize', async () => {
      await service.findAll({ page: 2, pageSize: 10 });

      expect(prismaMock.character.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('always filters out soft-deleted characters', async () => {
      await service.findAll({});

      expect(prismaMock.character.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: null }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('returns character when found', async () => {
      prismaMock.character.findFirst.mockResolvedValue(mockCharacter);

      expect(await service.findOne('char-1')).toEqual(mockCharacter);
    });

    it('throws NotFoundException when character does not exist', async () => {
      prismaMock.character.findFirst.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('queries with deletedAt: null to respect soft-delete', async () => {
      prismaMock.character.findFirst.mockResolvedValue(mockCharacter);

      await service.findOne('char-1');

      expect(prismaMock.character.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'char-1', deletedAt: null }),
        }),
      );
    });
  });
});
