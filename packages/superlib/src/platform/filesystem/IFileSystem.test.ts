import { describe, expect, it } from "bun:test"

import type { IFileSystem } from "./IFileSystem"

import { Err, Ok } from "../../basic/Result"
import { FileSystem } from "./FileSystem"
import { MemoryFileSystem } from "./MemoryFileSystem"

const fileSystems = [MemoryFileSystem, FileSystem]

for (const FS of fileSystems) {
  const fileSystem = new FS() as IFileSystem

  describe(FS.name, () => {
    describe(FS.prototype.readFile.name, () => {
      it("reads file contents", async () => {
        await using tmp = await fileSystem.createTempDir("superlib-tests")
        const dir = tmp.path
        const filePath = dir.join("notes.txt")
        ;(await fileSystem.writeFile(filePath, "hello")).unwrap()

        const contents = await fileSystem.readFile(filePath)

        expect(contents).toEqual(Ok("hello"))
      })

      it("returns error when file does not exist", async () => {
        await using tmp = await fileSystem.createTempDir("superlib-tests")
        const dir = tmp.path
        const filePath = dir.join("missing.txt")

        expect(await fileSystem.readFile(filePath)).toEqual(
          Err({ type: "fs/file-not-found", path: filePath }),
        )
      })

      it("returns error when file is a directory", async () => {
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
        ;(await fileSystem.writeFile(filePath, "first")).unwrap()
        ;(await fileSystem.writeFile(filePath, "second")).unwrap()

        expect(await fileSystem.readFile(filePath)).toEqual(Ok("second"))
      })

      it("returns error when writing file to non-existing dir", async () => {
        await using tmp = await fileSystem.createTempDir("superlib-tests")
        const filePath = tmp.path.join("missing/notes.txt")

        expect(await fileSystem.writeFile(filePath, "hello")).toEqual(
          Err({ type: "fs/parent-not-found", path: filePath }),
        )
      })
    })

    describe(FS.prototype.exists.name, () => {
      it("returns true when path exists", async () => {
        await using tmp = await fileSystem.createTempDir("superlib-tests")
        const dir = tmp.path
        const filePath = dir.join("notes.txt")
        ;(await fileSystem.writeFile(filePath, "hello")).unwrap()

        expect(await fileSystem.exists(filePath)).toBeTrue()
      })

      it("returns false when path is missing", async () => {
        await using tmp = await fileSystem.createTempDir("superlib-tests")
        const dir = tmp.path
        const filePath = dir.join("missing.txt")

        expect(await fileSystem.exists(filePath)).toBeFalse()
      })
    })

    describe(FS.prototype.createDir.name, () => {
      it("creates a directory when parent exists", async () => {
        await using tmp = await fileSystem.createTempDir("superlib-tests")
        const dir = tmp.path.join("child")
        ;(await fileSystem.createDir(dir, { recursive: false })).unwrap()

        expect(await fileSystem.exists(dir)).toBeTrue()
      })

      it("creates nested directories when recursive", async () => {
        await using tmp = await fileSystem.createTempDir("superlib-tests")
        const dir = tmp.path.join("parent/child")
        ;(await fileSystem.createDir(dir, { recursive: true })).unwrap()

        expect(await fileSystem.exists(dir)).toBeTrue()
      })

      it("returns error when parent is missing and not recursive", async () => {
        await using tmp = await fileSystem.createTempDir("superlib-tests")
        const dir = tmp.path.join("parent/child")

        expect(await fileSystem.createDir(dir, { recursive: false })).toEqual(
          Err({ type: "fs/parent-not-found", path: dir }),
        )
      })

      it("returns error when directory already exists and not recursive", async () => {
        await using tmp = await fileSystem.createTempDir("superlib-tests")
        const dir = tmp.path.join("child")
        ;(await fileSystem.createDir(dir, { recursive: false })).unwrap()

        expect(await fileSystem.createDir(dir, { recursive: false })).toEqual(
          Err({ type: "fs/already-exists", path: dir }),
        )
      })

      it("succeeds when directory already exists and recursive", async () => {
        await using tmp = await fileSystem.createTempDir("superlib-tests")
        const dir = tmp.path.join("child")
        ;(await fileSystem.createDir(dir, { recursive: false })).unwrap()

        expect(await fileSystem.createDir(dir, { recursive: true })).toEqual(Ok())
      })
    })

    describe(FS.prototype.removeDir.name, () => {
      it("removes an empty directory", async () => {
        await using tmp = await fileSystem.createTempDir("superlib-tests")
        const dir = tmp.path.join("child")
        ;(await fileSystem.createDir(dir, { recursive: false })).unwrap()
        ;(await fileSystem.removeDir(dir, { recursive: false, force: false })).unwrap()

        expect(await fileSystem.exists(dir)).toBeFalse()
      })

      it("removes directories recursively", async () => {
        await using tmp = await fileSystem.createTempDir("superlib-tests")
        const dir = tmp.path.join("parent/child")
        ;(await fileSystem.createDir(dir, { recursive: true })).unwrap()
        ;(await fileSystem.writeFile(dir.join("note.txt"), "hello")).unwrap()
        ;(
          await fileSystem.removeDir(tmp.path.join("parent"), {
            recursive: true,
            force: false,
          })
        ).unwrap()

        expect(await fileSystem.exists(dir)).toBeFalse()
      })

      it("returns error when removing non-empty directory without recursive", async () => {
        await using tmp = await fileSystem.createTempDir("superlib-tests")
        const dir = tmp.path.join("parent")
        ;(await fileSystem.createDir(dir, { recursive: false })).unwrap()
        ;(await fileSystem.writeFile(dir.join("note.txt"), "hello")).unwrap()

        expect(await fileSystem.removeDir(dir, { recursive: false, force: false })).toEqual(
          Err({ type: "fs/dir-not-empty", path: dir }),
        )
      })

      it("returns error when directory is missing and force is false", async () => {
        await using tmp = await fileSystem.createTempDir("superlib-tests")
        const dir = tmp.path.join("parent")

        expect(await fileSystem.removeDir(dir, { recursive: false, force: false })).toEqual(
          Err({ type: "fs/dir-not-found", path: dir }),
        )
      })

      it("returns error when not a directory", async () => {
        await using tmp = await fileSystem.createTempDir("superlib-tests")
        const filePath = tmp.path.join("file.txt")
        ;(await fileSystem.writeFile(filePath, "hello world!")).unwrap()

        expect(await fileSystem.removeDir(filePath, { recursive: false, force: false })).toEqual(
          Err({ type: "fs/not-a-dir", path: filePath }),
        )
      })

      it("succeeds when directory is missing and force is true", async () => {
        await using tmp = await fileSystem.createTempDir("superlib-tests")
        const dir = tmp.path.join("missing")

        expect(await fileSystem.removeDir(dir, { recursive: false, force: true })).toEqual(Ok())
      })
    })

    describe(FS.prototype.createTempDir.name, () => {
      it("creates a temp directory with the provided prefix", async () => {
        const tempDir = await fileSystem.createTempDir("superlib-test-")

        expect(tempDir.path.path).toContain("superlib-test-")
        expect(await fileSystem.exists(tempDir.path)).toBeTrue()

        const filename = tempDir.path.join("file.txt")
        ;(await fileSystem.writeFile(filename, "hello")).unwrap()
        expect(await fileSystem.exists(filename)).toBeTrue()

        await tempDir[Symbol.asyncDispose]()
        expect(await fileSystem.exists(tempDir.path)).toBeFalse()
        expect(await fileSystem.exists(filename)).toBeFalse()
      })
    })

    describe(FS.prototype.get.name, () => {
      it("gets existing file", async () => {
        await using tmp = await fileSystem.createTempDir("superlib-tests")
        const dir = tmp.path
        const filePath = dir.join("notes.txt")
        ;(await fileSystem.writeFile(filePath, "hello")).unwrap()

        expect(await fileSystem.get(filePath)).toEqual({ type: "file", path: filePath })
      })

      it("gets existing dir", async () => {
        await using tmp = await fileSystem.createTempDir("superlib-tests")

        expect(await fileSystem.get(tmp.path)).toEqual({ type: "dir", path: tmp.path })
      })

      it("returns undefined for not existing", async () => {
        await using tmp = await fileSystem.createTempDir("superlib-tests")

        expect(await fileSystem.get(tmp.path.join("/not-existing"))).toEqual(undefined)
      })
    })

    describe(FS.prototype.listDir.name, () => {
      it("lists non empty dir", async () => {
        await using tmp = await fileSystem.createTempDir("superlib-tests")
        const dir = tmp.path

        const notesFilePath = dir.join("notes.txt")
        ;(await fileSystem.writeFile(notesFilePath, "hello")).unwrap()
        const secretDirPath = dir.join("secret")
        ;(await fileSystem.createDir(secretDirPath, { recursive: false })).unwrap()
        const secretFilePath = secretDirPath.join("secret-notes.txt")
        ;(await fileSystem.writeFile(secretFilePath, "goodbye")).unwrap()

        const result = await fileSystem.listDir(dir)

        expect(result).toEqual(
          Ok([
            { type: "file", path: notesFilePath },
            { type: "dir", path: secretDirPath },
          ]),
        )
      })

      it("lists empty dir", async () => {
        await using tmp = await fileSystem.createTempDir("superlib-tests")

        expect(await fileSystem.listDir(tmp.path)).toEqual(Ok([]))
      })

      it("returns error when listing not-existing dir", async () => {
        await using tmp = await fileSystem.createTempDir("superlib-tests")

        const path = tmp.path.join("/not-existing")
        expect(await fileSystem.listDir(path)).toEqual(Err({ type: "fs/dir-not-found", path }))
      })

      it("returns error when listing file not dir", async () => {
        await using tmp = await fileSystem.createTempDir("superlib-tests")
        const filePath = tmp.path.join("file.txt")
        ;(await fileSystem.writeFile(filePath, "hello world!")).unwrap()

        expect(await fileSystem.listDir(filePath)).toEqual(
          Err({ type: "fs/not-a-dir", path: filePath }),
        )
      })
    })
  })
}
