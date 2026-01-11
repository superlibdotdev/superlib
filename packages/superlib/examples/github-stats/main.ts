/**
 * GitHub User Stats Fetcher
 *
 * A comprehensive example demonstrating SuperLib's capabilities:
 * - JsonHttpClient for type-safe HTTP requests with schema validation
 * - Result type for type-safe error handling
 * - Result.unwrap() to simplify where cases where errors are irrecoverable
 * - Task.pipe for composing async operations
 * - Task.timeout for operation limits
 * - Task.all for concurrent execution
 * - FileSystem for disk operations
 * - ProcessContext for environment configuration
 * - Dependency injection for testability
 *
 * Usage:
 *   GITHUB_USERS=octocat,torvalds bun examples/github-stats/main.ts
 */

import { FileSystem } from "../../src/platform/filesystem"
import { ProcessContext } from "../../src/platform/ProcessContext"
import { FileSystemCache } from "./FileSystemCache"
import { GitHubApiClient, type GitHubUser } from "./GitHubApiClient"
import { printGithubStats } from "./printGithubStats"

async function main(): Promise<void> {
  const processCtx = new ProcessContext()
  const fs = new FileSystem()

  const cacheDirPath = processCtx.env.string("CACHE_DIR", "~/.github-stats-cache")
  const cacheDir = processCtx.resolvePath(cacheDirPath)
  const usernames = processCtx.env.string("GITHUB_USERS", "octocat,torvalds").split(",")

  console.log(`Fetching stats for: ${usernames.join(", ")}`)
  console.log(`Cache directory: ${cacheDir.path}`)

  await fs.createDirectory(cacheDir, { recursive: true })

  const cache = new FileSystemCache<GitHubUser>(fs, cacheDir)
  const github = new GitHubApiClient(cache)

  await printGithubStats(github, usernames)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
