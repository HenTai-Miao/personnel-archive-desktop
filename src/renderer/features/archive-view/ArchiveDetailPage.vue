<!-- 完整档案查看页：读取全部入库字段与照片，并按原工作簿分区呈现。 -->
<script setup lang="ts">
import { ArrowLeft, Download } from "@element-plus/icons-vue"
import { computed, onBeforeUnmount, onMounted, ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import { errorMessage } from "@/shared/api/error"
import { personIdSchema } from "@/shared/api/schemas"
import ArchiveCareerSheet from "./ArchiveCareerSheet.vue"
import ArchiveEducationSheet from "./ArchiveEducationSheet.vue"
import ArchiveFamilySheet from "./ArchiveFamilySheet.vue"
import ArchiveIdentitySheet from "./ArchiveIdentitySheet.vue"
import { downloadPersonPhoto, getPerson } from "./api"
import { downloadAndOpenArchive } from "./open-archive"
import type { PersonDetail } from "./schemas"

const route = useRoute()
const router = useRouter()
const person = ref<PersonDetail | null>(null)
const loading = ref(true)
const opening = ref(false)
const message = ref("")
const messageFailed = ref(false)
const photoUrl = ref("")
const photoLoading = ref(false)
const photoError = ref("")

const employmentSummary = computed(() => {
  const current = person.value
  if (current === null) return ""
  return [
    current.employment.organization,
    current.employment.department,
    current.employment.position,
  ]
    .filter((value) => value.length > 0)
    .join(" · ")
})

const updatedAtLabel = computed(() => {
  const current = person.value
  if (current === null) return ""
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(current.archive.updatedAt))
})

onMounted(loadDetail)
onBeforeUnmount(revokePhotoUrl)

async function loadDetail(): Promise<void> {
  const parsed = personIdSchema.safeParse(route.params["personId"])
  if (!parsed.success) {
    message.value = "档案编号无效"
    loading.value = false
    return
  }
  try {
    const detail = await getPerson(parsed.data)
    person.value = detail
    // 详情先落屏，照片走独立加载状态，慢图片不能阻塞其余已入库字段。
    loading.value = false
    if (detail.photo !== null) await loadPhoto()
  } catch (error) {
    if (!(error instanceof Error)) throw error
    message.value = errorMessage(error)
    messageFailed.value = true
  } finally {
    loading.value = false
  }
}

async function loadPhoto(): Promise<void> {
  const current = person.value
  if (current === null || current.photo === null) return
  photoLoading.value = true
  photoError.value = ""
  try {
    const blob = await downloadPersonPhoto(current.id)
    revokePhotoUrl()
    photoUrl.value = URL.createObjectURL(blob)
  } catch (error) {
    if (!(error instanceof Error)) throw error
    photoError.value = errorMessage(error)
  } finally {
    photoLoading.value = false
  }
}

async function openArchive(): Promise<void> {
  const current = person.value
  if (current === null) return
  opening.value = true
  try {
    message.value = await downloadAndOpenArchive(current.id, current.name)
    messageFailed.value = false
  } catch (error) {
    if (!(error instanceof Error)) throw error
    message.value = errorMessage(error)
    messageFailed.value = true
  } finally {
    opening.value = false
  }
}

function revokePhotoUrl(): void {
  if (photoUrl.value.length === 0) return
  URL.revokeObjectURL(photoUrl.value)
  photoUrl.value = ""
}

function scrollToSection(sectionId: "identity" | "education" | "career" | "family"): void {
  document.getElementById(sectionId)?.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    block: "start",
  })
}
</script>

<template>
  <section class="page-stack archive-detail-page">
    <button class="back-link" type="button" @click="router.back">
      <el-icon><ArrowLeft /></el-icon> 返回档案列表
    </button>
    <div v-if="loading" class="paper-card detail-loading"><el-skeleton :rows="12" animated /></div>
    <el-result v-else-if="person === null" icon="error" title="无法打开档案" :sub-title="message">
      <template #extra><el-button @click="router.push('/persons')">返回档案列表</el-button></template>
    </el-result>
    <template v-else>
      <header class="person-dossier-header">
        <div class="dossier-heading-copy">
          <span class="dossier-eyebrow">CURRENT PERSONNEL RECORD</span>
          <p class="record-number">档案号 · {{ person.employeeNo || '未填写' }}</p>
          <h1>{{ person.name || '未填写姓名' }}</h1>
          <p>{{ employmentSummary || '当前任职信息未填写' }}</p>
        </div>
        <div class="active-stamp">有效<br />档案</div>
        <el-button type="primary" size="large" :icon="Download" :loading="opening" @click="openArchive">
          下载并打开 Excel
        </el-button>
      </header>

      <nav class="dossier-index" aria-label="档案内容索引">
        <span>卷内目录</span>
        <button type="button" @click="scrollToSection('identity')">基本与任职</button>
        <button type="button" @click="scrollToSection('education')">学历教育</button>
        <button type="button" @click="scrollToSection('career')">经历奖惩</button>
        <button type="button" @click="scrollToSection('family')">家庭与申报</button>
      </nav>

      <el-alert
        v-if="message"
        class="detail-alert"
        :title="message"
        :type="messageFailed ? 'error' : 'success'"
        show-icon
        @close="message = ''"
      />

      <div class="dossier-sections">
        <ArchiveIdentitySheet
          :person="person"
          :photo-url="photoUrl"
          :photo-loading="photoLoading"
          :photo-error="photoError"
          @retry-photo="loadPhoto"
        />
        <ArchiveEducationSheet
          :full-time="person.education.fullTime"
          :in-service="person.education.inService"
          :main-education="person.mainEducation"
        />
        <ArchiveCareerSheet
          :work-experiences="person.workExperiences"
          :rewards-punishments="person.rewardsPunishments"
        />
        <ArchiveFamilySheet :person="person" :updated-at-label="updatedAtLabel" />
      </div>
    </template>
  </section>
</template>
