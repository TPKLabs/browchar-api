import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CharactersService } from './characters.service';
import type {
  CreateCharacterInput,
  ListCharactersQuery,
} from '@/common/types/character.types';

/**
 * Rutas base del recurso Characters.
 *
 * El contrato (firmas + tipos) queda definido acá; la lógica fina de cada
 * endpoint se completa en sus tickets: POST (DEV-47/48/49), GET listado
 * (DEV-57/58) y GET detalle (DEV-61/64). La validación de body/query
 * (ValidationPipe + DTOs) llega con DEV-81.
 */
@Controller('characters')
export class CharactersController {
  constructor(private readonly charactersService: CharactersService) {}

  @Post()
  create(@Body() body: CreateCharacterInput) {
    return this.charactersService.create(body);
  }

  @Get()
  findAll(@Query() query: ListCharactersQuery) {
    return this.charactersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.charactersService.findOne(id);
  }
}
