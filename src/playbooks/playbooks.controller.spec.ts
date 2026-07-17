import { Test } from '@nestjs/testing';
import { jest, describe, it, beforeEach, expect } from '@jest/globals';
import { PlaybooksController } from './playbooks.controller';
import { PlaybooksService } from './playbooks.service';
import type { ListPlaybooksQueryDto } from './playbook.schemas';

// PlaybooksService se provee mockeado abajo, pero importar la clase (como token
// de DI) carga playbooks.service.ts → `@db` → el prisma client real, que no
// resuelve en jest. Mockeamos `@db` para cortar esa cadena.
jest.mock('@db', () => ({ __esModule: true, default: {} }));

describe('PlaybooksController', () => {
  let controller: PlaybooksController;
  const findAll = jest.fn<(query: ListPlaybooksQueryDto) => Promise<unknown>>();
  const findOne = jest.fn<(id: string) => Promise<unknown>>();

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [PlaybooksController],
      providers: [
        { provide: PlaybooksService, useValue: { findAll, findOne } },
      ],
    }).compile();

    controller = module.get(PlaybooksController);
    jest.clearAllMocks();
  });

  // El controller solo delega: verifica que pasa los argumentos tal cual y
  // devuelve lo que el service resuelve.
  it('delegates findAll to the service', async () => {
    const query = { page: 1 } as unknown as ListPlaybooksQueryDto;
    const list = { items: [], total: 0 };
    findAll.mockResolvedValue(list);

    await expect(controller.findAll(query)).resolves.toEqual(list);
    expect(findAll).toHaveBeenCalledWith(query);
  });

  it('delegates findOne to the service', async () => {
    const playbook = { id: 'pb-1' };
    findOne.mockResolvedValue(playbook);

    await expect(controller.findOne('pb-1')).resolves.toEqual(playbook);
    expect(findOne).toHaveBeenCalledWith('pb-1');
  });
});
