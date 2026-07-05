import { FieldType } from '@/common/types/fields.types';
import type { FieldDefinition } from '@/common/types/fields.types';
import type { TemplateSection } from '@/common/types/template.types';
import type { ValidationError } from '@/common/types/character.types';

/** Aplana los fields de todas las secciones del template, keyeados por su `id`. */
function flattenFields(template: unknown): Map<string, FieldDefinition> {
  const map = new Map<string, FieldDefinition>();
  if (!Array.isArray(template)) {
    return map;
  }
  for (const section of template as TemplateSection[]) {
    for (const field of section?.fields ?? []) {
      if (field?.id) {
        map.set(field.id, field);
      }
    }
  }
  return map;
}

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

/**
 * Valida `values` contra el `template` de un Playbook.
 *
 * Reglas:
 * - Campos `required` deben estar presentes y no vacíos.
 * - Cada valor debe respetar el `FieldType` del campo (tipos exactos, sin coerción).
 * - COUNTER/PROGRESS no pueden superar `maxValue`.
 * - SELECT/RADIO deben ser una de las `options`; CHECKBOX con `options` admite
 *   una o varias opciones válidas, sin `options` es booleano.
 * - Las claves de `values` que no están en el template se permiten (passthrough):
 *   no se validan ni se rechazan.
 *
 * Devuelve la lista de errores (vacía si `values` es válido).
 */
export function validateValuesAgainstTemplate(
  values: Record<string, unknown>,
  template: unknown,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const fields = flattenFields(template);

  for (const [id, field] of fields) {
    const value = values?.[id];

    if (isEmpty(value)) {
      if (field.required) {
        errors.push({ field: id, message: `"${field.label}" es obligatorio` });
      }
      continue; // campo opcional vacío: nada que validar
    }

    switch (field.type) {
      case FieldType.TEXT:
      case FieldType.TEXTAREA:
        if (typeof value !== 'string') {
          errors.push({
            field: id,
            message: `"${field.label}" debe ser texto`,
          });
        }
        break;

      case FieldType.TEXTNUMBER:
      case FieldType.COUNTER:
      case FieldType.PROGRESS:
        if (typeof value !== 'number' || !Number.isFinite(value)) {
          errors.push({
            field: id,
            message: `"${field.label}" debe ser un número`,
          });
        } else if (
          typeof field.maxValue === 'number' &&
          value > field.maxValue
        ) {
          errors.push({
            field: id,
            message: `"${field.label}" no puede superar ${field.maxValue}`,
          });
        }
        break;

      case FieldType.CHECKBOX:
        if (Array.isArray(field.options) && field.options.length > 0) {
          // Admite tanto una selección única (valor escalar) como varias
          // (array): normalizamos antes de chequear contra `options`.
          const selected = Array.isArray(value) ? value : [value];
          if (!selected.every((v) => field.options!.includes(v))) {
            errors.push({
              field: id,
              message: `"${field.label}" debe ser una o más de las opciones permitidas`,
            });
          }
        } else if (typeof value !== 'boolean') {
          errors.push({
            field: id,
            message: `"${field.label}" debe ser booleano`,
          });
        }
        break;

      case FieldType.SELECT:
      case FieldType.RADIO:
        if (!Array.isArray(field.options) || !field.options.includes(value)) {
          errors.push({
            field: id,
            message: `"${field.label}" debe ser una de las opciones permitidas`,
          });
        }
        break;

      default:
        // FieldType no reconocido: no validamos
        break;
    }
  }

  return errors;
}
