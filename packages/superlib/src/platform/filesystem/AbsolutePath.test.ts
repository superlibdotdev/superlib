import { describe, expect, it } from "bun:test"
import * as pathModule from "node:path"

import { AbsolutePath } from "./AbsolutePath"

describe(AbsolutePath.name, () => {
  describe("constructor", () => {
    it("works without the 'new' keyword", () => {
      const path = AbsolutePath("/")

      expect(path).toBeInstanceOf(AbsolutePath)
    })

    it("normalizes paths", () => {
      const path = AbsolutePath("/tmp/../tmp2/file")

      expect(path.path).toEqual("/tmp2/file")
    })

    it("removes trailing /", () => {
      const path = AbsolutePath("/tmp/")

      expect(path.path).toEqual("/tmp")
    })

    it("has correct metadata", () => {
      expect(AbsolutePath.name).toEqual("AbsolutePathClass")
    })

    it("throws when creating path with relative path", () => {
      expect(() => AbsolutePath("./")).toThrow("Path is not absolute")
      expect(() => AbsolutePath("README.md")).toThrow("Path is not absolute")
    })

    it("normalizes absolute path with redundant separators", () => {
      const result = AbsolutePath("/usr//local///bin")

      expect(result).toEqual(AbsolutePath("/usr/local/bin"))
    })

    it("normalizes absolute path with . segments", () => {
      const result = AbsolutePath("/usr/./local/./bin")

      expect(result).toEqual(AbsolutePath("/usr/local/bin"))
    })

    it("normalizes absolute path with .. segments", () => {
      const result = AbsolutePath("/usr/local/../bin")

      expect(result).toEqual(AbsolutePath("/usr/bin"))
    })
  })

  describe(AbsolutePath.prototype.join.name, () => {
    it("joins string segments", () => {
      const base = AbsolutePath("/tmp")
      const joined = base.join("logs", "app.log")

      expect(joined.path).toEqual(pathModule.join("/tmp", "logs", "app.log"))
    })

    it("normalizes paths", () => {
      const base = AbsolutePath("/tmp")
      const joined = base.join("../tmp2/file")

      expect(joined.path).toEqual("/tmp2/file")
    })
  })

  describe(AbsolutePath.prototype.getDirPath.name, () => {
    it("returns the parent directory", () => {
      const path = AbsolutePath("/tmp/logs/app.log")

      expect(path.getDirPath().path).toEqual("/tmp/logs")
    })

    it("returns root for root paths", () => {
      const path = AbsolutePath("/")

      expect(path.getDirPath().path).toEqual("/")
    })
  })

  describe(AbsolutePath.prototype.getName.name, () => {
    it("returns name for files", () => {
      const path = AbsolutePath("/tmp/logs/app.log")

      expect(path.getName()).toEqual("app.log")
    })

    it("returns name for dirs", () => {
      const path = AbsolutePath("/tmp")

      expect(path.getName()).toEqual("tmp")
    })

    it("returns '' for root dir", () => {
      const path = AbsolutePath("/")

      expect(path.getName()).toEqual("")
    })
  })

  describe(AbsolutePath.prototype.relativeFrom.name, () => {
    it("rebases on the provided path", () => {
      const path = AbsolutePath("/tmp/logs/app.log")
      const root = AbsolutePath("/tmp/logs")

      const relative = path.relativeFrom(root)

      expect(relative).toEqual("app.log")
    })
  })

  describe(AbsolutePath.prototype.contains.name, () => {
    it("returns true for same path", () => {
      const dir = AbsolutePath("/tmp/logs")

      expect(dir.contains(AbsolutePath("/tmp/logs"))).toBe(true)
    })

    it("returns true for direct child", () => {
      const dir = AbsolutePath("/tmp/logs")

      expect(dir.contains(AbsolutePath("/tmp/logs/app.log"))).toBe(true)
    })

    it("returns true for nested child", () => {
      const dir = AbsolutePath("/tmp/logs")

      expect(dir.contains(AbsolutePath("/tmp/logs/2024/01/app.log"))).toBe(true)
    })

    it("returns true for root directory containing any path", () => {
      const root = AbsolutePath("/")

      expect(root.contains(AbsolutePath("/tmp/logs/app.log"))).toBe(true)
    })

    it("returns false when checking if child contains parent", () => {
      const dir = AbsolutePath("/tmp/logs")

      expect(dir.contains(AbsolutePath("/tmp"))).toBe(false)
    })

    it("returns false for sibling directory", () => {
      const dir = AbsolutePath("/tmp/logs")

      expect(dir.contains(AbsolutePath("/tmp/data/file.txt"))).toBe(false)
    })

    it("returns false for path with similar prefix", () => {
      const dir = AbsolutePath("/tmp/logs")

      expect(dir.contains(AbsolutePath("/tmp/logs-backup/app.log"))).toBe(false)
    })
  })

  describe(AbsolutePath.prototype.eq.name, () => {
    it("returns true for equal paths", () => {
      const path1 = AbsolutePath("/tmp/logs")
      const path2 = AbsolutePath("/tmp/logs")

      expect(path1.eq(path2)).toBe(true)
    })

    it("returns true for paths that normalize to the same value", () => {
      const path1 = AbsolutePath("/tmp/logs")
      const path2 = AbsolutePath("/tmp/../tmp/logs")

      expect(path1.eq(path2)).toBe(true)
    })

    it("returns false for different paths", () => {
      const path1 = AbsolutePath("/tmp/logs")
      const path2 = AbsolutePath("/tmp/data")

      expect(path1.eq(path2)).toBe(false)
    })

    it("returns false for parent/child paths", () => {
      const path1 = AbsolutePath("/tmp")
      const path2 = AbsolutePath("/tmp/logs")

      expect(path1.eq(path2)).toBe(false)
    })
  })
})
