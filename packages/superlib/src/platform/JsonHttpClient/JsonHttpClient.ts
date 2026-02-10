import type { StandardSchemaV1 } from "../../schema/StandardSchema"

import { ResultAsync, type Result } from "../../basic"
import { validateSchema, type ValidationError } from "../../schema/validateSchema"
import { makeSafeFetch, type SafeFetch, type SafeFetchError } from "../safeFetch"

export type JsonHttpClientError =
  | SafeFetchError
  | { type: "jsonHttpClient/json-parse"; cause: unknown }
  | ValidationError

export class JsonHttpClient {
  constructor(private readonly safeFetch: SafeFetch = makeSafeFetch()) {}

  private async request<T>(
    url: string,
    schema: StandardSchemaV1<T>,
    _requestInit?: RequestInitWithHeadersFixed,
  ): Promise<Result<T, JsonHttpClientError>> {
    const requestInit: RequestInit = {
      ..._requestInit,
      headers: { ...defaultHeaders, ..._requestInit?.headers },
    }
    return new ResultAsync(this.safeFetch(url, requestInit))
      .andThen((response) =>
        ResultAsync.try(
          () => response.json(),
          (err): JsonHttpClientError => ({ type: "jsonHttpClient/json-parse", cause: err }),
        ),
      )
      .andThen((json) => {
        return validateSchema(schema, json)
      })
      .toPromise()
  }

  async get<T>(url: string, schema: StandardSchemaV1<T>): Promise<Result<T, JsonHttpClientError>> {
    return this.request(url, schema)
  }

  async post<T>(
    url: string,
    body: unknown,
    schema: StandardSchemaV1<T>,
  ): Promise<Result<T, JsonHttpClientError>> {
    return this.request(url, schema, {
      method: "POST",
      body: JSON.stringify(body),
    })
  }

  async patch<T>(
    url: string,
    body: unknown,
    schema: StandardSchemaV1<T>,
  ): Promise<Result<T, JsonHttpClientError>> {
    return this.request(url, schema, {
      method: "PATCH",
      body: JSON.stringify(body),
    })
  }

  async delete<T>(
    url: string,
    schema: StandardSchemaV1<T>,
  ): Promise<Result<T, JsonHttpClientError>> {
    return this.request(url, schema, { method: "DELETE" })
  }
}

type RequestInitWithHeadersFixed = Omit<RequestInit, "headers"> & {
  headers?: Headers
}

type Headers = Record<string, string | ReadonlyArray<string>>

const defaultHeaders: Headers = { "content-type": "application/json" }
