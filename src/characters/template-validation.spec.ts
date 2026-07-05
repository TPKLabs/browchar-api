import { validateValuesAgainstTemplate } from './template-validation';
import { FieldType } from '@/common/types/fields.types';

const template = [
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
        options: ['man', 'woman', 'ambiguous'],
      },
      {
        id: 'skills',
        label: 'Skills',
        type: FieldType.CHECKBOX,
        options: ['fight', 'sneak', 'charm'],
      },
    ],
  },
];

describe('validateValuesAgainstTemplate', () => {
  it('acepta un payload válido', () => {
    const errors = validateValuesAgainstTemplate(
      {
        character_name: 'Marlene',
        cool: 2,
        experience: 3,
        gender: 'ambiguous',
      },
      template,
    );
    expect(errors).toEqual([]);
  });

  it('marca error si falta un campo required', () => {
    const errors = validateValuesAgainstTemplate({ cool: 1 }, template);
    expect(errors).toContainEqual(
      expect.objectContaining({ field: 'character_name' }),
    );
  });

  it('marca error si el tipo no coincide (number esperado, string recibido)', () => {
    const errors = validateValuesAgainstTemplate(
      { character_name: 'X', cool: '2' },
      template,
    );
    expect(errors).toContainEqual(expect.objectContaining({ field: 'cool' }));
  });

  it('marca error si se supera maxValue', () => {
    const errors = validateValuesAgainstTemplate(
      { character_name: 'X', cool: 1, experience: 9 },
      template,
    );
    expect(errors).toContainEqual(
      expect.objectContaining({ field: 'experience' }),
    );
  });

  it('marca error si el valor no está en options', () => {
    const errors = validateValuesAgainstTemplate(
      { character_name: 'X', cool: 1, gender: 'robot' },
      template,
    );
    expect(errors).toContainEqual(expect.objectContaining({ field: 'gender' }));
  });

  it('permite claves extra que no están en el template (passthrough)', () => {
    const errors = validateValuesAgainstTemplate(
      { character_name: 'X', cool: 1, unknown_field: 'lo que sea' },
      template,
    );
    expect(errors).toEqual([]);
  });

  it('acepta un CHECKBOX con options como valor escalar', () => {
    const errors = validateValuesAgainstTemplate(
      { character_name: 'X', cool: 1, skills: 'fight' },
      template,
    );
    expect(errors).toEqual([]);
  });

  it('acepta un CHECKBOX con options como array', () => {
    const errors = validateValuesAgainstTemplate(
      { character_name: 'X', cool: 1, skills: ['fight', 'sneak'] },
      template,
    );
    expect(errors).toEqual([]);
  });

  it('marca error si el valor de CHECKBOX no está en options', () => {
    const errors = validateValuesAgainstTemplate(
      { character_name: 'X', cool: 1, skills: 'fly' },
      template,
    );
    expect(errors).toContainEqual(expect.objectContaining({ field: 'skills' }));
  });

  it('no valida campos opcionales vacíos', () => {
    const errors = validateValuesAgainstTemplate(
      { character_name: 'X', cool: 1, look: '' },
      template,
    );
    expect(errors).toEqual([]);
  });
});
