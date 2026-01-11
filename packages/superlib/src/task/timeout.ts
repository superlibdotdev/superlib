import type { Task, TaskMapper } from "./types"

import { BaseError, Err, ErrResult, Result } from "../basic"
import { durationToMs, prettyPrintDuration, type DurationLike } from "../time"

const { setTimeout, clearTimeout: cancelTimeout } = globalThis

export interface TimeoutOptions {
  timeout: DurationLike
  useResult?: boolean
}

export type TimeoutErr = { type: "timeout"; timeout: Temporal.Duration }

type TimeoutAsResult<Return, Options> = Options extends { useResult: true }
  ? Return extends Result<infer V, infer E>
    ? Result<V, E | TimeoutErr>
    : never
  : Return
// @todo: force useResult if return type is Result

export function timeout<T, O extends TimeoutOptions>(
  task: Task<T>,
  options: O,
): Promise<TimeoutAsResult<T, O>>
export function timeout<T, O extends TimeoutOptions>(
  options: O,
): TaskMapper<T, TimeoutAsResult<T, O>>
export function timeout<T, O extends TimeoutOptions>(
  taskOrOptions: Task<T> | O,
  options?: TimeoutOptions,
): Promise<TimeoutAsResult<T, O>> | TaskMapper<T, TimeoutAsResult<T, O>> {
  if (typeof taskOrOptions === "function") {
    return runTimeout(taskOrOptions, options as O)
  }

  return (task) => () => runTimeout(task, taskOrOptions)
}

async function runTimeout<T, O extends TimeoutOptions>(
  task: Task<T>,
  options: O,
): Promise<TimeoutAsResult<T, O>> {
  const useResult = !!options.useResult
  const timeoutDuration = Temporal.Duration.from(options.timeout)
  const timeoutMs = durationToMs(timeoutDuration)

  // note: we can't use sleep here because we want to ensure timeoutPromise cancellation
  let timeoutId: ReturnType<typeof setTimeout> | undefined = undefined
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new TimeoutError(timeoutDuration))
    }, timeoutMs)
  })

  try {
    return (await Promise.race([task(), timeoutPromise]).catch(
      (e: unknown): ErrResult<unknown, TimeoutErr> => {
        if (useResult) {
          return Err({ type: "timeout", timeout: timeoutDuration })
        }
        throw e
      },
    )) as any
  } finally {
    if (timeoutId !== undefined) {
      cancelTimeout(timeoutId)
    }
  }
}

export class TimeoutError extends BaseError {
  constructor(duration: Temporal.Duration) {
    super(`Task has timeout after ${prettyPrintDuration(duration)}`)
  }
}
