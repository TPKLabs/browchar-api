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

export type CreateCharacterInput = z.infer<typeof createCharacterSchema>;

export const listCharactersQuerySchema = z.object({
  playbookId: z.string().trim().min(1).optional(),
  gameId: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).optional(),
  // Los query params llegan como string: coercionamos a número.
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

export type ListCharactersQuery = z.infer<typeof listCharactersQuerySchema>;
