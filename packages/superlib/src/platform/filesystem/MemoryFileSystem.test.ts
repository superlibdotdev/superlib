import { describe, expect, it } from "bun:test"

import { Ok } from "../../basic"
import { AbsolutePath } from "./AbsolutePath"
import { MemoryFileSystem } from "./MemoryFileSystem"

describe(MemoryFileSystem.name, () => {
  describe("constructor", async () => {
    it("creates file system from genesis object", async () => {
      const mfs = new MemoryFileSystem({
        "dir-a": {
          "a.txt": "a text file",
        },
        "dir-b": {
          "dir-b-nested": {},
        },
      })

      expect(await mfs.readFile(AbsolutePath("/dir-a/a.txt"))).toEqual(Ok("a text file"))
      expect(await mfs.get(AbsolutePath("/dir-b"))).toEqual({
        type: "dir",
        path: expect.anything(),
      })
      expect(await mfs.get(AbsolutePath("/dir-b/dir-b-nested"))).toEqual({
        type: "dir",
        path: expect.anything(),
      })
    })
  })
})
