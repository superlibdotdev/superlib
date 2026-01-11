import { afterEach, beforeEach, describe, expect, it, jest, vi } from "bun:test"

import { TimeoutError } from "../task/timeout"
import { sleep } from "../time"
import { Timeout } from "./Timeout"

describe(Timeout.name, () => {
  let clock: typeof vi
  beforeEach(() => {
    clock = jest.useFakeTimers()
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  it("rejects with TimeoutError when a decorated method exceeds timeout", async () => {
    class Worker {
      @Timeout({ timeout: { milliseconds: 5 } })
      async run(): Promise<number> {
        await sleep({ milliseconds: 10 })
        return 42
      }
    }

    const worker = new Worker()
    const result = worker.run()

    clock.advanceTimersByTime(5)

    expect(result).rejects.toBeInstanceOf(TimeoutError)
  })
})
