import { afterEach, beforeEach, describe, expect, it, jest, vi } from "bun:test"

import { sleep } from "../time"
import { Retry } from "./Retry"
import { Timeout } from "./Timeout"

describe("Retry + Timeout", () => {
  let clock: typeof vi
  beforeEach(() => {
    clock = jest.useFakeTimers()
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  it("can apply retry and timeout together on the same method", async () => {
    class Worker {
      attempts = 0

      @Retry({ times: 2, delay: () => ({ milliseconds: 5 }) })
      @Timeout({ timeout: { milliseconds: 10 } })
      async run(): Promise<number> {
        this.attempts += 1
        if (this.attempts === 1) {
          await sleep({ milliseconds: 20 })
          return null as never
        }

        await sleep({ milliseconds: 5 })
        return 42
      }
    }

    const worker = new Worker()
    const result = worker.run()

    await (async (): Promise<void> => expect(worker.attempts).toBe(1))()
    clock.advanceTimersByTime(10) // timeouts after 10
    clock.advanceTimersByTime(5) // retries after another 5

    await (async (): Promise<void> => expect(worker.attempts).toBe(2))()
    clock.advanceTimersByTime(5) // sleeps for 5

    expect(await result).toEqual(42)
  })
})
