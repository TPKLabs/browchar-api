import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ZodValidationException } from 'nestjs-zod';
import { z } from 'zod';
import type { ApiErrorResponse } from '@tpklabs/browchar-contracts';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let json: jest.Mock<void, [ApiErrorResponse]>;
  let status: jest.Mock;
  let host: ArgumentsHost;
  let errorLog: jest.SpyInstance;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    json = jest.fn<void, [ApiErrorResponse]>();
    status = jest.fn().mockReturnValue({ json });
    host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ method: 'GET', url: '/characters/x' }),
      }),
    } as unknown as ArgumentsHost;
    // Silenciar y espiar el logger de errores 5xx.
    errorLog = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  /** Corre el filtro y devuelve el body JSON con el que respondió. */
  function run(exception: unknown): ApiErrorResponse {
    filter.catch(exception, host);
    expect(status).toHaveBeenCalledTimes(1);
    expect(json).toHaveBeenCalledTimes(1);
    const body = json.mock.calls[0][0];
    expect(status).toHaveBeenCalledWith(body.statusCode);
    return body;
  }

  it('mapea la validación Zod (nestjs-zod) a 400 VALIDATION_ERROR con details', () => {
    const zodError = z
      .object({ name: z.string(), age: z.number() })
      .safeParse({ name: 123 }).error!;
    const body = run(new ZodValidationException(zodError));

    expect(body.statusCode).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toBe('Validation failed');
    expect(body.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'name' }),
        expect.objectContaining({ field: 'age' }),
      ]),
    );
    expect(errorLog).not.toHaveBeenCalled();
  });

  it('tolera un ZodValidationException sin issues (details vacío)', () => {
    const body = run(new ZodValidationException({} as never));
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details).toEqual([]);
  });

  it('mapea issues con path/message ausentes a field/message vacíos', () => {
    const body = run(new ZodValidationException({ issues: [{}] } as never));
    expect(body.error.details).toEqual([{ field: '', message: '' }]);
  });

  it('mapea la validación de dominio ({ message, errors }) a 400 VALIDATION_ERROR con details', () => {
    const exception = new BadRequestException({
      message: 'Los datos del personaje no son válidos para el Playbook',
      errors: [{ field: 'concept', message: 'Required' }],
    });
    const body = run(exception);

    expect(body.statusCode).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toBe(
      'Los datos del personaje no son válidos para el Playbook',
    );
    expect(body.error.details).toEqual([
      { field: 'concept', message: 'Required' },
    ]);
  });

  it('mapea errors con path (en vez de field) uniendo por "."', () => {
    const body = run(
      new BadRequestException({
        message: 'm',
        errors: [{ path: ['a', 0], message: 'x' }],
      }),
    );
    expect(body.error.details).toEqual([{ field: 'a.0', message: 'x' }]);
  });

  it('un 400 con errors vacíos no expone details', () => {
    const body = run(new BadRequestException({ message: 'm', errors: [] }));
    expect(body.error.code).toBe('BAD_REQUEST');
    expect(body.error.details).toBeUndefined();
  });

  it('un BadRequestException con string plano → 400 BAD_REQUEST sin details', () => {
    const body = run(new BadRequestException('ownerId es requerido'));
    expect(body.statusCode).toBe(400);
    expect(body.error.code).toBe('BAD_REQUEST');
    expect(body.error.message).toBe('ownerId es requerido');
    expect(body.error.details).toBeUndefined();
  });

  it('mapea un message array (estilo class-validator) uniéndolo por ", "', () => {
    const body = run(
      new BadRequestException({ message: ['a', 'b'], statusCode: 400 }),
    );
    expect(body.error.message).toBe('a, b');
  });

  it('mapea NotFoundException → 404 NOT_FOUND', () => {
    const body = run(new NotFoundException('Character x no encontrado'));
    expect(body.statusCode).toBe(404);
    expect(body.error.code).toBe('NOT_FOUND');
    expect(body.error.message).toBe('Character x no encontrado');
  });

  it('mapea UnauthorizedException → 401 UNAUTHORIZED (listo para auth)', () => {
    const body = run(new UnauthorizedException());
    expect(body.statusCode).toBe(401);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('mapea ForbiddenException → 403 FORBIDDEN (listo para auth)', () => {
    const body = run(new ForbiddenException());
    expect(body.statusCode).toBe(403);
    expect(body.error.code).toBe('FORBIDDEN');
  });

  it('mapea ConflictException → 409 CONFLICT', () => {
    const body = run(new ConflictException());
    expect(body.statusCode).toBe(409);
    expect(body.error.code).toBe('CONFLICT');
  });

  it('un 4xx no mapeado cae en BAD_REQUEST por defecto', () => {
    const body = run(new HttpException('teapot', HttpStatus.I_AM_A_TEAPOT));
    expect(body.statusCode).toBe(418);
    expect(body.error.code).toBe('BAD_REQUEST');
    expect(body.error.message).toBe('teapot');
  });

  it('una HttpException 5xx se trata como INTERNAL sin exponer su contenido', () => {
    const body = run(new InternalServerErrorException('detalle sensible'));
    expect(body.statusCode).toBe(500);
    expect(body.error.code).toBe('INTERNAL');
    expect(body.error.message).toBe('Internal server error');
    expect(errorLog).toHaveBeenCalledTimes(1);
  });

  it('un Error genérico → 500 INTERNAL, logueado con stack', () => {
    const boom = new Error('boom');
    const body = run(boom);
    expect(body.statusCode).toBe(500);
    expect(body.error.code).toBe('INTERNAL');
    expect(body.error.message).toBe('Internal server error');
    expect(errorLog).toHaveBeenCalledWith(
      expect.stringContaining('→ 500'),
      boom.stack,
    );
  });

  it('un throw no-Error → 500 INTERNAL, logueado como string', () => {
    const body = run('algo raro');
    expect(body.statusCode).toBe(500);
    expect(errorLog).toHaveBeenCalledWith(expect.any(String), 'algo raro');
  });
});
