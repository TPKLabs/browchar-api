import { Injectable, Logger } from '@nestjs/common';
import prisma from '@db';
import type { GameView } from '@/common/types/game.types';

@Injectable()
export class GamesService {
  private readonly logger = new Logger(GamesService.name);

  /** GET /games — listado de juegos (id + nombre), ordenado por nombre. */
  async findAll(): Promise<GameView[]> {
    const games = await prisma.game.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    this.logger.log(`Games encontrados: ${games.length}`);

    return games;
  }
}
