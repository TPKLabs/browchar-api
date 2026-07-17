import { createZodDto } from 'nestjs-zod';
import {
  createCharacterSchema,
  listCharactersQuerySchema,
  updateCharacterSchema,
} from '@tpklabs/browchar-contracts';

/**
 * Schemas Zod de request del módulo Characters.
 *
 * DEV-153: los schemas (fuente de verdad) se movieron a `@tpklabs/browchar-contracts`
 * para compartirlos con el front. Acá sólo quedan los DTOs `createZodDto`, que
 * son específicos del back (nestjs-zod). Se re-exportan los schemas y tipos para
 * no romper los imports internos (`./character.schemas`).
 */
export {
  createCharacterSchema,
  listCharactersQuerySchema,
  updateCharacterSchema,
} from '@tpklabs/browchar-contracts';
export type {
  CharacterCreateRequestBody,
  CharacterListRequestParams,
  CharacterUpdateRequestBody,
} from '@tpklabs/browchar-contracts';

/**
 * DTOs para los controllers. El pipe global de nestjs-zod (registrado en
 * AppModule) valida automáticamente cualquier @Body()/@Query() tipado con
 * estas clases — no hace falta pipe por ruta.
 */
export class CreateCharacterDto extends createZodDto(createCharacterSchema) {}

export class ListCharactersQueryDto extends createZodDto(
  listCharactersQuerySchema,
) {}

export class UpdateCharacterDto extends createZodDto(updateCharacterSchema) {}
