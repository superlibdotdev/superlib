import { describe, expect, it } from "bun:test"

import { FixedRandom } from "./FixedRandom"

describe(FixedRandom.name, () => {
  it("returns values from sequence in order", () => {
    const random = new FixedRandom([0.25, 3, 2.5, true])

    expect(random.next()).toBe(0.25)
    expect(random.nextInteger(1, 5)).toBe(3)
    expect(random.nextNumber(2, 3)).toBe(2.5)
    expect(random.nextBoolean()).toBe(true)
  })

  it("throws when sequence value is invalid for method", () => {
    const random = new FixedRandom([false, 1.5, 3, "nope"])

    expect(() => random.next()).toThrow("FixedRandom.next expected number")
    expect(() => random.nextInteger(1, 5)).toThrow("FixedRandom.nextInteger expected integer")
    expect(() => random.nextNumber(1, 2)).toThrow("FixedRandom.nextNumber expected number")
    expect(() => random.nextBoolean()).toThrow("FixedRandom.nextBoolean expected boolean")
  })

  it("throws when sequence value is outside requested range", () => {
    const random = new FixedRandom([1.2, 10, 5])

    expect(() => random.next()).toThrow("FixedRandom.next expected number in range")
    expect(() => random.nextInteger(1, 5)).toThrow(
      "FixedRandom.nextInteger expected integer in range",
    )
    expect(() => random.nextNumber(1, 2)).toThrow("FixedRandom.nextNumber expected number in range")
  })

  it("throws when sequence is exhausted", () => {
    const random = new FixedRandom([0.5])

    expect(random.next()).toBe(0.5)
    expect(() => random.next()).toThrow("FixedRandom.next sequence is exhausted")
  })
})
