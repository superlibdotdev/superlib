import type { Primitive } from "../types"

export function memoize<TArgs extends Primitive[], TResult>(
  fn: (...args: TArgs) => TResult,
  keySerializer?: (args: TArgs) => string,
): (...args: TArgs) => TResult

export function memoize<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => TResult,
  keySerializer: (args: TArgs) => string,
): (...args: TArgs) => TResult

export function memoize<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => TResult,
  keySerializer?: (args: TArgs) => string,
): (...args: TArgs) => TResult {
  const cache = new Map<string, TResult>()
  const serializer = keySerializer ?? (defaultTupleSerializer as (args: TArgs) => string)

  return (...args: TArgs): TResult => {
    const key = serializer(args)
    if (cache.has(key)) {
      return cache.get(key) as TResult
    }
    const result = fn(...args)
    cache.set(key, result)
    return result
  }
}

const serializePrimitive = (val: Primitive): string => {
  if (typeof val === "bigint") {
    return `${val}n`
  }
  return JSON.stringify(val)
}

export const defaultTupleSerializer = <T extends Primitive[]>(args: T): string =>
  `[${args.map(serializePrimitive).join(",")}]`
