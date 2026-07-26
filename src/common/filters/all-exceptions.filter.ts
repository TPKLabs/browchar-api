import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ZodValidationException } from 'nestjs-zod';
import type { Request, Response } from 'express';
import type {
  ApiErrorCode,
  ApiErrorDetail,
  ApiErrorResponse,
} from '@tpklabs/browchar-contracts';

/**
 * Filtro global de excepciones (DEV-120).
 *
 * Normaliza CUALQUIER error de la API al envelope `ApiErrorResponse` de
 * `@tpklabs/browchar-contracts`. Cubre:
 *  - Validación Zod (`ZodValidationException` de nestjs-zod) → 400 con `details`.
 *  - Validación de dominio de los services (`BadRequestException({ message, errors })`) → 400 con `details`.
 *  - `HttpException` de Nest: 400 / 401 / 403 / 404 / 409 → su código semántico.
 *  - Cualquier otra cosa o 5xx → 500 `INTERNAL`, logueado completo pero SIN filtrar internals.
 *
 * Los códigos de auth (401/403) todavía no los produce ningún endpoint (no hay
 * auth), pero quedan mapeados para cuando entre auth (DEV-5 / DEV-83).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  /** Status HTTP → código de error del contrato (solo 4xx conocidos). */
  private static readonly CODE_BY_STATUS: Partial<
    Record<number, ApiErrorCode>
  > = {
    [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
    [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
    [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
    [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
    [HttpStatus.CONFLICT]: 'CONFLICT',
  };

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const body = this.toErrorResponse(exception);

    // 5xx: status HTTP como literal (getStatus() devuelve number; comparar
    // contra el enum HttpStatus dispara no-unsafe-enum-comparison).
    if (body.statusCode >= 500) {
      // El error completo va al log (con stack); al cliente solo el genérico.
      this.logger.error(
        `${req.method} ${req.url} → ${body.statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    res.status(body.statusCode).json(body);
  }

  private toErrorResponse(exception: unknown): ApiErrorResponse {
    // 1) Validación Zod (nestjs-zod): mapear los issues a `details`.
    if (exception instanceof ZodValidationException) {
      return this.build(
        HttpStatus.BAD_REQUEST,
        'VALIDATION_ERROR',
        'Validation failed',
        this.zodIssuesToDetails(exception),
      );
    }

    // 2) HttpException de Nest (incluye las excepciones de dominio de services).
    if (exception instanceof HttpException) {
      const status = exception.getStatus();

      // 5xx explícitas (p. ej. InternalServerErrorException, errores de
      // serialización): tratarlas como internas, sin exponer su contenido.
      if (status >= 500) {
        return this.build(status, 'INTERNAL', 'Internal server error');
      }

      const { message, details } = this.extractHttp(
        exception.getResponse(),
        exception.message,
      );
      // Un 400 con errores por campo es un error de validación de dominio.
      const code: ApiErrorCode =
        details && status === 400
          ? 'VALIDATION_ERROR'
          : (AllExceptionsFilter.CODE_BY_STATUS[status] ?? 'BAD_REQUEST');
      return this.build(status, code, message, details);
    }

    // 3) Cualquier otra cosa → 500 sin filtrar internals.
    return this.build(
      HttpStatus.INTERNAL_SERVER_ERROR,
      'INTERNAL',
      'Internal server error',
    );
  }

  /** Extrae mensaje y `details` del cuerpo de una HttpException (string u objeto). */
  private extractHttp(
    response: string | object,
    fallback: string,
  ): { message: string; details?: ApiErrorDetail[] } {
    if (typeof response === 'string') {
      return { message: response };
    }
    const r = response as Record<string, unknown>;
    const message =
      typeof r.message === 'string'
        ? r.message
        : Array.isArray(r.message)
          ? r.message.join(', ')
          : fallback;
    const details = this.toDetails(r.errors);
    return details ? { message, details } : { message };
  }

  /** Normaliza `errors` de una excepción de dominio a `ApiErrorDetail[]`. */
  private toDetails(errors: unknown): ApiErrorDetail[] | undefined {
    if (!Array.isArray(errors)) return undefined;
    const details = errors
      .filter(
        (e): e is Record<string, unknown> =>
          typeof e === 'object' && e !== null,
      )
      .map((e) => ({
        field:
          typeof e.field === 'string'
            ? e.field
            : Array.isArray(e.path)
              ? e.path.map(String).join('.')
              : '',
        message: typeof e.message === 'string' ? e.message : '',
      }));
    return details.length > 0 ? details : undefined;
  }

  /** Mapea los issues de un ZodError a `ApiErrorDetail[]`. */
  private zodIssuesToDetails(
    exception: ZodValidationException,
  ): ApiErrorDetail[] {
    const zodError: unknown = exception.getZodError();
    const issues =
      zodError && typeof zodError === 'object' && 'issues' in zodError
        ? (zodError as { issues: unknown }).issues
        : undefined;
    if (!Array.isArray(issues)) return [];
    return issues.map((issue: { path?: unknown; message?: unknown }) => ({
      field: Array.isArray(issue.path) ? issue.path.map(String).join('.') : '',
      message: typeof issue.message === 'string' ? issue.message : '',
    }));
  }

  private build(
    statusCode: number,
    code: ApiErrorCode,
    message: string,
    details?: ApiErrorDetail[],
  ): ApiErrorResponse {
    return {
      statusCode,
      error: details ? { code, message, details } : { code, message },
    };
  }
}
