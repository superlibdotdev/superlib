import { describe, expect, it, mock } from "bun:test"

import type { IFileSystem } from "../IFileSystem"

import { Ok } from "../../../basic/Result"
import { AbsolutePath } from "../AbsolutePath"
import { createCachedFs } from "./cachedFs"

describe(createCachedFs.name, () => {
  it("caches get() calls", async () => {
    const getMock = mock(async () => ({ type: "dir" as const, path: AbsolutePath("/") }))
    const mockFs: IFileSystem = {
      get: getMock,
      listDirectory: mock(async () => Ok([])),
      readFile: mock(async () => Ok("")),
      writeFile: mock(async () => Ok()),
      createDirectory: mock(async () => {}),
      removeDirectory: mock(async () => Ok()),
      exists: mock(async () => true),
      createTempDir: mock(async () => ({
        path: AbsolutePath("/tmp"),
        [Symbol.asyncDispose]: async () => {},
      })),
    }

    const cachedFs = createCachedFs(mockFs)
    const path = AbsolutePath("/test")

    await cachedFs.get(path)
    await cachedFs.get(path)
    await cachedFs.get(path)

    expect(getMock).toHaveBeenCalledTimes(1)
  })

  it("caches listDirectory() calls", async () => {
    const listDirectoryMock = mock(async () => Ok([]))
    const mockFs: IFileSystem = {
      get: mock(async () => ({ type: "dir" as const, path: AbsolutePath("/") })),
      listDirectory: listDirectoryMock,
      readFile: mock(async () => Ok("")),
      writeFile: mock(async () => Ok()),
      createDirectory: mock(async () => {}),
      removeDirectory: mock(async () => Ok()),
      exists: mock(async () => true),
      createTempDir: mock(async () => ({
        path: AbsolutePath("/tmp"),
        [Symbol.asyncDispose]: async () => {},
      })),
    }

    const cachedFs = createCachedFs(mockFs)
    const path = AbsolutePath("/test")

    await cachedFs.listDirectory(path)
    await cachedFs.listDirectory(path)
    await cachedFs.listDirectory(path)

    expect(listDirectoryMock).toHaveBeenCalledTimes(1)
  })

  it("caches different paths separately", async () => {
    const getMock = mock(async () => ({ type: "dir" as const, path: AbsolutePath("/") }))
    const mockFs: IFileSystem = {
      get: getMock,
      listDirectory: mock(async () => Ok([])),
      readFile: mock(async () => Ok("")),
      writeFile: mock(async () => Ok()),
      createDirectory: mock(async () => {}),
      removeDirectory: mock(async () => Ok()),
      exists: mock(async () => true),
      createTempDir: mock(async () => ({
        path: AbsolutePath("/tmp"),
        [Symbol.asyncDispose]: async () => {},
      })),
    }

    const cachedFs = createCachedFs(mockFs)

    await cachedFs.get(AbsolutePath("/a"))
    await cachedFs.get(AbsolutePath("/b"))
    await cachedFs.get(AbsolutePath("/a"))

    expect(getMock).toHaveBeenCalledTimes(2)
  })
})
