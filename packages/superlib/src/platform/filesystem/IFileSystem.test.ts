import { describe, expect, it } from "bun:test"

import type { IFileSystem } from "./IFileSystem"

import { Err, Ok } from "../../basic/Result"
import { FileSystem } from "./FileSystem"
import { MemoryFileSystem } from "./MemoryFileSystem"

const fileSystems = [FileSystem, MemoryFileSystem]

for (const FS of fileSystems) {
  const fileSystem = new FS() as IFileSystem

  describe(FS.name, () => {
    describe(FS.prototype.readFile.name, () => {
      it("reads file contents", async () => {
        await using tmp = await fileSystem.createTempDir("superlib-tests")
        const dir = tmp.path
        const filePath = dir.join("notes.txt")
        await fileSystem.writeFile(filePath, "hello")

        const contents = await fileSystem.readFile(filePath)

        expect(contents).toEqual(Ok("hello"))
      })

      it("throws when file does not exist", async () => {
        await using tmp = await fileSystem.createTempDir("superlib-tests")
        const dir = tmp.path
        const filePath = dir.join("missing.txt")

        expect(await fileSystem.readFile(filePath)).toEqual(
          Err({ type: "fs/file-not-found", path: filePath }),
        )
      })

      it("throws when file is a directory", async () => {
        await using tmp = await fileSystem.createTempDir("superlib-tests")
        const dir = tmp.path

        expect(await fileSystem.readFile(dir)).toEqual(Err({ type: "fs/file-is-a-dir", path: dir }))
      })
    })

    describe(FS.prototype.writeFile.name, () => {
      it("writes file contents and returns them", async () => {
        await using tmp = await fileSystem.createTempDir("superlib-tests")
        const dir = tmp.path
        const filePath = dir.join("notes.txt")

        const result = await fileSystem.writeFile(filePath, "hello")

        expect(result).toEqual(Ok())
        expect(await fileSystem.readFile(filePath)).toEqual(Ok("hello"))
      })

      it("overwrites existing contents", async () => {
        await using tmp = await fileSystem.createTempDir("superlib-tests")
        const dir = tmp.path
        const filePath = dir.join("notes.txt")
        await fileSystem.writeFile(filePath, "first")

        await fileSystem.writeFile(filePath, "second")

        expect(await fileSystem.readFile(filePath)).toEqual(Ok("second"))
      })
    })

    describe(FS.prototype.exists.name, () => {
      it("returns true when path exists", async () => {
        await using tmp = await fileSystem.createTempDir("superlib-tests")
        const dir = tmp.path
        const filePath = dir.join("notes.txt")
        await fileSystem.writeFile(filePath, "hello")

        expect(await fileSystem.exists(filePath)).toBeTrue()
      })

      it("returns false when path is missing", async () => {
        await using tmp = await fileSystem.createTempDir("superlib-tests")
        const dir = tmp.path
        const filePath = dir.join("missing.txt")

        expect(await fileSystem.exists(filePath)).toBeFalse()
      })
    })

    describe(FS.prototype.createDirectory.name, () => {
      it("creates a directory when parent exists", async () => {
        await using tmp = await fileSystem.createTempDir("superlib-tests")
        const dir = tmp.path.join("child")

        await fileSystem.createDirectory(dir, { recursive: false })

        expect(await fileSystem.exists(dir)).toBeTrue()
      })

      it("creates nested directories when recursive", async () => {
        await using tmp = await fileSystem.createTempDir("superlib-tests")
        const dir = tmp.path.join("parent/child")

        await fileSystem.createDirectory(dir, { recursive: true })

        expect(await fileSystem.exists(dir)).toBeTrue()
      })

      it("throws when parent is missing and not recursive", async () => {
        await using tmp = await fileSystem.createTempDir("superlib-tests")
        const dir = tmp.path.join("parent/child")

        expect(fileSystem.createDirectory(dir, { recursive: false })).rejects.toThrow()
      })
    })

    describe(FS.prototype.removeDirectory.name, () => {
      it("removes an empty directory", async () => {
        await using tmp = await fileSystem.createTempDir("superlib-tests")
        const dir = tmp.path.join("child")
        await fileSystem.createDirectory(dir, { recursive: false })

        ;(await fileSystem.removeDirectory(dir, { recursive: false, force: false })).unwrap()

        expect(await fileSystem.exists(dir)).toBeFalse()
      })

      it("removes directories recursively", async () => {
        await using tmp = await fileSystem.createTempDir("superlib-tests")
        const dir = tmp.path.join("parent/child")
        await fileSystem.createDirectory(dir, { recursive: true })
        await fileSystem.writeFile(dir.join("note.txt"), "hello")

        ;(
          await fileSystem.removeDirectory(tmp.path.join("parent"), {
            recursive: true,
            force: false,
          })
        ).unwrap()

        expect(await fileSystem.exists(dir)).toBeFalse()
      })

      it("throws when removing non-empty directory without recursive", async () => {
        await using tmp = await fileSystem.createTempDir("superlib-tests")
        const dir = tmp.path.join("parent")
        await fileSystem.createDirectory(dir, { recursive: false })
        await fileSystem.writeFile(dir.join("note.txt"), "hello")

        expect(await fileSystem.removeDirectory(dir, { recursive: false, force: false })).toEqual(
          Err({ type: "fs/dir-not-empty", path: dir }),
        )
      })

      it("throw when directory is missing and force is false", async () => {
        await using tmp = await fileSystem.createTempDir("superlib-tests")
        const dir = tmp.path.join("parent")

        expect(await fileSystem.removeDirectory(dir, { recursive: false, force: false })).toEqual(
          Err({ type: "fs/dir-not-found", path: dir }),
        )
      })

      it("does not throw when directory is missing and force is true", async () => {
        await using tmp = await fileSystem.createTempDir("superlib-tests")
        const dir = tmp.path.join("missing")

        expect(await fileSystem.removeDirectory(dir, { recursive: false, force: true })).toEqual(
          Ok(),
        )
      })
    })

    describe(FS.prototype.createTempDir.name, () => {
      it("creates a temp directory with the provided prefix", async () => {
        const tempDir = await fileSystem.createTempDir("superlib-test-")

        expect(tempDir.path.path).toContain("superlib-test-")
        expect(await fileSystem.exists(tempDir.path)).toBeTrue()

        const filename = tempDir.path.join("file.txt")
        await fileSystem.writeFile(filename, "hello")
        expect(await fileSystem.exists(filename)).toBeTrue()

        await tempDir[Symbol.asyncDispose]()
        expect(await fileSystem.exists(tempDir.path)).toBeFalse()
        expect(await fileSystem.exists(filename)).toBeFalse()
      })
    })
  })
}
