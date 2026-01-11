import type { PublicInterface } from "../types"

import { assert } from "../basic/assert"

export type IRandom = PublicInterface<AbstractRandom>

export abstract class AbstractRandom {
  /**
   * Returns next random number in range of <0;1)
   */
  abstract next(): number

  /**
   * Returns next random integer in range of <min;max>
   */
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

    return Math.floor(this.next() * (max - min + 1)) + min
  }

  /**
   * Returns next random number in range of <min, max)
   */
  nextNumber(min: number, max: number): number {
    assert(Number.isFinite(min), `min is expected to be a number, was: ${min}`)
    assert(Number.isFinite(max), `max is expected to be a number, was: ${max}`)
    assert(min < max, `expected min to be less than max, min=${min} max=${max}`)

    return this.next() * (max - min) + min
  }

  nextBoolean(): boolean {
    return this.nextInteger(0, 1) === 1
  }
}
