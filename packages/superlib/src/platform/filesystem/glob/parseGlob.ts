import { assert } from "../../../basic"

export type GlobChunk =
  | { type: "literal"; value: string }
  | { type: "pattern"; pattern: RegExp }
  | { type: "globstar" }

export function parseGlob(pattern: string): GlobChunk[] {
  const chunks = pattern.split("/").map(parseChunk)

  return combineLiteralChunks(chunks)
}

function parseChunk(chunk: string): GlobChunk {
  if (chunk === "**") {
    return { type: "globstar" }
  }
  if (chunk.includes("*") || chunk.includes("?") || chunk.includes("{")) {
    return { type: "pattern", pattern: globPatternToRegex(chunk) }
  }
  return { type: "literal", value: chunk }
}

function globPatternToRegex(globPattern: string): RegExp {
  let regexString = ""
  for (let i = 0; i < globPattern.length; i++) {
    const c = globPattern[i]!

    if (c === "*") {
      regexString += ".*"
    } else if (c === ".") {
      regexString += "\\."
    } else if (c === "?") {
      regexString += "."
    } else if (c === "{") {
      const closingBracketIndex = globPattern.indexOf("}", i + 1)
      assert(closingBracketIndex !== -1, `Glob pattern ${globPattern} incorrect: unbalanced {}`)

      const optionsString = globPattern.slice(i + 1, closingBracketIndex)
      const options = optionsString.split(",").map((s) => s.trim())
      regexString += `(${options.join("|")})`
      i = closingBracketIndex
    } else {
      regexString += c
    }
  }

  return new RegExp(`^${regexString}$`)
}

function combineLiteralChunks(chunks: GlobChunk[]): GlobChunk[] {
  return chunks.reduce((acc: GlobChunk[], chunk: GlobChunk) => {
    if (chunk.type === "literal" && acc.length > 0) {
      const lastChunk = acc[acc.length - 1]!

      if (lastChunk.type === "literal") {
        lastChunk.value += "/" + chunk.value
        return acc
      }
    }

    acc.push(chunk)
    return acc
  }, [] as GlobChunk[])
}
