/**
 * DEV-153: la forma del `template` de un Playbook vive en `@tpklabs/browchar-contracts`
 * (fuente de verdad única FE/BE). Se re-exporta para no romper imports internos.
 */
export type { TemplateSection, Template } from '@tpklabs/browchar-contracts';
