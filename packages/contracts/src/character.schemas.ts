import { z } from 'zod';

/**
 * Schemas Zod de request del recurso Characters (DEV-81, movidos a
 * `@tpklabs/browchar-contracts` en DEV-153).
 *
 * Son la fuente de verdad compartida: el back los envuelve con `createZodDto`
 * (nestjs-zod) para validar en runtime y el front los reutiliza para su form.
 * De acá se derivan los tipos con `z.infer`, así no duplicamos "tipo + validación".
 *
 * `values` es un objeto dinámico (su forma la define el `template` del Playbook),
 * por eso acá sólo se valida que sea un objeto; su contenido lo valida
 * `buildTemplateSchema` (ver `template-schema.ts`).
 */
export const createCharacterSchema = z.object({
  name: z.string().trim().min(1, 'name es requerido'),
  playbookId: z.string().trim().min(1, 'playbookId es requerido'),
  // Sin auth todavía (DEV-5): ownerId llega en el body en modo dev.
  ownerId: z.string().trim().min(1, 'ownerId es requerido'),
  values: z.record(z.string(), z.unknown()).default(() => ({})),
});

/** Body de `POST /characters` (convención DEV-197). */
export type CharacterCreateRequestBody = z.infer<typeof createCharacterSchema>;

/**
 * PATCH /characters/:id (DEV-67). Todos los campos son opcionales (update
 * parcial), pero el body no puede venir vacío. `values`, cuando se envía,
 * reemplaza el objeto completo y se revalida contra el template del Playbook
 * en el service — acá sólo se valida su forma (objeto), igual que en create.
 */
export const updateCharacterSchema = z
  .object({
    name: z.string().trim().min(1, 'name es requerido').optional(),
    values: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((data) => data.name !== undefined || data.values !== undefined, {
    message: 'Debe enviarse al menos un campo para actualizar',
  });

/** Body de `PATCH /characters/:id` (convención DEV-197). */
export type CharacterUpdateRequestBody = z.infer<typeof updateCharacterSchema>;

export const listCharactersQuerySchema = z.object({
  playbookId: z.string().trim().min(1).optional(),
  gameId: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).optional(),
  // Los query params llegan como string: coercionamos a número.
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

/** Query de `GET /characters` (convención DEV-197). */
export type CharacterListRequestParams = z.infer<
  typeof listCharactersQuerySchema
>;
