import { describe, expect, it } from "bun:test"

import { AbsolutePath } from "../filesystem"
import { InMemoryProcessContext } from "./ProcessContext"

describe(InMemoryProcessContext.name, () => {
  describe(InMemoryProcessContext.prototype.pathFromCwd.name, () => {
    const ctx = new InMemoryProcessContext()

    it("joins simple filename with cwd", () => {
      const result = ctx.pathFromCwd("file.txt")

      expect(result).toEqual(new AbsolutePath("/home/workspace/file.txt"))
    })

    it("works with custom cwd", () => {
      const customCtx = new InMemoryProcessContext({
        cwd: new AbsolutePath("/var/www/app"),
      })

      const result = customCtx.pathFromCwd("public/index.html")

      expect(result).toEqual(new AbsolutePath("/var/www/app/public/index.html"))
    })
  })

  describe(InMemoryProcessContext.prototype.resolvePath.name, () => {
    const ctx = new InMemoryProcessContext()

    describe("absolute paths", () => {
      it("resolves absolute Unix path", () => {
        const result = ctx.resolvePath("/usr/local/bin")

        expect(result).toEqual(new AbsolutePath("/usr/local/bin"))
      })

      it("resolves absolute root path", () => {
        const result = ctx.resolvePath("/")

        expect(result).toEqual(new AbsolutePath("/"))
      })
    })

    describe("relative paths", () => {
      it("resolves ./ to current working directory", () => {
        const result = ctx.resolvePath("./")

        expect(result).toEqual(new AbsolutePath("/home/workspace"))
      })

      it("resolves ./file relative to cwd", () => {
        const result = ctx.resolvePath("./file.txt")

        expect(result).toEqual(new AbsolutePath("/home/workspace/file.txt"))
      })

      it("resolves ./subdir/file relative to cwd", () => {
        const result = ctx.resolvePath("./src/index.ts")

        expect(result).toEqual(new AbsolutePath("/home/workspace/src/index.ts"))
      })

      it("resolves relative path without ./ prefix", () => {
        const result = ctx.resolvePath("src/file.ts")

        expect(result).toEqual(new AbsolutePath("/home/workspace/src/file.ts"))
      })

      it("resolves bare filename as relative to cwd", () => {
        const result = ctx.resolvePath("file.txt")

        expect(result).toEqual(new AbsolutePath("/home/workspace/file.txt"))
      })
    })

    describe("home directory paths (~ prefix)", () => {
      it("resolves ~ to home directory", () => {
        const result = ctx.resolvePath("~")

        expect(result).toEqual(new AbsolutePath("/home"))
      })

      it("resolves ~/file relative to home", () => {
        const result = ctx.resolvePath("~/config.json")

        expect(result).toEqual(new AbsolutePath("/home/config.json"))
      })

      it("resolves ~/subdir/file relative to home", () => {
        const result = ctx.resolvePath("~/.config/app/settings.json")

        expect(result).toEqual(new AbsolutePath("/home/.config/app/settings.json"))
      })

      it("resolves ~/ (with trailing slash) to home directory", () => {
        const result = ctx.resolvePath("~/")

        expect(result).toEqual(new AbsolutePath("/home"))
      })

      it("resolves ~/path with .. segments", () => {
        const result = ctx.resolvePath("~/projects/../documents")

        expect(result).toEqual(new AbsolutePath("/home/documents"))
      })

      it("resolves ~/path with . segments", () => {
        const result = ctx.resolvePath("~/./projects/./app")

        expect(result).toEqual(new AbsolutePath("/home/projects/app"))
      })
    })

    describe("invalid paths", () => {
      it("throws for empty string", () => {
        expect(() => ctx.resolvePath("")).toThrow("assertion failed: Path cannot be empty")
      })
    })

    describe("edge cases", () => {
      it("handles ~ in middle of path (treated as literal)", () => {
        const result = ctx.resolvePath("./dir~name/file")

        expect(result).toEqual(new AbsolutePath("/home/workspace/dir~name/file"))
      })

      it("handles path that resolves above root", () => {
        const result = ctx.resolvePath("/../../../")

        expect(result).toEqual(new AbsolutePath("/"))
      })

      it("handles ./.. that resolves above cwd", () => {
        const result = ctx.resolvePath("./../../../../../../")

        expect(result).toEqual(new AbsolutePath("/"))
      })

      it("handles ~/../ that resolves above home", () => {
        const result = ctx.resolvePath("~/../")

        expect(result).toEqual(new AbsolutePath("/"))
      })
    })

    describe("with custom cwd and home", () => {
      it("resolves relative to custom cwd", () => {
        const customCtx = new InMemoryProcessContext({
          cwd: new AbsolutePath("/var/www/app"),
        })

        const result = customCtx.resolvePath("./public/index.html")

        expect(result).toEqual(new AbsolutePath("/var/www/app/public/index.html"))
      })

      it("resolves relative to custom home", () => {
        const customCtx = new InMemoryProcessContext({
          home: new AbsolutePath("/Users/john"),
        })

        const result = customCtx.resolvePath("~/.ssh/id_rsa")

        expect(result).toEqual(new AbsolutePath("/Users/john/.ssh/id_rsa"))
      })
    })
  })
})
