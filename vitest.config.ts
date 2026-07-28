import vue from "@vitejs/plugin-vue"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": new URL("./src/renderer", import.meta.url).pathname,
      "@shared": new URL("./src/shared", import.meta.url).pathname,
    },
  },
  test: {
    environment: "happy-dom",
    globals: true,
    include: ["tests/unit/**/*.test.ts"],
    css: true,
  },
})
