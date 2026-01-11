import { describe, expect, it } from "bun:test"
import { z } from "zod"

import { Err, Ok } from "../basic"
import { validateSchema } from "./validateSchema"

describe(validateSchema.name, () => {
  it("returns Ok when value matches the schema", () => {
    const schema = z.object({ name: z.string() })

    const result = validateSchema(schema, { name: "Ada" })

    expect(result).toEqual(Ok({ name: "Ada" }))
  })

  it("returns Err with issues when validation fails", () => {
    const schema = z.string()

    const result = validateSchema(schema, 123)

    expect(result).toEqual(
      Err({
        type: "schema/validate",
        issue: expect.arrayContaining([
          expect.objectContaining({
            message: expect.any(String),
          }),
        ]),
      }),
    )
  })

  it("throws when schema validation is async", () => {
    const schema = z.string().refine(async () => false, "nope")

    expect(() => validateSchema(schema, "ok")).toThrow(/Only sync validation supported/)
  })
})
