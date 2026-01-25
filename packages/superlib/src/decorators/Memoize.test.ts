import { describe, expect, it } from "bun:test"

import { Memoize } from "./Memoize"

interface PathLike {
  path: string
}

describe(Memoize.name, () => {
  it("memoizes sync method calls", () => {
    let callCount = 0

    class Calculator {
      @Memoize(([n]) => String(n))
      double(n: number): number {
        callCount++
        return n * 2
      }
    }

    const calc = new Calculator()

    expect(calc.double(5)).toBe(10)
    expect(calc.double(5)).toBe(10)
    expect(calc.double(5)).toBe(10)
    expect(callCount).toBe(1)
  })

  it("memoizes async method calls", async () => {
    let callCount = 0

    class AsyncCalculator {
      @Memoize(([n]) => String(n))
      async double(n: number): Promise<number> {
        callCount++
        return n * 2
      }
    }

    const calc = new AsyncCalculator()

    expect(await calc.double(5)).toBe(10)
    expect(await calc.double(5)).toBe(10)
    expect(await calc.double(5)).toBe(10)
    expect(callCount).toBe(1)
  })

  it("concurrent async calls with same args share the same promise", async () => {
    let callCount = 0

    class SlowCalculator {
      @Memoize(([n]) => String(n))
      async double(n: number): Promise<number> {
        callCount++
        await new Promise((resolve) => setTimeout(resolve, 10))
        return n * 2
      }
    }

    const calc = new SlowCalculator()

    const promise1 = calc.double(5)
    const promise2 = calc.double(5)
    const promise3 = calc.double(5)

    expect(promise1).toBe(promise2)
    expect(promise2).toBe(promise3)

    const results = await Promise.all([promise1, promise2, promise3])

    expect(results).toEqual([10, 10, 10])
    expect(callCount).toBe(1)
  })

  it("different args get different cached results", () => {
    let callCount = 0

    class Calculator {
      @Memoize(([n]) => String(n))
      double(n: number): number {
        callCount++
        return n * 2
      }
    }

    const calc = new Calculator()

    expect(calc.double(5)).toBe(10)
    expect(calc.double(10)).toBe(20)
    expect(calc.double(5)).toBe(10)
    expect(calc.double(10)).toBe(20)
    expect(callCount).toBe(2)
  })

  it("each instance has its own cache", () => {
    let callCount = 0

    class Calculator {
      @Memoize(([n]) => String(n))
      double(n: number): number {
        callCount++
        return n * 2
      }
    }

    const calc1 = new Calculator()
    const calc2 = new Calculator()

    expect(calc1.double(5)).toBe(10)
    expect(calc2.double(5)).toBe(10)
    expect(callCount).toBe(2)

    expect(calc1.double(5)).toBe(10)
    expect(calc2.double(5)).toBe(10)
    expect(callCount).toBe(2)
  })

  it("works with multiple arguments", () => {
    let callCount = 0

    class Calculator {
      @Memoize(([a, b]) => `${a},${b}`)
      add(a: number, b: number): number {
        callCount++
        return a + b
      }
    }

    const calc = new Calculator()

    expect(calc.add(1, 2)).toBe(3)
    expect(calc.add(1, 2)).toBe(3)
    expect(calc.add(2, 1)).toBe(3)
    expect(callCount).toBe(2)
  })

  it("works with object arguments", async () => {
    let callCount = 0

    class PathResolver {
      @Memoize(([path]: [PathLike]) => path.path)
      async resolve(path: PathLike): Promise<string> {
        callCount++
        return `resolved:${path.path}`
      }
    }

    const resolver = new PathResolver()
    const path1 = { path: "/foo" }
    const path2 = { path: "/bar" }

    expect(await resolver.resolve(path1)).toBe("resolved:/foo")
    expect(await resolver.resolve(path1)).toBe("resolved:/foo")
    expect(await resolver.resolve(path2)).toBe("resolved:/bar")
    expect(callCount).toBe(2)
  })

  it("works with class that has constructor", async () => {
    let callCount = 0

    class Wrapper {
      constructor(private readonly prefix: string) {}

      @Memoize(([path]: [PathLike]) => path.path)
      async resolve(path: PathLike): Promise<string> {
        callCount++
        return `${this.prefix}:${path.path}`
      }
    }

    const wrapper = new Wrapper("test")
    const path = { path: "/foo" }

    expect(await wrapper.resolve(path)).toBe("test:/foo")
    expect(await wrapper.resolve(path)).toBe("test:/foo")
    expect(callCount).toBe(1)
  })
})
