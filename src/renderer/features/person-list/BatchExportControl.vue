<!-- 批量导出控制条：把当前选择数量和生成档案包动作保持在同一视觉单元。 -->
<script setup lang="ts">
import { Download } from "@element-plus/icons-vue"
import { usePersonListStore } from "./store"

const store = usePersonListStore()
</script>

<template>
  <div class="batch-export-strip" :class="{ active: store.selectedPersonIds.length > 0 }">
    <div class="batch-export-copy">
      <span class="batch-export-kicker">BATCH EXPORT</span>
      <strong class="batch-export-title">
        {{ store.selectedPersonIds.length ? `已选 ${store.selectedPersonIds.length} 份卷宗` : '批量档案包' }}
      </strong>
    </div>
    <el-button
      data-test="batch-export"
      type="primary"
      :icon="Download"
      :disabled="store.selectedPersonIds.length === 0"
      :loading="store.batchExporting"
      @click="store.exportSelected"
    >
      {{ store.selectedPersonIds.length ? '导出档案包' : '请先勾选' }}
    </el-button>
  </div>
</template>
