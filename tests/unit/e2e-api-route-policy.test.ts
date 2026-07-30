import { describe, expect, it } from "vitest"
import {
  assertE2eApiRequestAllowed,
  assertElectronE2eRendererBundleAllowed,
  E2E_API_ROUTE_GLOB,
  UnexpectedE2eApiOriginError,
  UnexpectedE2eRendererApiError,
} from "../support/e2e-api-route-policy"

describe("Electron E2E API route policy", () => {
  it("accepts the local API origin used by a fresh development build", () => {
    // Given: the renderer request emitted by the development E2E build.
    const requestUrl = "http://127.0.0.1:18080/api/v1/imports/history?page=0&size=20"

    // When
    const parsed = assertE2eApiRequestAllowed(requestUrl)

    // Then
    expect(parsed.pathname).toBe("/api/v1/imports/history")
  })

  it("rejects the production API origin before an E2E request can leave the browser", () => {
    // Given: the renderer request emitted when a stale production bundle is under test.
    const requestUrl = "http://10.23.157.237:18080/api/v1/auth/login"

    // When
    const parseRequest = (): URL => assertE2eApiRequestAllowed(requestUrl)

    // Then
    expect(parseRequest).toThrowError(UnexpectedE2eApiOriginError)
  })

  it("registers one route glob that catches API requests regardless of their origin", () => {
    expect(E2E_API_ROUTE_GLOB).toBe("**/api/v1/**")
  })

  it("accepts only a renderer bundle with one local E2E API base URL", () => {
    expect(() =>
      assertElectronE2eRendererBundleAllowed('const apiBaseUrl = "http://127.0.0.1:18080/api/v1"'),
    ).not.toThrow()

    expect(() =>
      assertElectronE2eRendererBundleAllowed(
        'const apiBaseUrl = "http://10.23.157.237:18080/api/v1"',
      ),
    ).toThrow(UnexpectedE2eRendererApiError)

    expect(() =>
      assertElectronE2eRendererBundleAllowed(
        'const local = "http://127.0.0.1:18080/api/v1"; const prod = "http://10.23.157.237:18080/api/v1"',
      ),
    ).toThrow(UnexpectedE2eRendererApiError)
  })
})
