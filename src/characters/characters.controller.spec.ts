import { Test } from '@nestjs/testing';
import { jest, describe, it, beforeEach, expect } from '@jest/globals';
import { CharactersController } from './characters.controller';
import { CharactersService } from './characters.service';
import type {
  CreateCharacterDto,
  ListCharactersQueryDto,
  UpdateCharacterDto,
} from './character.schemas';

// CharactersService se provee mockeado abajo, pero importar la clase (como
// token de DI) carga characters.service.ts → `@db` → el prisma client real,
// que no resuelve en jest. Mockeamos `@db` para cortar esa cadena.
jest.mock('@db', () => ({ __esModule: true, default: {} }));

describe('CharactersController', () => {
  let controller: CharactersController;
  const create = jest.fn<(body: CreateCharacterDto) => Promise<unknown>>();
  const findAll =
    jest.fn<(query: ListCharactersQueryDto) => Promise<unknown>>();
  const findOne = jest.fn<(id: string) => Promise<unknown>>();
  const update =
    jest.fn<(id: string, body: UpdateCharacterDto) => Promise<unknown>>();
  const remove = jest.fn<(id: string) => Promise<unknown>>();

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [CharactersController],
      providers: [
        {
          provide: CharactersService,
          useValue: { create, findAll, findOne, update, remove },
        },
      ],
    }).compile();

    controller = module.get(CharactersController);
    jest.clearAllMocks();
  });

  // El controller solo delega: el pipe global valida el request y el service
  // hace el trabajo. Alcanza con verificar que pasa los argumentos tal cual y
  // devuelve lo que el service resuelve. El body va casteado porque el DTO es
  // una clase createZodDto y el controller no lo inspecciona.
  it('delegates create to the service', async () => {
    const body = { name: 'Aria' } as unknown as CreateCharacterDto;
    const created = { id: 'char-1', name: 'Aria' };
    create.mockResolvedValue(created);

    await expect(controller.create(body)).resolves.toEqual(created);
    expect(create).toHaveBeenCalledWith(body);
  });

  it('delegates findAll to the service', async () => {
    const query = { page: 1 } as unknown as ListCharactersQueryDto;
    const list = { items: [], total: 0 };
    findAll.mockResolvedValue(list);

    await expect(controller.findAll(query)).resolves.toEqual(list);
    expect(findAll).toHaveBeenCalledWith(query);
  });

  it('delegates findOne to the service', async () => {
    const character = { id: 'char-1' };
    findOne.mockResolvedValue(character);

    await expect(controller.findOne('char-1')).resolves.toEqual(character);
    expect(findOne).toHaveBeenCalledWith('char-1');
  });

  it('delegates update to the service', async () => {
    const body = { name: 'Aria II' } as unknown as UpdateCharacterDto;
    const updated = { id: 'char-1', name: 'Aria II' };
    update.mockResolvedValue(updated);

    await expect(controller.update('char-1', body)).resolves.toEqual(updated);
    expect(update).toHaveBeenCalledWith('char-1', body);
  });

  it('delegates remove to the service', async () => {
    remove.mockResolvedValue(undefined);

    await expect(controller.remove('char-1')).resolves.toBeUndefined();
    expect(remove).toHaveBeenCalledWith('char-1');
  });
});
