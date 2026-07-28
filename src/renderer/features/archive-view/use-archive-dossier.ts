import { getCurrentInstance, onBeforeUnmount, type Ref, reactive, ref } from "vue"
import { errorMessage } from "@/shared/api/error"
import type { PersonId } from "@/shared/api/schemas"
import { downloadPersonPhoto, getPerson, revealSensitiveValue } from "./api"
import type { PersonDetail, SensitiveField } from "./schemas"

export type DossierPhotoState =
  | { readonly kind: "absent" }
  | { readonly kind: "loading" }
  | { readonly kind: "failed"; readonly message: string }
  | { readonly kind: "ready"; readonly url: string }

export type ArchiveDossierState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading"; readonly personId: PersonId }
  | { readonly kind: "failed"; readonly personId: PersonId; readonly message: string }
  | {
      readonly kind: "ready"
      readonly personId: PersonId
      readonly person: PersonDetail
      readonly photo: DossierPhotoState
    }

type ArchiveDossier = {
  readonly state: Readonly<Ref<ArchiveDossierState>>
  readonly sensitiveValues: Readonly<Record<SensitiveField, string>>
  readonly sensitiveLoading: Readonly<Ref<SensitiveField | null>>
  readonly sensitiveError: Readonly<Ref<string>>
  readonly select: (personId: PersonId) => Promise<void>
  readonly clear: () => void
  readonly retryPhoto: () => Promise<void>
  readonly toggleSensitive: (field: SensitiveField) => Promise<void>
}

const IDLE_STATE: ArchiveDossierState = { kind: "idle" }

/** Owns all temporary data associated with one actively read personnel dossier. */
export function useArchiveDossier(): ArchiveDossier {
  const state = ref<ArchiveDossierState>(IDLE_STATE)
  const sensitiveValues = reactive<Record<SensitiveField, string>>({
    IDENTITY_CARD: "",
    PHONE_NUMBER: "",
  })
  const sensitiveLoading = ref<SensitiveField | null>(null)
  const sensitiveError = ref("")
  let requestToken = 0

  function revokePhotoUrl(): void {
    const current = state.value
    if (current.kind === "ready" && current.photo.kind === "ready") {
      URL.revokeObjectURL(current.photo.url)
    }
  }

  function clearSensitiveValues(): void {
    sensitiveValues.IDENTITY_CARD = ""
    sensitiveValues.PHONE_NUMBER = ""
    sensitiveLoading.value = null
    sensitiveError.value = ""
  }

  function clear(): void {
    requestToken += 1
    revokePhotoUrl()
    clearSensitiveValues()
    state.value = IDLE_STATE
  }

  async function select(personId: PersonId): Promise<void> {
    const token = requestToken + 1
    requestToken = token
    revokePhotoUrl()
    clearSensitiveValues()
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
    // A visible failure is the only state allowed to start a retry. This coalesces rapid clicks.
    if (
      current.kind !== "ready" ||
      current.person.photo === null ||
      current.photo.kind !== "failed"
    ) {
      return
    }
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
      revokePhotoUrl()
      state.value = { ...current, person, photo: { kind: "ready", url: URL.createObjectURL(blob) } }
    } catch (error) {
      if (!(error instanceof Error)) throw error
      if (token !== requestToken) return
      const current = state.value
      if (current.kind !== "ready" || current.personId !== personId) return
      state.value = { ...current, person, photo: { kind: "failed", message: errorMessage(error) } }
    }
  }

  async function toggleSensitive(field: SensitiveField): Promise<void> {
    const current = state.value
    if (current.kind !== "ready" || sensitiveLoading.value !== null) return
    sensitiveError.value = ""
    if (sensitiveValues[field].length > 0) {
      sensitiveValues[field] = ""
      return
    }

    const token = requestToken
    const personId = current.personId
    sensitiveLoading.value = field
    try {
      const result = await revealSensitiveValue(personId, field)
      if (token !== requestToken) return
      const latest = state.value
      if (latest.kind !== "ready" || latest.personId !== personId) return
      sensitiveValues[field] = result.value
    } catch (error) {
      if (token !== requestToken) return
      if (!(error instanceof Error)) throw error
      sensitiveError.value = errorMessage(error)
    } finally {
      if (token === requestToken) sensitiveLoading.value = null
    }
  }

  if (getCurrentInstance() !== null) onBeforeUnmount(clear)

  return {
    state,
    sensitiveValues,
    sensitiveLoading,
    sensitiveError,
    select,
    clear,
    retryPhoto,
    toggleSensitive,
  }
}
