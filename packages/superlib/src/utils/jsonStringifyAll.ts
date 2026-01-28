function replacer(_k: string, v: unknown): unknown {
  if (typeof v === "bigint") {
    return v.toString()
  }

  if (v instanceof Promise) {
    return "Promise"
  }

  return v
}

export function jsonStringifyAll(value: object, space?: number): string {
  return JSON.stringify(value, replacer, space)
}
