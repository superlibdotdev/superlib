export type Primitive = string | number | boolean | null | undefined | bigint

const serializePrimitive = (val: Primitive): string => {
  if (typeof val === "bigint") {
    return `${val}n`
  }
  return JSON.stringify(val)
}

const defaultSerializer = <T extends Primitive>(arg: T): string => serializePrimitive(arg)

export function memoize<TArg extends Primitive, TResult>(
  fn: (arg: TArg) => TResult,
  keySerializer?: (arg: TArg) => string,
): (arg: TArg) => TResult

export function memoize<TArg, TResult>(
  fn: (arg: TArg) => TResult,
  keySerializer: (arg: TArg) => string,
): (arg: TArg) => TResult

export function memoize<TArg, TResult>(
  fn: (arg: TArg) => TResult,
  keySerializer?: (arg: TArg) => string,
): (arg: TArg) => TResult {
  const cache = new Map<string, TResult>()
  const serializer = keySerializer ?? (defaultSerializer as (arg: TArg) => string)

  return (arg: TArg): TResult => {
    const key = serializer(arg)
    if (cache.has(key)) {
      return cache.get(key) as TResult
    }
    const result = fn(arg)
    cache.set(key, result)
    return result
  }
}
