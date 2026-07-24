import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CharactersService } from './characters.service';
import {
  CreateCharacterDto,
  ListCharactersQueryDto,
  UpdateCharacterDto,
} from './character.schemas';

/**
 * Rutas del recurso Characters.
 *
 * La validación de la forma del request (DEV-81) la aplica el pipe global de
 * nestjs-zod (registrado en AppModule) sobre los DTOs `createZodDto`. La
 * validación de dominio de `values` contra el template del Playbook vive en el
 * service (DEV-48).
 */
@Controller('characters')
export class CharactersController {
  constructor(private readonly charactersService: CharactersService) {}

  @Post()
  create(@Body() body: CreateCharacterDto) {
    return this.charactersService.create(body);
  }

  @Get()
  findAll(@Query() query: ListCharactersQueryDto) {
    return this.charactersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.charactersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateCharacterDto) {
    return this.charactersService.update(id, body);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string) {
    return this.charactersService.remove(id);
  }
}
