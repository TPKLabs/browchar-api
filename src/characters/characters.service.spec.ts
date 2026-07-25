import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { jest, describe, it, beforeEach, expect } from '@jest/globals';
import { CharactersService } from './characters.service';
import prisma from '@db';

jest.mock('@db', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
    },
    playbook: {
      findUnique: jest.fn(),
    },
    character: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

type AsyncMock = jest.Mock<(...args: any[]) => Promise<any>>;

const prismaMock = prisma as unknown as {
  user: { findUnique: AsyncMock };
  playbook: { findUnique: AsyncMock };
  character: {
    create: AsyncMock;
    findMany: AsyncMock;
    findFirst: AsyncMock;
    count: AsyncMock;
    update: AsyncMock;
    updateMany: AsyncMock;
  };
};

const mockOwner = { id: 'user-1' };
const mockPlaybook = { id: 'pb-1', name: 'El Bruto', version: 2, template: [] };

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

    it('throws BadRequestException when ownerId is missing', async () => {
      await expect(service.create({ ...input, ownerId: '' })).rejects.toThrow(
        BadRequestException,
      );
      expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
      expect(prismaMock.character.create).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when owner does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.create(input)).rejects.toThrow(NotFoundException);
      expect(prismaMock.character.create).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when playbook does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockOwner);
      prismaMock.playbook.findUnique.mockResolvedValue(null);

      await expect(service.create(input)).rejects.toThrow(NotFoundException);
      expect(prismaMock.character.create).not.toHaveBeenCalled();
    });

    it('persists character with playbookVersion from resolved playbook', async () => {
      prismaMock.user.findUnique.mockResolvedValue(mockOwner);
      prismaMock.playbook.findUnique.mockResolvedValue(mockPlaybook);
      prismaMock.character.create.mockResolvedValue(mockCharacter);

      const result = await service.create(input);

      expect(prismaMock.character.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            playbookId: 'pb-1',
            playbookVersion: 2,
            // DEV-172: `values` se persiste tal cual; el server ya NO inyecta
            // character_name/playbook_name (viven en `name`/`playbookId`).
            values: { moves: [] },
          }),
        }),
      );
      expect(result).toEqual(mockCharacter);
    });
  });

  describe('findAll', () => {
    // La fila que devuelve Prisma trae el join `playbook.game` (el service lo
    // pide con `include`); el envelope expone `playbookName`/`gameName` planos.
    const mockCharacterRow = {
      ...mockCharacter,
      playbook: { name: 'El Bruto', game: { name: 'Apocalypse World' } },
    };
    const enrichedItem = {
      ...mockCharacter,
      playbookName: 'El Bruto',
      gameName: 'Apocalypse World',
    };

    beforeEach(() => {
      prismaMock.character.findMany.mockResolvedValue([mockCharacterRow]);
      prismaMock.character.count.mockResolvedValue(1);
    });

    it('returns paginated envelope with defaults when no query params', async () => {
      const result = await service.findAll({});

      expect(result).toEqual({
        data: [enrichedItem],
        meta: { page: 1, pageSize: 20, total: 1 },
      });
    });

    it('enriches each item with resolved playbookName and gameName', async () => {
      const result = await service.findAll({});

      expect(result.data[0]).toMatchObject({
        playbookName: 'El Bruto',
        gameName: 'Apocalypse World',
      });
      // El objeto `playbook` anidado no se filtra al cliente.
      expect(result.data[0]).not.toHaveProperty('playbook');
      expect(prismaMock.character.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            playbook: {
              select: { name: true, game: { select: { name: true } } },
            },
          },
        }),
      );
    });

    it('orders by updatedAt desc (most recently used first)', async () => {
      await service.findAll({});

      expect(prismaMock.character.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { updatedAt: 'desc' } }),
      );
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

  describe('update', () => {
    it('throws NotFoundException when character does not exist', async () => {
      prismaMock.character.findFirst.mockResolvedValue(null);

      await expect(
        service.update('missing', { name: 'Nuevo nombre' }),
      ).rejects.toThrow(NotFoundException);
      expect(prismaMock.character.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when character is soft-deleted', async () => {
      prismaMock.character.findFirst.mockResolvedValue(null);

      await expect(
        service.update('char-1', { name: 'Nuevo nombre' }),
      ).rejects.toThrow(NotFoundException);
      expect(prismaMock.character.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'char-1', deletedAt: null }),
        }),
      );
    });

    it('updates only name without touching the playbook', async () => {
      prismaMock.character.findFirst.mockResolvedValue(mockCharacter);
      prismaMock.character.update.mockResolvedValue({
        ...mockCharacter,
        name: 'Nuevo nombre',
      });

      const result = await service.update('char-1', { name: 'Nuevo nombre' });

      expect(prismaMock.playbook.findUnique).not.toHaveBeenCalled();
      expect(prismaMock.character.update).toHaveBeenCalledWith({
        where: { id: 'char-1', deletedAt: null },
        data: { name: 'Nuevo nombre' },
      });
      expect(result.name).toBe('Nuevo nombre');
    });

    it('revalidates values against the playbook template when values is sent', async () => {
      prismaMock.character.findFirst.mockResolvedValue(mockCharacter);
      prismaMock.playbook.findUnique.mockResolvedValue(mockPlaybook);
      prismaMock.character.update.mockResolvedValue({
        ...mockCharacter,
        values: { moves: ['punch'] },
      });

      await service.update('char-1', { values: { moves: ['punch'] } });

      expect(prismaMock.playbook.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: mockCharacter.playbookId } }),
      );
      expect(prismaMock.character.update).toHaveBeenCalledWith({
        where: { id: 'char-1', deletedAt: null },
        data: { values: { moves: ['punch'] } },
      });
    });

    it('throws NotFoundException when character is soft-deleted before the write', async () => {
      prismaMock.character.findFirst.mockResolvedValue(mockCharacter);
      prismaMock.character.update.mockRejectedValue({ code: 'P2025' });

      await expect(
        service.update('char-1', { name: 'Nuevo nombre' }),
      ).rejects.toThrow(NotFoundException);
      expect(prismaMock.character.update).toHaveBeenCalledWith({
        where: { id: 'char-1', deletedAt: null },
        data: { name: 'Nuevo nombre' },
      });
    });

    it('throws BadRequestException when values do not match the template', async () => {
      prismaMock.character.findFirst.mockResolvedValue(mockCharacter);
      prismaMock.playbook.findUnique.mockResolvedValue({
        ...mockPlaybook,
        template: [
          {
            fields: [
              { id: 'name', type: 'TEXT', label: 'Nombre', required: true },
            ],
          },
        ],
      });

      await expect(service.update('char-1', { values: {} })).rejects.toThrow(
        BadRequestException,
      );
      expect(prismaMock.character.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the character playbook no longer exists', async () => {
      prismaMock.character.findFirst.mockResolvedValue(mockCharacter);
      prismaMock.playbook.findUnique.mockResolvedValue(null);

      await expect(
        service.update('char-1', { values: { moves: [] } }),
      ).rejects.toThrow(NotFoundException);
      expect(prismaMock.character.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when no active character is updated', async () => {
      prismaMock.character.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.remove('missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaMock.character.updateMany).toHaveBeenCalledWith({
        where: { id: 'missing', deletedAt: null },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('soft-deletes by setting deletedAt instead of removing the row', async () => {
      prismaMock.character.updateMany.mockResolvedValue({ count: 1 });

      await service.remove('char-1');

      expect(prismaMock.character.updateMany).toHaveBeenCalledWith({
        where: { id: 'char-1', deletedAt: null },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('rethrows unexpected errors from the atomic update', async () => {
      const unexpected = new Error('connection lost');
      prismaMock.character.updateMany.mockRejectedValue(unexpected);

      await expect(service.remove('char-1')).rejects.toThrow(unexpected);
    });
  });
});
