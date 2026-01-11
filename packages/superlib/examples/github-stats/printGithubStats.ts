import { zip } from "remeda"

import { Task } from "../../src"
import { type GitHubApiClient } from "./GitHubApiClient"

export async function printGithubStats(
  github: GitHubApiClient,
  usernames: string[],
): Promise<void> {
  const tasks = usernames.map((username) => () => github.getUser(username))
  const results = await Task.all(tasks, { concurrency: 3 })
  const resultsWithUsername = zip(results, usernames)

  for (const [userResult, username] of resultsWithUsername) {
    if (userResult.isErr()) {
      console.error(`[ERROR] ${username} failed with: ${userResult.err.type}`)
      continue
    }
    const user = userResult.unwrap()

    console.log(`[OK] ${user.login}: ${user.public_repos} repos, ${user.followers} followers`)
  }
}
