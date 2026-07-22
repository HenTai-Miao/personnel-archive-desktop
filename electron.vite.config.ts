import { resolve } from "node:path"
import vue from "@vitejs/plugin-vue"
import { defineConfig, externalizeDepsPlugin } from "electron-vite"
import { loadEnv, type Plugin } from "vite"

const DEFAULT_API_BASE_URL = "http://127.0.0.1:8080/api/v1"

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const apiBaseUrl = new URL(env["VITE_API_BASE_URL"] ?? DEFAULT_API_BASE_URL)
  const configuredOrigin = new URL(env["VITE_API_ORIGIN"] ?? apiBaseUrl.origin)
  if (configuredOrigin.origin !== apiBaseUrl.origin) throw new ApiOriginMismatchError()
  return {
    main: { plugins: [externalizeDepsPlugin()] },
    preload: {
      plugins: [externalizeDepsPlugin({ exclude: ["zod"] })],
      ssr: { noExternal: ["zod"] },
      build: { rollupOptions: { output: { format: "cjs", entryFileNames: "index.cjs" } } },
    },
    renderer: {
      resolve: {
        alias: {
          "@": resolve("src/renderer"),
          "@shared": resolve("src/shared"),
        },
      },
      plugins: [vue(), apiOriginPlugin(configuredOrigin.origin)],
    },
  }
})

function apiOriginPlugin(origin: string): Plugin {
  return {
    name: "personnel-archive-api-csp",
    transformIndexHtml(html) {
      return html.replace("__API_ORIGIN__", origin)
    },
  }
}

class ApiOriginMismatchError extends Error {
  readonly name = "ApiOriginMismatchError"
  constructor() {
    super("VITE_API_ORIGIN must match the origin of VITE_API_BASE_URL")
  }
}
