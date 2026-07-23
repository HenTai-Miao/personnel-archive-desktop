import { getCurrentInstance, onBeforeUnmount, ref } from "vue"
import { downloadPersonPhoto, getPerson } from "@/features/archive-view/api"
import type { PersonDetail } from "@/features/archive-view/schemas"
import { errorMessage } from "@/shared/api/error"
import type { PersonId } from "@/shared/api/schemas"

type PhotoState =
  | { readonly kind: "absent" }
  | { readonly kind: "loading" }
  | { readonly kind: "failed"; readonly message: string }
  | { readonly kind: "ready"; readonly url: string }

export type PersonPreviewState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading"; readonly personId: PersonId }
  | { readonly kind: "failed"; readonly personId: PersonId; readonly message: string }
  | {
      readonly kind: "ready"
      readonly personId: PersonId
      readonly person: PersonDetail
      readonly photo: PhotoState
    }

type PersonPreview = {
  readonly state: Readonly<{ value: PersonPreviewState }>
  readonly select: (personId: PersonId) => Promise<void>
  readonly clear: () => void
  readonly retryPhoto: () => Promise<void>
}

const IDLE_STATE: PersonPreviewState = { kind: "idle" }

/** Keeps temporary photo URLs scoped to the currently selected archive preview. */
export function usePersonPreview(): PersonPreview {
  const state = ref<PersonPreviewState>(IDLE_STATE)
  let requestToken = 0

  function revokePhoto(): void {
    const current = state.value
    if (current.kind === "ready" && current.photo.kind === "ready") {
      URL.revokeObjectURL(current.photo.url)
    }
  }

  function clear(): void {
    requestToken += 1
    revokePhoto()
    state.value = IDLE_STATE
  }

  async function select(personId: PersonId): Promise<void> {
    const token = requestToken + 1
    requestToken = token
    revokePhoto()
    state.value = { kind: "loading", personId }

    try {
      const person = await getPerson(personId)
      if (token !== requestToken) return
      state.value = {
        kind: "ready",
        personId,
        person,
        photo: person.photo === null ? { kind: "absent" } : { kind: "loading" },
      }
      if (person.photo !== null) await loadPhoto(token, personId, person)
    } catch (error) {
      if (!(error instanceof Error)) throw error
      if (token !== requestToken) return
      state.value = { kind: "failed", personId, message: errorMessage(error) }
    }
  }

  async function retryPhoto(): Promise<void> {
    const current = state.value
    if (current.kind !== "ready" || current.person.photo === null) return
    const token = requestToken
    state.value = { ...current, photo: { kind: "loading" } }
    await loadPhoto(token, current.personId, current.person)
  }

  async function loadPhoto(token: number, personId: PersonId, person: PersonDetail): Promise<void> {
    try {
      const blob = await downloadPersonPhoto(personId)
      if (token !== requestToken) return
      const current = state.value
      if (current.kind !== "ready" || current.personId !== personId) return
      revokePhoto()
      state.value = { ...current, person, photo: { kind: "ready", url: URL.createObjectURL(blob) } }
    } catch (error) {
      if (!(error instanceof Error)) throw error
      if (token !== requestToken) return
      const current = state.value
      if (current.kind !== "ready" || current.personId !== personId) return
      state.value = { ...current, person, photo: { kind: "failed", message: errorMessage(error) } }
    }
  }

  if (getCurrentInstance() !== null) onBeforeUnmount(clear)

  return { state, select, clear, retryPhoto }
}
