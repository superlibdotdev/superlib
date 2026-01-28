import { jsonStringifyAll } from "./jsonStringifyAll"

export interface PrettyJsonStringifyAllOptions {
  space?: number
  singleLineUntilLength?: number
}

export function prettyJsonStringifyAll(
  value: object,
  options?: PrettyJsonStringifyAllOptions,
): string {
  const singleLineUntilLength = options?.singleLineUntilLength
  const space = options?.space

  if (singleLineUntilLength !== undefined) {
    const compact = jsonStringifyAll(value)
    if (compact.length <= singleLineUntilLength) {
      return compact
    }
  }

  return jsonStringifyAll(value, space)
}
