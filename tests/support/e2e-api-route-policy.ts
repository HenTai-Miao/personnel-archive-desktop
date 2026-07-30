const LOCAL_E2E_API_ORIGIN = "http://127.0.0.1:18080"
const LOCAL_E2E_API_BASE_URL = `${LOCAL_E2E_API_ORIGIN}/api/v1`
const API_BASE_URL_PATTERN = /https?:\/\/(?:\[[0-9a-fA-F:]+\]|[A-Za-z0-9.-]+)(?::\d+)?\/api\/v1\b/g

/** Catch API calls before Chromium chooses a network destination; the origin is checked separately. */
export const E2E_API_ROUTE_GLOB = "**/api/v1/**" as const

export function assertE2eApiRequestAllowed(requestUrl: string): URL {
  const url = new URL(requestUrl)
  if (url.origin !== LOCAL_E2E_API_ORIGIN) {
    throw new UnexpectedE2eApiOriginError(url.origin)
  }
  return url
}

export class UnexpectedE2eApiOriginError extends Error {
  readonly name = "UnexpectedE2eApiOriginError"

  constructor(readonly origin: string) {
    super(`Electron E2E blocked an API request to unexpected origin: ${origin}`)
  }
}

export function assertElectronE2eRendererBundleAllowed(bundleSource: string): void {
  const apiBaseUrls = new Set(bundleSource.match(API_BASE_URL_PATTERN) ?? [])
  if (apiBaseUrls.size !== 1 || !apiBaseUrls.has(LOCAL_E2E_API_BASE_URL)) {
    throw new UnexpectedE2eRendererApiError()
  }
}

export class UnexpectedE2eRendererApiError extends Error {
  constructor() {
    super("Electron E2E requires a renderer bundle built for the local test API")
    this.name = "UnexpectedE2eRendererApiError"
  }
}
