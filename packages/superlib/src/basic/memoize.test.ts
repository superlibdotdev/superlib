import { describe, expect, it } from "bun:test"

import { memoize } from "./memoize"

describe(memoize.name, () => {
  it("memoizes function calls", () => {
    let callCount = 0
    const double = memoize(
      (n: number) => {
        callCount++
        return n * 2
      },
      (n) => String(n),
    )

    expect(double(5)).toBe(10)
    expect(double(5)).toBe(10)
    expect(double(5)).toBe(10)
    expect(callCount).toBe(1)
  })

  it("memoizes async function calls", async () => {
    let callCount = 0
    const double = memoize(
      async (n: number) => {
        callCount++
        return n * 2
      },
      (n) => String(n),
    )

    expect(await double(5)).toBe(10)
    expect(await double(5)).toBe(10)
    expect(callCount).toBe(1)
  })

  it("concurrent async calls share the same promise", async () => {
    let callCount = 0
    const slow = memoize(
      async (n: number) => {
        callCount++
        await new Promise((resolve) => setTimeout(resolve, 10))
        return n * 2
      },
      (n) => String(n),
    )

    const promise1 = slow(5)
    const promise2 = slow(5)

    expect(promise1).toBe(promise2)
    expect(await Promise.all([promise1, promise2])).toEqual([10, 10])
    expect(callCount).toBe(1)
  })

  it("different args get different cached results", () => {
    let callCount = 0
    const double = memoize(
      (n: number) => {
        callCount++
        return n * 2
      },
      (n) => String(n),
    )

    expect(double(5)).toBe(10)
    expect(double(10)).toBe(20)
    expect(double(5)).toBe(10)
    expect(callCount).toBe(2)
  })

  it("caches undefined values correctly", () => {
    let callCount = 0
    const maybeFind = memoize(
      (key: string): string | undefined => {
        callCount++
        return key === "exists" ? "found" : undefined
      },
      (key) => key,
    )

    expect(maybeFind("missing")).toBeUndefined()
    expect(maybeFind("missing")).toBeUndefined()
    expect(maybeFind("exists")).toBe("found")
    expect(callCount).toBe(2)
  })
})
