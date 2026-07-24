<!-- 档案列表页面：筛选和分页查看已导入的有效档案，并进入详情或导出。 -->
<script setup lang="ts">
import { Download, Search } from "@element-plus/icons-vue"
import { computed, onMounted, ref } from "vue"
import { useRouter } from "vue-router"
import { downloadAndOpenArchive } from "@/features/archive-view/open-archive"
import { useAuthStore } from "@/features/auth/store"
import { errorMessage } from "@/shared/api/error"
import type { PersonId } from "@/shared/api/schemas"
import FixedListPagination from "@/shared/components/FixedListPagination.vue"
import BatchExportControl from "./BatchExportControl.vue"
import PersonArchivePreview from "./PersonArchivePreview.vue"
import { PERSON_LIST_CRUD_OPTION } from "./person-list-crud"
import type { PersonListItem } from "./schemas"
import { usePersonListStore } from "./store"
import { usePersonPreview } from "./use-person-preview"

const store = usePersonListStore()
const auth = useAuthStore()
const router = useRouter()
const preview = usePersonPreview()
const openingPersonId = ref<PersonId | null>(null)
const actionMessage = ref("")
const actionFailed = ref(false)
const crudRows = computed(() => store.results.map((person) => ({ ...person })))
const canImport = computed(() => {
  const roles = auth.user?.roles ?? []
  return roles.includes("ADMIN") || roles.includes("ARCHIVE_EDITOR")
})

type PreviewRowClassContext = {
  readonly row: PersonListItem
}

onMounted(() => loadPage(store.page))

function updatedAtLabel(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

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
  preview.clear()
  await store.load(page)
}

async function applyFilters(): Promise<void> {
  await loadPage(0)
}

async function resetFilters(): Promise<void> {
  preview.clear()
  await store.reset()
}

function viewDetail(personId: PersonId): void {
  router.push({ name: "person-detail", params: { personId } })
}

function previewPerson(person: PersonListItem): void {
  preview.select(person.id)
}

function previewRowClassName({ row }: PreviewRowClassContext): string {
  const current = preview.state.value
  return "personId" in current && current.personId === row.id ? "is-preview-active" : ""
}
</script>

<template>
  <section class="page-stack person-list-page">
    <header class="page-header">
      <div>
        <p class="page-eyebrow">人员目录 / 卷宗联动</p>
        <h1>人员档案</h1>
        <p class="page-summary">筛选当前有效档案，并在工作台中联动核对卷宗摘要。</p>
      </div>
    </header>

    <div class="archive-list-ledger">
      <div class="ledger-count">
        <span>档案总数</span>
        <strong>{{ store.total }}</strong>
      </div>
      <form class="person-filter-form" @submit.prevent="applyFilters">
        <label>
          <span>姓名</span>
          <el-input v-model="store.name" clearable placeholder="输入姓名片段" />
        </label>
        <label>
          <span>人员编号</span>
          <el-input v-model="store.employeeNo" clearable placeholder="输入编号片段" />
        </label>
        <label>
          <span>单位 / 部门</span>
          <el-input v-model="store.department" clearable placeholder="输入单位或部门" />
        </label>
        <div class="filter-actions">
          <el-button type="primary" native-type="submit" :icon="Search" :loading="store.loading">
            筛选档案
          </el-button>
          <el-button :disabled="!store.hasFilters || store.loading" @click="resetFilters">
            重置
          </el-button>
        </div>
      </form>
    </div>

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

    <div v-if="store.loading && store.results.length === 0" class="paper-card list-loading">
      <el-skeleton :rows="7" animated />
    </div>
    <div v-else-if="store.results.length" class="person-workbench">
      <div class="paper-card person-list-card">
        <div class="table-heading">
          <div>
            <strong>{{ store.hasFilters ? '筛选结果' : '在册档案目录' }}</strong>
            <span>共 {{ store.total }} 份当前有效档案</span>
          </div>
          <BatchExportControl />
        </div>
        <avue-crud
          class="archive-crud"
          :data="crudRows"
          :option="PERSON_LIST_CRUD_OPTION"
          :row-class-name="previewRowClassName"
          :table-loading="store.loading"
          @row-click="previewPerson"
          @selection-change="store.select"
        >
          <template #employeeNo="{ row }">{{ row.employeeNo || '—' }}</template>
          <template #name="{ row }">
            <strong class="person-name">{{ row.name || '未填写姓名' }}</strong>
          </template>
          <template #organization="{ row }">
            {{ row.organization || '—' }}
            <small v-if="row.department" class="relationship">{{ row.department }}</small>
          </template>
          <template #position="{ row }">{{ row.position || '—' }}</template>
          <template #titleOrSkill="{ row }">{{ row.titleOrSkill || '—' }}</template>
          <template #updatedAt="{ row }">{{ updatedAtLabel(row.updatedAt) }}</template>
          <template #menu="{ row }">
            <el-button
              data-test="preview-person"
              type="primary"
              link
              @click.stop="preview.select(row.id)"
            >
              预览
            </el-button>
            <el-button
              type="primary"
              link
              @click.stop="viewDetail(row.id)"
            >
              查看
            </el-button>
            <el-button
              type="primary"
              link
              :icon="Download"
              :loading="openingPersonId === row.id"
              @click.stop="openArchive(row)"
            >
              导出
            </el-button>
          </template>
        </avue-crud>
        <FixedListPagination :page="store.page" :total="store.total" @change="loadPage" />
      </div>
      <PersonArchivePreview
        v-if="preview.state.value.kind !== 'idle'"
        :state="preview.state.value"
        :opening-person-id="openingPersonId"
        @close="preview.clear"
        @retry="preview.select"
        @retry-photo="preview.retryPhoto"
        @view="viewDetail"
        @export-person="openArchive"
      />
    </div>
    <div v-else-if="store.message" class="empty-sheet person-list-empty">
      <span>档案目录暂时无法加载</span>
      <p>请检查服务连接后重试。</p>
      <el-button type="primary" @click="loadPage(store.page)">重新加载</el-button>
    </div>
    <div v-else-if="store.loaded && !store.loading" class="empty-sheet person-list-empty">
      <span>{{ store.hasFilters ? '没有符合条件的档案' : '还没有人员档案' }}</span>
      <p>{{ store.hasFilters ? '可调整筛选条件后再次查找。' : '导入标准工作簿后，档案会显示在这里。' }}</p>
      <el-button v-if="store.hasFilters" @click="resetFilters">清除筛选条件</el-button>
      <el-button v-else-if="canImport" type="primary" @click="router.push({ name: 'import' })">
        前往批量导入
      </el-button>
    </div>
  </section>
</template>
