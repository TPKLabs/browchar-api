import { Test } from '@nestjs/testing';
import { jest, describe, it, beforeEach, expect } from '@jest/globals';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';

// GamesService se provee mockeado abajo, pero importar la clase (como token de
// DI) carga games.service.ts → `@db` → el prisma client real, que no resuelve
// en jest. Mockeamos `@db` para cortar esa cadena.
jest.mock('@db', () => ({ __esModule: true, default: {} }));

describe('GamesController', () => {
  let controller: GamesController;
  const findAll = jest.fn<() => Promise<unknown>>();

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [GamesController],
      providers: [{ provide: GamesService, useValue: { findAll } }],
    }).compile();

    controller = module.get(GamesController);
    jest.clearAllMocks();
  });

  it('delegates findAll to the service', async () => {
    const games = [{ id: 'game-1', name: 'Apocalypse World' }];
    findAll.mockResolvedValue(games);

    await expect(controller.findAll()).resolves.toEqual(games);
    expect(findAll).toHaveBeenCalledTimes(1);
  });
});
