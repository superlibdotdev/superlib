# Agents

This file provides guidance to an Agent when working with code in this repository.

## Project Overview

SuperLib is a missing standard library for TypeScript, providing utilities for async orchestration, error handling, filesystem abstraction, and common patterns. The project uses a monorepo structure with Bun as the runtime and package manager.

## Commands

**Important**: Always run `bun run fix` after introducing changes to the codebase. This ensures code is properly formatted, linted, and tested.

### Running Tests

```bash
bun test                    # Run all tests across all workspaces
bun test <file>             # Run a specific test file
```

### Linting and Formatting

```bash
bun run lint                # Run oxlint with type-aware checking across all workspaces
bun run lint:fix            # Auto-fix linting issues
bun run fmt                 # Check formatting with oxfmt
bun run fmt:fix             # Auto-fix formatting issues
bun run fix                 # Run fmt:fix, lint:fix, and test in sequence
```

### Workspace Commands

```bash
cd packages/core && bun run lint    # Run lint in specific package
cd packages/core && bun test        # Run tests in specific package
```

## Architecture

### Core Abstractions

**Task Pipeline (`task/`)**: The `Task` type represents async operations as `() => Promise<T>`. The Task module provides composable operations:

- `Task.pipe()`: Compose multiple task transformations. Mappers can be `undefined` for conditional composition
- `Task.retry()`: Retry with exponential backoff and jitter. Works with both thrown errors and `Result` types
- `Task.timeout()`: Add timeout to tasks with optional `Result` wrapping
- `Task.all()`: Run multiple tasks concurrently

**Result Type (`basic/Result.ts`)**: Type-safe error handling using `Result<V, E>` where errors must be `TaggedError` (have a `type` field). Create with `Ok(value)` or `Err(error)`. Use `.andThen()` for chaining operations. The `ResultAsync` variant provides async helpers.

**Filesystem Abstraction (`platform/filesystem/`)**:

- `IFileSystem`: Interface for filesystem operations returning `Result` types for error handling
- `FileSystem`: Real filesystem implementation
- `MemoryFileSystem`: In-memory implementation for testing
- `AbsolutePath`: Type-safe absolute path wrapper

**SafeFetch (`platform/safeFetch/`)**: HTTP client that returns `Result` types and integrates with Task pipeline for retry/timeout:

```typescript
const safeFetch = makeSafeFetch({
  retry: { times: 3, delay: "1s", untilStatus: (s) => s >= 200 && s < 300 },
  timeout: "5s"
})
```

**Schema Validation (`schema/`)**: Uses StandardSchema for validation (Zod compatible). The `validateSchema()` function returns `Result<T, ValidationError>` for type-safe validation.

### Module Organization

- `basic/`: Core primitives (Result, assert, BaseError)
- `task/`: Task orchestration and composition
- `platform/`: Platform abstractions (filesystem, HTTP, process, ports)
- `time/`: Temporal polyfill and duration utilities
- `types/`: TypeScript utility types
- `decorators/`: Class decorators
- `random/`: Random number generation with testable IRandom interface
- `schema/`: Schema validation utilities

### Key Patterns

1. **Result-Based Error Handling**: Functions that can fail return `Result<V, E>` instead of throwing. Errors are tagged with a `type` field for discriminated unions.

2. **Task Composition**: Build complex async flows by piping tasks through transformations. The pipe function skips `undefined` mappers for easy conditional logic.

3. **Dependency Injection**: Platform-specific functionality (filesystem, random) uses interfaces for testability.

4. **Temporal API**: Uses `temporal-polyfill` for duration handling. Import is global via `index.ts`.

5. **Impossible Cases**: To handle impossible cases in code use `basic/assert.ts` instead of throwing errors.

6. **Never leave floating Results**: Always call `.unwrap()` or properly handle `Result` values. Ignoring Results silently swallows errors. For example, `await fs.writeFile(path, content)` is wrong - use `(await fs.writeFile(path, content)).unwrap()`.

7. **Prefer AbsolutePath.join()**: Use `AbsolutePath(basePath).join("relative/path")` instead of `path.join()` from `node:path`. This maintains type safety and consistency with the filesystem abstraction.

## Testing Conventions

- Most tests should follow Arrange, Act, and Assert (AAA) pattern with a blank line between each section. Do not add `// Arrange`, `// Act`, `// Assert` comments - the blank lines are sufficient
- Test files use `.test.ts` suffix
- Tests use Bun's built-in test runner
- Filesystem tests use `MemoryFileSystem` for isolation
- Random-dependent code injects `IRandom` for deterministic testing
- When testing time-related functions ALWAYS mock clock with `jest.useFakeTimers()` and explicitly progress time with `clock.advanceTimersByTime(5)`
- When naming "describe" blocks, prefer `SomeClass.name` and `SomeClass.prototype.method.name` instead of hardcoding names
- Instead of using `await expect(promise).resolves.toEqual` use `expect(await promise).toEqual`

## Dependencies

- **Runtime**: Bun (not Node.js)
- **Utilities**: remeda (Lodash alternative)
- **Validation**: Zod (dev dependency for StandardSchema compliance)
- **Temporal**: temporal-polyfill for duration/date handling
- **Linting**: oxlint with type-aware checking and TSGolint rules
- **Formatting**: oxfmt
