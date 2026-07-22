/** 人员档案列表状态：集中管理筛选、分页、加载和错误，页面只负责呈现。 */
import { defineStore } from "pinia"
import { computed, ref } from "vue"
import { errorMessage } from "@/shared/api/error"
import type { PersonId } from "@/shared/api/schemas"
import { LIST_PAGE_SIZE } from "@/shared/components/list-pagination"
import { fetchPersons } from "./api"
import { downloadAndSavePersonArchives } from "./batch-export"
import type { PersonListItem } from "./schemas"

export const usePersonListStore = defineStore("person-list", () => {
  const name = ref("")
  const employeeNo = ref("")
  const department = ref("")
  const results = ref<readonly PersonListItem[]>([])
  const page = ref(0)
  const total = ref(0)
  const loading = ref(false)
  const loaded = ref(false)
  const message = ref("")
  const selectedPersonIds = ref<readonly PersonId[]>([])
  const batchExporting = ref(false)
  const batchMessage = ref("")
  const batchFailed = ref(false)
  const hasFilters = computed(
    () =>
      name.value.trim().length > 0 ||
      employeeNo.value.trim().length > 0 ||
      department.value.trim().length > 0,
  )

  async function load(targetPage = 0): Promise<void> {
    selectedPersonIds.value = []
    loading.value = true
    message.value = ""
    try {
      const response = await fetchPersons({
        name: name.value,
        employeeNo: employeeNo.value,
        department: department.value,
        page: targetPage,
        size: LIST_PAGE_SIZE,
      })
      results.value = response.content
      page.value = response.page
      total.value = response.totalElements
      loaded.value = true
    } catch (error) {
      if (!(error instanceof Error)) throw error
      results.value = []
      total.value = 0
      loaded.value = true
      message.value = errorMessage(error)
    } finally {
      loading.value = false
    }
  }

  async function reset(): Promise<void> {
    name.value = ""
    employeeNo.value = ""
    department.value = ""
    await load(0)
  }

  function select(rows: readonly PersonListItem[]): void {
    selectedPersonIds.value = rows.map((row) => row.id)
  }

  async function exportSelected(): Promise<void> {
    if (selectedPersonIds.value.length === 0) return
    const personIds = selectedPersonIds.value
    batchExporting.value = true
    batchMessage.value = ""
    try {
      const result = await downloadAndSavePersonArchives(personIds)
      switch (result.status) {
        case "CANCELED":
          return
        case "SAVED":
          batchMessage.value = `已保存 ${personIds.length} 份档案：${result.fileName}`
          batchFailed.value = false
          return
        default:
          return assertNever(result)
      }
    } catch (error) {
      if (!(error instanceof Error)) throw error
      batchMessage.value = errorMessage(error)
      batchFailed.value = true
    } finally {
      batchExporting.value = false
    }
  }

  return {
    name,
    employeeNo,
    department,
    results,
    page,
    size: LIST_PAGE_SIZE,
    total,
    loading,
    loaded,
    message,
    selectedPersonIds,
    batchExporting,
    batchMessage,
    batchFailed,
    hasFilters,
    load,
    reset,
    select,
    exportSelected,
  }
})

function assertNever(value: never): never {
  throw new TypeError(`Unexpected batch export result: ${String(value)}`)
}
