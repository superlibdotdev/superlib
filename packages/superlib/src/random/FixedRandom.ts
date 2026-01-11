import type { IRandom } from "./Random"

import { assert } from "../basic"

export class FixedRandom implements IRandom {
  private index = 0
  constructor(private readonly sequence: any[]) {}

  private takeValue(methodName: string): any {
    assert(this.index < this.sequence.length, `FixedRandom.${methodName} sequence is exhausted`)
    const value = this.sequence[this.index]
    this.index += 1
    return value
  }

  next(): number {
    const value = this.takeValue("next")
    assert(Number.isFinite(value), `FixedRandom.next expected number, got: ${value}`)
    assert(
      value >= 0 && value < 1,
      `FixedRandom.next expected number in range <0;1), got: ${value}`,
    )
    return value
  }

  nextInteger(min: number, max: number): number {
    assert(
      Number.isInteger(min) && !Number.isNaN(min),
      `min is expected to be an integer, was: ${min}`,
    )
    assert(
      Number.isInteger(max) && !Number.isNaN(max),
      `max is expected to be an integer, was: ${max}`,
    )
    assert(min < max, `expected min to be less than max, min=${min} max=${max}`)

    const value = this.takeValue("nextInteger")
    assert(Number.isInteger(value), `FixedRandom.nextInteger expected integer, got: ${value}`)
    assert(
      value >= min && value <= max,
      `FixedRandom.nextInteger expected integer in range <${min};${max}>, got: ${value}`,
    )
    return value
  }

  nextNumber(min: number, max: number): number {
    assert(Number.isFinite(min), `min is expected to be a number, was: ${min}`)
    assert(Number.isFinite(max), `max is expected to be a number, was: ${max}`)
    assert(min < max, `expected min to be less than max, min=${min} max=${max}`)

    const value = this.takeValue("nextNumber")
    assert(Number.isFinite(value), `FixedRandom.nextNumber expected number, got: ${value}`)
    assert(
      value >= min && value < max,
      `FixedRandom.nextNumber expected number in range <${min};${max}), got: ${value}`,
    )
    return value
  }

  nextBoolean(): boolean {
    const value = this.takeValue("nextBoolean")
    assert(typeof value === "boolean", `FixedRandom.nextBoolean expected boolean, got: ${value}`)
    return value
  }
}
