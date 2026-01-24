# Contributing

## Testing

Tests are written using `bun:test` as the primary test runner. To run tests locally:

```bash
bun test
```

### Cross-Runtime Testing with Vitest

To ensure compatibility across Node.js and Deno, we use Vitest as a secondary test runner. The `test:vitest` script automatically transforms `bun:test` files to Vitest format:

```bash
cd packages/superlib && bun run test:vitest
```

**How it works:**

1. The transform script (`scripts/transform-tests-for-vitest.ts`) finds all `*.test.ts` files
2. It converts `bun:test` imports and APIs to Vitest equivalents (e.g., `mock()` → `vi.fn()`)
3. Transformed files are written as `*.test-vitest.ts` (gitignored)
4. Vitest runs only these transformed files

This approach lets us write tests once using Bun's fast test runner while verifying the library works correctly on Node.js and Deno via CI.
