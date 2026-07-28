<!-- B 人员检阅桌：左侧卷宗索引、中间完整纸页、右侧章节目录。 -->
<script setup lang="ts">
import { Download } from "@element-plus/icons-vue"
import { computed, onMounted, ref } from "vue"
import { useRouter } from "vue-router"
import ArchiveDossierContent from "@/features/archive-view/ArchiveDossierContent.vue"
import { downloadAndOpenArchive } from "@/features/archive-view/open-archive"
import { useArchiveDossier } from "@/features/archive-view/use-archive-dossier"
import { useAuthStore } from "@/features/auth/store"
import { errorMessage } from "@/shared/api/error"
import type { PersonId } from "@/shared/api/schemas"
import DossierOutline from "@/shared/components/DossierOutline.vue"
import BatchExportControl from "./BatchExportControl.vue"
import PersonDeleteAction from "./PersonDeleteAction.vue"
import PersonRecordIndex from "./PersonRecordIndex.vue"
import type { PersonListItem } from "./schemas"
import { usePersonListStore } from "./store"

const DOSSIER_SECTIONS = [
  { id: "identity", label: "基本情况与任职", code: "01" },
  { id: "education", label: "学历与教育", code: "02" },
  { id: "career", label: "经历与奖惩", code: "03" },
  { id: "family", label: "家庭成员与申报", code: "04" },
] as const

type PersonFilters = {
  readonly name: string
  readonly employeeNo: string
  readonly department: string
}

const store = usePersonListStore()
const auth = useAuthStore()
const router = useRouter()
const dossier = useArchiveDossier()
const readerState = dossier.state
const openingPersonId = ref<PersonId | null>(null)
const actionMessage = ref("")
const actionFailed = ref(false)
const activePersonId = computed(() =>
  "personId" in readerState.value ? readerState.value.personId : null,
)
const canImport = computed(() => {
  const roles = auth.user?.roles ?? []
  return roles.includes("ADMIN") || roles.includes("ARCHIVE_EDITOR")
})

onMounted(() => loadPage(store.page))

async function openArchive(person: Pick<PersonListItem, "id" | "name">): Promise<void> {
  openingPersonId.value = person.id
  actionMessage.value = ""
  try {
    actionMessage.value = await downloadAndOpenArchive(person.id, person.name)
    actionFailed.value = false
  } catch (error) {
    if (!(error instanceof Error)) throw error
    actionMessage.value = errorMessage(error)
    actionFailed.value = true
  } finally {
    openingPersonId.value = null
  }
}

async function loadPage(page: number): Promise<void> {
  dossier.clear()
  await store.load(page)
}

async function applyFilters(filters: PersonFilters): Promise<void> {
  store.name = filters.name
  store.employeeNo = filters.employeeNo
  store.department = filters.department
  await loadPage(0)
}

async function resetFilters(): Promise<void> {
  dossier.clear()
  await store.reset()
}

function viewDetail(personId: PersonId): void {
  router.push({ name: "person-detail", params: { personId } })
}

async function refreshAfterDeletion(wasDeleted: boolean): Promise<void> {
  const targetPage = store.results.length === 1 && store.page > 0 ? store.page - 1 : store.page
  actionMessage.value = wasDeleted ? "档案已删除" : "档案已被其他操作删除，列表已刷新"
  actionFailed.value = !wasDeleted
  await loadPage(targetPage)
}
</script>

