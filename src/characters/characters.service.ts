import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import prisma from '@db';
import { type Prisma } from '../../prisma/generated/client';
import type { CharacterView, Paginated } from '@/common/types/character.types';
import type {
  CreateCharacterInput,
  ListCharactersQuery,
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
  async create(input: CreateCharacterInput): Promise<CharacterView> {
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
        select: { id: true, name: true, version: true, template: true },
      }),
    ]);
    if (!owner) {
      throw new NotFoundException(`User ${input.ownerId} no encontrado`);
    }
    if (!playbook) {
      throw new NotFoundException(`Playbook ${input.playbookId} no encontrado`);
    }

    // 3) Completar los campos derivados que no son input libre del usuario:
    //    - character_name refleja el `name` del body (la columna es la fuente de verdad);
    //    - playbook_name sale del Playbook elegido (set predefinido).
    //    El cliente no manda estos campos; el servidor los inyecta.
    const effectiveValues: Record<string, unknown> = {
      ...input.values,
      character_name: input.name,
      playbook_name: playbook.name,
    };

    // 4) Validar `effectiveValues` contra el template (DEV-48, unificado en
    //    DEV-153 vía el schema Zod compartido `buildTemplateSchema`).
    const result = buildTemplateSchema(playbook.template).safeParse(
      effectiveValues,
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

    // 5) Persistir (Prisma directo, sin repository — CLAUDE.md).
    const character = await prisma.character.create({
      data: {
        name: input.name,
        ownerId: owner.id,
        playbookId: playbook.id,
        playbookVersion: playbook.version,
        values: effectiveValues as Prisma.InputJsonValue,
      },
    });

    this.logger.log(`Character creado: ${character.id}`);
    return character;
  }

  /**
   * GET /characters — listado con envelope `data`/`meta` y filtros por
   * `playbookId`, `gameId` (vía playbook.game) y `search`. Respeta soft-delete.
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
}
