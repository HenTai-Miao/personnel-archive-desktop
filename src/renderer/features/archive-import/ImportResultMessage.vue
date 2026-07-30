<!-- 导入结果说明：字段级失败展示首项摘要，并通知所属面板打开共享问题弹窗。 -->
<script setup lang="ts">
import { computed } from "vue"

const props = defineProps<{
  readonly code: string
  readonly message: string
}>()

const emit = defineEmits<{
  "show-issues": []
}>()

const isFieldFailure = computed(() => props.code === "IMPORT_FIELD_VALIDATION_FAILED")
const firstLine = computed(() => props.message.split("\n", 1)[0] ?? props.message)
</script>

<template>
  <div class="import-result-message">
    <span
      class="import-result-message__summary"
      data-test="import-result-message-summary"
      :title="isFieldFailure ? firstLine : props.message"
    >
      {{ isFieldFailure ? firstLine : props.message }}
    </span>
    <el-button
      v-if="isFieldFailure"
      data-test="show-import-field-issues"
      type="primary"
      link
      @click="emit('show-issues')"
    >
      查看全部问题
    </el-button>
  </div>
</template>
