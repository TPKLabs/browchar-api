import { createZodDto } from 'nestjs-zod';
import { registerSchema } from '@tpklabs/browchar-contracts';

/**
 * Schemas Zod de request del módulo Auth.
 *
 * Los schemas (fuente de verdad) viven en `@tpklabs/browchar-contracts` para
 * compartirlos con el front; acá sólo quedan los DTOs `createZodDto`, que son
 * específicos del back (nestjs-zod). Se re-exportan schema y tipo para no
 * obligar a los imports internos a conocer el paquete.
 */
export { registerSchema } from '@tpklabs/browchar-contracts';
export type { AuthRegisterRequestBody } from '@tpklabs/browchar-contracts';

/**
 * DTO para el controller. El pipe global de nestjs-zod (registrado en
 * AppModule) valida automáticamente cualquier @Body() tipado con esta clase.
 */
export class RegisterDto extends createZodDto(registerSchema) {}
