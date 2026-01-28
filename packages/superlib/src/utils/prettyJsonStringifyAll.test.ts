import { describe, expect, it } from "bun:test"

import { prettyJsonStringifyAll } from "./prettyJsonStringifyAll"

describe(prettyJsonStringifyAll.name, () => {
  it("indents with space option", () => {
    const result = prettyJsonStringifyAll({ a: 1 }, { space: 2 })

    expect(result).toBe('{\n  "a": 1\n}')
  })

  describe("singleLineUntilLength", () => {
    it("uses compact format when result fits within singleLineUntilLength", () => {
      const result = prettyJsonStringifyAll({ a: 1 }, { space: 2, singleLineUntilLength: 100 })

      expect(result).toBe('{"a":1}')
    })

    it("uses indented format when result exceeds singleLineUntilLength", () => {
      const result = prettyJsonStringifyAll(
        { key: "value" },
        { space: 2, singleLineUntilLength: 5 },
      )

      expect(result).toBe('{\n  "key": "value"\n}')
    })

    it("uses compact format when result length equals singleLineUntilLength exactly", () => {
      const compact = '{"a":1}'

      const result = prettyJsonStringifyAll(
        { a: 1 },
        { space: 2, singleLineUntilLength: compact.length },
      )

      expect(result).toBe(compact)
    })

    it("falls back to indented when singleLineUntilLength is exceeded by one", () => {
      const compact = '{"a":1}'

      const result = prettyJsonStringifyAll(
        { a: 1 },
        { space: 2, singleLineUntilLength: compact.length - 1 },
      )

      expect(result).toBe('{\n  "a": 1\n}')
    })

    it("uses compact format without space when singleLineUntilLength fits and no space given", () => {
      const result = prettyJsonStringifyAll({ x: 42 }, { singleLineUntilLength: 100 })

      expect(result).toBe('{"x":42}')
    })
  })

  it("handles nested objects", () => {
    const result = prettyJsonStringifyAll({ a: { b: 1 } }, { space: 2 })

    expect(result).toContain('"b": 1')
  })

  it("handles empty object", () => {
    expect(prettyJsonStringifyAll({})).toBe("{}")
  })
})
