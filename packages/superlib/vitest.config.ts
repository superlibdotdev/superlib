import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["src/**/*.vitest.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
  },
})
