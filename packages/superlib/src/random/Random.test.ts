import { describe, expect, it } from "bun:test"

import { AbstractRandom } from "./Random"
import { RealRandom } from "./RealRandom"
import { SeededRandom } from "./SeededRandom"

const randomImplementations: (new () => AbstractRandom)[] = [RealRandom, SeededRandom]

for (const RandomImplementation of randomImplementations) {
  const random = new RandomImplementation()

  describe(RandomImplementation.name, () => {
    describe(RandomImplementation.prototype.next.name, () => {
      it("returns number within range", () => {
        expect(random.next()).toBeWithin(0, 1)
      })
    })

    describe(RandomImplementation.prototype.nextInteger.name, () => {
      it("returns number within range", () => {
        expect(random.nextInteger(10, 20)).toBeWithin(10, 20 + 0.1)
      })

      it("returns number within range if one of the ranges is negative", () => {
        expect(random.nextInteger(-2, 2)).toBeWithin(-2, 2 + 0.1)
      })

      it("returns integer", () => {
        expect(random.nextInteger(-10, 128)).toBeInteger()
      })

      it("throws if range is not valid integer", () => {
        expect(() => random.nextInteger(0.5, 1)).toThrow(`min is expected to be an integer`)
        expect(() => random.nextInteger(NaN, 1)).toThrow(`min is expected to be an integer`)
        expect(() => random.nextInteger(1, 0.5)).toThrow(`max is expected to be an integer`)
        expect(() => random.nextInteger(0, NaN)).toThrow(`max is expected to be an integer`)
      })

      it("throws if range is not valid", () => {
        expect(() => random.nextInteger(10, 1)).toThrow(`expected min to be less than max`)
        expect(() => random.nextInteger(10, 10)).toThrow(` expected min to be less than max`)
      })
    })

    describe(RandomImplementation.prototype.nextNumber.name, () => {
      it("returns number within range", () => {
        expect(random.nextNumber(10, 20)).toBeWithin(10, 20)
      })

      it("returns number within range if one of the ranges is negative", () => {
        expect(random.nextNumber(-2, 2)).toBeWithin(-2, 2)
      })

      it("throws if range is not valid number", () => {
        expect(() => random.nextNumber(Number.NaN, 1)).toThrow(`min is expected to be a number`)
        expect(() => random.nextNumber(1, Number.NaN)).toThrow(`max is expected to be a number`)
        expect(() => random.nextNumber(Number.POSITIVE_INFINITY, 1)).toThrow(
          `min is expected to be a number`,
        )
        expect(() => random.nextNumber(0, Number.NEGATIVE_INFINITY)).toThrow(
          `max is expected to be a number`,
        )
      })

      it("throws if range is not valid", () => {
        expect(() => random.nextNumber(10, 1)).toThrow(`expected min to be less than max`)
        expect(() => random.nextNumber(10, 10)).toThrow(`expected min to be less than max`)
      })
    })

    describe(RandomImplementation.prototype.nextBoolean.name, () => {
      it("returns boolean", () => {
        expect(random.nextBoolean()).toBeBoolean()
      })
    })
  })
}
