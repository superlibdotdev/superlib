import { afterEach, beforeEach, describe, expect, it, jest, vi } from "bun:test"

import { Retry } from "./Retry"

describe(Retry.name, () => {
  let clock: typeof vi
  beforeEach(() => {
    clock = jest.useFakeTimers()
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  it("retries a decorated method until it succeeds", async () => {
    class Counter {
      attempts = 0

      @Retry({ times: 2, delay: () => ({ milliseconds: 5 }) })
      async run(): Promise<number> {
        this.attempts += 1
        if (this.attempts < 3) {
          throw new Error("boom!")
        }
        return this.attempts
      }
    }

    const counter = new Counter()
    const result = counter.run()

    await (async (): Promise<void> => expect(counter.attempts).toBe(1))()
    clock.advanceTimersByTime(5)

    await (async (): Promise<void> => expect(counter.attempts).toBe(2))()
    clock.advanceTimersByTime(5)

    expect(await result).toEqual(3)
    expect(counter.attempts).toBe(3)
  })
})
