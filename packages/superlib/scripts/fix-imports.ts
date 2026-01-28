/**
 * Post-build script to add .js extensions to relative imports in compiled output.
 * Required for Deno compatibility.
 */
import {
  AbsolutePath,
  FileSystemUnsafe,
  glob,
  type IFileSystemUnsafe,
} from "../src/platform/filesystem"

export async function fixImportsInDirectory(
  distDir: AbsolutePath,
  fs: IFileSystemUnsafe,
): Promise<void> {
  const jsFiles = await glob({ pattern: "**/*.js", cwd: distDir, onlyFiles: true }, fs)

  for (const filePath of jsFiles) {
    await fixImportsInFile(filePath, fs)
  }
}

async function fixImportsInFile(filePath: AbsolutePath, fs: IFileSystemUnsafe): Promise<void> {
  const content = await fs.readFile(filePath)
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
  const distDir = AbsolutePath(import.meta.dirname).join("../dist")
  await fixImportsInDirectory(distDir, new FileSystemUnsafe())
}
