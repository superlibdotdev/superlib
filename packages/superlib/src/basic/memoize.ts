export function memoize<TArg, TResult>(
  fn: (arg: TArg) => TResult,
  keySerializer: (arg: TArg) => string,
): (arg: TArg) => TResult {
  const cache = new Map<string, TResult>()

  return (arg: TArg): TResult => {
    const key = keySerializer(arg)
    if (cache.has(key)) {
      return cache.get(key) as TResult
    }
    const result = fn(arg)
    cache.set(key, result)
    return result
  }
}
