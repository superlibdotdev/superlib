import { afterEach, beforeEach, describe, expect, it, jest, spyOn, vi } from "bun:test"

import { Err, Ok } from "../../basic"
import { sleep, type DurationLike } from "../../time"
import { makeSafeFetch, type UserSafeFetchOptions } from "./makeSafeFetch"

describe(makeSafeFetch.name, () => {
  let fetchSpy: ReturnType<typeof spyOn<typeof globalThis, "fetch">>
  beforeEach(() => {
    fetchSpy = spyOn(globalThis, "fetch")
  })
  afterEach(() => {
    fetchSpy?.mockRestore()
  })

  let clock: typeof vi
  beforeEach(() => {
    clock = jest.useFakeTimers()
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  describe("no retries", () => {
    const options: UserSafeFetchOptions = {
      retry: undefined,
    }

    it("returns Ok on success", async () => {
      const response = new Response("ok", { status: 200 })
      fetchSpy.mockResolvedValue(response)

      const result = await makeSafeFetch(options)("https://example.com")

      expect(result).toEqual(Ok(response))
      expect(fetchSpy).toHaveBeenCalledTimes(1)
    })

    it("errors with network errors", async () => {
      const response = Response.error()
      fetchSpy.mockRejectedValue(response)

      const result = await makeSafeFetch(options)("https://example.com")

      expect(result).toEqual(Err({ type: "fetch/network", cause: response }))
    })

    it("errors with http errors", async () => {
      const response = new Response("bad request", { status: 400 })
      fetchSpy.mockResolvedValue(response)

      const result = await makeSafeFetch(options)("https://example.com")

      expect(result).toEqual(Err({ type: "fetch/http", status: 400 }))
    })
  })

  describe("with retries", () => {
    const options = {
      retry: {
        times: 3,
        delay: (): DurationLike => ({ milliseconds: 100 }),
      },
    } satisfies UserSafeFetchOptions

    it("retries http errors until success", async () => {
      const successResponse = new Response("ok", { status: 200 })
      const errorResponse = new Response("internal-server-error", { status: 500 })
      fetchSpy
        .mockResolvedValueOnce(errorResponse)
        .mockResolvedValueOnce(errorResponse)
        .mockResolvedValueOnce(successResponse)

      const result = makeSafeFetch(options)("https://example.com")

      await flushMicrotasks()
      expect(fetchSpy).toHaveBeenCalledTimes(1)
      clock.advanceTimersByTime(100)

      await flushMicrotasks()
      expect(fetchSpy).toHaveBeenCalledTimes(2)
      clock.advanceTimersByTime(100)

      expect(await result).toEqual(Ok(successResponse))
      expect(fetchSpy).toHaveBeenCalledTimes(3)
    })

    it("retries network errors and returns errored result", async () => {
      const response = Response.error()
      fetchSpy.mockRejectedValue(response)

      const result = makeSafeFetch(options)("https://example.com")

      await flushMicrotasks()
      expect(fetchSpy).toHaveBeenCalledTimes(1)
      clock.advanceTimersByTime(100)

      await flushMicrotasks()
      expect(fetchSpy).toHaveBeenCalledTimes(2)
      clock.advanceTimersByTime(100)

      await flushMicrotasks()
      expect(fetchSpy).toHaveBeenCalledTimes(3)
      clock.advanceTimersByTime(100)

      expect(await result).toEqual(Err({ type: "fetch/network", cause: response }))
      expect(fetchSpy).toHaveBeenCalledTimes(4)
    })

    it("retries with custom 'untilStatus' function", async () => {
      const response = new Response("created", { status: 201 })
      fetchSpy.mockResolvedValue(response)

      const result = makeSafeFetch({
        retry: options.retry,
        retryUntilStatus: (status) => status === 200,
      })("https://example.com")
      await flushMicrotasks()
      expect(fetchSpy).toHaveBeenCalledTimes(1)
      clock.advanceTimersByTime(100)

      await flushMicrotasks()
      expect(fetchSpy).toHaveBeenCalledTimes(2)
      clock.advanceTimersByTime(100)

      await flushMicrotasks()
      expect(fetchSpy).toHaveBeenCalledTimes(3)
      clock.advanceTimersByTime(100)

      expect(await result).toEqual(Err({ type: "fetch/http", status: 201 }))
    })
  })

  describe("with timeout", () => {
    it("timeouts", async () => {
      const successResponse = new Response("ok", { status: 200 })
      fetchSpy.mockReturnValueOnce(
        (async (): Promise<Response> => {
          await sleep({ seconds: 2 })
          return successResponse
        })(),
      )

      const result = makeSafeFetch({
        timeout: { seconds: 1 },
        retry: undefined,
      })("https://example.com")

      await flushMicrotasks()
      expect(fetchSpy).toHaveBeenCalledTimes(1)
      clock.advanceTimersByTime(1000) // timeout

      expect(await result).toEqual(Err({ type: "timeout", timeout: expect.anything() }))
      expect(fetchSpy).toHaveBeenCalledTimes(1)
    })

    it("retries timeouts", async () => {
      const successResponse = new Response("ok", { status: 200 })
      fetchSpy
        .mockReturnValueOnce(
          (async (): Promise<Response> => {
            await sleep({ seconds: 2 })
            return successResponse
          })(),
        )
        .mockReturnValueOnce(
          (async (): Promise<Response> => {
            await sleep({ seconds: 4 })
            return successResponse
          })(),
        )
        .mockResolvedValueOnce(successResponse)

      const result = makeSafeFetch({
        retry: {
          times: 3,
          delay: (): DurationLike => ({ milliseconds: 100 }),
        },
        timeout: { seconds: 1 },
      })("https://example.com")

      await flushMicrotasks()
      expect(fetchSpy).toHaveBeenCalledTimes(1)
      clock.advanceTimersByTime(1000) // timeout
      clock.advanceTimersByTime(100) // retry

      await flushMicrotasks()
      expect(fetchSpy).toHaveBeenCalledTimes(2)
      clock.advanceTimersByTime(1000) // timeout
      clock.advanceTimersByTime(100) // retry

      expect(await result).toEqual(Ok(successResponse))
      expect(fetchSpy).toHaveBeenCalledTimes(3)
    })
  })
})

// flushes microtasks giving an opportunity for runtime to execute other work in the meantime
export async function flushMicrotasks(times: number = 10): Promise<void> {
  for (let i = 0; i < times; i++) {
    await Promise.resolve()
  }
}
