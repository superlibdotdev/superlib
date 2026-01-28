import { describe, expect, it } from "bun:test"

import { jsonStringifyAll } from "./jsonStringifyAll"

describe(jsonStringifyAll.name, () => {
  it("stringifies a simple object", () => {
    expect(jsonStringifyAll({ a: 1 })).toBe('{"a":1}')
  })

  it("stringifies an empty object", () => {
    expect(jsonStringifyAll({})).toBe("{}")
  })

  it("converts BigInt values to strings", () => {
    expect(jsonStringifyAll({ n: 123n })).toBe('{"n":"123"}')
  })

  it("converts Promise values to 'Promise'", () => {
    expect(jsonStringifyAll({ p: Promise.resolve(42) })).toBe('{"p":"Promise"}')
  })

  it("handles nested objects with BigInt", () => {
    const result = jsonStringifyAll({ outer: { inner: 999n } })

    expect(result).toBe('{"outer":{"inner":"999"}}')
  })

  it("preserves regular values unchanged", () => {
    const result = jsonStringifyAll({ str: "hello", num: 42, bool: true, nil: null })

    expect(JSON.parse(result)).toEqual({ str: "hello", num: 42, bool: true, nil: null })
  })

  it("handles arrays", () => {
    expect(jsonStringifyAll({ arr: [1, 2n, 3] })).toBe('{"arr":[1,"2",3]}')
  })

  it("indents output with space parameter", () => {
    const result = jsonStringifyAll({ a: 1 }, 2)

    expect(result).toBe('{\n  "a": 1\n}')
  })

  it("produces compact output without space parameter", () => {
    const result = jsonStringifyAll({ a: 1, b: 2 })

    expect(result).not.toContain("\n")
  })
})
