import { describe, expect, it } from "bun:test"

import { AbsolutePath } from "../platform/filesystem/AbsolutePath"
import { MemoryFileSystem } from "../platform/filesystem/MemoryFileSystem"
import { makeUnsafe } from "./makeUnsafe"
import { Err, Ok, type Result } from "./Result"
import { ResultAsync } from "./ResultAsync"

describe(makeUnsafe.name, () => {
  describe("class wrapping", () => {
    it("returns a constructor that can be instantiated", () => {
      class MyClass {
        getValue(): Result<number, { type: "error" }> {
          return Ok(42)
        }
      }

      const UnsafeMyClass = makeUnsafe(MyClass)
      const instance = new UnsafeMyClass()

      expect(instance).toBeInstanceOf(MyClass)
    })
  })

  describe("synchronous Result methods", () => {
    it("unwraps Ok results", () => {
      class MyClass {
        getValue(): Result<number, { type: "error" }> {
          return Ok(42)
        }
      }

      const UnsafeMyClass = makeUnsafe(MyClass)
      const instance = new UnsafeMyClass()
      const result = instance.getValue()

      expect(result).toBe(42)
    })

    it("throws on Err results", () => {
      class MyClass {
        getValue(): Result<number, { type: "boom" }> {
          return Err({ type: "boom" })
        }
      }

      const UnsafeMyClass = makeUnsafe(MyClass)
      const instance = new UnsafeMyClass()

      expect(() => instance.getValue()).toThrow()
    })
  })

  describe("async Result methods", () => {
    it("unwraps Promise<Ok>", async () => {
      class MyClass {
        async getValue(): Promise<Result<string, { type: "error" }>> {
          return Ok("hello")
        }
      }

      const UnsafeMyClass = makeUnsafe(MyClass)
      const instance = new UnsafeMyClass()
      const result = await instance.getValue()

      expect(result).toBe("hello")
    })

    it("rejects Promise on Err", async () => {
      class MyClass {
        async getValue(): Promise<Result<string, { type: "boom" }>> {
          return Err({ type: "boom" })
        }
      }

      const UnsafeMyClass = makeUnsafe(MyClass)
      const instance = new UnsafeMyClass()

      expect(instance.getValue()).rejects.toEqual({ type: "boom" })
    })
  })

  describe("ResultAsync methods", () => {
    it("unwraps ResultAsync Ok values", async () => {
      class MyClass {
        getValue(): ResultAsync<number, { type: "error" }> {
          return new ResultAsync(Promise.resolve(Ok(42)))
        }
      }

      const UnsafeMyClass = makeUnsafe(MyClass)
      const instance = new UnsafeMyClass()
      const result = await instance.getValue()

      expect(result).toBe(42)
    })

    it("rejects on ResultAsync Err", async () => {
      class MyClass {
        getValue(): ResultAsync<number, { type: "boom" }> {
          return new ResultAsync(Promise.resolve(Err({ type: "boom" })))
        }
      }

      const UnsafeMyClass = makeUnsafe(MyClass)
      const instance = new UnsafeMyClass()

      expect(instance.getValue()).rejects.toEqual({ type: "boom" })
    })
  })

  describe("non-Result returns", () => {
    it("passes through primitive returns unchanged", () => {
      class MyClass {
        getNumber(): number {
          return 42
        }

        getString(): string {
          return "hello"
        }
      }

      const UnsafeMyClass = makeUnsafe(MyClass)
      const instance = new UnsafeMyClass()

      expect(instance.getNumber()).toBe(42)
      expect(instance.getString()).toBe("hello")
    })

    it("passes through Promise returns unchanged", async () => {
      class MyClass {
        async getValue(): Promise<string> {
          return "async"
        }
      }

      const UnsafeMyClass = makeUnsafe(MyClass)
      const instance = new UnsafeMyClass()
      const result = await instance.getValue()

      expect(result).toBe("async")
    })
  })

  describe("constructor arguments", () => {
    it("passes constructor arguments to base class", () => {
      class MyClass {
        constructor(
          private readonly multiplier: number,
          private readonly prefix: string,
        ) {}

        calculate(n: number): Result<string, { type: "error" }> {
          return Ok(`${this.prefix}${n * this.multiplier}`)
        }
      }

      const UnsafeMyClass = makeUnsafe(MyClass)
      const instance = new UnsafeMyClass(10, "Result: ")
      const result = instance.calculate(5)

      expect(result).toBe("Result: 50")
    })
  })

  describe("method binding", () => {
    it("preserves this context for class methods", () => {
      class Counter {
        private value = 10

        getValue(): Result<number, { type: "error" }> {
          return Ok(this.value)
        }
      }

      const UnsafeCounter = makeUnsafe(Counter)
      const instance = new UnsafeCounter()
      const result = instance.getValue()

      expect(result).toBe(10)
    })
  })

  describe("void results", () => {
    it("handles Result<void, E> correctly", () => {
      let called = false

      class MyClass {
        doSomething(): Result<void, { type: "error" }> {
          called = true
          return Ok()
        }
      }

      const UnsafeMyClass = makeUnsafe(MyClass)
      const instance = new UnsafeMyClass()
      const result = instance.doSomething()

      expect(result).toBeUndefined()
      expect(called).toBe(true)
    })
  })

  describe("MemoryFileSystem integration", () => {
    const UnsafeMemoryFileSystem = makeUnsafe(MemoryFileSystem)

    it("can be instantiated with genesis argument", () => {
      const fs = new UnsafeMemoryFileSystem({
        "test.txt": "hello world",
      })

      expect(fs).toBeInstanceOf(MemoryFileSystem)
    })

    it("throws FileAccessError when file not found", async () => {
      const fs = new UnsafeMemoryFileSystem()

      expect(fs.readFile(AbsolutePath("/nonexistent.txt"))).rejects.toEqual({
        type: "fs/file-not-found",
        path: AbsolutePath("/nonexistent.txt"),
      })
    })

    it("returns string content when file exists", async () => {
      const fs = new UnsafeMemoryFileSystem({
        "test.txt": "hello world",
      })

      const content = await fs.readFile(AbsolutePath("/test.txt"))

      expect(content).toBe("hello world")
    })

    it("writeFile works and returns void", async () => {
      const fs = new UnsafeMemoryFileSystem()

      const result = await fs.writeFile(AbsolutePath("/new.txt"), "content")

      expect(result).toBeUndefined()

      const content = await fs.readFile(AbsolutePath("/new.txt"))
      expect(content).toBe("content")
    })

    it("exists passes through boolean unchanged", async () => {
      const fs = new UnsafeMemoryFileSystem({
        "exists.txt": "content",
      })

      expect(await fs.exists(AbsolutePath("/exists.txt"))).toBe(true)
      expect(await fs.exists(AbsolutePath("/missing.txt"))).toBe(false)
    })
  })
})
