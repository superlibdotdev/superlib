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
})
