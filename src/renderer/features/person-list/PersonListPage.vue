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
import type { PersonListItem } from "./schemas"
import { usePersonListStore } from "./store"

const store = usePersonListStore()
const auth = useAuthStore()
const router = useRouter()
const openingPersonId = ref<PersonId | null>(null)
const actionMessage = ref("")
const actionFailed = ref(false)
const canImport = computed(() => {
  const roles = auth.user?.roles ?? []
  return roles.includes("ADMIN") || roles.includes("ARCHIVE_EDITOR")
})

onMounted(() => store.load(store.page))

function updatedAtLabel(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

async function openArchive(person: PersonListItem): Promise<void> {
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
</script>

<template>
  <section class="page-stack person-list-page">
    <header class="page-header">
      <div>
        <span class="section-kicker">在册总目</span>
        <h1>人员档案</h1>
        <p>查看当前有效档案，可按姓名、人员编号或单位部门快速定位。</p>
      </div>
      <div class="header-stamp">在册<br />档案</div>
    </header>

    <div class="archive-list-ledger">
      <div class="ledger-count">
        <span>活动档案</span>
        <strong>{{ store.total }}</strong>
        <small>份在册记录</small>
      </div>
      <form class="person-filter-form" @submit.prevent="store.load(0)">
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
          <el-button :disabled="!store.hasFilters || store.loading" @click="store.reset">
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
    <div v-else-if="store.results.length" class="paper-card person-list-card">
      <div class="table-heading">
        <div>
          <strong>{{ store.hasFilters ? '筛选结果' : '在册档案目录' }}</strong>
          <span>共 {{ store.total }} 份当前有效档案</span>
        </div>
        <BatchExportControl />
      </div>
      <el-table v-loading="store.loading" :data="store.results" stripe @selection-change="store.select">
        <el-table-column type="selection" width="52" align="center" />
        <el-table-column label="人员编号" min-width="125">
          <template #default="scope">{{ scope.row.employeeNo || '—' }}</template>
        </el-table-column>
        <el-table-column label="姓名" min-width="115">
          <template #default="scope"><strong class="person-name">{{ scope.row.name || '未填写姓名' }}</strong></template>
        </el-table-column>
        <el-table-column label="单位 / 部门" min-width="230">
          <template #default="scope">
            {{ scope.row.organization || '—' }}
            <small v-if="scope.row.department" class="relationship">{{ scope.row.department }}</small>
          </template>
        </el-table-column>
        <el-table-column prop="position" label="职务" min-width="130">
          <template #default="scope">{{ scope.row.position || '—' }}</template>
        </el-table-column>
        <el-table-column prop="titleOrSkill" label="职称 / 技能" min-width="140">
          <template #default="scope">{{ scope.row.titleOrSkill || '—' }}</template>
        </el-table-column>
        <el-table-column label="更新日期" width="155">
          <template #default="scope">{{ updatedAtLabel(scope.row.updatedAt) }}</template>
        </el-table-column>
        <el-table-column label="档案操作" width="170" fixed="right">
          <template #default="scope">
            <el-button
              type="primary"
              link
              @click="router.push({ name: 'person-detail', params: { personId: scope.row.id } })"
            >
              查看
            </el-button>
            <el-button
              type="primary"
              link
              :icon="Download"
              :loading="openingPersonId === scope.row.id"
              @click="openArchive(scope.row)"
            >
              导出
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <FixedListPagination
        :page="store.page"
        :total="store.total"
        @change="store.load"
      />
    </div>
    <div v-else-if="store.message" class="empty-sheet person-list-empty">
      <span>档案目录暂时无法加载</span>
      <p>请检查服务连接后重试。</p>
      <el-button type="primary" @click="store.load(store.page)">重新加载</el-button>
    </div>
    <div v-else-if="store.loaded && !store.loading" class="empty-sheet person-list-empty">
      <span>{{ store.hasFilters ? '没有符合条件的档案' : '还没有人员档案' }}</span>
      <p>{{ store.hasFilters ? '可调整筛选条件后再次查找。' : '导入标准工作簿后，档案会显示在这里。' }}</p>
      <el-button v-if="store.hasFilters" @click="store.reset">清除筛选条件</el-button>
      <el-button v-else-if="canImport" type="primary" @click="router.push({ name: 'import' })">
        前往批量导入
      </el-button>
    </div>
  </section>
</template>