<template>
  <section class="page-stack person-list-page">
    <header class="page-header person-page-header">
      <div>
        <p class="page-eyebrow">PERSONNEL DOSSIERS / 人员目录</p>
        <h1>人员档案检阅</h1>
        <p class="page-summary">从在册索引显式打开当前有效卷宗；批量勾选不会读取档案详情。</p>
      </div>
      <BatchExportControl />
    </header>

    <el-alert
      v-if="store.message"
      class="list-alert"
      :title="store.message"
      type="error"
      :closable="false"
      show-icon
    />
    <el-alert
      v-if="actionMessage"
      class="list-alert"
      :title="actionMessage"
      :type="actionFailed ? 'error' : 'success'"
      show-icon
      @close="actionMessage = ''"
    />
    <el-alert
      v-if="store.batchMessage"
      class="list-alert"
      :title="store.batchMessage"
      :type="store.batchFailed ? 'error' : 'success'"
      show-icon
      @close="store.batchMessage = ''"
    />

    <div class="person-reading-layout">
      <PersonRecordIndex
        class="person-record-index"
        :rows="store.results"
        :active-person-id="activePersonId"
        :selected-person-ids="store.selectedPersonIds"
        :total="store.total"
        :page="store.page"
        :loading="store.loading"
        :name="store.name"
        :employee-no="store.employeeNo"
        :department="store.department"
        @activate="dossier.select"
        @toggle-selection="store.toggleSelected"
        @apply-filters="applyFilters"
        @reset-filters="resetFilters"
        @change-page="loadPage"
      />

      <section class="person-dossier-stage" aria-live="polite">
        <div
          v-if="store.loading && store.results.length === 0"
          class="dossier-selection-empty dossier-directory-loading"
        >
          <el-skeleton :rows="12" animated />
        </div>
        <div v-else-if="store.message && store.results.length === 0" class="dossier-selection-empty">
          <strong>档案目录暂时无法加载</strong>
          <p>请检查人员档案数据服务连接后重试。</p>
          <el-button type="primary" @click="loadPage(store.page)">重新加载</el-button>
        </div>
        <div
          v-else-if="store.loaded && store.results.length === 0"
          class="dossier-selection-empty"
        >
          <strong>当前页没有档案</strong>
          <p>{{ store.hasFilters ? '可调整左侧筛选条件后再次查找。' : '导入标准工作簿后，档案会显示在这里。' }}</p>
          <el-button v-if="store.hasFilters" @click="resetFilters">清除筛选条件</el-button>
          <el-button v-else-if="canImport" type="primary" @click="router.push({ name: 'import' })">
            前往批量导入
          </el-button>
        </div>
        <div v-else-if="readerState.kind === 'idle'" class="dossier-selection-empty">
          <span>ACTIVE READING DESK</span>
          <strong>请选择卷宗</strong>
          <p>从左侧在册卷宗中选择一人，完整档案将在这里打开。</p>
        </div>
        <ArchiveDossierContent
          v-else-if="readerState.kind === 'ready'"
          class="dossier-reading-sheet"
          :person="readerState.person"
          :photo="readerState.photo"
          :sensitive-values="dossier.sensitiveValues"
          :sensitive-loading="dossier.sensitiveLoading.value"
          :sensitive-error="dossier.sensitiveError.value"
          @retry-photo="dossier.retryPhoto"
          @toggle-sensitive="dossier.toggleSensitive"
        >
          <template #actions>
            <el-button @click="viewDetail(readerState.personId)">独立查看</el-button>
            <el-button
              type="primary"
              :icon="Download"
              :loading="openingPersonId === readerState.personId"
              @click="openArchive(readerState.person)"
            >
              打开 Excel
            </el-button>
            <PersonDeleteAction
              v-if="canImport"
              :person-id="readerState.personId"
              :person-name="readerState.person.name"
              @deleted="refreshAfterDeletion(true)"
              @missing="refreshAfterDeletion(false)"
            />
          </template>
        </ArchiveDossierContent>
        <div
          v-else-if="readerState.kind === 'loading'"
          class="dossier-reading-sheet dossier-loading"
        >
          <el-skeleton :rows="12" animated />
        </div>
        <el-result
          v-else
          class="dossier-reading-sheet"
          icon="error"
          title="卷宗读取失败"
          :sub-title="readerState.message"
        >
          <template #extra>
            <el-button
              type="primary"
              data-test="retry-active-dossier"
              @click="dossier.select(readerState.personId)"
            >
              重新读取
            </el-button>
          </template>
        </el-result>
      </section>

      <DossierOutline title="卷宗目录" :sections="DOSSIER_SECTIONS" />
    </div>
  </section>
</template>
