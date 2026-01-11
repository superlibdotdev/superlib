import { Err, Ok, Result, type TaggedError } from "./Result"

export class ResultAsync<V, E extends TaggedError> {
  constructor(private readonly promisedResult: Promise<Result<V, E>>) {}

  andThen<V2, E2 extends TaggedError>(
    mapper: (value: V) => Result<V2, E2> | ResultAsync<V2, E2>,
  ): ResultAsync<V2, E | E2> {
    const result = this.promisedResult.then(async (r) => {
      if (r.isOk()) {
        const result = mapper(r.value)
        if (result instanceof Result) {
          return result
        } else {
          return result.promisedResult
        }
      } else {
        return r as Result<never, E>
      }
    })

    return new ResultAsync<V2, E | E2>(result)
  }

  toPromise(): Promise<Result<V, E>> {
    return this.promisedResult
  }

  static try<V, E extends TaggedError>(
    fn: () => Promise<V>,
    catchFn: (e: unknown) => E | Result<V, E>,
  ): ResultAsync<V, E> {
    const result = fn()
      .then((v) => Ok(v))
      .catch((e) => {
        const r = catchFn(e)
        if (r instanceof Result) {
          return r
        } else {
          return Err(r)
        }
      })

    return new ResultAsync<V, E>(result)
  }
}
