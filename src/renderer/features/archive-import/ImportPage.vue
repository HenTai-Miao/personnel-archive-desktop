<!-- 批量导入页面：呈现手动队列、逐文件结果及需要用户明确确认的重复档案决定。 -->
<script setup lang="ts">
import { ElMessageBox } from "element-plus"
import { computed, ref } from "vue"
import FixedListPagination from "@/shared/components/FixedListPagination.vue"
import { useLocalListPagination } from "@/shared/components/list-pagination"
import type { WorkbookSource } from "./archive-policy"
import type { ImportRow, LocalFileState } from "./queue-model"
import type { ImportDecision, ImportStatus } from "./schemas"
import { useImportStore } from "./store"

const store = useImportStore()
const queuedPagination = useLocalListPagination(computed(() => store.queuedWorkbooks))
const resultPagination = useLocalListPagination(computed(() => store.items))
const dialogVisible = ref(false)
const activeItem = ref<ImportRow | null>(null)
const decision = ref<ImportDecision>("SKIP")

const statusMap: Readonly<
  Record<ImportStatus, { label: string; type: "info" | "success" | "warning" | "danger" }>
> = {
  PENDING_DECISION: { label: "待确认", type: "warning" },
  IMPORTED: { label: "已导入", type: "success" },
  OVERWRITTEN: { label: "已覆盖", type: "success" },
  SKIPPED: { label: "已跳过", type: "info" },
  FAILED: { label: "失败", type: "danger" },
}

const completedCount = computed(
  () => store.items.filter((item) => item.status !== "PENDING_DECISION").length,
)

const timestampFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
})

function formatTimestamp(value: string): string {
  return timestampFormatter.format(new Date(value)).replaceAll("/", "-")
}

function openDecision(item: ImportRow): void {
  activeItem.value = item
  decision.value = "SKIP"
  dialogVisible.value = true
}

function statusMeta(item: ImportRow) {
  return statusMap[item.status]
}

function sourceLabel(source: WorkbookSource): string {
  switch (source.kind) {
    case "MANUAL":
      return "手动选择"
    case "AUTO":
      return "自动扫描"
    default:
      return assertNever(source)
  }
}

function localStateText(state: LocalFileState): string {
  switch (state.kind) {
    case "MANUAL_RETAINED":
      return "保留原路径"
    case "AUTO_WAITING":
      return "等待成功后归档"
    case "AUTO_RETAINED":
      return "未移动，源文件保留"
    case "AUTO_MOVED":
      return `已归档为 ${state.archivedName}`
    case "AUTO_MOVE_FAILED":
      return state.message
    default:
      return assertNever(state)
  }
}

function assertNever(value: never): never {
  throw new TypeError(`未知页面状态：${String(value)}`)
}

async function submit(): Promise<void> {
  const item = activeItem.value
  if (item === null) return
  if (decision.value === "OVERWRITE") {
    try {
      await ElMessageBox.confirm(
        "原有效档案将转为历史快照，本工作簿将成为新的有效档案。此操作不会删除历史记录。",
        "确认覆盖档案",
        { type: "warning", confirmButtonText: "确认覆盖", cancelButtonText: "返回检查" },
      )
    } catch (error) {
      if (error === "cancel" || error === "close") return
      throw error
    }
  }
  await store.decide(item.itemId, decision.value)
  if (store.staleItemId === null) dialogVisible.value = false
}
</script>

