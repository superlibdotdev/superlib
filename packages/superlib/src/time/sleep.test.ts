import { afterEach, beforeEach, describe, expect, it, jest, vi } from "bun:test"

import { sleep } from "./sleep"

describe(`${sleep.name}`, () => {
  let clock: typeof vi
  beforeEach(() => {
    clock = jest.useFakeTimers()
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  it("resolves after the requested duration", async () => {
    let resolved = false
    const promise = sleep({ milliseconds: 10 }).then(() => {
      resolved = true
    })

    clock.advanceTimersByTime(9)
    expect(resolved).toBe(false)

    clock.advanceTimersByTime(1)
    await promise

    expect(resolved).toBe(true)
  })

  it("accepts Temporal.Duration inputs", async () => {
    let resolved = false
    const promise = sleep(Temporal.Duration.from({ milliseconds: 5 })).then(() => {
      resolved = true
    })

    clock.advanceTimersByTime(5)
    await promise

    expect(resolved).toBe(true)
  })
})
