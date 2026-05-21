import { Injectable } from '@nestjs/common';
import prisma from '@db';

@Injectable()
export class PlaybooksService {
  async findAll() {
    const playbooks = await prisma.playbook.findMany({
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

    return playbooks.map(({ game, gameId: _gameId, ...playbook }) => ({
      ...playbook,
      game: {
        gameId: game.id,
        gameName: game.name,
      },
    }));
  }
}