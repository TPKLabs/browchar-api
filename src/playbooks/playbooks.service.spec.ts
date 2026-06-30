import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { jest, describe, it, beforeEach, expect } from '@jest/globals';
import { PlaybooksService } from './playbooks.service';
import prisma from '@db';

jest.mock('@db', () => ({
  __esModule: true,
  default: {
    playbook: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

type AsyncMock = jest.Mock<(...args: any[]) => Promise<any>>;

const prismaMock = prisma as unknown as {
  playbook: {
    findMany: AsyncMock;
    findUnique: AsyncMock;
  };
};

const mockRawPlaybook = {
  id: 'pb-1',
  name: 'El Bruto',
  gameId: 'game-1',
  version: 1,
  description: null,
  template: {},
  createdAt: new Date(),
  game: { id: 'game-1', name: 'Apocalypse World' },
};

const expectedView = {
  id: 'pb-1',
  name: 'El Bruto',
  version: 1,
  description: null,
  template: {},
  createdAt: mockRawPlaybook.createdAt,
  game: { gameId: 'game-1', gameName: 'Apocalypse World' },
};

describe('PlaybooksService', () => {
  let service: PlaybooksService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [PlaybooksService],
    }).compile();

    service = module.get(PlaybooksService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns transformed playbooks stripping gameId', async () => {
      prismaMock.playbook.findMany.mockResolvedValue([mockRawPlaybook]);

      const result = await service.findAll();

      expect(result).toEqual([expectedView]);
      expect(result[0]).not.toHaveProperty('gameId');
    });

    it('returns empty array when no playbooks exist', async () => {
      prismaMock.playbook.findMany.mockResolvedValue([]);

      expect(await service.findAll()).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('returns the transformed playbook', async () => {
      prismaMock.playbook.findUnique.mockResolvedValue(mockRawPlaybook);

      const result = await service.findOne('pb-1');

      expect(result).toEqual(expectedView);
      expect(result).not.toHaveProperty('gameId');
      expect(prismaMock.playbook.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'pb-1' } }),
      );
    });

    it('throws NotFoundException when playbook does not exist', async () => {
      prismaMock.playbook.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
