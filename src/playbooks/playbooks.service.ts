import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import prisma from '@db';
import type { PlaybookView } from '@/common/types/playbook.types';
import type { PlaybookListRequestParams } from './playbook.schemas';

@Injectable()
export class PlaybooksService {
  private readonly logger = new Logger(PlaybooksService.name);

  async findAll(
    query: PlaybookListRequestParams = {},
  ): Promise<PlaybookView[]> {
    const playbooks = await prisma.playbook.findMany({
      where: {
        ...(query.gameId ? { gameId: query.gameId } : {}),
      },
      include: {
        game: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    this.logger.log(`Playbooks encontrados: ${playbooks.length}`);

    return playbooks.map(({ game, gameId: _gameId, ...playbook }) => ({
      ...playbook,
      game: {
        gameId: game.id,
        gameName: game.name,
      },
    }));
  }

  async findOne(id: string): Promise<PlaybookView> {
    const playbook = await prisma.playbook.findUnique({
      where: { id },
      include: {
        game: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!playbook) {
      throw new NotFoundException(`Playbook ${id} no encontrado`);
    }

    const { game, gameId: _gameId, ...rest } = playbook;
    return {
      ...rest,
      game: {
        gameId: game.id,
        gameName: game.name,
      },
    };
  }
}
