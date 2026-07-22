/** 统一列表分页策略：所有客户端列表固定每页 20 条，并在数据缩减时回退到有效页。 */
import { computed, type Ref, ref, watch } from "vue"

export const LIST_PAGE_SIZE = 20 as const

export function useLocalListPagination<T>(items: Readonly<Ref<readonly T[]>>) {
  const page = ref(0)
  const visibleItems = computed(() => {
    const start = page.value * LIST_PAGE_SIZE
    return items.value.slice(start, start + LIST_PAGE_SIZE)
  })

  watch(
    () => items.value.length,
    (total) => {
      const lastPage = Math.max(0, Math.ceil(total / LIST_PAGE_SIZE) - 1)
      page.value = Math.min(page.value, lastPage)
    },
  )

  function setPage(nextPage: number): void {
    page.value = nextPage
  }

  return { page, visibleItems, setPage }
}
