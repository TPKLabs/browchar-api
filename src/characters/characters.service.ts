import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import prisma from '@db';
import { type Prisma } from '../../prisma/generated/client';
import type {
  CharacterListItem,
  CharacterView,
  Paginated,
} from '@/common/types/character.types';
import type {
  CharacterCreateRequestBody,
  CharacterListRequestParams,
  CharacterUpdateRequestBody,
} from './character.schemas';
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from '@/common/pagination';
import { buildTemplateSchema } from '@tpklabs/browchar-contracts';

@Injectable()
export class CharactersService {
  private readonly logger = new Logger(CharactersService.name);

  /**
   * POST /characters.
   * Valida `values` contra el `template` del Playbook y persiste el personaje
   * con su `playbookVersion`. Sin auth todavía: `ownerId` llega en el body en
   * modo dev (DEV-5 lo moverá al token).
   */
  async create(input: CharacterCreateRequestBody): Promise<CharacterView> {
    // 1) El owner debe existir (modo dev: ownerId viene en el body).
    //    El DTO ya garantiza un ownerId no vacío cuando la request pasa por el
    //    pipe global de nestjs-zod; este chequeo sigue existiendo porque el
    //    service también se llama directo (tests, futuros callers internos)
    //    sin pasar por ese pipe, y porque Prisma no resuelve un `where.id`
    //    vacío a null, sino que tira un PrismaClientValidationError (500 en
    //    vez del 404 esperado).
    if (!input.ownerId) {
      throw new BadRequestException('ownerId es requerido');
    }

    // 2) Resolver el owner y el Playbook (su versión + template) en paralelo:
    //    son lookups independientes, ninguno depende del resultado del otro.
    const [owner, playbook] = await Promise.all([
      prisma.user.findUnique({
        where: { id: input.ownerId },
        select: { id: true },
      }),
      prisma.playbook.findUnique({
        where: { id: input.playbookId },
        select: { id: true, version: true, template: true },
      }),
    ]);
    if (!owner) {
      throw new NotFoundException(`User ${input.ownerId} no encontrado`);
    }
    if (!playbook) {
      throw new NotFoundException(`Playbook ${input.playbookId} no encontrado`);
    }

    // 3) Validar `values` contra el template (DEV-48, unificado en DEV-153 vía
    //    el schema Zod compartido `buildTemplateSchema`).
    //    DEV-172: el nombre del personaje vive en la columna `name` y el
    //    playbook en `playbookId`/`playbookVersion`; NO se duplican dentro de
    //    `values` (antes se inyectaban `character_name`/`playbook_name`, que en
    //    el form aparecían como campos redundantes que el server pisaba).
    const result = buildTemplateSchema(playbook.template).safeParse(
      input.values,
    );
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: String(issue.path[0] ?? ''),
        message: issue.message,
      }));
      throw new BadRequestException({
        message: 'Los datos del personaje no son válidos para el Playbook',
        errors,
      });
    }

    // 4) Persistir (Prisma directo, sin repository — CLAUDE.md).
    const character = await prisma.character.create({
      data: {
        name: input.name,
        ownerId: owner.id,
        playbookId: playbook.id,
        playbookVersion: playbook.version,
        values: input.values as Prisma.InputJsonValue,
      },
    });

    this.logger.log(`Character creado: ${character.id}`);
    return character;
  }

  /**
   * GET /characters — listado con envelope `data`/`meta` y filtros por
   * `playbookId`, `gameId` (vía playbook.game) y `search`. Respeta soft-delete.
   *
   * Cada item se enriquece con `playbookName`/`gameName` resueltos vía el join
   * `playbook.game` (DEV-60), para que las tarjetas del front no dependan de
   * cruzar el listado de playbooks a mano.
   *
   * Orden por `updatedAt` desc: "más recientes" = últimos en uso (la home
   * muestra los primeros N como "personajes recientes"), no los últimos creados.
   */
  async findAll(
    query: CharacterListRequestParams,
  ): Promise<Paginated<CharacterListItem>> {
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

    const [rows, total] = await Promise.all([
      prisma.character.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          playbook: {
            select: { name: true, game: { select: { name: true } } },
          },
        },
      }),
      prisma.character.count({ where }),
    ]);

    const data: CharacterListItem[] = rows.map(
      ({ playbook, ...character }) => ({
        ...character,
        playbookName: playbook.name,
        gameName: playbook.game.name,
      }),
    );

    return { data, meta: { page, pageSize, total } };
  }

  /**
   * GET /characters/:id — detalle. Respeta soft-delete. Las validaciones de
   * acceso/ownership se completan en DEV-64.
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

  /**
   * PATCH /characters/:id — update parcial. Respeta soft-delete (404 si no
   * existe o está borrado). Las validaciones de ownership se completan en
   * DEV-64, igual que en `findOne`.
   *
   * Si viene `values`, se revalida completo contra el template del Playbook
   * del personaje (mismo mecanismo que `create`, DEV-48/DEV-153) y reemplaza
   * el objeto entero — no hace merge campo a campo.
   */
  async update(
    id: string,
    input: CharacterUpdateRequestBody,
  ): Promise<CharacterView> {
    const character = await prisma.character.findFirst({
      where: { id, deletedAt: null },
    });
    if (!character) {
      throw new NotFoundException(`Character ${id} no encontrado`);
    }

    const data: Prisma.CharacterUpdateInput = {};

    if (input.name !== undefined) {
      data.name = input.name;
    }

    if (input.values !== undefined) {
      const playbook = await prisma.playbook.findUnique({
        where: { id: character.playbookId },
        select: { template: true },
      });
      if (!playbook) {
        throw new NotFoundException(
          `Playbook ${character.playbookId} no encontrado`,
        );
      }

      const result = buildTemplateSchema(playbook.template).safeParse(
        input.values,
      );
      if (!result.success) {
        const errors = result.error.issues.map((issue) => ({
          field: String(issue.path[0] ?? ''),
          message: issue.message,
        }));
        throw new BadRequestException({
          message: 'Los datos del personaje no son válidos para el Playbook',
          errors,
        });
      }

      data.values = input.values as Prisma.InputJsonValue;
    }

    let updated: CharacterView;
    try {
      updated = await prisma.character.update({
        where: { id, deletedAt: null },
        data,
      });
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Character ${id} no encontrado`);
      }
      throw error;
    }

    this.logger.log(`Character actualizado: ${updated.id}`);
    return updated;
  }

  /**
   * DELETE /characters/:id — borrado lógico: marca `deletedAt` en vez de
   * borrar la fila (mismo criterio que ya respetan `findAll`/`findOne`/
   * `update` con `deletedAt: null`), así el personaje deja de listarse/verse
   * sin perder el registro. 404 si no existe o ya está borrado. Las
   * validaciones de ownership se completan en DEV-64/DEV-73, igual que en
   * `findOne`/`update` — todavía no hay auth de la cual derivar la usuaria
   * actual.
   */
  async remove(id: string): Promise<void> {
    const character = await prisma.character.findFirst({
      where: { id, deletedAt: null },
    });
    if (!character) {
      throw new NotFoundException(`Character ${id} no encontrado`);
    }

    try {
      await prisma.character.update({
        where: { id, deletedAt: null },
        data: { deletedAt: new Date() },
      });
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(`Character ${id} no encontrado`);
      }
      throw error;
    }

    this.logger.log(`Character eliminado: ${id}`);
  }
}
