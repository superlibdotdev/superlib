import type { TimeoutErr } from "../../task/timeout"
import type { DurationLike } from "../../time"

import { Err, Ok, ResultAsync, type Result } from "../../basic"
import { Task } from "../../task"
import { type RetryOptions } from "../../task/retry"

export interface SafeFetchOptions {
  retry?: RetryOptions<SafeFetchResult> & { untilStatus?: UntilStatusFn }
  timeout?: DurationLike
}

type UntilStatusFn = (status: number) => boolean

export type SafeFetchError =
  | { type: "fetch/network"; cause: unknown }
  | { type: "fetch/http"; status: number }
  | TimeoutErr

export type SafeFetchResult = Result<Response, SafeFetchError>

export type SafeFetch = (...args: Parameters<typeof fetch>) => Promise<SafeFetchResult>

export function makeSafeFetch(options: SafeFetchOptions): SafeFetch {
  const untilStatus: UntilStatusFn =
    options.retry?.untilStatus ?? ((status) => status >= 200 && status < 300)

  return async (url, requestInit = {}) => {
    const fetchTask: Task.Task<SafeFetchResult> = async () => {
      return ResultAsync.try(
        () => fetch(url, requestInit),
        (error): SafeFetchError => ({ type: "fetch/network", cause: error }),
      )
        .andThen((response): SafeFetchResult => {
          if (!untilStatus(response.status)) {
            return Err({ type: "fetch/http", status: response.status })
          }

          return Ok(response)
        })
        .toPromise()
    }

    return Task.pipe(
      fetchTask,
      options.timeout && Task.timeout({ timeout: options.timeout, useResult: true }),
      options.retry && Task.retry(options.retry),
    )
  }
}
