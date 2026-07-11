import {
  createCharacterSchema,
  listCharactersQuerySchema,
} from './character.schemas';

describe('createCharacterSchema', () => {
  it('acepta un body válido y aplica default {} a values', () => {
    const parsed = createCharacterSchema.parse({
      name: 'Marlene',
      playbookId: 'pb-1',
      ownerId: 'usr_demo',
    });
    expect(parsed.values).toEqual({});
  });

  it('conserva values cuando viene en el body', () => {
    const parsed = createCharacterSchema.parse({
      name: 'Marlene',
      playbookId: 'pb-1',
      ownerId: 'usr_demo',
      values: { cool: 2 },
    });
    expect(parsed.values).toEqual({ cool: 2 });
  });

  it('rechaza name vacío', () => {
    const result = createCharacterSchema.safeParse({
      name: '',
      playbookId: 'pb-1',
      ownerId: 'u',
    });
    expect(result.success).toBe(false);
  });

  it('rechaza playbookId faltante', () => {
    const result = createCharacterSchema.safeParse({
      name: 'x',
      ownerId: 'u',
    });
    expect(result.success).toBe(false);
  });
});

describe('listCharactersQuerySchema', () => {
  it('coacciona page/pageSize de string a number', () => {
    const parsed = listCharactersQuerySchema.parse({
      page: '2',
      pageSize: '10',
    });
    expect(parsed.page).toBe(2);
    expect(parsed.pageSize).toBe(10);
  });

  it('rechaza page no positivo', () => {
    const result = listCharactersQuerySchema.safeParse({ page: '0' });
    expect(result.success).toBe(false);
  });

  it('acepta un query vacío', () => {
    expect(listCharactersQuerySchema.parse({})).toEqual({});
  });
});
