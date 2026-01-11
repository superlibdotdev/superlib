import { afterEach, beforeEach, describe, expect, it, jest, mock, spyOn, vi } from "bun:test"

import { Err, Ok, type Result } from "../basic"
import { FixedRandom } from "../random"
import * as time from "../time"
import { multiplyDuration } from "../time"
import { ExponentialBackoffRetryPolicy, JitteredRetryPolicy, retry } from "./retry"

describe(retry.name, () => {
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

  describe("delay as duration", () => {
    it("retries a failing task using jittered, exponential backoff strategy", async () => {
      const random = new FixedRandom([0.5, 0.6, 0.8]) // will be used as scaling factors for jittered delay
      const retryTask = mock(async () => 42)
      retryTask.mockRejectedValueOnce(new Error("boom!"))
      retryTask.mockRejectedValueOnce(new Error("boom!"))
      retryTask.mockRejectedValueOnce(new Error("boom!"))

      const result = retry(retryTask, { times: 5, delay: { milliseconds: 100 } }, { random })

      await (async (): Promise<void> => expect(retryTask).toBeCalledTimes(1))() // await needed here to give time for retry to execute
      clock.advanceTimersByTime(50)

      await (async (): Promise<void> => expect(retryTask).toBeCalledTimes(2))() // await needed here to give time for retry to execute
      clock.advanceTimersByTime(120)

      await (async (): Promise<void> => expect(retryTask).toBeCalledTimes(3))() // await needed here to give time for retry to execute
      clock.advanceTimersByTime(320)

      expect(await result).toEqual(42)
      expect(retryTask).toHaveBeenCalledTimes(4)
    })

    it("retries failing task up until retry limit reached and then fails", async () => {
      const random = new FixedRandom([0.5, 0.5])
      const retryTask = mock(async () => {
        throw new Error("boom!")
      })

      const result = retry(retryTask, { times: 2, delay: { milliseconds: 100 } }, { random })

      await (async (): Promise<void> => expect(retryTask).toBeCalledTimes(1))()
      clock.advanceTimersByTime(50)
      await (async (): Promise<void> => expect(retryTask).toBeCalledTimes(2))()
      clock.advanceTimersByTime(100)

      expect(result).rejects.toThrow("boom!")
      expect(retryTask).toHaveBeenCalledTimes(3)
    })
  })

  describe("delay as function", () => {
    it("respects custom delay function", async () => {
      const sleepSpy = spyOn(time, "sleep").mockResolvedValue()
      const delay = mock((attempt: number) => ({ milliseconds: (attempt + 1) * 25 }))
      const retryTask = mock(async () => {
        if (retryTask.mock.calls.length < 3) {
          throw new Error("boom!")
        }
        return 42
      })

      const result = await retry(retryTask, { times: 3, delay })

      expect(result).toEqual(42)
      expect(delay).toHaveBeenCalledTimes(2)
      expect(delay).toHaveBeenNthCalledWith(1, 0)
      expect(delay).toHaveBeenNthCalledWith(2, 1)
      expect(sleepSpy).toHaveBeenNthCalledWith(1, { milliseconds: 25 })
      expect(sleepSpy).toHaveBeenNthCalledWith(2, { milliseconds: 50 })
    })
  })

  describe("task-last invocation", () => {
    it("retries using task-last convention", async () => {
      const retryTask = mock(async () => {
        if (retryTask.mock.calls.length < 2) {
          throw new Error("boom!")
        }
        return 42
      })

      const withRetry = retry({ times: 2, delay: () => ({ milliseconds: 5 }) })
      const result = withRetry(retryTask)()

      await (async (): Promise<void> => expect(retryTask).toBeCalledTimes(1))()
      clock.advanceTimersByTime(5)

      await (async (): Promise<void> => expect(retryTask).toBeCalledTimes(2))()

      expect(await result).toEqual(42)
    })
  })

  describe("custom `until` function", () => {
    it("stops retrying when 'until' returns false", async () => {
      const until = mock((_err: unknown) => false)
      const retryTask = mock(async () => {
        throw new Error("fatal")
      })

      const result = retry(retryTask, { times: 3, delay: { milliseconds: 5 }, until })

      expect(result).rejects.toThrow("fatal")
      expect(until).toHaveBeenCalledTimes(1)
      expect(retryTask).toHaveBeenCalledTimes(1)
    })

    it("retries while 'until' returns true, then stops on false", async () => {
      const sleepSpy = spyOn(time, "sleep")
      const until = mock((err: any) => err.message !== "stop")
      const retryTask = mock(async () => {
        throw new Error("stop")
      })
      retryTask.mockRejectedValueOnce(new Error("retryable"))
      retryTask.mockRejectedValueOnce(new Error("retryable"))

      const result = retry(retryTask, { times: 3, delay: () => ({ milliseconds: 5 }), until })

      await (async (): Promise<void> => expect(retryTask).toBeCalledTimes(1))()
      clock.advanceTimersByTime(5)

      await (async (): Promise<void> => expect(retryTask).toBeCalledTimes(2))()
      clock.advanceTimersByTime(5)

      expect(result).rejects.toThrow("stop")
      expect(until).toHaveBeenCalledTimes(3)
      expect(sleepSpy).toHaveBeenCalledTimes(2)
    })
  })

  describe("with Result values", () => {
    it("by default retries errored values", async () => {
      // @note: retry only a particular error in a type safe manner
      type MockResultType = Result<number, { type: "retryable-error" }>
      const retryTask = mock(async (): Promise<MockResultType> => Ok(42))
      retryTask.mockResolvedValueOnce(Err({ type: "retryable-error" }))

      const result = retry(retryTask, {
        times: 3,
        delay: { milliseconds: 5 },
      })

      await (async (): Promise<void> => expect(retryTask).toBeCalledTimes(1))()
      clock.advanceTimersByTime(5)

      await (async (): Promise<void> => expect(retryTask).toBeCalledTimes(2))()
      clock.advanceTimersByTime(5)

      expect(await result).toEqual(Ok(42))
      expect(retryTask).toHaveBeenCalledTimes(2)
    })

    it("allow to easily inspect exact errored result", async () => {
      // @note: retry only a particular error in a type safe manner
      type MockResultType = Result<
        number,
        { type: "retryable-error" } | { type: "not-retryable-error" }
      >
      const retryTask = mock(async (): Promise<MockResultType> => {
        return Err({ type: "not-retryable-error" })
      })
      retryTask.mockResolvedValueOnce(Err({ type: "retryable-error" }))

      const result = retry(retryTask, {
        times: 3,
        delay: { milliseconds: 5 },
        until: (result) => result.err.type === "retryable-error",
      })

      await (async (): Promise<void> => expect(retryTask).toBeCalledTimes(1))()
      clock.advanceTimersByTime(5)

      await (async (): Promise<void> => expect(retryTask).toBeCalledTimes(2))()
      clock.advanceTimersByTime(5)

      expect(await result).toEqual(Err({ type: "not-retryable-error" }))
      expect(retryTask).toHaveBeenCalledTimes(2)
    })
  })
})

