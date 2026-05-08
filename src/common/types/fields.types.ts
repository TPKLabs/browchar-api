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

export interface FieldDefinition {
  id: string;
  label: string;
  description?: string;
  required?: boolean;
  type: FieldType;
  defaultValue?: any;
  maxValue?: any; // Solo para COUNTER y PROGRESS
  disabled?: boolean;
  isReadOnly?: boolean; // Campos de texto plano, como las Additional Rules
  options?: any[]; // Solo para SELECT, CHECKBOX, RADIO
}
