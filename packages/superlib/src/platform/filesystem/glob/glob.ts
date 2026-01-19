import type { FileSystemEntry, IFileSystem } from "../IFileSystem"

import { assert } from "../../../basic"
import { Task } from "../../../task"
import { AbsolutePath } from "../AbsolutePath"
import { parseGlob, type GlobChunk } from "./parseGlob"

export interface GlobOptions {
  pattern: string
  onlyFiles?: boolean
  cwd: AbsolutePath
}

export async function glob(
  options: GlobOptions & { onlyFiles: true },
  fs: IFileSystem,
): Promise<AbsolutePath[]>
export async function glob(
  options: GlobOptions & { onlyFiles?: false },
  fs: IFileSystem,
): Promise<FileSystemEntry[]>
export async function glob(
  options: GlobOptions,
  fs: IFileSystem,
): Promise<FileSystemEntry[] | AbsolutePath[]> {
  const cwd = options.cwd
  const chunks = parseGlob(options.pattern)

  const entries = await matchGlobWalker(chunks, cwd, fs, new Set())

  if (options.onlyFiles) {
    return entries.filter((e) => e.type === "file").map((e) => e.path)
  }

  return entries
}

async function matchGlobWalker(
  chunks: GlobChunk[],
  cwd: AbsolutePath,
  fs: IFileSystem,
  visited: Set<string>,
): Promise<FileSystemEntry[]> {
  const [chunk, ...rest] = chunks
  if (!chunk) {
    const cwdEntity = await fs.get(cwd)
    assert(!!cwdEntity, `${cwd.path} does not exist`)

    // @note: it's important that writing and checking 'visited' happens is not interrupted by async operation
    const alreadyVisited = visited.has(cwd.path)
    if (alreadyVisited) {
      return []
    }

    visited.add(cwd.path)
    return [cwdEntity]
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

      const newCwds = entities.map((m) => m.path)

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
