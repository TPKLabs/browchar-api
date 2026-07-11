/**
 * DEV-153: el vocabulario de dominio de fields ahora vive en el paquete
 * compartido `@tpklabs/browchar-contracts` (fuente de verdad única FE/BE). Se re-exporta
 * desde acá para no romper los imports internos (`@/common/types/fields.types`).
 */
export { FieldType } from '@tpklabs/browchar-contracts';
export type { FieldDefinition, FieldOption } from '@tpklabs/browchar-contracts';
