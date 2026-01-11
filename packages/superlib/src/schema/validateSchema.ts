import type { StandardSchemaV1 } from "./StandardSchema"

import { assert, Err, Ok, type Result } from "../basic"

export type ValidationError = {
  type: "schema/validate"
  issue: ReadonlyArray<StandardSchemaV1.Issue>
}
export type ValidateSchemaResult<T> = Result<T, ValidationError>

export function validateSchema<T>(
  schema: StandardSchemaV1<T>,
  value: unknown,
): ValidateSchemaResult<T> {
  const result = schema["~standard"].validate(value)

  assert(!(result instanceof Promise), "Only sync validation supported at the moment")

  if (result.issues) {
    return Err({ type: "schema/validate", issue: result.issues })
  }

  return Ok(result.value)
}
