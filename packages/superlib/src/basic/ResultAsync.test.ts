import { describe, expect, it } from "bun:test"

import { Err, Ok, Result } from "./Result"
import { ResultAsync } from "./ResultAsync"

describe(ResultAsync.name, () => {
  // @todo rewrite these tests
  it.skip("works", async () => {
    const result = await simpleSafeFetch("https://jsonplaceholder.typicode.com/todos/1")

    expect(result).toEqual(
      Ok({
        userId: 1,
        id: 1,
        title: "delectus aut autem",
        completed: false,
      }),
    )
  })
})

type FetchError =
  | { type: "network"; cause: unknown }
  | { type: "http"; code: number }
  | { type: "json-parse"; cause: unknown }

function simpleSafeFetch(url: string): Promise<Result<unknown, FetchError>> {
  return ResultAsync.try(
    () => fetch(url),
    (err): FetchError => ({
      type: "network",
      cause: err,
    }),
  )
    .andThen((response) => {
      if (!response.ok) {
        return Err({ type: "http", code: response.status } as FetchError)
      }

      return ResultAsync.try(
        () => response.json(),
        (err): FetchError => ({ type: "json-parse", cause: err }),
      )
    })
    .toPromise()
}
