import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Public } from '@/auth/public.decorator';
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
/**
 * ⚠️ `@Public()` TEMPORAL — este es el único del proyecto que hay que sacar.
 *
 * Estos endpoints **deberían** exigir token, pero hoy no pueden: `create()`
 * todavía recibe `ownerId` en el body (el front manda `usr_demo` hardcodeado)
 * y `findAll`/`findOne`/`update`/`remove` no filtran por dueño. Protegerlos
 * ahora daría 401 al front sin arreglar nada de fondo: seguirían devolviendo
 * los personajes de todos los usuarios a cualquiera que sí tenga token.
 *
 * El arreglo real es scopear las queries por el actor del token:
 * DEV-59 (listado) y DEV-64 (detalle/edición/borrado). Cuando aterricen, se
 * borra este decorador y `ownerId` sale del body para pasar a salir de
 * `@CurrentUser()`.
 *
 * Hasta entonces la API NO se puede deployar — el gate está en DEV-163.
 */
@Public()
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
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.charactersService.remove(id);
  }
}
