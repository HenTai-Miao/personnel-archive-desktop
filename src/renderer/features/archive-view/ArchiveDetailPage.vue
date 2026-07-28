<!-- B 卷宗详情页：统一读取完整快照，并以连续纸页和章节目录呈现。 -->
<script setup lang="ts">
import { ArrowLeft, Download } from "@element-plus/icons-vue"
import { nextTick, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { errorMessage } from "@/shared/api/error"
import { personIdSchema } from "@/shared/api/schemas"
import DossierOutline from "@/shared/components/DossierOutline.vue"
import ArchiveDossierContent from "./ArchiveDossierContent.vue"
import { downloadAndOpenArchive } from "./open-archive"
import type { PersonDetail } from "./schemas"
import { useArchiveDossier } from "./use-archive-dossier"

const SECTIONS = [
  { id: "identity", label: "基本情况与任职", code: "01" },
  { id: "education", label: "学历与教育", code: "02" },
  { id: "career", label: "经历与奖惩", code: "03" },
  { id: "family", label: "家庭成员与申报", code: "04" },
] as const

const route = useRoute()
const router = useRouter()
const dossier = useArchiveDossier()
const readerState = dossier.state
const opening = ref(false)
const message = ref("")
const messageFailed = ref(false)
const routeError = ref("")
const highlightedMemberName = ref("")
const highlightedRelationship = ref("")

watch(() => route.params["personId"], loadDetail, { immediate: true })

async function loadDetail(): Promise<void> {
  routeError.value = ""
  highlightedMemberName.value = ""
  highlightedRelationship.value = ""
  const parsed = personIdSchema.safeParse(route.params["personId"])
  if (!parsed.success) {
    dossier.clear()
    routeError.value = "档案编号无效"
    return
  }

  await dossier.select(parsed.data)
  const current = readerState.value
  if (current.kind === "ready" && current.personId === parsed.data) {
    await focusMatchedFamilyMember(current.person)
  }
}

async function openArchive(): Promise<void> {
  const current = readerState.value
  if (current.kind !== "ready") return
  opening.value = true
  try {
    message.value = await downloadAndOpenArchive(current.personId, current.person.name)
    messageFailed.value = false
  } catch (error) {
    if (!(error instanceof Error)) throw error
    message.value = errorMessage(error)
    messageFailed.value = true
  } finally {
    opening.value = false
  }
}

async function focusMatchedFamilyMember(detail: PersonDetail): Promise<void> {
  const member = typeof route.query["member"] === "string" ? route.query["member"].trim() : ""
  const relationship =
    typeof route.query["relationship"] === "string" ? route.query["relationship"].trim() : ""
  if (member.length === 0) return

  const exactMatch = detail.familyMembers.some(
    (candidate) => candidate.name === member && candidate.relationship === relationship,
  )
  const nameMatch = detail.familyMembers.some((candidate) => candidate.name === member)
  if (!exactMatch && !nameMatch) return

  highlightedMemberName.value = member
  highlightedRelationship.value = exactMatch ? relationship : ""
  await nextTick()
  const reducedMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  document.querySelector<HTMLElement>(".family-member-row.is-search-match")?.scrollIntoView({
    behavior: reducedMotion ? "auto" : "smooth",
    block: "center",
  })
}
</script>

<template>
  <section class="page-stack archive-detail-page">
    <button class="back-link" type="button" @click="router.back">
      <el-icon><ArrowLeft /></el-icon> 返回档案列表
    </button>

    <div v-if="readerState.kind === 'loading'" class="paper-card detail-loading">
      <el-skeleton :rows="12" animated />
    </div>
    <el-result
      v-else-if="readerState.kind !== 'ready'"
      icon="error"
      title="无法打开档案"
      :sub-title="readerState.kind === 'failed' ? readerState.message : routeError"
    >
      <template #extra><el-button @click="router.push('/persons')">返回档案列表</el-button></template>
    </el-result>
    <template v-else>
      <el-alert
        v-if="message"
        class="detail-alert"
        :title="message"
        :type="messageFailed ? 'error' : 'success'"
        show-icon
        @close="message = ''"
      />

      <div class="detail-reading-layout">
        <ArchiveDossierContent
          class="dossier-reading-sheet"
          :person="readerState.person"
          :photo="readerState.photo"
          :sensitive-values="dossier.sensitiveValues"
          :sensitive-loading="dossier.sensitiveLoading.value"
          :sensitive-error="dossier.sensitiveError.value"
          :highlighted-member-name="highlightedMemberName"
          :highlighted-relationship="highlightedRelationship"
          @retry-photo="dossier.retryPhoto"
          @toggle-sensitive="dossier.toggleSensitive"
        >
          <template #actions>
            <el-button type="primary" :icon="Download" :loading="opening" @click="openArchive">
              下载并打开 Excel
            </el-button>
          </template>
        </ArchiveDossierContent>
        <DossierOutline title="卷宗目录" :sections="SECTIONS" />
      </div>
    </template>
  </section>
</template>
