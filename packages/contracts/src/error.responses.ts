/**
 * Envelope estándar de error de la API (DEV-120).
 *
 * Fuente única FE/BE de la forma que tiene CUALQUIER respuesta de error sobre
 * HTTP. El back la aplica de forma centralizada con un exception filter global
 * (`AllExceptionsFilter`); el front la consume para mostrar mensajes y, cuando
 * hay validación, los errores por campo.
 *
 * Wire (ejemplos):
 *   404 → { statusCode: 404, error: { code: 'NOT_FOUND', message: 'Character x no encontrado' } }
 *   400 → { statusCode: 400, error: { code: 'VALIDATION_ERROR', message: 'Validation failed',
 *                                     details: [{ field: 'name', message: 'Required' }] } }
 *   500 → { statusCode: 500, error: { code: 'INTERNAL', message: 'Internal server error' } }
 */

/**
 * Código de error legible por máquina. Se deriva del status HTTP; los códigos
 * de auth (`UNAUTHORIZED` / `FORBIDDEN`) quedan definidos aunque todavía no los
 * produzca nadie, para que estén listos cuando entre auth (DEV-5 / DEV-83).
 */
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL';

/** Error por campo, para respuestas de validación (`VALIDATION_ERROR`). */
export interface ApiErrorDetail {
  /** Nombre del campo (path del issue de Zod unido por `.`). */
  field: string;
  message: string;
}

/** Cuerpo del error normalizado. */
export interface ApiError {
  code: ApiErrorCode;
  message: string;
  /** Presente solo en errores de validación. */
  details?: ApiErrorDetail[];
}

/** Response completa de error: el status va también en el body por conveniencia. */
export interface ApiErrorResponse {
  statusCode: number;
  error: ApiError;
}
