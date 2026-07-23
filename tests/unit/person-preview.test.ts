import { mount } from "@vue/test-utils"
import { afterEach, describe, expect, it, vi } from "vitest"
import { defineComponent, h, ref } from "vue"
import { usePersonPreview } from "@/features/person-list/use-person-preview"
import { personIdSchema } from "@/shared/api/schemas"
import { PERSON_DETAIL_FIXTURE } from "../support/person-detail-fixture"

const apiMocks = vi.hoisted(() => ({
  getPerson: vi.fn(),
  downloadPersonPhoto: vi.fn(),
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

describe("usePersonPreview", () => {
  it("stays idle until the user selects a person", () => {
    // Given
    const preview = usePersonPreview()

    // Then
    expect(preview.state.value.kind).toBe("idle")
    expect(apiMocks.getPerson).not.toHaveBeenCalled()
  })

  it("keeps only the latest selected person and revokes the previous photo", async () => {
    // Given
    const firstPerson = {
      ...PERSON_DETAIL_FIXTURE,
      id: personIdSchema.parse("1"),
      photo: PHOTO_METADATA,
    }
    const secondPerson = { ...PERSON_DETAIL_FIXTURE, id: personIdSchema.parse("2"), photo: null }
    apiMocks.getPerson.mockResolvedValueOnce(firstPerson).mockResolvedValueOnce(secondPerson)
    apiMocks.downloadPersonPhoto.mockResolvedValue(new Blob(["photo"], { type: "image/png" }))
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:first")
    const revokeObjectUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined)
    const preview = usePersonPreview()

    // When
    await preview.select(personIdSchema.parse("1"))
    await preview.select(personIdSchema.parse("2"))

    // Then
    expect(preview.state.value).toMatchObject({ kind: "ready", personId: "2" })
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:first")
  })

  it("loads a photo after the selected person's detail is ready", async () => {
    // Given
    apiMocks.getPerson.mockResolvedValue({ ...PERSON_DETAIL_FIXTURE, photo: PHOTO_METADATA })
    apiMocks.downloadPersonPhoto.mockResolvedValue(new Blob(["photo"], { type: "image/png" }))
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:person-photo")
    const preview = usePersonPreview()

    // When
    await preview.select(personIdSchema.parse("7"))

    // Then
    expect(preview.state.value).toMatchObject({
      kind: "ready",
      personId: "7",
      photo: { kind: "ready", url: "blob:person-photo" },
    })
    expect(apiMocks.downloadPersonPhoto).toHaveBeenCalledWith("7")
  })

  it("retries a failed photo download for the selected person", async () => {
    // Given
    apiMocks.getPerson.mockResolvedValue({ ...PERSON_DETAIL_FIXTURE, photo: PHOTO_METADATA })
    apiMocks.downloadPersonPhoto
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(new Blob(["photo"], { type: "image/png" }))
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:retried-photo")
    const preview = usePersonPreview()
    await preview.select(personIdSchema.parse("7"))

    // When
    await preview.retryPhoto()

    // Then
    expect(preview.state.value).toMatchObject({
      kind: "ready",
      personId: "7",
      photo: { kind: "ready", url: "blob:retried-photo" },
    })
    expect(apiMocks.downloadPersonPhoto).toHaveBeenCalledTimes(2)
  })

  it("ignores a repeated photo retry while the failed photo is already reloading", async () => {
    // Given
    let resolveRetry: ((blob: Blob) => void) | undefined
    const retryResult = new Promise<Blob>((resolve) => {
      resolveRetry = resolve
    })
    apiMocks.getPerson.mockResolvedValue({ ...PERSON_DETAIL_FIXTURE, photo: PHOTO_METADATA })
    apiMocks.downloadPersonPhoto
      .mockRejectedValueOnce(new Error("offline"))
      .mockReturnValueOnce(retryResult)
      .mockReturnValueOnce(new Promise<Blob>(() => undefined))
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:retried-photo")
    const preview = usePersonPreview()
    await preview.select(personIdSchema.parse("7"))

    // When
    const retry = preview.retryPhoto()
    const repeatedRetry = preview.retryPhoto()

    // Then
    expect(apiMocks.downloadPersonPhoto).toHaveBeenCalledTimes(2)
    resolveRetry?.(new Blob(["photo"], { type: "image/png" }))
    await Promise.all([retry, repeatedRetry])
    expect(preview.state.value).toMatchObject({
      kind: "ready",
      personId: "7",
      photo: { kind: "ready", url: "blob:retried-photo" },
    })
  })

  it("clears the selected person and revokes its temporary photo URL", async () => {
    // Given
    apiMocks.getPerson.mockResolvedValue({ ...PERSON_DETAIL_FIXTURE, photo: PHOTO_METADATA })
    apiMocks.downloadPersonPhoto.mockResolvedValue(new Blob(["photo"], { type: "image/png" }))
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:person-photo")
    const revokeObjectUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined)
    const preview = usePersonPreview()
    await preview.select(personIdSchema.parse("7"))

    // When
    preview.clear()

    // Then
    expect(preview.state.value).toEqual({ kind: "idle" })
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:person-photo")
  })

  it("revokes the selected photo URL when its Vue host unmounts", async () => {
    // Given
    apiMocks.getPerson.mockResolvedValue({ ...PERSON_DETAIL_FIXTURE, photo: PHOTO_METADATA })
    apiMocks.downloadPersonPhoto.mockResolvedValue(new Blob(["photo"], { type: "image/png" }))
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:person-photo")
    const revokeObjectUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined)
    const previewRef = ref<ReturnType<typeof usePersonPreview> | null>(null)
    const Host = defineComponent({
      setup() {
        previewRef.value = usePersonPreview()
        return () => h("div")
      },
    })
    const wrapper = mount(Host)
    const preview = previewRef.value
    if (preview === null) throw new Error("expected preview host setup to run")
    await preview.select(personIdSchema.parse("7"))

    // When
    wrapper.unmount()

    // Then
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:person-photo")
  })

  it("ignores a stale detail response after another person is selected", async () => {
    // Given
    let resolveFirst: ((person: typeof PERSON_DETAIL_FIXTURE) => void) | undefined
    const firstResult = new Promise<typeof PERSON_DETAIL_FIXTURE>((resolve) => {
      resolveFirst = resolve
    })
    const secondPerson = { ...PERSON_DETAIL_FIXTURE, id: personIdSchema.parse("2") }
    apiMocks.getPerson.mockReturnValueOnce(firstResult).mockResolvedValueOnce(secondPerson)
    const preview = usePersonPreview()

    // When
    const first = preview.select(personIdSchema.parse("1"))
    const second = preview.select(personIdSchema.parse("2"))
    resolveFirst?.(PERSON_DETAIL_FIXTURE)
    await Promise.all([first, second])

    // Then
    expect(preview.state.value).toMatchObject({ kind: "ready", personId: "2" })
  })
})
