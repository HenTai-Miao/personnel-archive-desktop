<!-- 字段问题共享弹窗：脱离表格层叠上下文并原样展示服务端安全消息。 -->
<script setup lang="ts">
import { computed, ref, watch } from "vue"

const props = defineProps<{
  readonly modelValue: boolean
  readonly fileName: string
  readonly message: string
}>()

const emit = defineEmits<{
  "update:modelValue": [value: boolean]
}>()

const issueLines = computed(() => props.message.split("\n").filter((line) => line.length > 0))
const copyFeedback = ref("")

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) copyFeedback.value = ""
  },
)

async function copyIssueMessage(): Promise<void> {
  if (typeof navigator.clipboard?.writeText !== "function") {
    copyFeedback.value = "当前环境无法自动复制，请手动选择问题文字。"
    return
  }
  try {
    await navigator.clipboard.writeText(props.message)
    copyFeedback.value = "问题清单已复制"
  } catch (error) {
    if (!(error instanceof Error)) throw error
    copyFeedback.value = "复制失败，请手动选择问题文字。"
  }
}
</script>

<template>
  <el-dialog
    :model-value="props.modelValue"
    append-to-body
    class="import-field-issues-dialog"
    modal-class="import-field-issues-overlay"
    title="工作簿需要修正"
    width="min(680px, calc(100vw - 48px))"
    :close-on-click-modal="false"
    destroy-on-close
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="import-field-issues-content">
      <p class="import-field-issues-guidance">
        请按单元格位置修正后重新上传，原文件未被修改。
      </p>
      <div class="import-field-issues-file">
        <span>工作簿</span>
        <strong :title="props.fileName">{{ props.fileName }}</strong>
      </div>
      <ol class="import-field-issues-list">
        <li v-for="(issue, index) in issueLines" :key="`${index}:${issue}`">
          {{ issue }}
        </li>
      </ol>
    </div>
    <template #footer>
      <div class="import-field-issues-footer">
        <span class="import-field-issues-copy-feedback" role="status">{{ copyFeedback }}</span>
        <div class="import-field-issues-actions">
          <el-button data-test="copy-import-field-issues" @click="copyIssueMessage">
            复制全部问题
          </el-button>
          <el-button
            data-test="close-import-field-issues"
            type="primary"
            @click="emit('update:modelValue', false)"
          >
            关闭
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>
