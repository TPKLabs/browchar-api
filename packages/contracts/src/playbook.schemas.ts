import { z } from 'zod';

/**
 * Schema Zod de query del recurso Playbooks.
 *
 * Mismo patrón que `listCharactersQuerySchema` (`character.schemas.ts`):
 * fuente de verdad compartida entre back (DTO `createZodDto`) y front.
 */
export const listPlaybooksQuerySchema = z.object({
  gameId: z.string().trim().min(1).optional(),
});

/** Query de `GET /playbooks` (convención DEV-197). */
export type PlaybookListRequestParams = z.infer<
  typeof listPlaybooksQuerySchema
>;
