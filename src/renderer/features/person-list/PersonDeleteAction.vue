<!-- 档案删除操作：独立承载必填原因、提交状态和并发删除分支。 -->
<script setup lang="ts">
import { computed, ref } from "vue"
import { ApiError, errorMessage } from "@/shared/api/error"
import type { PersonId } from "@/shared/api/schemas"
import { deletePerson } from "./api"

const MAX_REASON_LENGTH = 10_000
const DEFAULT_REASON = "误导入"

const props = defineProps<{
  readonly personId: PersonId
  readonly personName: string
}>()

const emit = defineEmits<{
  deleted: [personId: PersonId]
  missing: [personId: PersonId]
}>()

const visible = ref(false)
const reason = ref(DEFAULT_REASON)
const submitting = ref(false)
const failureMessage = ref("")
const normalizedReason = computed(() => reason.value.trim())
const canSubmit = computed(
  () =>
    !submitting.value &&
    normalizedReason.value.length > 0 &&
    normalizedReason.value.length <= MAX_REASON_LENGTH,
)

function openDialog(): void {
  reason.value = DEFAULT_REASON
  failureMessage.value = ""
  visible.value = true
}

function closeDialog(): void {
  if (!submitting.value) visible.value = false
}

async function confirmDeletion(): Promise<void> {
  if (!canSubmit.value) return
  submitting.value = true
  failureMessage.value = ""
  try {
    await deletePerson(props.personId, normalizedReason.value)
    visible.value = false
    emit("deleted", props.personId)
  } catch (error) {
    if (error instanceof ApiError && error.code === "NOT_FOUND") {
      visible.value = false
      emit("missing", props.personId)
      return
    }
    failureMessage.value = errorMessage(error)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <el-button
    type="danger"
    link
    data-test="person-delete-trigger"
    @click.stop="openDialog"
  >
    删除
  </el-button>
  <el-dialog
    v-model="visible"
    append-to-body
    width="520px"
    title="删除档案"
    data-test="person-delete-dialog"
    :close-on-click-modal="!submitting"
    :close-on-press-escape="!submitting"
    :show-close="!submitting"
  >
    <div class="delete-confirmation">
      <p>
        确认删除 <strong>{{ personName || '未填写姓名' }}</strong> 的当前档案？
      </p>
      <p class="delete-preservation-note">档案将从在册目录隐藏，历史数据、照片及导入记录仍会保留。</p>
      <label class="delete-reason-label" for="person-delete-reason">删除原因（必填）</label>
      <el-input
        id="person-delete-reason"
        v-model="reason"
        data-test="person-delete-reason"
        type="textarea"
        :rows="4"
        :maxlength="MAX_REASON_LENGTH"
        show-word-limit
        resize="vertical"
        placeholder="请输入删除原因"
      />
      <el-alert
        v-if="failureMessage"
        class="delete-error"
        data-test="person-delete-error"
        :title="failureMessage"
        type="error"
        :closable="false"
        show-icon
      />
    </div>
    <template #footer>
      <el-button :disabled="submitting" @click="closeDialog">取消</el-button>
      <el-button
        type="danger"
        data-test="person-delete-confirm"
        :disabled="!canSubmit"
        :loading="submitting"
        @click="confirmDeletion"
      >
        确认删除
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.delete-confirmation {
  color: var(--dossier-ink);
}

.delete-confirmation p {
  margin: 0;
}

.delete-confirmation .delete-preservation-note {
  margin-top: 8px;
  color: var(--dossier-subtle);
  line-height: 1.65;
}

.delete-reason-label {
  display: block;
  margin: 20px 0 8px;
  font-weight: 700;
}

.delete-error {
  margin-top: 14px;
}
</style>
