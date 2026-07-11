/** Un error de validación de un campo de `values` contra el template (DEV-153). */
export interface ValidationError {
  field: string;
  message: string;
}
