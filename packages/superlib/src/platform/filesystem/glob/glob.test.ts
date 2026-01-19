import { describe, expect, it } from "bun:test"

import { AbsolutePath } from "../AbsolutePath"
import { MemoryFileSystem } from "../MemoryFileSystem"
import { glob } from "./glob"

describe.only(glob.name, () => {
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
  })

  it("finds deeply nested files", async () => {
    const results = await glob({ cwd: AbsolutePath("/"), pattern: "**/*.ts" }, fs)

    const expected: AbsolutePath[] = [
      AbsolutePath("/proj/lib/server.ts"),
      AbsolutePath("/proj/index.ts"),
      AbsolutePath("/tmp/another-proj/index.ts"),
    ]
    expect(results).toEqual(expect.arrayContaining(expected))
    expect(results).toHaveLength(expected.length)
  })

  it("finds all entities in directory", async () => {
    const results = await glob({ cwd: AbsolutePath("/proj"), pattern: "lib/*" }, fs)

    const expected: AbsolutePath[] = [
      AbsolutePath("/proj/lib/server.ts"),
      AbsolutePath("/proj/lib/components"),
    ]
    expect(results).toEqual(expect.arrayContaining(expected))
    expect(results).toHaveLength(expected.length)
  })

  it("finds no files for incorrect pattern", async () => {
    const results = await glob(
      {
        cwd: AbsolutePath("/"),
        pattern: "lib/*", // /lib doesn't exist
      },
      fs,
    )

    const expected: AbsolutePath[] = []
    expect(results).toEqual(expect.arrayContaining(expected))
    expect(results).toHaveLength(expected.length)
  })

  it.skip("finds all files with '**'", () => {})
})
