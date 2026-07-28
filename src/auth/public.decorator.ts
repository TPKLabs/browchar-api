import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marca una ruta como accesible sin token.
 *
 * El guard JWT se registra **globalmente** (ver `AuthModule`), así que el
 * default de la API es "protegido" y abrirse es un acto explícito. Es al revés
 * de lo habitual —proteger ruta por ruta— y a propósito: con opt-in, olvidarse
 * de poner el guard deja un endpoint expuesto y nada lo delata; con opt-out,
 * olvidarse de `@Public()` devuelve 401 y se nota en el primer request.
 *
 * O sea: el modo de fallar por descuido es "de más", no "de menos".
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
