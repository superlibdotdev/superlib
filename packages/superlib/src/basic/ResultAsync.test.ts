import { describe, expect, it, mock } from "bun:test"

import { Err, Ok, Result } from "./Result"
import { ResultAsync } from "./ResultAsync"

describe(ResultAsync.name, () => {
  // @todo rewrite these tests
  it.skip("works", async () => {
    const result = await simpleSafeFetch("https://jsonplaceholder.typicode.com/todos/1")

    expect(result).toEqual(
      Ok({
        userId: 1,
        id: 1,
        title: "delectus aut autem",
        completed: false,
      }),
    )
  })

  describe(ResultAsync.prototype.map.name, () => {
    it("maps Ok value with sync mapper", async () => {
      const result = await new ResultAsync(Ok(5)).map((v) => v * 2).toPromise()

      expect(result).toEqual(Ok(10))
    })

    it("maps Ok value with async mapper", async () => {
      const result = await new ResultAsync(Ok(5)).map(async (v) => v * 3).toPromise()

      expect(result).toEqual(Ok(15))
    })

    it("does nothing on Err", async () => {
      const mapper = mock((v: number) => v * 2)

      const result = await new ResultAsync(Err({ type: "original" })).map(mapper).toPromise()

      expect(result).toEqual(Err({ type: "original" }))
      expect(mapper).not.toHaveBeenCalled()
    })
  })

  describe(ResultAsync.prototype.mapTry.name, () => {
    it("maps Ok value with sync mapper", async () => {
      const result = await new ResultAsync(Ok(5))
        .mapTry(
          (v) => v * 2,
          () => ({ type: "fail" }),
        )
        .toPromise()

      expect(result).toEqual(Ok(10))
    })

    it("maps Ok value with async mapper", async () => {
      const result = await new ResultAsync(Ok(5))
        .mapTry(
          async (v) => v * 3,
          () => ({ type: "fail" }),
        )
        .toPromise()

      expect(result).toEqual(Ok(15))
    })

    it("returns Err when sync mapper throws", async () => {
      const result = await new ResultAsync(Ok(5))
        .mapTry(
          () => {
            throw new Error("boom")
          },
          (e) => ({ type: "caught", cause: e }),
        )
        .toPromise()

      expect(result).toEqual(Err({ type: "caught", cause: expect.any(Error) }))
    })

    it("returns Err when async mapper rejects", async () => {
      const result = await new ResultAsync(Ok(5))
        .mapTry(
          async () => {
            throw new Error("async boom")
          },
          (e) => ({ type: "caught", cause: e }),
        )
        .toPromise()

      expect(result).toEqual(Err({ type: "caught", cause: expect.any(Error) }))
    })

    it("returns Ok when catchFn returns Ok result", async () => {
      const result = await new ResultAsync(Ok(5))
        .mapTry(
          () => {
            throw new Error("boom")
          },
          () => Ok(42),
        )
        .toPromise()

      expect(result).toEqual(Ok(42))
    })

    it("does nothing on Err", async () => {
      const mapper = mock((v: number) => v * 2)
      const catchFn = mock(() => ({ type: "fail" }))

      const result = await new ResultAsync(Err({ type: "original" }))
        .mapTry(mapper, catchFn)
        .toPromise()

      expect(result).toEqual(Err({ type: "original" }))
      expect(mapper).not.toHaveBeenCalled()
      expect(catchFn).not.toHaveBeenCalled()
    })
  })
})

type FetchError =
  | { type: "network"; cause: unknown }
  | { type: "http"; code: number }
  | { type: "json-parse"; cause: unknown }

function simpleSafeFetch(url: string): Promise<Result<unknown, FetchError>> {
  return ResultAsync.try(
    () => fetch(url),
    (err): FetchError => ({
      type: "network",
      cause: err,
    }),
  )
    .andThen((response) => {
      if (!response.ok) {
        return Err({ type: "http", code: response.status } as FetchError)
      }

      return ResultAsync.try(
        () => response.json(),
        (err): FetchError => ({ type: "json-parse", cause: err }),
      )
    })
    .toPromise()
}
