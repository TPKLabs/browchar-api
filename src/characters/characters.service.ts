import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import prisma from '@db';
import { Prisma } from '../../prisma/generated/client';
import type {
  CharacterView,
  CreateCharacterInput,
  ListCharactersQuery,
  Paginated,
} from '@/common/types/character.types';

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;

@Injectable()
export class CharactersService {
  private readonly logger = new Logger(CharactersService.name);

  /**
   * POST /characters — base.
   * Resuelve el Playbook y persiste el personaje con su `playbookVersion`.
   * La validación de `values` contra el template del Playbook se implementa
   * en DEV-48; la lógica de create definitiva, en DEV-49.
   */
  async create(input: CreateCharacterInput): Promise<CharacterView> {
    const playbook = await prisma.playbook.findUnique({
      where: { id: input.playbookId },
      select: { id: true, version: true },
    });

    if (!playbook) {
      throw new NotFoundException(`Playbook ${input.playbookId} no encontrado`);
    }

    const character = await prisma.character.create({
      data: {
        name: input.name,
        ownerId: input.ownerId,
        playbookId: playbook.id,
        playbookVersion: playbook.version,
        values: input.values as Prisma.InputJsonValue,
      },
    });

    this.logger.log(`Character creado: ${character.id}`);
    return character;
  }

  /**
   * GET /characters — base.
   * Devuelve el envelope `data`/`meta` con filtros por `playbookId`, `gameId`
   * (vía playbook.game) y `search`. Paginación/orden se afinan en DEV-58 y los
   * filtros se completan en DEV-57.
   */
  async findAll(query: ListCharactersQuery): Promise<Paginated<CharacterView>> {
    const page = query.page && query.page > 0 ? query.page : DEFAULT_PAGE;
    const pageSize =
      query.pageSize && query.pageSize > 0 ? query.pageSize : DEFAULT_PAGE_SIZE;

    const where: Prisma.CharacterWhereInput = {
      deletedAt: null,
      ...(query.playbookId ? { playbookId: query.playbookId } : {}),
      ...(query.gameId ? { playbook: { gameId: query.gameId } } : {}),
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' } }
        : {}),
    };

    const [data, total] = await Promise.all([
      prisma.character.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.character.count({ where }),
    ]);

    return { data, meta: { page, pageSize, total } };
  }

  /**
   * GET /characters/:id — base.
   * Respeta soft-delete. Las validaciones de acceso/ownership y el detalle de
   * errores se completan en DEV-64.
   */
  async findOne(id: string): Promise<CharacterView> {
    const character = await prisma.character.findFirst({
      where: { id, deletedAt: null },
    });

    if (!character) {
      throw new NotFoundException(`Character ${id} no encontrado`);
    }

    return character;
  }
}
