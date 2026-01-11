import { describe, expect, it } from "bun:test"

import { AssertionError, assert, assertNever, raise } from "./assert"

describe(`${AssertionError.name}`, () => {
  it("formats the default message", () => {
    const error = new AssertionError()

    expect(error.message).toBe("assertion failed")
  })

  it("formats a custom message", () => {
    const error = new AssertionError("missing data")

    expect(error.message).toBe("assertion failed: missing data")
  })
})

describe(`${assert.name}`, () => {
  it("does nothing when condition is truth", () => {
    expect(() => assert(true)).not.toThrow()
  })

  it.skip("[TYPE LEVEL] it requires booleans", () => {
    // @note: implicit conversions often leads to bugs, like here. We want to assert that value is defined but accidentally it will also fail on values that evaluate to false
    const optionalNumber: number | undefined = 0

    // @ts-expect-error
    expect(() => assert(optionalNumber)).not.toThrow()
  })

  it("throws AssertionError with the default message when condition is false", () => {
    expect(() => assert(false)).toThrow("assertion failed: Assertion failed")
  })

  it("throws AssertionError with provided string", () => {
    expect(() => assert(false, "nope")).toThrow("assertion failed: nope")
  })

  it("rethrows provided Error instance", () => {
    const error = new Error("kaboom")

    expect(() => assert(false, error)).toThrow(error)
  })
})

describe(`${raise.name}`, () => {
  it("throws AssertionError for string input", () => {
    expect(() => raise("bad")).toThrow("assertion failed: bad")
  })

  it("rethrows Error instances", () => {
    const error = new Error("boom")

    expect(() => raise(error)).toThrow(error)
  })
})

describe(`${assertNever.name}`, () => {
  it("throws AssertionError with unexpected object details", () => {
    expect(() => assertNever("surprise" as never)).toThrow(
      "assertNever: Unexpected object: surprise",
    )
  })

  it.skip("[TYPE] detects never in switch", () => {
    let something: "a" | "b" = null as any

    switch (something) {
      case "a":
        break
      // forgotten case "b"
      default:
        // @ts-expect-error Argument of type '"b"' is not assignable to parameter of type 'never'
        assertNever(something)
    }
  })
})