describe(ExponentialBackoffRetryPolicy.name, () => {
  it("scales the base duration exponentially per attempt", () => {
    const policy = ExponentialBackoffRetryPolicy({ milliseconds: 10 })

    expect(policy(0)).toEqual(Temporal.Duration.from({ milliseconds: 10 }))
    expect(policy(1)).toEqual(Temporal.Duration.from({ milliseconds: 20 }))
    expect(policy(2)).toEqual(Temporal.Duration.from({ milliseconds: 40 }))
  })

  it("scales all duration fields", () => {
    const policy = ExponentialBackoffRetryPolicy({ seconds: 1, milliseconds: 250 })

    expect(policy(2)).toEqual(Temporal.Duration.from({ seconds: 4, milliseconds: 1000 }))
  })
})

describe(JitteredRetryPolicy.name, () => {
  it("scales the provided duration using randomness", () => {
    const policy = JitteredRetryPolicy(
      { milliseconds: 100 },
      {},
      { random: new FixedRandom([0.1]) },
    )

    expect(policy(0)).toEqual(Temporal.Duration.from({ milliseconds: 10 }))
  })

  it("wraps another policy and jitters per attempt", () => {
    const policy = JitteredRetryPolicy(
      ExponentialBackoffRetryPolicy({ milliseconds: 200 }),
      {
        minFactor: 0.8,
        maxFactor: 1.2,
      },
      { random: new FixedRandom([0.9, 1.1, 1, 1.1]) },
    )

    expect(policy(0)).toEqual(multiplyDuration(Temporal.Duration.from({ milliseconds: 200 }), 0.9))
    expect(policy(1)).toEqual(multiplyDuration(Temporal.Duration.from({ milliseconds: 400 }), 1.1))
    expect(policy(2)).toEqual(multiplyDuration(Temporal.Duration.from({ milliseconds: 800 }), 1))
    expect(policy(3)).toEqual(multiplyDuration(Temporal.Duration.from({ milliseconds: 1600 }), 1.1))
  })
})
