import { describe, expect, it } from "bun:test"

import { AbsolutePath } from "../platform/filesystem/AbsolutePath"
import { MemoryFileSystem } from "../platform/filesystem/MemoryFileSystem"
import { asSafe, makeUnsafeClass } from "./makeUnsafeClass"
import { Err, Ok, type Result, type TaggedError } from "./Result"
import { ResultAsync } from "./ResultAsync"

class MyCounter {
  constructor(private _counter: number = 0) {}

  getCounter(): Result<number, TaggedError> {
    return Ok(this._counter)
  }

  getCounterThrows(): Result<number, { type: "boom" }> {
    return Err({ type: "boom" })
  }

  async getCounterAsync(): Promise<Result<number, TaggedError>> {
    return Ok(this._counter)
  }

  async getCounterAsyncThrows(): Promise<Result<number, { type: "boom" }>> {
    return Err({ type: "boom" })
  }

  increment(): Result<number, TaggedError> {
    const result = this.getCounter()
    this._counter += 1

    // @note: this is written in such way to use the fact that result should always return Result. Even in unsafe version
    return result.andThen((r) => Ok(r + 1))
  }

  incrementTwice(): Result<number, TaggedError> {
    return this.increment().andThen(() => this.increment())
  }
}

const UnsafeMyCounter = makeUnsafeClass(MyCounter)

describe(makeUnsafeClass.name, () => {
  describe("class wrapping", () => {
    it("returns a constructor that can be instantiated", () => {
      const instance = new UnsafeMyCounter()

      expect(instance).toBeInstanceOf(MyCounter)
    })

    it("preserves constructor identity", () => {
      const instance = new UnsafeMyCounter()

      expect(instance.constructor).toBe(MyCounter)
    })
  })

  describe("synchronous Result methods", () => {
    it("unwraps Ok results", () => {
      const instance = new UnsafeMyCounter(42)

      const result = instance.getCounter()

      expect(result).toBe(42)
    })

    it("throws on Err results", () => {
      const instance = new UnsafeMyCounter()

      expect(() => instance.getCounterThrows()).toThrow()
    })

    it("unwraps Ok results with internal calls", () => {
      const instance = new UnsafeMyCounter(42)

      const result = instance.increment()

      expect(result).toBe(43)
    })

    it("unwraps Ok results with internal calls modifying state", () => {
      const instance = new UnsafeMyCounter(42)

      const result = instance.incrementTwice()

      expect(result).toBe(44)
    })
  })

  describe("async Result methods", () => {
    it("unwraps Promise<Ok>", async () => {
      const instance = new UnsafeMyCounter(42)

      const result = await instance.getCounterAsync()

      expect(result).toBe(42)
    })

    it("rejects Promise on Err", async () => {
      const instance = new UnsafeMyCounter()

      expect(instance.getCounterAsyncThrows()).rejects.toEqual({ type: "boom" })
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
      const instance = new UnsafeMyCounter(42)

      const result = instance.getCounter()

      expect(result).toBe(42)
    })
  })

  describe("method binding", () => {
    it("preserves this context for class methods", () => {
      const instance = new UnsafeMyCounter(10)

      const result = instance.getCounter()

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
    const unsafeCounter = new UnsafeMyCounter(0)
    const safeCounter = asSafe(unsafeCounter)

    unsafeCounter.increment()
    expect(unsafeCounter.getCounter()).toBe(1)
    expect(safeCounter.getCounter().unwrap()).toBe(1)

    safeCounter.increment()
    expect(unsafeCounter.getCounter()).toBe(2)
    expect(safeCounter.getCounter().unwrap()).toBe(2)
  })

  describe("with inherited methods", () => {
    it("should preserve methods from parent classes", () => {
      class BaseService {
        getData(): Result<string, TaggedError> {
          return Ok("base data")
        }
      }

      class ChildService extends BaseService {
        getChildData(): Result<string, TaggedError> {
          return Ok("child data")
        }
      }

      const UnsafeChild = makeUnsafeClass(ChildService)
      const unsafeInstance = new UnsafeChild()

      expect(unsafeInstance.getData()).toBe("base data")
      expect(unsafeInstance.getChildData()).toBe("child data")

      const safeInstance = asSafe(unsafeInstance)

      const baseResult = safeInstance.getData()
      expect(baseResult.isOk()).toBe(true)
      expect(baseResult.unwrap()).toBe("base data")

      const childResult = safeInstance.getChildData()
      expect(childResult.isOk()).toBe(true)
      expect(childResult.unwrap()).toBe("child data")
    })

    it("should preserve async methods from parent classes", async () => {
      class AsyncBaseService {
        async fetchData(): Promise<Result<string, TaggedError>> {
          return Ok("async base data")
        }
      }

      class AsyncChildService extends AsyncBaseService {
        async fetchChildData(): Promise<Result<string, TaggedError>> {
          return Ok("async child data")
        }
      }

      const UnsafeAsyncChild = makeUnsafeClass(AsyncChildService)
      const unsafeInstance = new UnsafeAsyncChild()

      expect(await unsafeInstance.fetchData()).toBe("async base data")
      expect(await unsafeInstance.fetchChildData()).toBe("async child data")

      const safeInstance = asSafe(unsafeInstance)

      const baseResult = await safeInstance.fetchData()
      expect(baseResult.isOk()).toBe(true)
      expect(baseResult.unwrap()).toBe("async base data")

      const childResult = await safeInstance.fetchChildData()
      expect(childResult.isOk()).toBe(true)
      expect(childResult.unwrap()).toBe("async child data")
    })
  })

  describe("with internal method calls", () => {
    it("works with methods calling internal methods", () => {
      const unsafeInstance = new UnsafeMyCounter(0)
      const safeInstance = asSafe(unsafeInstance)

      const result = safeInstance.increment()

      expect(result.unwrap()).toBe(1)
    })

    it("should work with internal methods modifying state", () => {
      const unsafeInstance = new UnsafeMyCounter(0)
      const safeInstance = asSafe(unsafeInstance)

      const result = safeInstance.incrementTwice()

      expect(result.unwrap()).toBe(2)
    })
  })
})
