import type { IFileSystem } from "../IFileSystem"

import { assert } from "../../../basic"
import { Task } from "../../../task"
import { AbsolutePath } from "../AbsolutePath"
import { parseGlob, type GlobChunk } from "./parseGlob"

export interface GlobOptions {
  pattern: string
  cwd: AbsolutePath
}

export async function glob(options: GlobOptions, fs: IFileSystem): Promise<AbsolutePath[]> {
  const cwd = options.cwd
  const chunks = parseGlob(options.pattern)

  return await matchGlobWalker(chunks, cwd, fs, new Set())
}

async function matchGlobWalker(
  chunks: GlobChunk[],
  cwd: AbsolutePath,
  fs: IFileSystem,
  visited: Set<string>,
): Promise<AbsolutePath[]> {
  const [chunk, ...rest] = chunks
  if (!chunk) {
    const cwdEntity = await fs.get(cwd)
    assert(!!cwdEntity, `${cwd.path} does not exist`)

    // @note: it's important that writing and checking 'visited' happens is not interrupted by async operation
    const alreadyVisited = visited.has(cwd.path)
    if (alreadyVisited) {
      return []
    }

    if (cwdEntity.type === "file") {
      visited.add(cwd.path)
      return [cwd]
    } else {
      return []
    }
  }

  switch (chunk.type) {
    case "literal": {
      const newCwd = cwd.join(chunk.value)
      if ((await fs.get(newCwd)) !== undefined) {
        return matchGlobWalker(rest, newCwd, fs, visited)
      }
      return []
    }

    case "pattern": {
      const entities = await fs.listDirectory(cwd)

      const newCwds = entities
        .filter((entity) => chunk.pattern.test(entity.path.getName()))
        .map((m) => m.path)

      const results = await Task.all(
        newCwds.map((newCwd) => () => matchGlobWalker(rest, newCwd, fs, visited)),
        { concurrency: "unbounded" },
      )
      return results.flat()
    }

    case "globstar": {
      const entities = await fs.listDirectory(cwd)

      const newCwds = entities.filter((c) => c.type === "dir").map((m) => m.path)

      const results = await Task.all(
        [
          ...newCwds.map((newCwd) => () => matchGlobWalker(rest, newCwd, fs, visited)), // without nesting
          ...newCwds.map((newCwd) => () => matchGlobWalker(chunks, newCwd, fs, visited)), // with nesting
        ],
        { concurrency: "unbounded" },
      )

      return results.flat()
    }
  }
}
