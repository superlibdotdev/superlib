import type { Primitive } from "../types"

export function memoize<TThis, TArgs extends Primitive[], TResult>(
  fn: (this: TThis, ...args: TArgs) => TResult,
  keySerializer?: (args: TArgs) => string,
): (this: TThis, ...args: TArgs) => TResult

export function memoize<TThis, TArgs extends unknown[], TResult>(
  fn: (this: TThis, ...args: TArgs) => TResult,
  keySerializer: (args: TArgs) => string,
): (this: TThis, ...args: TArgs) => TResult

export function memoize<TThis, TArgs extends unknown[], TResult>(
  fn: (this: TThis, ...args: TArgs) => TResult,
  keySerializer?: (args: TArgs) => string,
): (this: TThis, ...args: TArgs) => TResult {
  const cache = new Map<string, TResult>()
  const serializer = keySerializer ?? (defaultTupleSerializer as (args: TArgs) => string)

  return function (this: TThis, ...args: TArgs): TResult {
    const key = serializer(args)
    if (cache.has(key)) {
      return cache.get(key) as TResult
    }
    const result = fn.apply(this, args)
    cache.set(key, result)
    return result
  }
}

const serializePrimitive = (val: Primitive): string => {
  if (val === undefined) {
    return "undefined"
  }
  if (typeof val === "number") {
    if (Number.isNaN(val)) {
      return "NaN"
    }
    if (val === Infinity) {
      return "Infinity"
    }
    if (val === -Infinity) {
      return "-Infinity"
    }
    if (Object.is(val, -0)) {
      return "-0"
    }
  }
  if (typeof val === "bigint") {
    return `${val}n`
  }
  return JSON.stringify(val)
}

export const defaultTupleSerializer = <T extends Primitive[]>(args: T): string =>
  `[${args.map(serializePrimitive).join(",")}]`
