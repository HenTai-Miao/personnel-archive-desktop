<!-- B 批量导入页：依次完成文件接收、当前批次处理与永久历史回查。 -->
<script setup lang="ts">
import { ElMessageBox } from "element-plus"
import { computed, ref } from "vue"
import FixedListPagination from "@/shared/components/FixedListPagination.vue"
import { useLocalListPagination } from "@/shared/components/list-pagination"
import type { WorkbookSource } from "./archive-policy"
import ImportHistoryPanel from "./ImportHistoryPanel.vue"
import type { ImportRow, LocalFileState } from "./queue-model"
import type { ImportDecision } from "./schemas"
import { importBatchSummary, importStatusMeta } from "./status-presentation"
import { useImportStore } from "./store"

const store = useImportStore()
const queuedPagination = useLocalListPagination(computed(() => store.queuedWorkbooks))
const resultPagination = useLocalListPagination(computed(() => store.items))
const dialogVisible = ref(false)
const activeItem = ref<ImportRow | null>(null)
const decision = ref<ImportDecision>("SKIP")

const completedCount = computed(
  () => store.items.filter((item) => item.status !== "PENDING_DECISION").length,
)
const historyRefreshKey = computed(() =>
  store.items.map((item) => `${item.itemId}:${item.status}`).join("|"),
)
const currentBatchSummary = computed(() =>
  importBatchSummary(store.items.map((item) => item.status)),
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
  <section class="page-stack import-page">
    <header class="page-header">
      <div>
        <p class="page-eyebrow">WORKBOOK INTAKE / 工作簿接收</p>
        <h1>批量导入</h1>
        <p class="page-summary">统一处理手动文件与自动扫描队列，并逐份确认重复档案。</p>
      </div>
    </header>

    <div class="import-workflow-stack">
      <section class="import-picker-sheet">
        <header class="import-picker-heading">
          <div>
            <span>INTAKE QUEUE</span>
            <h2>选择文件</h2>
            <small>仅支持 .xlsx；每批最多 100 份，单份不超过 12 MiB。</small>
          </div>
          <div class="picker-actions">
            <el-button :disabled="store.loading || store.scanning" @click="store.chooseFiles">
              选择文件
            </el-button>
            <el-button
              type="primary"
              :loading="store.loading"
              :disabled="store.scanning || store.queuedWorkbooks.length === 0"
              @click="store.precheck"
            >
              上传并检查
            </el-button>
          </div>
        </header>
        <div v-if="store.queuedWorkbooks.length" class="import-queued-section">
          <div class="import-queued-caption">
            <strong>待处理文件</strong>
            <span>{{ store.queuedWorkbooks.length }} 份</span>
          </div>
          <div class="queue-records">
            <div
              v-for="queued in queuedPagination.visibleItems.value"
              :key="queued.id"
              class="queued-file-chip"
            >
              <el-tag :type="queued.source.kind === 'AUTO' ? 'warning' : 'info'" effect="plain">
                {{ sourceLabel(queued.source) }}
              </el-tag>
              <span :title="queued.file.name">{{ queued.file.name }}</span>
            </div>
          </div>
          <FixedListPagination
            :page="queuedPagination.page.value"
            :total="store.queuedWorkbooks.length"
            @change="queuedPagination.setPage"
          />
        </div>
      </section>

      <el-alert
        v-if="store.scanMessage"
        class="import-alert"
        :title="store.scanMessage"
        :type="store.scanState === 'READY' ? 'info' : 'warning'"
        :closable="false"
        show-icon
      />
      <el-alert
        v-if="store.message"
        class="import-alert"
        :title="store.message"
        :type="store.items.some((item) => item.status === 'FAILED') ? 'warning' : 'info'"
        :closable="false"
        show-icon
      />

      <section id="import-current" class="import-current-sheet">
        <header class="import-section-heading">
          <div>
            <span>CURRENT BATCH</span>
            <h2>当前批次</h2>
            <small>{{ completedCount }} / {{ store.items.length }} 已处理</small>
          </div>
          <el-tag v-if="store.items.length" :type="currentBatchSummary.type">
            {{ currentBatchSummary.kind === 'PENDING' ? `${store.pendingCount} 项待确认` : currentBatchSummary.label }}
          </el-tag>
        </header>
        <el-table v-if="store.items.length" :data="resultPagination.visibleItems.value" stripe>
          <el-table-column
            prop="fileName"
            label="工作簿"
            min-width="240"
            show-overflow-tooltip
          />
          <el-table-column label="来源" width="105">
            <template #default="scope">
              <el-tag effect="plain" :type="scope.row.source.kind === 'AUTO' ? 'warning' : 'info'">
                {{ sourceLabel(scope.row.source) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="110">
            <template #default="scope">
              <el-tag :type="importStatusMeta(scope.row.status).type">
                {{ importStatusMeta(scope.row.status).label }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="message" label="处理说明" min-width="220" />
          <el-table-column label="本地文件" min-width="210">
            <template #default="scope">
              <span :class="{ 'archive-error': scope.row.localState.kind === 'AUTO_MOVE_FAILED' }">
                {{ localStateText(scope.row.localState) }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="scope">
              <el-button
                v-if="scope.row.status === 'PENDING_DECISION'"
                type="primary"
                link
                @click="openDecision(scope.row)"
              >
                确认处理
              </el-button>
              <el-button
                v-else-if="scope.row.localState.kind === 'AUTO_MOVE_FAILED'"
                type="danger"
                link
                :loading="store.loading"
                @click="store.retryArchive(scope.row.itemId)"
              >
                重试归档
              </el-button>
              <span v-else>—</span>
            </template>
          </el-table-column>
        </el-table>
        <div v-else class="workflow-empty">
          <strong>当前没有处理中的批次</strong>
          <span>选择文件并上传检查后，逐份结果会显示在这里。</span>
        </div>
        <FixedListPagination
          :page="resultPagination.page.value"
          :total="store.items.length"
          @change="resultPagination.setPage"
        />
      </section>

      <ImportHistoryPanel id="import-history" :refresh-key="historyRefreshKey" />
    </div>

    <el-dialog
      v-model="dialogVisible"
      class="duplicate-decision-dialog"
      title="发现重复档案"
      width="560px"
      :close-on-click-modal="false"
    >
      <div v-if="activeItem?.duplicate" class="duplicate-sheet">
        <dl>
          <div><dt>姓名</dt><dd>{{ activeItem.duplicate.personName }}</dd></div>
          <div><dt>证件尾号</dt><dd>**** {{ activeItem.duplicate.identityCardLastFour }}</dd></div>
          <div><dt>原人员编号</dt><dd>{{ activeItem.duplicate.existingEmployeeNo || '未填写' }}</dd></div>
          <div><dt>新人员编号</dt><dd>{{ activeItem.duplicate.incomingEmployeeNo || '未填写' }}</dd></div>
          <div><dt>原档案更新时间</dt><dd>{{ formatTimestamp(activeItem.duplicate.existingUpdatedAt) }}</dd></div>
        </dl>
        <el-alert
          v-if="store.staleItemId === activeItem.itemId"
          title="档案状态已变化。本次决定未生效，请关闭窗口后重新上传预检。"
          type="warning"
          :closable="false"
        />
        <el-radio-group v-model="decision" class="decision-options">
          <el-radio value="SKIP" border>跳过，不变更现有档案（默认）</el-radio>
          <el-radio value="OVERWRITE" border>覆盖，设为新的有效档案</el-radio>
        </el-radio-group>
      </div>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button
          :type="decision === 'OVERWRITE' ? 'danger' : 'primary'"
          :loading="store.loading"
          @click="submit"
        >
          {{ decision === 'SKIP' ? '确认跳过' : '继续覆盖' }}
        </el-button>
      </template>
    </el-dialog>
  </section>
</template>
