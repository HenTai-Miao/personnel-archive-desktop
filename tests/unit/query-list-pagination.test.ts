/** 查询列表分页测试：人员与家庭成员查询始终向服务端请求每页 20 条。 */
import { createPinia, setActivePinia } from "pinia"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { searchFamilyMembers } from "@/features/family-search/api"
import { useFamilySearchStore } from "@/features/family-search/store"
import { fetchPersons } from "@/features/person-list/api"
import { usePersonListStore } from "@/features/person-list/store"

vi.mock("@/features/person-list/api", () => ({
  fetchPersons: vi.fn(),
  downloadPersonArchives: vi.fn(),
}))

vi.mock("@/features/family-search/api", () => ({
  searchFamilyMembers: vi.fn(),
}))

describe("query list pagination", () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.mocked(fetchPersons).mockReset()
    vi.mocked(searchFamilyMembers).mockReset()
  })

  it("requests the selected personnel page with 20 rows", async () => {
    // Given
    vi.mocked(fetchPersons).mockResolvedValue({
      content: [],
      page: 2,
      size: 20,
      totalElements: 0,
      totalPages: 0,
    })
    const store = usePersonListStore()

    // When
    await store.load(2)

    // Then
    expect(fetchPersons).toHaveBeenCalledWith({
      name: "",
      employeeNo: "",
      department: "",
      page: 2,
      size: 20,
    })
  })

  it("requests the selected family-search page with 20 rows", async () => {
    // Given
    vi.mocked(searchFamilyMembers).mockResolvedValue({
      content: [],
      page: 3,
      size: 20,
      totalElements: 0,
      totalPages: 0,
    })
    const store = useFamilySearchStore()
    store.query = "示例成员"

    // When
    await store.search(3)

    // Then
    expect(searchFamilyMembers).toHaveBeenCalledWith({ name: "示例成员", page: 3, size: 20 })
  })
})
