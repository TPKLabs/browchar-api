import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { describe, it, expect } from '@jest/globals';
import type { Request } from 'express';
import type { AuthPrincipal } from '@/common/types/auth.types';
import { CurrentUser } from './current-user.decorator';

/**
 * `createParamDecorator` devuelve una factory de decorador; la función que
 * realmente corre en cada request queda guardada en su metadata. Este helper
 * la extrae para poder testearla sin levantar un módulo de Nest entero.
 */
function resolveDecorator(): (
  data: unknown,
  context: ExecutionContext,
) => AuthPrincipal {
  class Probe {
    handler(@CurrentUser() _user: AuthPrincipal): void {}
  }

  const factories = Reflect.getMetadata(
    ROUTE_ARGS_METADATA,
    Probe,
    'handler',
  ) as Record<
    string,
    { factory: (d: unknown, c: ExecutionContext) => AuthPrincipal }
  >;

  return Object.values(factories)[0].factory;
}

const ROUTE_ARGS_METADATA = '__routeArguments__';

function contextWith(user?: AuthPrincipal): ExecutionContext {
  const request = { user } as unknown as Request;
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('CurrentUser', () => {
  it('devuelve el actor que dejó el guard', () => {
    const factory = resolveDecorator();

    expect(factory(undefined, contextWith({ userId: 'user-1' }))).toEqual({
      userId: 'user-1',
    });
  });

  // Sin actor devolver `undefined` sería peor que fallar: terminaría como
  // `ownerId: undefined` en una query, que no scopea nada y devuelve de más.
  it('tira 401 en vez de devolver undefined cuando no hay actor', () => {
    const factory = resolveDecorator();

    expect(() => factory(undefined, contextWith(undefined))).toThrow(
      UnauthorizedException,
    );
  });
});
