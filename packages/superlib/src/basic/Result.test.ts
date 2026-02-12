import { describe, expect, it, mock } from "bun:test"

import { Err, Ok, OkResult, Result } from "./Result"

describe(Result.name, () => {
  describe(Result.try.name, () => {
    it("creates Ok result on success", () => {
      const errorFn = mock(() => {
        return { type: "unknown" }
      })

      const result = Result.try(() => {
        return 5
      }, errorFn)

      expect(result).toEqual(Ok(5))
      expect(errorFn).not.toHaveBeenCalled()
    })

    it("creates Err result on exception", () => {
      const errorFn = mock((error) => {
        if (error instanceof Error && error.message === "boom") {
          return { type: "exploded" }
        }
        throw error
      })

      const result = Result.try(() => {
        throw new Error("boom")
      }, errorFn)

      expect(result).toEqual(Err({ type: "exploded" }))
      expect(errorFn).toHaveBeenCalledTimes(1)
    })

    it("passes error thrown by err function", () => {
      const errorFn = mock((error) => {
        throw error
      })

      expect(() =>
        Result.try(() => {
          throw new Error("boom")
        }, errorFn),
      ).toThrow("boom")
      expect(errorFn).toHaveBeenCalledTimes(1)
    })

    it("returns Ok when catchFn returns Ok result", () => {
      const result = Result.try(
        () => {
          throw new Error("boom")
        },
        () => Ok(42),
      )

      expect(result).toEqual(Ok(42))
    })

    // perhaps AssertionErrors should be automatically rethrown and now passed to Error handler
  })

  describe(OkResult.prototype.andThen.name, () => {
    it("maps Ok to another Ok", () => {
      const initial = Ok("initial")
      const result = initial.andThen((r) => {
        expect(r).toEqual("initial")
        return Ok(42)
      })

      expect(result).toEqual(Ok(42))
    })

    it("maps Ok to Err", () => {
      const initial = Ok("initial")
      const result = initial.andThen((r) => {
        expect(r).toEqual("initial")
        return Err({ type: "boom" })
      })

      expect(result).toEqual(Err({ type: "boom" }))
    })

    it("does nothing on Err", () => {
      const initial = Err({ type: "initial" })
      const mapper = mock(() => {
        return Ok(true)
      })
      const result = initial.andThen(mapper)

      expect(result).toEqual(Err({ type: "initial" }))
      expect(mapper).not.toHaveBeenCalled()
    })
  })
  describe(OkResult.prototype.map.name, () => {
    it("maps Ok value", () => {
      const result = Ok(5).map((v) => v * 2)

      expect(result).toEqual(Ok(10))
    })

    it("does nothing on Err", () => {
      const mapper = mock((v: number) => v * 2)
      const result = Err({ type: "boom" }).map(mapper)

      expect(result).toEqual(Err({ type: "boom" }))
      expect(mapper).not.toHaveBeenCalled()
    })
  })

  describe(OkResult.prototype.mapTry.name, () => {
    it("maps Ok value when mapper succeeds", () => {
      const result = Ok(5).mapTry(
        (v) => v * 2,
        () => ({ type: "fail" }),
      )

      expect(result).toEqual(Ok(10))
    })

    it("returns Err when mapper throws", () => {
      const result = Ok(5).mapTry(
        () => {
          throw new Error("boom")
        },
        (e) => ({ type: "caught", cause: e }),
      )

      expect(result).toEqual(Err({ type: "caught", cause: expect.any(Error) }))
    })

    it("returns Ok when catchFn returns Ok result", () => {
      const result = Ok(5).mapTry(
        () => {
          throw new Error("boom")
        },
        () => Ok(42),
      )

      expect(result).toEqual(Ok(42))
    })

    it("does nothing on Err", () => {
      const mapper = mock((v: number) => v * 2)
      const catchFn = mock(() => ({ type: "fail" }))
      const result = Err({ type: "original" }).mapTry(mapper, catchFn)

      expect(result).toEqual(Err({ type: "original" }))
      expect(mapper).not.toHaveBeenCalled()
      expect(catchFn).not.toHaveBeenCalled()
    })
  })

  // @todo: tests for isOk and isErr
  // @todo: tests for unwrap
  // @todo: unwraping should rethrow {type } as BaseError instances (tagged error?)
  // @todo: OkResult should have runtime name Ok (for tests)
})
