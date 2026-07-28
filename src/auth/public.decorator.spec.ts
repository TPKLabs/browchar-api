import { Controller, Get } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, it, expect } from '@jest/globals';
import { IS_PUBLIC_KEY, Public } from './public.decorator';

/**
 * El decorador es una línea, pero lo que se fija acá no es su implementación
 * sino el **acuerdo con el guard**: `@Public()` tiene que escribir exactamente
 * la metadata que `JwtAuthGuard` lee con `IS_PUBLIC_KEY`. Si ese acuerdo se
 * rompiera del lado del valor, rutas pensadas como públicas empezarían a pedir
 * token — o peor, al revés.
 *
 * Se lee con `Reflector`, la misma API que usa el guard, en vez de con
 * `Reflect.getMetadata` directo: así el test recorre el mismo camino que el
 * código de producción.
 */
describe('@Public()', () => {
  const reflector = new Reflector();

  @Controller('sample')
  class SampleController {
    @Public()
    @Get('open')
    open() {
      return null;
    }

    @Get('closed')
    closed() {
      return null;
    }
  }

  // `unbound-method` existe para evitar perder el `this` al pasar un método
  // suelto. Acá los handlers NUNCA se invocan: se usan como clave de metadata,
  // que es exactamente lo que hace el guard con `context.getHandler()`.
  /* eslint-disable @typescript-eslint/unbound-method */
  const openHandler = SampleController.prototype.open;
  const closedHandler = SampleController.prototype.closed;
  /* eslint-enable @typescript-eslint/unbound-method */

  it('marca el handler con la metadata que lee el guard', () => {
    expect(reflector.get<boolean>(IS_PUBLIC_KEY, openHandler)).toBe(true);
  });

  it('no marca los handlers que no lo declaran', () => {
    expect(
      reflector.get<boolean>(IS_PUBLIC_KEY, closedHandler),
    ).toBeUndefined();
  });

  it('puede aplicarse a la clase entera', () => {
    @Public()
    @Controller('todo-abierto')
    class OpenController {}

    expect(reflector.get<boolean>(IS_PUBLIC_KEY, OpenController)).toBe(true);
  });
});
