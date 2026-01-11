/**
 * Post-build script to add .js extensions to relative imports in compiled output.
 * Required for Deno compatibility.
 */
import { readdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"

const distDir = join(import.meta.dirname, "../dist")

async function* walkFiles(dir: string): AsyncGenerator<string> {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      yield* walkFiles(path)
    } else if (entry.name.endsWith(".js")) {
      yield path
    }
  }
}

async function fixImports(filePath: string): Promise<void> {
  const content = await readFile(filePath, "utf-8")

  // Add .js extension to relative imports that don't have one
  const fixed = content.replace(
    /from\s+["'](\.[^"']+)["']/g,
    (match, importPath: string) => {
      if (importPath.endsWith(".js") || importPath.endsWith(".json")) {
        return match
      }
      return `from "${importPath}.js"`
    },
  )

  if (fixed !== content) {
    await writeFile(filePath, fixed)
  }
}

async function main(): Promise<void> {
  for await (const file of walkFiles(distDir)) {
    await fixImports(file)
  }
}

main()
