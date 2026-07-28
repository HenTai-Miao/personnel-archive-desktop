<script setup lang="ts">
import { computed } from "vue"
import ArchiveCareerSheet from "./ArchiveCareerSheet.vue"
import ArchiveEducationSheet from "./ArchiveEducationSheet.vue"
import ArchiveFamilySheet from "./ArchiveFamilySheet.vue"
import ArchiveIdentitySheet from "./ArchiveIdentitySheet.vue"
import type { PersonDetail, SensitiveField } from "./schemas"
import type { DossierPhotoState } from "./use-archive-dossier"

const props = withDefaults(
  defineProps<{
    readonly person: PersonDetail
    readonly photo: DossierPhotoState
    readonly sensitiveValues: Readonly<Record<SensitiveField, string>>
    readonly sensitiveLoading: SensitiveField | null
    readonly sensitiveError: string
    readonly highlightedMemberName?: string
    readonly highlightedRelationship?: string
  }>(),
  { highlightedMemberName: "", highlightedRelationship: "" },
)

const emit = defineEmits<{
  retryPhoto: []
  toggleSensitive: [field: SensitiveField]
}>()

const employmentSummary = computed(() =>
  [
    props.person.employment.organization,
    props.person.employment.department,
    props.person.employment.position,
  ]
    .filter((value) => value.length > 0)
    .join(" · "),
)

const updatedAtLabel = computed(() =>
  new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(props.person.archive.updatedAt)),
)
</script>

<template>
  <article class="dossier-document">
    <header class="dossier-hero">
      <div class="dossier-hero-copy">
        <div class="dossier-hero-kicker">
          <span>ACTIVE DOSSIER</span>
          <strong><i aria-hidden="true"></i>当前有效</strong>
        </div>
        <p class="dossier-record-number">人员编号 {{ person.employeeNo || '未填写' }}</p>
        <h1>{{ person.name || '未填写姓名' }}</h1>
        <p class="dossier-employment-summary">{{ employmentSummary || '当前任职信息未填写' }}</p>
        <div class="dossier-hero-meta">
          <span>模板 {{ person.archive.templateVersion }}</span>
          <span>快照版本 {{ person.archive.snapshotVersion }}</span>
          <span>{{ updatedAtLabel }} 更新</span>
        </div>
        <div class="dossier-hero-actions"><slot name="actions" /></div>
      </div>

      <figure class="dossier-hero-photo">
        <div class="dossier-photo-stage">
          <img
            v-if="photo.kind === 'ready'"
            :src="photo.url"
            :alt="`${person.name}的档案照片`"
          />
          <div v-else-if="photo.kind === 'loading'" class="dossier-photo-placeholder is-loading">
            <span>正在读取</span>
            <small>PHOTO</small>
          </div>
          <div v-else-if="photo.kind === 'failed'" class="dossier-photo-placeholder is-failed">
            <span>照片读取失败</span>
            <button type="button" @click="emit('retryPhoto')">重新读取</button>
          </div>
          <div v-else class="dossier-photo-placeholder">
            <span>原表未附照片</span>
            <small>NO PHOTO</small>
          </div>
        </div>
        <figcaption v-if="person.photo">
          {{ person.photo.widthPixels }} × {{ person.photo.heightPixels }} px ·
          {{ (person.photo.byteSize / 1024).toFixed(1) }} KiB
        </figcaption>
      </figure>
    </header>

    <div class="dossier-sections">
      <ArchiveIdentitySheet
        :person="person"
        :sensitive-values="sensitiveValues"
        :sensitive-loading="sensitiveLoading"
        :sensitive-error="sensitiveError"
        @toggle-sensitive="emit('toggleSensitive', $event)"
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
      <ArchiveFamilySheet
        :person="person"
        :updated-at-label="updatedAtLabel"
        :highlighted-member-name="highlightedMemberName"
        :highlighted-relationship="highlightedRelationship"
      />
    </div>
  </article>
</template>
