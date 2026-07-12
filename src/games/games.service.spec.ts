import { Test } from '@nestjs/testing';
import { jest, describe, it, beforeEach, expect } from '@jest/globals';
import { GamesService } from './games.service';
import prisma from '@db';

jest.mock('@db', () => ({
  __esModule: true,
  default: {
    game: {
      findMany: jest.fn(),
    },
  },
}));

type AsyncMock = jest.Mock<(...args: any[]) => Promise<any>>;

const prismaMock = prisma as unknown as {
  game: {
    findMany: AsyncMock;
  };
};

describe('GamesService', () => {
  let service: GamesService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [GamesService],
    }).compile();

    service = module.get(GamesService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns games (id + name) ordered by name', async () => {
      const games = [
        { id: 'game-1', name: 'Apocalypse World' },
        { id: 'game-2', name: 'Dungeon World' },
      ];
      prismaMock.game.findMany.mockResolvedValue(games);

      const result = await service.findAll();

      expect(result).toEqual(games);
      expect(prismaMock.game.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        }),
      );
    });

    it('returns an empty array when no games exist', async () => {
      prismaMock.game.findMany.mockResolvedValue([]);

      expect(await service.findAll()).toEqual([]);
    });
  });
});
