import { FieldDefinition } from "./fields.types";

export interface TemplateSection {
  id: string;
  title?: string;
  description?: string;
  fields?: FieldDefinition[]; // IDs de los campos que pertenecen a esta sección
}