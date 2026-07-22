<!-- 批量导出控制条：把当前选择数量和生成档案包动作保持在同一视觉单元。 -->
<script setup lang="ts">
import { Download } from "@element-plus/icons-vue"
import { usePersonListStore } from "./store"

const store = usePersonListStore()
</script>

<template>
  <div class="batch-export-strip">
    <span>
      {{ store.selectedPersonIds.length ? `已选 ${store.selectedPersonIds.length} 份` : '勾选档案后可打包导出' }}
    </span>
    <el-button
      data-test="batch-export"
      type="primary"
      :icon="Download"
      :disabled="store.selectedPersonIds.length === 0"
      :loading="store.batchExporting"
      @click="store.exportSelected"
    >
      导出档案包
    </el-button>
  </div>
</template>
