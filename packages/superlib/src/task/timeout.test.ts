import { afterEach, beforeEach, describe, expect, it, jest, mock, spyOn, vi } from "bun:test"

import type { Task } from "./types"

import { Err, Ok, ResultAsync } from "../basic"
import { sleep } from "../time"
import * as timeoutModule from "./timeout"

const { TimeoutError, timeout } = timeoutModule

describe.only(timeout.name, () => {
  let clock: typeof vi
  beforeEach(() => {
    clock = jest.useFakeTimers()
  })
  afterEach(() => {
    jest.useRealTimers()
  })
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("resolves when task finishes before timeout", async () => {
    const task: Task<number> = mock(async () => {
      await sleep({ milliseconds: 10 })
      return 42
    })

    const result = timeout(task, { timeout: { milliseconds: 20 } })

    clock.advanceTimersByTime(10)

    expect(await result).toEqual(42)
    expect(task).toHaveBeenCalledTimes(1)
  })

  it("rejects with TimeoutError when task exceeds timeout", async () => {
    const task = mock(async () => {
      await sleep({ milliseconds: 20 })
      return 42
    })

    const result = timeout(task, { timeout: { milliseconds: 10 } })

    clock.advanceTimersByTime(10)

    expect(result).rejects.toBeInstanceOf(TimeoutError)
    expect(task).toHaveBeenCalledTimes(1)
  })

  it("propagates task errors before the timeout", async () => {
    const task = mock(async () => {
      await sleep({ milliseconds: 5 })
      throw new Error("boom")
    })

    const result = timeout(task, { timeout: { milliseconds: 20 } })

    clock.advanceTimersByTime(5)

    expect(result).rejects.toThrow("boom")
    expect(task).toHaveBeenCalledTimes(1)
  })

  it("supports task-last invocation", async () => {
    const task = mock(async () => {
      await sleep({ milliseconds: 5 })
      return 7
    })

    const withTimeout = timeout({ timeout: { milliseconds: 10 } })
    const result = withTimeout(task)()

    clock.advanceTimersByTime(5)

    expect(await result).toEqual(7)
    expect(task).toHaveBeenCalledTimes(1)
  })

  it("cancels timeout if task resolved before it finished", async () => {
    const timeoutErrorSpy = spyOn(timeoutModule, "TimeoutError")
    const task: Task<number> = async () => {
      await sleep({ milliseconds: 5 })
      return 42
    }

    const result = timeout(task, { timeout: { milliseconds: 20 } })

    clock.advanceTimersByTime(5)

    expect(await result).toEqual(42)

    clock.advanceTimersByTime(30)

    expect(timeoutErrorSpy).toHaveBeenCalledTimes(0)
  })

  describe("with ResultAsync", () => {
    it("returns Result if not timeouted", async () => {
      const task = mock(() => {
        return ResultAsync.try(
          async () => {
            await sleep({ milliseconds: 20 })
            return 42
          },
          () => {
            return null as any as never
          },
        )
      })

      const result = timeout(task, { timeout: { milliseconds: 30 } })

      clock.advanceTimersByTime(20)

      expect(await result.toPromise()).toEqual(Ok(42))
      expect(task).toHaveBeenCalledTimes(1)
    })

    it("changes return type to include timeout error", async () => {
      const task = mock(() => {
        return ResultAsync.try(
          async () => {
            await sleep({ milliseconds: 20 })
            return 42
          },
          () => {
            return null as any as never
          },
        )
      })

      const result = timeout(task, { timeout: { milliseconds: 10 } })

      clock.advanceTimersByTime(10)

      expect(await result.toPromise()).toEqual(Err({ type: "timeout", timeout: expect.anything() }))
      expect(task).toHaveBeenCalledTimes(1)
    })
  })
})

describe(TimeoutError.name, () => {
  it("has correct metadata", () => {
    const timeoutErrorInstance = new TimeoutError(Temporal.Duration.from({ seconds: 1 }))
    expect(timeoutErrorInstance.name).toEqual("TimeoutError")
    expect(timeoutErrorInstance.message).toEqual("Task has timeout after 1s")
  })
})
