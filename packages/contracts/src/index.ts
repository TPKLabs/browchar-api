/**
 * `@tpklabs/browchar-contracts` — fuente de verdad única de tipos y validación
 * compartidos entre browchar-api y browchar-fe (DEV-153).
 */
export * from './fields';
export * from './pagination';
export * from './character.schemas';
export * from './character.responses';
export * from './playbook.schemas';
export * from './playbook.responses';
export * from './template-schema';
export * from './template.schemas';
export * from './validation';
// Fixtures del contrato (DEV-202): los consumen los contract tests de ambos
// repos. Viven en el paquete para que API y FE prueben contra los MISMOS casos.
export * from './fixtures';
