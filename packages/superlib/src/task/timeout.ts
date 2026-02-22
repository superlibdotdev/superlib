
import type { Task, TaskMapper } from "./types"

import { BaseError, Err, Ok, ResultAsync, type TaggedError } from "../basic"
import { durationToMs, prettyPrintDuration, type DurationLike } from "../time"

export interface TimeoutOptions {
  timeout: DurationLike
}

export type TimeoutErr = { type: "timeout"; timeout: Temporal.Duration }

// type TimeoutAsResult<R> =
//   R extends ResultAsync<infer V, infer E> ? ResultAsync<V, E | TimeoutErr> : R

export type Return<T> =
  T extends ResultAsync<infer V, infer E> ? ResultAsync<V, E | TimeoutErr> : Promise<T>

export function timeout<T>(task: Task<T>, options: TimeoutOptions): Return<T>
export function timeout<T>(options: TimeoutOptions): TaskMapper<T, T>
export function timeout<T>(
  taskOrOptions: Task<T> | TimeoutOptions,
  options?: TimeoutOptions,
): Return<T> | TaskMapper<T, T> {
  if (typeof taskOrOptions === "function") {
    return runTimeout(taskOrOptions, options!)
  }

  return ((task: any) => () => runTimeout(task, taskOrOptions)) as any
}

function runTimeout<T>(task: Task<T>, options: TimeoutOptions): Return<T> {
  const timeoutDuration = Temporal.Duration.from(options.timeout)
  const timeoutMs = durationToMs(timeoutDuration)

  // note: we can't use `sleep` here because we want to ensure timeoutPromise cancellation
  let timeoutId: ReturnType<typeof setTimeout> | undefined = undefined
  const timeoutPromise = new Promise<never>((_, resolve) => {
    timeoutId = setTimeout(() => {
      resolve(Ok(new TimeoutError(timeoutDuration)))
    }, timeoutMs)
  })

  const taskPromise = task()
  const isResultAsync = taskPromise instanceof ResultAsync

  if (isResultAsync) {
    return ResultAsync(Promise.race([taskPromise.toPromise(), timeoutPromise])).andThen((r) => {
      clearTimeout(timeoutId)
      
      if (r instanceof TimeoutError) {
        return Err({ type: "timeout"; timeout: Temporal.Duration })
      }

      
      return e
    })
  }

  return Promise.race([taskPromise, timeoutPromise]).finally(() => {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId)
    }
  }) as any
}

export class TimeoutError extends BaseError {
  constructor(duration: Temporal.Duration) {
    super(`Task has timeout after ${prettyPrintDuration(duration)}`)
  }
}
