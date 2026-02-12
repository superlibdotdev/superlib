import { afterEach, beforeEach, describe, expect, it, jest, spyOn, vi } from "bun:test"

import { Err, Ok } from "../../basic"
import { sleep, type DurationLike } from "../../time"
import { flushMicrotasks } from "../safeFetch/makeSafeFetch.test"
import { HttpClient, type HttpClientOptions } from "./HttpClient"

describe(HttpClient.name, () => {
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
    const clientOptions: HttpClientOptions = { retry: undefined }

    it("returns Ok with parsed JSON by default", async () => {
      fetchSpy.mockResolvedValue(new Response(JSON.stringify({ name: "Ada" }), { status: 200 }))
      const client = new HttpClient(clientOptions)

      const result = await client.get({ url: "https://example.com" }).toPromise()

      expect(result).toEqual(Ok({ name: "Ada" }))
      expect(fetchSpy).toHaveBeenCalledTimes(1)
    })

    it("returns Ok with text when output is text", async () => {
      fetchSpy.mockResolvedValue(new Response("hello world", { status: 200 }))
      const client = new HttpClient(clientOptions)

      const result = await client.get({ url: "https://example.com", output: "text" }).toPromise()

      expect(result).toEqual(Ok("hello world"))
    })

    it("returns Err on network error", async () => {
      const networkError = new Error("DNS failed")
      fetchSpy.mockRejectedValue(networkError)
      const client = new HttpClient(clientOptions)

      const result = await client.get({ url: "https://example.com" }).toPromise()

      expect(result).toEqual(Err({ type: "httpClient/network", cause: networkError }))
    })

    it("returns Err on HTTP error", async () => {
      fetchSpy.mockResolvedValue(new Response("bad request", { status: 400 }))
      const client = new HttpClient(clientOptions)

      const result = await client.get({ url: "https://example.com" }).toPromise()

      expect(result).toEqual(Err({ type: "httpClient/http", status: 400 }))
    })

    it("returns Err on JSON parse error", async () => {
      fetchSpy.mockResolvedValue(new Response("{invalid", { status: 200 }))
      const client = new HttpClient(clientOptions)

      const result = await client.get({ url: "https://example.com" }).toPromise()

      expect(result).toEqual(Err({ type: "httpClient/parse", cause: expect.anything() }))
    })
  })

  describe("HTTP methods", () => {
    const clientOptions: HttpClientOptions = { retry: undefined }

    it("post sends body with POST method", async () => {
      fetchSpy.mockResolvedValue(new Response(JSON.stringify({ id: 1 }), { status: 200 }))
      const client = new HttpClient(clientOptions)

      const result = await client
        .post({ url: "https://example.com", body: JSON.stringify({ name: "Ada" }) })
        .toPromise()

      expect(result).toEqual(Ok({ id: 1 }))
      expect(fetchSpy.mock.calls[0]!).toEqual([
        "https://example.com",
        { method: "POST", headers: undefined, body: JSON.stringify({ name: "Ada" }) },
      ] as any)
    })

    it("put sends body with PUT method", async () => {
      fetchSpy.mockResolvedValue(new Response(JSON.stringify({ updated: true }), { status: 200 }))
      const client = new HttpClient(clientOptions)

      await client.put({ url: "https://example.com", body: "data" }).toPromise()

      expect(fetchSpy.mock.calls[0]![1]).toEqual(
        expect.objectContaining({ method: "PUT", body: "data" }),
      )
    })

    it("patch sends body with PATCH method", async () => {
      fetchSpy.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))
      const client = new HttpClient(clientOptions)

      await client.patch({ url: "https://example.com", body: "patch-data" }).toPromise()

      expect(fetchSpy.mock.calls[0]![1]).toEqual(
        expect.objectContaining({ method: "PATCH", body: "patch-data" }),
      )
    })

    it("delete sends DELETE method", async () => {
      fetchSpy.mockResolvedValue(new Response(JSON.stringify({ deleted: true }), { status: 200 }))
      const client = new HttpClient(clientOptions)

      const result = await client.delete({ url: "https://example.com" }).toPromise()

      expect(result).toEqual(Ok({ deleted: true }))
      expect(fetchSpy.mock.calls[0]![1]).toEqual(expect.objectContaining({ method: "DELETE" }))
    })

    it("passes custom headers", async () => {
      fetchSpy.mockResolvedValue(new Response(JSON.stringify({}), { status: 200 }))
      const client = new HttpClient(clientOptions)

      await client
        .get({ url: "https://example.com", headers: { Authorization: "Bearer token" } })
        .toPromise()

      expect(fetchSpy.mock.calls[0]![1]).toEqual(
        expect.objectContaining({ headers: { Authorization: "Bearer token" } }),
      )
    })
  })

  describe("with retries", () => {
    const clientOptions: HttpClientOptions = {
      retry: {
        times: 3,
        delay: (): DurationLike => ({ milliseconds: 100 }),
      },
    }

    it("retries HTTP errors until success", async () => {
      fetchSpy
        .mockResolvedValueOnce(new Response("error", { status: 500 }))
        .mockResolvedValueOnce(new Response("error", { status: 500 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))
      const client = new HttpClient(clientOptions)

      const result = client.get({ url: "https://example.com" }).toPromise()

      await flushMicrotasks(20)
      expect(fetchSpy).toHaveBeenCalledTimes(1)
      clock.advanceTimersByTime(100)

      await flushMicrotasks(20)
      expect(fetchSpy).toHaveBeenCalledTimes(2)
      clock.advanceTimersByTime(100)

      expect(await result).toEqual(Ok({ ok: true }))
      expect(fetchSpy).toHaveBeenCalledTimes(3)
    })

    it("retries JSON parse errors until success", async () => {
      const badResponse = new Response("{invalid", { status: 200 })
      const goodResponse = new Response(JSON.stringify({ ok: true }), { status: 200 })
      fetchSpy.mockResolvedValueOnce(badResponse).mockResolvedValueOnce(goodResponse)
      const client = new HttpClient(clientOptions)

      const result = client.get({ url: "https://example.com" }).toPromise()

      await flushMicrotasks(20)
      expect(fetchSpy).toHaveBeenCalledTimes(1)
      clock.advanceTimersByTime(100)

      expect(await result).toEqual(Ok({ ok: true }))
      expect(fetchSpy).toHaveBeenCalledTimes(2)
    })

    it("retries text read errors until success", async () => {
      const failingResponse = new Response("ok", { status: 200 })
      spyOn(failingResponse, "text").mockRejectedValueOnce(new Error("stream interrupted"))
      const goodResponse = new Response("hello", { status: 200 })
      fetchSpy.mockResolvedValueOnce(failingResponse).mockResolvedValueOnce(goodResponse)
      const client = new HttpClient(clientOptions)

      const result = client.get({ url: "https://example.com", output: "text" }).toPromise()

      await flushMicrotasks(20)
      expect(fetchSpy).toHaveBeenCalledTimes(1)
      clock.advanceTimersByTime(100)

      expect(await result).toEqual(Ok("hello"))
      expect(fetchSpy).toHaveBeenCalledTimes(2)
    })

    it("returns parse error after exhausting retries", async () => {
      fetchSpy.mockResolvedValue(new Response("{invalid", { status: 200 }))
      const client = new HttpClient(clientOptions)

      const result = client.get({ url: "https://example.com" }).toPromise()

      await flushMicrotasks(20)
      clock.advanceTimersByTime(100)
      await flushMicrotasks(20)
      clock.advanceTimersByTime(100)
      await flushMicrotasks(20)
      clock.advanceTimersByTime(100)

      expect(await result).toEqual(Err({ type: "httpClient/parse", cause: expect.anything() }))
      expect(fetchSpy).toHaveBeenCalledTimes(4)
    })
  })

  describe("with timeout", () => {
    it("timeouts", async () => {
      fetchSpy.mockReturnValueOnce(
        (async (): Promise<Response> => {
          await sleep({ seconds: 2 })
          return new Response("ok", { status: 200 })
        })(),
      )
      const client = new HttpClient({ timeout: { seconds: 1 }, retry: undefined })

      const result = client.get({ url: "https://example.com" }).toPromise()

      await flushMicrotasks(20)
      expect(fetchSpy).toHaveBeenCalledTimes(1)
      clock.advanceTimersByTime(1000)

      expect(await result).toEqual(Err({ type: "timeout", timeout: expect.anything() }))
    })
  })

  describe("per-request override", () => {
    it("overrides retryUntilStatus for a single request", async () => {
      fetchSpy.mockResolvedValue(
        new Response(JSON.stringify({ status: "created" }), { status: 201 }),
      )
      const client = new HttpClient({
        retry: undefined,
        retryUntilStatus: (status) => status === 200,
      })

      const resultWithoutOverride = await client.get({ url: "https://example.com" }).toPromise()

      expect(resultWithoutOverride).toEqual(Err({ type: "httpClient/http", status: 201 }))

      const resultWithOverride = await client
        .get(
          { url: "https://example.com" },
          { retryUntilStatus: (status) => status >= 200 && status < 300 },
        )
        .toPromise()

      expect(resultWithOverride).toEqual(Ok({ status: "created" }))
    })

    it("overrides timeout for a single request", async () => {
      fetchSpy.mockReturnValue(
        (async (): Promise<Response> => {
          await sleep({ seconds: 3 })
          return new Response(JSON.stringify({ ok: true }), { status: 200 })
        })(),
      )
      const client = new HttpClient({ timeout: { seconds: 5 }, retry: undefined })

      const result = client
        .get({ url: "https://example.com" }, { timeout: { seconds: 1 } })
        .toPromise()

      await flushMicrotasks(20)
      clock.advanceTimersByTime(1000)

      expect(await result).toEqual(Err({ type: "timeout", timeout: expect.anything() }))
    })
  })
})
