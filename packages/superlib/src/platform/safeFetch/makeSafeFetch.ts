import type { TimeoutErr } from "../../task/timeout"
import type { DurationLike } from "../../time"
import type { MarkOptional } from "../../types"

import { Err, Ok, ResultAsync, type Result } from "../../basic"
import { Task } from "../../task"
import { type RetryOptions } from "../../task/retry"

export interface SafeFetchOptions {
  retry?: RetryOptions<SafeFetchResult>
  retryUntilStatus: UntilStatusFn
  timeout?: DurationLike
}

export type UserSafeFetchOptions = MarkOptional<SafeFetchOptions, "retryUntilStatus">

export const defaultOptions: Required<SafeFetchOptions> = {
  timeout: { seconds: 5 },
  retry: {
    times: 3,
    delay: { milliseconds: 200 }, // @note: jittered by default
    until: () => true, // retry on any error
  },
  retryUntilStatus: (status) => status >= 200 && status < 300,
}

type UntilStatusFn = (status: number) => boolean

export type SafeFetchError =
  | { type: "fetch/network"; cause: unknown }
  | { type: "fetch/http"; status: number }
  | TimeoutErr

export type SafeFetchResult = Result<Response, SafeFetchError>

export type SafeFetch = (...args: Parameters<typeof fetch>) => Promise<SafeFetchResult>

export function makeSafeFetch(_options: UserSafeFetchOptions = {}): SafeFetch {
  const options: SafeFetchOptions = { ...defaultOptions, ..._options }

  return async (url, requestInit = {}) => {
    const fetchTask: Task.Task<SafeFetchResult> = async () => {
      return ResultAsync.try(
        () => fetch(url, requestInit),
        (error): SafeFetchError => ({ type: "fetch/network", cause: error }),
      )
        .andThen((response): SafeFetchResult => {
          if (!options.retryUntilStatus(response.status)) {
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
