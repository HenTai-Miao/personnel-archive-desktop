import { mount } from "@vue/test-utils"
import { afterEach, describe, expect, it, vi } from "vitest"
import { defineComponent, h, ref } from "vue"
import { useArchiveDossier } from "@/features/archive-view/use-archive-dossier"
import { personIdSchema } from "@/shared/api/schemas"
import { PERSON_DETAIL_FIXTURE } from "../support/person-detail-fixture"

const apiMocks = vi.hoisted(() => ({
  getPerson: vi.fn(),
  downloadPersonPhoto: vi.fn(),
  revealSensitiveValue: vi.fn(),
}))

const PHOTO_METADATA = {
  mimeType: "image/png" as const,
  originalFilename: "preview.png",
  byteSize: 1,
  widthPixels: 1,
  heightPixels: 1,
}

vi.mock("@/features/archive-view/api", () => apiMocks)

afterEach(() => {
  vi.restoreAllMocks()
})

function deferred<T>() {
  let resolve: (value: T) => void = () => {
    throw new TypeError("deferred result has not been initialized")
  }
  const promise = new Promise<T>((complete) => {
    resolve = complete
  })
  return { promise, resolve }
}

describe("useArchiveDossier", () => {
  it("starts idle without reading a dossier", () => {
    const dossier = useArchiveDossier()

    expect(dossier.state.value).toEqual({ kind: "idle" })
    expect(apiMocks.getPerson).not.toHaveBeenCalled()
  })

  it("keeps only the latest dossier response", async () => {
    const first = deferred<typeof PERSON_DETAIL_FIXTURE>()
    apiMocks.getPerson.mockReturnValueOnce(first.promise).mockResolvedValueOnce({
      ...PERSON_DETAIL_FIXTURE,
      id: personIdSchema.parse("2"),
      photo: null,
    })
    const dossier = useArchiveDossier()

    const firstLoad = dossier.select(personIdSchema.parse("1"))
    const secondLoad = dossier.select(personIdSchema.parse("2"))
    first.resolve({ ...PERSON_DETAIL_FIXTURE, id: personIdSchema.parse("1") })
    await Promise.all([firstLoad, secondLoad])

    expect(dossier.state.value).toMatchObject({ kind: "ready", personId: "2" })
  })

  it("coalesces a repeated photo retry", async () => {
    const retry = deferred<Blob>()
    apiMocks.getPerson.mockResolvedValue({ ...PERSON_DETAIL_FIXTURE, photo: PHOTO_METADATA })
    apiMocks.downloadPersonPhoto
      .mockRejectedValueOnce(new Error("offline"))
      .mockReturnValueOnce(retry.promise)
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:retried-photo")
    const dossier = useArchiveDossier()
    await dossier.select(personIdSchema.parse("7"))

    const firstRetry = dossier.retryPhoto()
    const secondRetry = dossier.retryPhoto()

    expect(apiMocks.downloadPersonPhoto).toHaveBeenCalledTimes(2)
    retry.resolve(new Blob(["photo"], { type: "image/png" }))
    await Promise.all([firstRetry, secondRetry])
    expect(dossier.state.value).toMatchObject({
      kind: "ready",
      photo: { kind: "ready", url: "blob:retried-photo" },
    })
  })

  it("loads sensitive data only after an explicit request and clears it when switching dossiers", async () => {
    apiMocks.getPerson
      .mockResolvedValueOnce({ ...PERSON_DETAIL_FIXTURE, id: personIdSchema.parse("7") })
      .mockResolvedValueOnce({ ...PERSON_DETAIL_FIXTURE, id: personIdSchema.parse("8") })
    apiMocks.revealSensitiveValue.mockResolvedValue({ value: "123456789012345678" })
    const dossier = useArchiveDossier()

    await dossier.select(personIdSchema.parse("7"))
    expect(apiMocks.revealSensitiveValue).not.toHaveBeenCalled()
    await dossier.toggleSensitive("IDENTITY_CARD")
    expect(dossier.sensitiveValues.IDENTITY_CARD).toBe("123456789012345678")

    await dossier.select(personIdSchema.parse("8"))
    expect(dossier.sensitiveValues.IDENTITY_CARD).toBe("")
    expect(dossier.sensitiveValues.PHONE_NUMBER).toBe("")
  })

  it("does not expose a stale sensitive response after switching dossiers", async () => {
    const reveal = deferred<{ value: string }>()
    apiMocks.getPerson.mockResolvedValue({ ...PERSON_DETAIL_FIXTURE, photo: null })
    apiMocks.revealSensitiveValue.mockReturnValue(reveal.promise)
    const dossier = useArchiveDossier()
    await dossier.select(personIdSchema.parse("7"))

    const revealing = dossier.toggleSensitive("IDENTITY_CARD")
    await dossier.select(personIdSchema.parse("8"))
    reveal.resolve({ value: "123456789012345678" })
    await revealing

    expect(dossier.sensitiveValues.IDENTITY_CARD).toBe("")
  })

  it("revokes the ready photo and clears secrets", async () => {
    apiMocks.getPerson.mockResolvedValue({ ...PERSON_DETAIL_FIXTURE, photo: PHOTO_METADATA })
    apiMocks.downloadPersonPhoto.mockResolvedValue(new Blob(["photo"], { type: "image/png" }))
    apiMocks.revealSensitiveValue.mockResolvedValue({ value: "123456789012345678" })
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:person-photo")
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined)
    const dossier = useArchiveDossier()
    await dossier.select(personIdSchema.parse("7"))
    await dossier.toggleSensitive("IDENTITY_CARD")

    dossier.clear()

    expect(revoke).toHaveBeenCalledWith("blob:person-photo")
    expect(dossier.sensitiveValues.IDENTITY_CARD).toBe("")
    expect(dossier.state.value).toEqual({ kind: "idle" })
  })

  it("clears a ready dossier when its Vue host unmounts", async () => {
    apiMocks.getPerson.mockResolvedValue({ ...PERSON_DETAIL_FIXTURE, photo: PHOTO_METADATA })
    apiMocks.downloadPersonPhoto.mockResolvedValue(new Blob(["photo"], { type: "image/png" }))
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:host-photo")
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined)
    const exposed = ref<ReturnType<typeof useArchiveDossier> | null>(null)
    const Host = defineComponent({
      setup() {
        exposed.value = useArchiveDossier()
        return () => h("div")
      },
    })
    const wrapper = mount(Host)
    if (exposed.value === null) throw new Error("archive dossier host did not initialize")
    await exposed.value.select(personIdSchema.parse("7"))

    wrapper.unmount()

    expect(revoke).toHaveBeenCalledWith("blob:host-photo")
  })
})
