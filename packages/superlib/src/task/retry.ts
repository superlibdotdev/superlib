import type { Task, TaskMapper } from "./types"

import { assert, ErrResult, Result, ResultAsync } from "../basic"
import { type IRandom, RealRandom } from "../random"
import { multiplyDuration, sleep, type DurationLike } from "../time"

export type ErrResultOrError<T> =
  T extends ResultAsync<any, infer E> ? ErrResult<unknown, E> : unknown

export interface RetryOptions<R> {
  until?: (error: ErrResultOrError<R>) => boolean
  times: number
  delay: DurationLike | RetryDelayPolicy // by default this is a jittered <0..1), exponential backoff.
}

export type RetryDelayPolicy = (attempt: number) => DurationLike

export interface RetryDependencies {
  random: IRandom
}

export function retry<T>(
  task: Task<T>,
  options: RetryOptions<T>,
  dependencies?: RetryDependencies,
): Promise<T>
export function retry<T>(
  options: RetryOptions<T>,
  dependencies?: RetryDependencies,
): TaskMapper<T, T>
export function retry<T>(
  taskOrOptions: Task<T> | RetryOptions<T>,
  optionsOrDependencies?: RetryOptions<T> | RetryDependencies,
  dependencies?: RetryDependencies,
): Promise<T> | TaskMapper<T, T> {
  if (typeof taskOrOptions === "function") {
    return runRetry(taskOrOptions, optionsOrDependencies as RetryOptions<T>, dependencies)
  }

  return (task) => () => runRetry(task, taskOrOptions, optionsOrDependencies as RetryDependencies)
}

async function runRetry<T>(
  task: Task<T>,
  options: RetryOptions<T>,
  dependencies?: RetryDependencies,
): Promise<T> {
  const until: (err?: any) => boolean = options.until ?? (() => true)
  const delay: (attempt: number) => DurationLike =
    options.delay instanceof Function
      ? options.delay
      : JitteredRetryPolicy(ExponentialBackoffRetryPolicy(options.delay), {}, dependencies)
  let attempt = 0

  while (true) {
    let thrownError: unknown = undefined
    let resultError: ErrResult<any, any> | undefined = undefined

    try {
      const result_ = task()
      const result = await (result_ instanceof ResultAsync ? result_.toPromise() : result_)
      if (!(result instanceof Result) || result.isOk()) {
        return result
      }
      resultError = result as any
    } catch (error) {
      thrownError = error
    }
    assert(!!(thrownError || resultError))

    if (attempt < options.times && until(thrownError || resultError)) {
      const sleepDuration = delay(attempt++)
      await sleep(sleepDuration)
    } else {
      if (thrownError) {
        throw thrownError
      } else {
        return resultError as any
      }
    }
  }
}

export function ExponentialBackoffRetryPolicy(base: DurationLike): RetryDelayPolicy {
  const baseDuration = Temporal.Duration.from(base)
  return (attempt: number): DurationLike => {
    return multiplyDuration(baseDuration, 2 ** attempt)
  }
}

interface JitteredRetryOptions {
  minFactor?: number
  maxFactor?: number
}

interface JitteredRetryDependencies {
  random: IRandom
}

export function JitteredRetryPolicy(
  base: DurationLike | RetryDelayPolicy,
  options?: JitteredRetryOptions,
  dependencies?: JitteredRetryDependencies,
): RetryDelayPolicy {
  const random = dependencies?.random ?? new RealRandom()
  const minFactor = options?.minFactor ?? 0
  const maxFactor = options?.maxFactor ?? 1
  assert(
    minFactor >= 0 && maxFactor > minFactor,
    `invalid jitter range: min=${minFactor} max=${maxFactor}`,
  )
  const basePolicy: RetryDelayPolicy = base instanceof Function ? base : (): DurationLike => base

  return (attempt: number): DurationLike => {
    const baseDuration = Temporal.Duration.from(basePolicy(attempt))
    const factor = random.nextNumber(minFactor, maxFactor)

    return multiplyDuration(baseDuration, factor)
  }
}
