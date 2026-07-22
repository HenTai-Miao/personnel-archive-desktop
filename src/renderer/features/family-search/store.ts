/** 家庭成员查询状态：保存条件、分页、加载结果和可恢复错误。 */
import { defineStore } from "pinia"
import { ref } from "vue"
import { errorMessage } from "@/shared/api/error"
import { LIST_PAGE_SIZE } from "@/shared/components/list-pagination"
import { searchFamilyMembers } from "./api"
import type { FamilySearchItem } from "./schemas"

export const useFamilySearchStore = defineStore("family-search", () => {
  const query = ref("")
  const results = ref<readonly FamilySearchItem[]>([])
  const page = ref(0)
  const total = ref(0)
  const loading = ref(false)
  const searched = ref(false)
  const message = ref("")

  async function search(targetPage = 0): Promise<void> {
    if (query.value.trim().length === 0) {
      message.value = "请输入家庭成员姓名"
      return
    }
    loading.value = true
    message.value = ""
    try {
      const response = await searchFamilyMembers({
        name: query.value,
        page: targetPage,
        size: LIST_PAGE_SIZE,
      })
      results.value = response.content
      page.value = response.page
      total.value = response.totalElements
      searched.value = true
    } catch (error) {
      if (!(error instanceof Error)) throw error
      results.value = []
      message.value = errorMessage(error)
    } finally {
      loading.value = false
    }
  }

  return {
    query,
    results,
    page,
    size: LIST_PAGE_SIZE,
    total,
    loading,
    searched,
    message,
    search,
  }
})
