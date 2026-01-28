import { describe, expect, it } from "bun:test"

import { AbsolutePath } from "../platform/filesystem/AbsolutePath"
import { MemoryFileSystem } from "../platform/filesystem/MemoryFileSystem"
import { makeUnsafe } from "./makeUnsafe"
import { Err, Ok, type Result } from "./Result"
import { ResultAsync } from "./ResultAsync"

describe(makeUnsafe.name, () => {
  describe("synchronous Result methods", () => {
    it("unwraps Ok results", () => {
      const obj = {
        getValue(): Result<number, { type: "error" }> {
          return Ok(42)
        },
      }

      const unsafe = makeUnsafe(obj)
      const result = unsafe.getValue()

      expect(result).toBe(42)
    })

    it("throws on Err results", () => {
      const obj = {
        getValue(): Result<number, { type: "boom" }> {
          return Err({ type: "boom" })
        },
      }

      const unsafe = makeUnsafe(obj)

      expect(() => unsafe.getValue()).toThrow()
    })
  })

  describe("async Result methods", () => {
    it("unwraps Promise<Ok>", async () => {
      const obj = {
        async getValue(): Promise<Result<string, { type: "error" }>> {
          return Ok("hello")
        },
      }

      const unsafe = makeUnsafe(obj)
      const result = await unsafe.getValue()

      expect(result).toBe("hello")
    })

    it("rejects Promise on Err", async () => {
      const obj = {
        async getValue(): Promise<Result<string, { type: "boom" }>> {
          return Err({ type: "boom" })
        },
      }

      const unsafe = makeUnsafe(obj)

      expect(unsafe.getValue()).rejects.toEqual({ type: "boom" })
    })
  })

  describe("ResultAsync methods", () => {
    it("unwraps ResultAsync Ok values", async () => {
      const obj = {
        getValue(): ResultAsync<number, { type: "error" }> {
          return new ResultAsync(Promise.resolve(Ok(42)))
        },
      }

      const unsafe = makeUnsafe(obj)
      const result = await unsafe.getValue()

      expect(result).toBe(42)
    })

    it("rejects on ResultAsync Err", async () => {
      const obj = {
        getValue(): ResultAsync<number, { type: "boom" }> {
          return new ResultAsync(Promise.resolve(Err({ type: "boom" })))
        },
      }

      const unsafe = makeUnsafe(obj)

      expect(unsafe.getValue()).rejects.toEqual({ type: "boom" })
    })
  })

  describe("non-Result returns", () => {
    it("passes through primitive returns unchanged", () => {
      const obj = {
        getNumber(): number {
          return 42
        },
        getString(): string {
          return "hello"
        },
      }

      const unsafe = makeUnsafe(obj)

      expect(unsafe.getNumber()).toBe(42)
      expect(unsafe.getString()).toBe("hello")
    })

    it("passes through Promise returns unchanged", async () => {
      const obj = {
        async getValue(): Promise<string> {
          return "async"
        },
      }

      const unsafe = makeUnsafe(obj)
      const result = await unsafe.getValue()

      expect(result).toBe("async")
    })
  })

  describe("properties", () => {
    it("passes through non-function properties unchanged", () => {
      const obj = {
        name: "test",
        count: 42,
      }

      const unsafe = makeUnsafe(obj)

      expect(unsafe.name).toBe("test")
      expect(unsafe.count).toBe(42)
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

      const counter = new Counter()
      const unsafe = makeUnsafe(counter)
      const result = unsafe.getValue()

      expect(result).toBe(10)
    })
  })

  describe("void results", () => {
    it("handles Result<void, E> correctly", () => {
      let called = false
      const obj = {
        doSomething(): Result<void, { type: "error" }> {
          called = true
          return Ok()
        },
      }

      const unsafe = makeUnsafe(obj)
      const result = unsafe.doSomething()

      expect(result).toBeUndefined()
      expect(called).toBe(true)
    })
  })

  describe("MemoryFileSystem integration", () => {
    it("throws FileAccessError when file not found", async () => {
      const fs = new MemoryFileSystem()

      const unsafeFs = makeUnsafe(fs)

      expect(unsafeFs.readFile(AbsolutePath("/nonexistent.txt"))).rejects.toEqual({
        type: "fs/file-not-found",
        path: AbsolutePath("/nonexistent.txt"),
      })
    })

    it("returns string content when file exists", async () => {
      const fs = new MemoryFileSystem({
        "test.txt": "hello world",
      })

      const unsafeFs = makeUnsafe(fs)
      const content = await unsafeFs.readFile(AbsolutePath("/test.txt"))

      expect(content).toBe("hello world")
    })

    it("writeFile works and returns void", async () => {
      const fs = new MemoryFileSystem()

      const unsafeFs = makeUnsafe(fs)
      const result = await unsafeFs.writeFile(AbsolutePath("/new.txt"), "content")

      expect(result).toBeUndefined()

      const content = await unsafeFs.readFile(AbsolutePath("/new.txt"))
      expect(content).toBe("content")
    })

    it("exists passes through boolean unchanged", async () => {
      const fs = new MemoryFileSystem({
        "exists.txt": "content",
      })

      const unsafeFs = makeUnsafe(fs)

      expect(await unsafeFs.exists(AbsolutePath("/exists.txt"))).toBe(true)
      expect(await unsafeFs.exists(AbsolutePath("/missing.txt"))).toBe(false)
    })
  })
})
