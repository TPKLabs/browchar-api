import { buildTemplateSchema } from './template-schema';
import { FieldType } from './fields';
import type { TemplateSection } from './fields';

const template: TemplateSection[] = [
  {
    id: 'identity',
    title: 'Identity',
    fields: [
      {
        id: 'character_name',
        label: 'Name',
        type: FieldType.TEXT,
        required: true,
      },
      { id: 'look', label: 'Look', type: FieldType.TEXTAREA },
      {
        id: 'notes',
        label: 'Additional Rules',
        type: FieldType.TEXTAREA,
        required: true,
        isReadOnly: true,
      },
    ],
  },
  {
    id: 'stats',
    title: 'Stats',
    fields: [
      { id: 'cool', label: 'Cool', type: FieldType.TEXTNUMBER, required: true },
      {
        id: 'experience',
        label: 'Experience',
        type: FieldType.PROGRESS,
        maxValue: 5,
      },
      {
        id: 'gender',
        label: 'Gender',
        type: FieldType.SELECT,
        options: [
          { label: 'Man', value: 'man' },
          { label: 'Woman', value: 'woman' },
          { label: 'Ambiguous', value: 'ambiguous' },
        ],
      },
      {
        id: 'skills',
        label: 'Skills',
        type: FieldType.CHECKBOX,
        options: [
          { label: 'Fight', value: 'fight' },
          { label: 'Sneak', value: 'sneak' },
          { label: 'Charm', value: 'charm' },
        ],
      },
    ],
  },
];

const schema = buildTemplateSchema(template);
const fieldsWithError = (values: Record<string, unknown>): string[] => {
  const result = schema.safeParse(values);
  return result.success
    ? []
    : result.error.issues.map((issue) => String(issue.path[0] ?? ''));
};

describe('buildTemplateSchema', () => {
  it('acepta un payload válido', () => {
    expect(
      schema.safeParse({
        character_name: 'Marlene',
        cool: 2,
        experience: 3,
        gender: 'ambiguous',
      }).success,
    ).toBe(true);
  });

  it('marca error si falta un campo required', () => {
    expect(fieldsWithError({ cool: 1 })).toContain('character_name');
  });

  it('marca error si el tipo no coincide (number esperado, string recibido)', () => {
    expect(fieldsWithError({ character_name: 'X', cool: '2' })).toContain(
      'cool',
    );
  });

  it('marca error si se supera maxValue', () => {
    expect(
      fieldsWithError({ character_name: 'X', cool: 1, experience: 9 }),
    ).toContain('experience');
  });

  it('marca error si el valor no está en options', () => {
    expect(
      fieldsWithError({ character_name: 'X', cool: 1, gender: 'robot' }),
    ).toContain('gender');
  });

  it('permite claves extra que no están en el template (passthrough)', () => {
    expect(
      fieldsWithError({ character_name: 'X', cool: 1, unknown_field: 'x' }),
    ).toEqual([]);
  });

  it('acepta un CHECKBOX con options como valor escalar', () => {
    expect(
      fieldsWithError({ character_name: 'X', cool: 1, skills: 'fight' }),
    ).toEqual([]);
  });

  it('acepta un CHECKBOX con options como array', () => {
    expect(
      fieldsWithError({
        character_name: 'X',
        cool: 1,
        skills: ['fight', 'sneak'],
      }),
    ).toEqual([]);
  });

  it('marca error si el valor de CHECKBOX no está en options', () => {
    expect(
      fieldsWithError({ character_name: 'X', cool: 1, skills: 'fly' }),
    ).toContain('skills');
  });

  it('no valida campos opcionales vacíos', () => {
    expect(fieldsWithError({ character_name: 'X', cool: 1, look: '' })).toEqual(
      [],
    );
  });

  // --- Divergencias corregidas en DEV-153 ---

  it('admite numéricos negativos (no hay min(0))', () => {
    expect(fieldsWithError({ character_name: 'X', cool: -2 })).toEqual([]);
  });

  it('no valida un campo isReadOnly aunque sea required', () => {
    // `notes` es required + isReadOnly: no debe bloquear el submit al faltar.
    expect(fieldsWithError({ character_name: 'X', cool: 1 })).toEqual([]);
  });

  it('coerciona strings a number cuando coerceNumbers=true (form del front)', () => {
    const formSchema = buildTemplateSchema(template, { coerceNumbers: true });
    const result = formSchema.safeParse({ character_name: 'X', cool: '3' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cool).toBe(3);
    }
  });
});
