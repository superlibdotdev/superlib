import { z } from "zod"

import type { FileSystemCache } from "./FileSystemCache"

import { Err, ErrResult, Ok, type Result } from "../../src"
import {
  JsonHttpClient,
  type JsonHttpClientError,
} from "../../src/platform/JsonHttpClient/JsonHttpClient"
import { makeSafeFetch } from "../../src/platform/safeFetch"

export const GitHubUserSchema = z.object({
  login: z.string(),
  id: z.number(),
  public_repos: z.number(),
  followers: z.number(),
  following: z.number(),
  created_at: z.string(),
})

export type GitHubUser = z.infer<typeof GitHubUserSchema>

export type GitHubApiError =
  | { type: "github/rate-limited" }
  | { type: "github/not-found"; username: string }
  | { type: "github/network"; cause: JsonHttpClientError }
  | { type: "github/timeout" }
  | { type: "github/validation"; issues: readonly unknown[] }

export class GitHubApiClient {
  private readonly client: JsonHttpClient

  constructor(private readonly cache: FileSystemCache<GitHubUser>) {
    const safeFetch = makeSafeFetch({
      retry: {
        times: 3,
        delay: { milliseconds: 500 },
        untilStatus: (s) => s >= 200 && s < 300,
      },
      timeout: { seconds: 10 },
    })
    this.client = new JsonHttpClient(safeFetch)
  }

  async getUser(username: string): Promise<Result<GitHubUser, GitHubApiError>> {
    const cached = await this.cache.get(username)
    if (cached) {
      return Ok(cached)
    }

    const url = `https://api.github.com/users/${username}`
    const result = await this.client.get(url, GitHubUserSchema)

    if (result.isErr()) {
      return Err(this.mapError(result as ErrResult<GitHubUser, JsonHttpClientError>, username))
    }

    const user = result.unwrap()

    await this.cache.set(username, user)

    return Ok(user)
  }

  private mapError(
    result: ErrResult<GitHubUser, JsonHttpClientError>,
    username: string,
  ): GitHubApiError {
    const err = result.err

    if (err.type === "fetch/http" && err.status === 404) {
      return { type: "github/not-found", username }
    }
    if (err.type === "timeout") {
      return { type: "github/timeout" }
    }
    if (err.type === "schema/validate") {
      return { type: "github/validation", issues: err.issue }
    }

    return { type: "github/network", cause: err }
  }
}
