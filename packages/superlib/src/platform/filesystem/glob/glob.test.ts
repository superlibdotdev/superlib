import { describe, expect, it } from "bun:test"
import { sort } from "remeda"

import type { FileSystemEntry } from "../IFileSystem"

import { AbsolutePath } from "../AbsolutePath"
import { MemoryFileSystem } from "../MemoryFileSystem"
import { glob } from "./glob"

describe(glob.name, () => {
  const fs = new MemoryFileSystem({
    "/proj": {
      lib: {
        "server.ts": "server file ",
        components: {
          "Home.tsx": "component file",
          "Button.jsx": "component file in js",
        },
      },
      "index.ts": "a typescript file",
      "README.md": "# file from in memory file system",
    },
    "/tmp": {
      "another-proj": {
        "index.ts": "index file",
        "CONTRIBUTING.md": "how to contribute to this repo",
      },
    },
    ".gitignore": "",
  })

  it("finds deeply nested entries", async () => {
    const results = await glob({ cwd: AbsolutePath("/"), pattern: "**/*.ts" }, fs)

    expect(sortByPath(results)).toEqual([
      { type: "file", path: AbsolutePath("/proj/index.ts") },
      { type: "file", path: AbsolutePath("/proj/lib/server.ts") },
      { type: "file", path: AbsolutePath("/tmp/another-proj/index.ts") },
    ])
  })

  it("finds all entry in directory", async () => {
    const results = await glob({ cwd: AbsolutePath("/proj"), pattern: "lib/*" }, fs)

    expect(sortByPath(results)).toEqual([
      { type: "dir", path: AbsolutePath("/proj/lib/components") },
      { type: "file", path: AbsolutePath("/proj/lib/server.ts") },
    ])
  })

  it("finds no entries for incorrect pattern", async () => {
    const results = await glob(
      {
        cwd: AbsolutePath("/"),
        pattern: "lib/*", // /lib doesn't exist
      },
      fs,
    )

    expect(results).toEqual([])
  })

  it("finds all entries with '**'", async () => {
    const results = await glob(
      {
        cwd: AbsolutePath("/"),
        pattern: "**",
      },
      fs,
    )

    expect(sortByPath(results)).toMatchSnapshot()
  })

  describe("option onlyFiles", () => {
    it("returns paths for files", async () => {
      const results = await glob(
        {
          cwd: AbsolutePath("/"),
          onlyFiles: true,
          pattern: "**/*.tsx",
        },
        fs,
      )

      expect(results).toEqual([AbsolutePath("/proj/lib/components/Home.tsx")])
    })
  })
})

function sortByPath(results: FileSystemEntry[]): FileSystemEntry[] {
  return sort(results, (a, b) => a.path.path.localeCompare(b.path.path))
}
