import type { TimeoutErr } from "../../task/timeout"
import type { DurationLike } from "../../time"

import { Err, Ok, ResultAsync, type Result } from "../../basic"
import { Task } from "../../task"
import { type RetryOptions } from "../../task/retry"

export type HttpClientError =
  | { type: "httpClient/network"; cause: unknown }
  | { type: "httpClient/http"; status: number }
  | { type: "httpClient/parse"; cause: unknown }
  | TimeoutErr

export interface HttpClientOptions {
  retry?: RetryOptions<ResultAsync<unknown, HttpClientError>>
  retryUntilStatus?: (status: number) => boolean
  timeout?: DurationLike
}

export interface HttpClientRequestOptions {
  url: string
  headers?: Record<string, string>
  output?: "json" | "text"
}

export interface HttpClientRequestOptionsWithBody extends HttpClientRequestOptions {
  body?: RequestInit["body"]
}

type HttpClientResult = ResultAsync<unknown, HttpClientError>

const defaultOptions: Required<Pick<HttpClientOptions, "retryUntilStatus">> &
  Required<Pick<HttpClientOptions, "timeout" | "retry">> = {
  timeout: { seconds: 5 },
  retry: {
    times: 3,
    delay: { milliseconds: 200 },
    until: () => true,
  },
  retryUntilStatus: (status) => status >= 200 && status < 300,
}

export class HttpClient {
  private readonly options: Required<HttpClientOptions>

  constructor(options: HttpClientOptions = {}) {
    this.options = { ...defaultOptions, ...options }
  }

  get(
    options: HttpClientRequestOptions & { output: "text" },
    overrides?: HttpClientOptions,
  ): ResultAsync<string, HttpClientError>
  get(
    options: HttpClientRequestOptions & { output?: "json" },
    overrides?: HttpClientOptions,
  ): ResultAsync<unknown, HttpClientError>
  get(
    options: HttpClientRequestOptions,
    overrides?: HttpClientOptions,
  ): ResultAsync<unknown, HttpClientError> {
    return this.request(options, "GET", overrides)
  }

  post(
    options: HttpClientRequestOptionsWithBody & { output: "text" },
    overrides?: HttpClientOptions,
  ): ResultAsync<string, HttpClientError>
  post(
    options: HttpClientRequestOptionsWithBody & { output?: "json" },
    overrides?: HttpClientOptions,
  ): ResultAsync<unknown, HttpClientError>
  post(
    options: HttpClientRequestOptionsWithBody,
    overrides?: HttpClientOptions,
  ): ResultAsync<unknown, HttpClientError> {
    return this.request(options, "POST", overrides)
  }

  put(
    options: HttpClientRequestOptionsWithBody & { output: "text" },
    overrides?: HttpClientOptions,
  ): ResultAsync<string, HttpClientError>
  put(
    options: HttpClientRequestOptionsWithBody & { output?: "json" },
    overrides?: HttpClientOptions,
  ): ResultAsync<unknown, HttpClientError>
  put(
    options: HttpClientRequestOptionsWithBody,
    overrides?: HttpClientOptions,
  ): ResultAsync<unknown, HttpClientError> {
    return this.request(options, "PUT", overrides)
  }

  patch(
    options: HttpClientRequestOptionsWithBody & { output: "text" },
    overrides?: HttpClientOptions,
  ): ResultAsync<string, HttpClientError>
  patch(
    options: HttpClientRequestOptionsWithBody & { output?: "json" },
    overrides?: HttpClientOptions,
  ): ResultAsync<unknown, HttpClientError>
  patch(
    options: HttpClientRequestOptionsWithBody,
    overrides?: HttpClientOptions,
  ): ResultAsync<unknown, HttpClientError> {
    return this.request(options, "PATCH", overrides)
  }

  delete(
    options: HttpClientRequestOptions & { output: "text" },
    overrides?: HttpClientOptions,
  ): ResultAsync<string, HttpClientError>
  delete(
    options: HttpClientRequestOptions & { output?: "json" },
    overrides?: HttpClientOptions,
  ): ResultAsync<unknown, HttpClientError>
  delete(
    options: HttpClientRequestOptions,
    overrides?: HttpClientOptions,
  ): ResultAsync<unknown, HttpClientError> {
    return this.request(options, "DELETE", overrides)
  }

  private request(
    requestOptions: HttpClientRequestOptionsWithBody,
    method: string,
    overrides?: HttpClientOptions,
  ): ResultAsync<unknown, HttpClientError> {
    const options = { ...this.options, ...overrides }
    const output = requestOptions.output ?? "json"

    const requestInit: RequestInit = {
      method,
      headers: requestOptions.headers,
      body: requestOptions.body,
    }

    const fetchTask: Task.Task<HttpClientResult> = () => {
      return ResultAsync.try(
        () => fetch(requestOptions.url, requestInit),
        (error): HttpClientError => ({ type: "httpClient/network", cause: error }),
      )
        .andThen((response): Result<Response, HttpClientError> => {
          if (!options.retryUntilStatus(response.status)) {
            return Err({ type: "httpClient/http", status: response.status })
          }
          return Ok(response)
        })
        .mapTry(
          (response) => (output === "text" ? response.text() : response.json()),
          (cause): HttpClientError => ({ type: "httpClient/parse", cause }),
        )
    }

    return Task.pipe(
      fetchTask,
      options.timeout && Task.timeout({ timeout: options.timeout }),
      options.retry && Task.retry(options.retry),
    )
  }
}
