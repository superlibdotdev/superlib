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
  if (chunk.includes("*")) {
    return { type: "pattern", pattern: globPatternToRegex(chunk) }
  }
  return { type: "literal", value: chunk }
}

function globPatternToRegex(globPattern: string): RegExp {
  let regexString = ""
  for (const c of globPattern) {
    if (c === "*") {
      regexString += ".*"
    } else if (c === ".") {
      regexString += "\\."
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
