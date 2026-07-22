<!-- 导入记录面板：从服务端分页读取永久保存的逐文件处理结果。 -->
<script setup lang="ts">
import { ref, watch } from "vue"
import { errorMessage } from "@/shared/api/error"
import FixedListPagination from "@/shared/components/FixedListPagination.vue"
import { LIST_PAGE_SIZE } from "@/shared/components/list-pagination"
import { fetchImportHistory } from "./api"
import type { ImportHistoryItem } from "./schemas"
import { importStatusMeta } from "./status-presentation"

const props = defineProps<{ readonly refreshKey: string }>()
const items = ref<readonly ImportHistoryItem[]>([])
const page = ref(0)
const total = ref(0)
const loading = ref(false)
const loaded = ref(false)
const message = ref("")
let latestRequestId = 0

const timestampFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
})

watch(
  () => props.refreshKey,
  () => void load(0),
  { immediate: true },
)

async function load(targetPage: number): Promise<void> {
  const requestId = ++latestRequestId
  loading.value = true
  message.value = ""
  try {
    const response = await fetchImportHistory({ page: targetPage, size: LIST_PAGE_SIZE })
    if (requestId !== latestRequestId) return
    items.value = response.content
    page.value = response.page
    total.value = response.totalElements
    loaded.value = true
  } catch (error) {
    if (requestId !== latestRequestId) return
    if (!(error instanceof Error)) throw error
    message.value = errorMessage(error)
    loaded.value = true
  } finally {
    if (requestId === latestRequestId) loading.value = false
  }
}

function formatTimestamp(value: string): string {
  return timestampFormatter.format(new Date(value)).replaceAll("/", "-")
}
</script>

<template>
  <section class="paper-card result-card import-history-card" data-test="import-history">
    <div class="table-heading">
      <div><strong>导入记录</strong><span>记录保存在数据服务中，刷新或重新打开软件仍可查询</span></div>
      <el-button :loading="loading" @click="load(page)">刷新记录</el-button>
    </div>

    <div v-if="loading" class="list-loading" role="status">
      <span>正在加载导入记录…</span>
      <el-skeleton :rows="3" animated />
    </div>
    <el-alert v-else-if="message" :title="message" type="warning" :closable="false" show-icon />
    <el-table v-else-if="items.length" :data="items" stripe>
      <el-table-column label="处理时间" width="170">
        <template #default="scope">{{ formatTimestamp(scope.row.processedAt) }}</template>
      </el-table-column>
      <el-table-column label="批次" width="110">
        <template #default="scope">#{{ scope.row.batchId }}</template>
      </el-table-column>
      <el-table-column prop="fileName" label="工作簿" min-width="230" show-overflow-tooltip />
      <el-table-column prop="operatorName" label="操作人" width="130" />
      <el-table-column label="状态" width="105">
        <template #default="scope">
          <el-tag :type="importStatusMeta(scope.row.status).type">
            {{ importStatusMeta(scope.row.status).label }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="message" label="处理说明" min-width="240" show-overflow-tooltip />
    </el-table>
    <div v-else-if="loaded" class="empty-sheet">
      <span>暂无导入记录</span><p>完成一次批量导入后，逐文件处理结果会保存在这里。</p>
    </div>

    <FixedListPagination v-if="!loading && !message" :page="page" :total="total" @change="load" />
  </section>
</template>
