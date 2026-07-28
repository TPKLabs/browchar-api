import { Controller, Get } from '@nestjs/common';
import { Public } from '@/auth/public.decorator';
import { GamesService } from './games.service';

/**
 * Datos de referencia (los juegos soportados), iguales para todos y sin dueño.
 * Público de forma permanente: el front los necesita para armar el formulario
 * de creación antes de que exista una sesión.
 */
@Public()
@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Get()
  findAll() {
    return this.gamesService.findAll();
  }
}
