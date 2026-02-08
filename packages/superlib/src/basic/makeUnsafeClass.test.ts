import { describe, expect, it } from "bun:test"

import { AbsolutePath } from "../platform/filesystem/AbsolutePath"
import { MemoryFileSystem } from "../platform/filesystem/MemoryFileSystem"
import { asSafe, makeUnsafeClass } from "./makeUnsafeClass"
import { Err, Ok, type Result, type TaggedError } from "./Result"
import { ResultAsync } from "./ResultAsync"

describe(makeUnsafeClass.name, () => {
  describe("class wrapping", () => {
    it("returns a constructor that can be instantiated", () => {
      class MyClass {
        getValue(): Result<number, { type: "error" }> {
          return Ok(42)
        }
      }

      const UnsafeMyClass = makeUnsafeClass(MyClass)
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

      const UnsafeMyClass = makeUnsafeClass(MyClass)
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

      const UnsafeMyClass = makeUnsafeClass(MyClass)
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

      const UnsafeMyClass = makeUnsafeClass(MyClass)
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

      const UnsafeMyClass = makeUnsafeClass(MyClass)
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

      const UnsafeMyClass = makeUnsafeClass(MyClass)
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

      const UnsafeMyClass = makeUnsafeClass(MyClass)
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

      const UnsafeMyClass = makeUnsafeClass(MyClass)
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

      const UnsafeMyClass = makeUnsafeClass(MyClass)
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

      const UnsafeMyClass = makeUnsafeClass(MyClass)
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

      const UnsafeCounter = makeUnsafeClass(Counter)
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

      const UnsafeMyClass = makeUnsafeClass(MyClass)
      const instance = new UnsafeMyClass()
      const result = instance.doSomething()

      expect(result).toBeUndefined()
      expect(called).toBe(true)
    })
  })

  describe("MemoryFileSystem integration", () => {
    const UnsafeMemoryFileSystem = makeUnsafeClass(MemoryFileSystem)

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

describe(asSafe.name, () => {
  it("returns safe instance unchanged", () => {
    const fs = new MemoryFileSystem()

    const result = asSafe(fs)

    expect(result).toBe(fs)
  })

  it("converts unsafe instance to safe API", async () => {
    const UnsafeFs = makeUnsafeClass(MemoryFileSystem)
    const unsafeFs = new UnsafeFs({ "test.txt": "content" })

    const safeFs = asSafe(unsafeFs)
    const result = await safeFs.readFile(AbsolutePath("/test.txt"))

    expect(result.isOk()).toBe(true)
    expect(result.unwrap()).toBe("content")
  })

  it("safe wrapper returns Result on error", async () => {
    const UnsafeFs = makeUnsafeClass(MemoryFileSystem)
    const unsafeFs = new UnsafeFs()

    const safeFs = asSafe(unsafeFs)
    const result = await safeFs.readFile(AbsolutePath("/missing.txt"))

    expect(result.isErr()).toBe(true)
  })

  it("preserves state between safe and unsafe wrappers", () => {
    class StatefulClass {
      constructor(private _data = "default") {}

      setData(value: string): Result<string, TaggedError> {
        this._data = value
        return Ok("success")
      }

      getData(): string {
        return this._data
      }
    }

    const UnsafeStatefulClass = makeUnsafeClass(StatefulClass)
    const unsafeClass = new UnsafeStatefulClass()
    const safeClass = asSafe(unsafeClass)

    unsafeClass.setData("first write")
    expect(unsafeClass.getData()).toEqual("first write")
    expect(safeClass.getData()).toEqual("first write")

    safeClass.setData("second write")
    expect(unsafeClass.getData()).toEqual("second write")
    expect(safeClass.getData()).toEqual("second write")
  })

  describe("with inherited methods", () => {
    it("should preserve methods from parent classes", () => {
      // Base class with a method returning Result
      class BaseService {
        getData(): Result<string, TaggedError> {
          return Ok("base data")
        }
      }

      // Child class extending base with its own method
      class ChildService extends BaseService {
        getChildData(): Result<string, TaggedError> {
          return Ok("child data")
        }
      }

      // Create unsafe version
      const UnsafeChild = makeUnsafeClass(ChildService)
      const unsafeInstance = new UnsafeChild()

      // Verify both methods work on unsafe instance (auto-unwrapped)
      expect(unsafeInstance.getData()).toBe("base data")
      expect(unsafeInstance.getChildData()).toBe("child data")

      // Convert back to safe API
      const safeInstance = asSafe(unsafeInstance)

      // Verify inherited method from parent is preserved
      const baseResult = safeInstance.getData()
      expect(baseResult.isOk()).toBe(true)
      expect(baseResult.unwrap()).toBe("base data")

      // Verify child method is also preserved
      const childResult = safeInstance.getChildData()
      expect(childResult.isOk()).toBe(true)
      expect(childResult.unwrap()).toBe("child data")
    })

    it("should preserve async methods from parent classes", async () => {
      // Base class with async method
      class AsyncBaseService {
        async fetchData(): Promise<Result<string, TaggedError>> {
          return Ok("async base data")
        }
      }

      // Child class with its own async method
      class AsyncChildService extends AsyncBaseService {
        async fetchChildData(): Promise<Result<string, TaggedError>> {
          return Ok("async child data")
        }
      }

      const UnsafeAsyncChild = makeUnsafeClass(AsyncChildService)
      const unsafeInstance = new UnsafeAsyncChild()

      // Unsafe: auto-unwraps to Promise<string>
      expect(await unsafeInstance.fetchData()).toBe("async base data")
      expect(await unsafeInstance.fetchChildData()).toBe("async child data")

      // Safe: returns Promise<Result<string, E>>
      const safeInstance = asSafe(unsafeInstance)

      const baseResult = await safeInstance.fetchData()
      expect(baseResult.isOk()).toBe(true)
      expect(baseResult.unwrap()).toBe("async base data")

      const childResult = await safeInstance.fetchChildData()
      expect(childResult.isOk()).toBe(true)
      expect(childResult.unwrap()).toBe("async child data")
    })
  })
})
