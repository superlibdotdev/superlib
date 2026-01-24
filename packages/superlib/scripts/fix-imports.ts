/**
 * Post-build script to add .js extensions to relative imports in compiled output.
 * Required for Deno compatibility.
 */
import { join } from "node:path"

import type { IFileSystem } from "../src/platform/filesystem/IFileSystem"

import { AbsolutePath } from "../src/platform/filesystem/AbsolutePath"
import { FileSystem } from "../src/platform/filesystem/FileSystem"
import { glob } from "../src/platform/filesystem/glob/glob"

export async function fixImportsInDirectory(distDir: AbsolutePath, fs: IFileSystem): Promise<void> {
  const jsFiles = await glob({ pattern: "**/*.js", cwd: distDir, onlyFiles: true }, fs)

  for (const filePath of jsFiles) {
    await fixImportsInFile(filePath, fs)
  }
}

async function fixImportsInFile(filePath: AbsolutePath, fs: IFileSystem): Promise<void> {
  const contentResult = await fs.readFile(filePath)
  if (!contentResult.isOk()) {
    return
  }

  const content = contentResult.value
  const fileDir = filePath.getDirPath()

  const importRegex = /from\s+["'](\.[^"']+)["']/g
  let fixed = content
  const matches = [...content.matchAll(importRegex)]

  for (const match of matches) {
    const importPath = match[1]!
    if (importPath.endsWith(".js") || importPath.endsWith(".json")) {
      continue
    }

    const resolvedPath = fileDir.join(importPath)
    const entry = await fs.get(resolvedPath)
    const isDir = entry?.type === "dir"

    const newImport = isDir ? `from "${importPath}/index.js"` : `from "${importPath}.js"`
    fixed = fixed.replace(match[0], newImport)
  }

  if (fixed !== content) {
    await fs.writeFile(filePath, fixed)
  }
}

if (import.meta.main) {
  const distDir = AbsolutePath(join(import.meta.dirname, "../dist"))
  await fixImportsInDirectory(distDir, new FileSystem())
}
