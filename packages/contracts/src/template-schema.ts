import { z } from 'zod';
import { FieldType } from './fields';
import type { FieldDefinition, TemplateSection } from './fields';

/**
 * Construye el schema Zod de los `values` de un personaje a partir del
 * `template` de su Playbook (DEV-153).
 *
 * Reemplaza dos reimplementaciones a mano de la misma lógica que existían en
 * paralelo — el validador imperativo del back (`template-validation.ts`) y el
 * builder del form del front (`character-schema.ts`) — unificándolas en una sola
 * fuente de verdad. Al hacerlo se corrigen tres divergencias reales:
 *
 * - `options` se leen como objetos `{ value }` (data real + front), no como
 *   primitivos (bug latente del validador viejo del back).
 * - los TEXTNUMBER admiten negativos: se elimina el `.min(0)` que el front
 *   aplicaba y que rechazaba, por ejemplo, un modificador negativo.
 * - los campos `isReadOnly` (display-only) no se validan: antes el front los
 *   trataba como `required` y podían bloquear el submit sin forma de editarlos.
 *
 * Reglas:
 * - Campos `required` deben estar presentes y no vacíos.
 * - Cada valor respeta el `FieldType` del campo (sin coerción, salvo
 *   `coerceNumbers`).
 * - COUNTER/PROGRESS/TEXTNUMBER no pueden superar `maxValue`.
 * - SELECT/RADIO deben ser una de las `options`; CHECKBOX con `options` admite
 *   una o varias opciones válidas, sin `options` es booleano.
 * - Las claves fuera del template se permiten (passthrough).
 */
export interface BuildTemplateSchemaOptions {
  /**
   * Cuando es `true`, los campos numéricos aceptan además el string del input
   * y lo coercionan a number. react-hook-form entrega strings, así que el front
   * usa `true`; el back valida valores JSON ya tipados, así que usa `false`
   * (default).
   */
  coerceNumbers?: boolean;
}

const TEXT_TYPES = new Set<FieldType>([FieldType.TEXT, FieldType.TEXTAREA]);
const NUMBER_TYPES = new Set<FieldType>([
  FieldType.TEXTNUMBER,
  FieldType.COUNTER,
  FieldType.PROGRESS,
]);
const CHOICE_TYPES = new Set<FieldType>([FieldType.SELECT, FieldType.RADIO]);

function optionValues(field: FieldDefinition): string[] {
  return (field.options ?? []).map((option) => option.value);
}

function textFieldSchema(field: FieldDefinition): z.ZodTypeAny {
  const requiredMsg = `"${field.label}" es obligatorio`;
  const typeMsg = `"${field.label}" debe ser texto`;
  const base = z.string({
    error: (issue) => (issue.input === undefined ? requiredMsg : typeMsg),
  });
  return field.required ? base.min(1, requiredMsg) : base.optional();
}

function numberFieldSchema(
  field: FieldDefinition,
  coerce: boolean,
): z.ZodTypeAny {
  const requiredMsg = `"${field.label}" es obligatorio`;
  const numberMsg = `"${field.label}" debe ser un número`;

  let num = z.number({
    error: (issue) =>
      issue.code === 'invalid_type'
        ? issue.input === undefined
          ? requiredMsg
          : numberMsg
        : undefined,
  });
  if (typeof field.maxValue === 'number') {
    num = num.max(
      field.maxValue,
      `"${field.label}" no puede superar ${field.maxValue}`,
    );
  }
  // Sin `.min(0)`: los numéricos admiten negativos (p.ej. un modificador).
  const schema: z.ZodTypeAny = num.refine(
    (value) => Number.isFinite(value),
    numberMsg,
  );

  if (coerce) {
    // El input entrega string; normalizamos vacío -> undefined para que el
    // opcional pase y el requerido dispare "obligatorio".
    return z.preprocess(
      (value) => {
        if (value === '' || value === null || value === undefined) {
          return undefined;
        }
        if (typeof value === 'number') return value;
        const parsed = Number(value);
        return Number.isNaN(parsed) ? value : parsed;
      },
      field.required ? schema : schema.optional(),
    );
  }

  return field.required ? schema : schema.optional();
}

function choiceFieldSchema(field: FieldDefinition): z.ZodTypeAny {
  const values = optionValues(field);
  const requiredMsg = `"${field.label}" es obligatorio`;
  const optionMsg = `"${field.label}" debe ser una de las opciones permitidas`;

  if (field.required) {
    return z
      .string({
        error: (issue) => (issue.input === undefined ? requiredMsg : optionMsg),
      })
      .min(1, requiredMsg)
      .refine((value) => values.includes(value), optionMsg);
  }
  // Opcional: admite vacío (no seleccionado) o una opción válida.
  return z
    .string()
    .refine((value) => value === '' || values.includes(value), optionMsg)
    .optional();
}

function checkboxFieldSchema(field: FieldDefinition): z.ZodTypeAny {
  const values = optionValues(field);

  if (values.length > 0) {
    // Admite selección única (escalar) o múltiple (array) contra `options`.
    const optionMsg = `"${field.label}" debe ser una o más de las opciones permitidas`;
    const within = (value: unknown) => {
      const selected = Array.isArray(value) ? value : [value];
      return selected.every((v) => typeof v === 'string' && values.includes(v));
    };
    const base = z
      .union([z.string(), z.array(z.string())])
      .refine(within, optionMsg);
    if (field.required) {
      return base.refine(
        (value) => (Array.isArray(value) ? value.length > 0 : value !== ''),
        `"${field.label}" es obligatorio`,
      );
    }
    return base.optional();
  }

  // Sin `options`: booleano (una casilla). `false` es un valor válido.
  const boolMsg = `"${field.label}" debe ser booleano`;
  const base = z.boolean({ error: () => boolMsg });
  return field.required ? base : base.optional();
}

function fieldSchema(field: FieldDefinition, coerce: boolean): z.ZodTypeAny {
  // DEV-153: los campos display-only no se validan (podrían venir `required`
  // sin ser editables y bloquearían el submit).
  if (field.isReadOnly) return z.unknown().optional();
  if (TEXT_TYPES.has(field.type)) return textFieldSchema(field);
  if (NUMBER_TYPES.has(field.type)) return numberFieldSchema(field, coerce);
  if (CHOICE_TYPES.has(field.type)) return choiceFieldSchema(field);
  if (field.type === FieldType.CHECKBOX) return checkboxFieldSchema(field);
  // Tipo desconocido: no validamos.
  return z.unknown().optional();
}

/** Aplana los fields de todas las secciones del template (los que tienen `id`). */
export function flattenTemplateFields(template: unknown): FieldDefinition[] {
  if (!Array.isArray(template)) return [];
  return (template as TemplateSection[])
    .flatMap((section) => section?.fields ?? [])
    .filter((field): field is FieldDefinition => Boolean(field?.id));
}

export function buildTemplateSchema(
  template: unknown,
  options: BuildTemplateSchemaOptions = {},
) {
  const coerce = options.coerceNumbers ?? false;
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of flattenTemplateFields(template)) {
    shape[field.id] = fieldSchema(field, coerce);
  }
  // Passthrough: las claves fuera del template se permiten sin validar.
  return z.object(shape).catchall(z.unknown());
}
