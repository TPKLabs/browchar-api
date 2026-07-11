/**
 * Vocabulario de dominio de los templates de Playbook (DEV-153).
 *
 * Fuente de verdad única compartida por browchar-api y browchar-fe: la forma de
 * un `template` (secciones + campos) y su enum de tipos vivía duplicada a mano
 * en ambos repos (`src/common/types` en el back, `src/lib/types` en el front).
 * Ahora vive acá y ambos la consumen.
 *
 * Nota de shape: `options` son objetos `{ label, value }` — es lo que usa la
 * data real (ver `data/playbooks/**\/base.json`) y el front. El validador previo
 * del back los trataba como primitivos, lo que era un bug latente para
 * SELECT/RADIO/CHECKBOX (ver DEV-153).
 */

export enum FieldType {
  TEXT = 'TEXT',
  TEXTAREA = 'TEXTAREA',
  TEXTNUMBER = 'TEXTNUMBER',
  COUNTER = 'COUNTER',
  PROGRESS = 'PROGRESS',
  SELECT = 'SELECT',
  CHECKBOX = 'CHECKBOX',
  RADIO = 'RADIO',
}

/** Una opción de un campo SELECT/RADIO/CHECKBOX. */
export interface FieldOption {
  label: string;
  value: string;
  description?: string;
}

export interface FieldDefinition {
  id: string;
  label: string;
  description?: string;
  required?: boolean;
  type: FieldType;
  defaultValue?: unknown;
  /** Solo para COUNTER/PROGRESS (y, por paridad histórica, TEXTNUMBER). */
  maxValue?: number;
  disabled?: boolean;
  /** Campos display-only (p.ej. Additional Rules): no se validan. */
  isReadOnly?: boolean;
  /** Solo para SELECT/CHECKBOX/RADIO. */
  options?: FieldOption[];
}

export interface TemplateSection {
  id: string;
  title?: string;
  description?: string;
  fields?: FieldDefinition[];
}

/** El `template` de un Playbook: lista de secciones. */
export type Template = TemplateSection[];