<template>
  <section class="page-stack">
    <header class="page-header">
      <div><span class="section-kicker">档案入柜</span><h1>批量导入人员档案</h1><p>档案字段可留空；姓名与身份证同时匹配时，由用户选择覆盖或跳过。</p></div>
      <div class="header-stamp">逐份<br />核验</div>
    </header>

    <div class="paper-card import-picker">
      <div>
        <strong>01 · 上传队列</strong>
        <p>不设必填字段；仅支持 .xlsx，每批最多 100 份，单份不超过 12 MiB。</p>
      </div>
      <div class="picker-actions">
        <el-button :disabled="store.loading || store.scanning" @click="store.chooseFiles">选择文件</el-button>
        <el-button type="primary" :loading="store.loading" :disabled="store.scanning || store.queuedWorkbooks.length === 0" @click="store.precheck">上传并检查重复档案</el-button>
      </div>
      <div v-if="store.queuedWorkbooks.length" class="file-chips">
        <div v-for="queued in queuedPagination.visibleItems.value" :key="queued.id" class="queued-file-chip">
          <el-tag :type="queued.source.kind === 'AUTO' ? 'warning' : 'info'" effect="plain">{{ sourceLabel(queued.source) }}</el-tag>
          <span>{{ queued.file.name }}</span>
        </div>
      </div>
      <FixedListPagination
        :page="queuedPagination.page.value"
        :total="store.queuedWorkbooks.length"
        @change="queuedPagination.setPage"
      />
    </div>

    <el-alert
      v-if="store.scanMessage"
      :title="store.scanMessage"
      :type="store.scanState === 'READY' ? 'info' : 'warning'"
      :closable="false"
      show-icon
    />
    <el-alert v-if="store.message" :title="store.message" :type="store.items.some((item) => item.status === 'FAILED') ? 'warning' : 'info'" :closable="false" show-icon />

    <div v-if="store.items.length" class="paper-card result-card">
      <div class="table-heading">
        <div><strong>02 · 逐项结果</strong><span>{{ completedCount }} / {{ store.items.length }} 已处理</span></div>
        <el-tag v-if="store.pendingCount" type="warning">{{ store.pendingCount }} 项待确认</el-tag>
      </div>
      <el-table :data="resultPagination.visibleItems.value" stripe>
        <el-table-column prop="fileName" label="工作簿" min-width="240" show-overflow-tooltip />
        <el-table-column label="来源" width="105">
          <template #default="scope"><el-tag effect="plain" :type="scope.row.source.kind === 'AUTO' ? 'warning' : 'info'">{{ sourceLabel(scope.row.source) }}</el-tag></template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="scope"><el-tag :type="statusMeta(scope.row).type">{{ statusMeta(scope.row).label }}</el-tag></template>
        </el-table-column>
        <el-table-column prop="message" label="处理说明" min-width="220" />
        <el-table-column label="本地文件" min-width="210">
          <template #default="scope">
            <span :class="{ 'archive-error': scope.row.localState.kind === 'AUTO_MOVE_FAILED' }">{{ localStateText(scope.row.localState) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="scope">
            <el-button v-if="scope.row.status === 'PENDING_DECISION'" type="primary" link @click="openDecision(scope.row)">确认处理</el-button>
            <el-button v-else-if="scope.row.localState.kind === 'AUTO_MOVE_FAILED'" type="danger" link :loading="store.loading" @click="store.retryArchive(scope.row.itemId)">重试归档</el-button>
            <span v-else>—</span>
          </template>
        </el-table-column>
      </el-table>
      <FixedListPagination
        :page="resultPagination.page.value"
        :total="store.items.length"
        @change="resultPagination.setPage"
      />
    </div>

    <div v-else-if="!store.loading" class="empty-sheet"><span>尚无导入批次</span><p>手动选择文件，或把工作簿放入待上传文件夹。</p></div>

    <el-dialog v-model="dialogVisible" title="发现重复档案" width="560px" :close-on-click-modal="false">
      <div v-if="activeItem?.duplicate" class="duplicate-sheet">
        <dl><div><dt>姓名</dt><dd>{{ activeItem.duplicate.personName }}</dd></div><div><dt>证件尾号</dt><dd>**** {{ activeItem.duplicate.identityCardLastFour }}</dd></div><div><dt>原人员编号</dt><dd>{{ activeItem.duplicate.existingEmployeeNo || '未填写' }}</dd></div><div><dt>新人员编号</dt><dd>{{ activeItem.duplicate.incomingEmployeeNo || '未填写' }}</dd></div><div><dt>原档案更新时间</dt><dd>{{ formatTimestamp(activeItem.duplicate.existingUpdatedAt) }}</dd></div></dl>
        <el-alert v-if="store.staleItemId === activeItem.itemId" title="档案状态已变化。本次决定未生效，请关闭窗口后重新上传预检。" type="warning" :closable="false" />
        <el-radio-group v-model="decision" class="decision-options">
          <el-radio value="SKIP" border>跳过，不变更现有档案（默认）</el-radio>
          <el-radio value="OVERWRITE" border>覆盖，设为新的有效档案</el-radio>
        </el-radio-group>
      </div>
      <template #footer><el-button @click="dialogVisible = false">取消</el-button><el-button :type="decision === 'OVERWRITE' ? 'danger' : 'primary'" :loading="store.loading" @click="submit">{{ decision === 'SKIP' ? '确认跳过' : '继续覆盖' }}</el-button></template>
    </el-dialog>
  </section>
</template>
