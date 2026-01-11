# SuperLib

Missing standard library for TypeScript

## Features:

- `Task` primitive to orchestrate async work (retries, timeouts, concurrency etc.)
- `FileSystem` abstraction and InMemoryFileSystem to test FS interactions
- `ProcessContext` abstraction with env reader: `env.optionalBoolean("TEST", false)`
- Optional error handling with `Result` type
- And many, many smaller utils (`sleep`, `random`, `AbsolutePath` etc.)

## Examples

- [github-stats](./packages/superlib/examples/github-stats/) - Fetches GitHub repository statistics using SuperLib's Task pipeline, SafeFetch, and FileSystem abstractions
