<!-- 人员卷宗预览：只在显式选择后展示脱敏详情与鉴权照片，不提供敏感原文读取入口。 -->
<script setup lang="ts">
import { Close } from "@element-plus/icons-vue"
import { computed } from "vue"
import ArchiveCareerSheet from "@/features/archive-view/ArchiveCareerSheet.vue"
import ArchiveEducationSheet from "@/features/archive-view/ArchiveEducationSheet.vue"
import ArchiveFamilySheet from "@/features/archive-view/ArchiveFamilySheet.vue"
import type { PersonDetail } from "@/features/archive-view/schemas"
import type { PersonId } from "@/shared/api/schemas"
import type { PersonPreviewState } from "./use-person-preview"

const props = defineProps<{
  readonly state: PersonPreviewState
  readonly openingPersonId: PersonId | null
}>()

const emit = defineEmits<{
  close: []
  retry: [personId: PersonId]
  retryPhoto: []
  view: [personId: PersonId]
  exportPerson: [person: PersonDetail]
}>()

const renderedState = computed<PersonPreviewState>(() => {
  switch (props.state.kind) {
    case "idle":
    case "loading":
    case "failed":
    case "ready":
      return props.state
    default:
      return assertNever(props.state)
  }
})

const updatedAtLabel = computed(() => {
  const current = renderedState.value
  if (current.kind !== "ready") return ""
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(current.person.archive.updatedAt))
})

function assertNever(value: never): never {
  throw new TypeError(`Unexpected person preview state: ${String(value)}`)
}
</script>

<template>
  <aside class="person-preview" data-test="person-preview" aria-live="polite">
    <el-button
      class="preview-close"
      circle
      :icon="Close"
      aria-label="关闭卷宗预览"
      title="关闭卷宗预览"
      @click="emit('close')"
    />
    <div v-if="renderedState.kind === 'idle'" class="preview-state">
      <strong>卷宗预览</strong>
      <p>点击名册行，在这里核对当前有效档案。</p>
    </div>
    <div v-else-if="renderedState.kind === 'loading'" class="preview-state">
      <strong>正在读取卷宗</strong>
      <el-skeleton :rows="10" animated />
    </div>
    <el-result
      v-else-if="renderedState.kind === 'failed'"
      icon="error"
      title="卷宗读取失败"
      :sub-title="renderedState.message"
    >
      <template #extra>
        <el-button type="primary" @click="emit('retry', renderedState.personId)">重新读取</el-button>
      </template>
    </el-result>
    <div v-else class="preview-dossier">
      <header class="preview-heading">
        <div>
          <span>当前卷宗 · {{ renderedState.person.employeeNo || '未填写编号' }}</span>
          <h2>{{ renderedState.person.name || '未填写姓名' }}</h2>
          <p>
            {{ renderedState.person.employment.organization || '任职单位未填写' }}
            <template v-if="renderedState.person.employment.position">
              · {{ renderedState.person.employment.position }}
            </template>
          </p>
        </div>
        <div class="preview-actions">
          <el-button @click="emit('view', renderedState.personId)">查看完整档案</el-button>
          <el-button
            type="primary"
            :loading="openingPersonId === renderedState.personId"
            @click="emit('exportPerson', renderedState.person)"
          >
            下载并打开 Excel
          </el-button>
        </div>
      </header>

      <article class="preview-section preview-identity">
        <header><h3>基本情况与任职信息</h3><span>敏感字段为服务端脱敏值</span></header>
        <figure class="preview-photo">
          <img
            v-if="renderedState.photo.kind === 'ready'"
            :src="renderedState.photo.url"
            :alt="`${renderedState.person.name}的档案照片`"
          />
          <span v-else-if="renderedState.photo.kind === 'loading'">正在读取照片</span>
          <span v-else-if="renderedState.photo.kind === 'absent'">原表未附照片</span>
          <span v-else>
            照片读取失败
            <button type="button" @click="emit('retryPhoto')">重新读取</button>
          </span>
        </figure>
        <dl class="preview-fields">
          <div><dt>姓名</dt><dd>{{ renderedState.person.name || '—' }}</dd></div>
          <div><dt>人员编号</dt><dd>{{ renderedState.person.employeeNo || '—' }}</dd></div>
          <div><dt>身份证号码</dt><dd>{{ renderedState.person.identityCardMasked || '—' }}</dd></div>
          <div><dt>联系电话</dt><dd>{{ renderedState.person.personal.phoneNumberMasked || '—' }}</dd></div>
          <div><dt>性别</dt><dd>{{ renderedState.person.personal.gender || '—' }}</dd></div>
          <div><dt>出生年月</dt><dd>{{ renderedState.person.personal.birthDate || '—' }}</dd></div>
          <div><dt>民族</dt><dd>{{ renderedState.person.personal.nation || '—' }}</dd></div>
          <div><dt>籍贯</dt><dd>{{ renderedState.person.personal.nativePlace || '—' }}</dd></div>
          <div><dt>出生地</dt><dd>{{ renderedState.person.personal.birthPlace || '—' }}</dd></div>
          <div><dt>政治面貌</dt><dd>{{ renderedState.person.personal.politicalStatus || '—' }}</dd></div>
          <div><dt>加入时间</dt><dd>{{ renderedState.person.personal.politicalJoinDate || '—' }}</dd></div>
          <div><dt>婚姻状况</dt><dd>{{ renderedState.person.personal.maritalStatus || '—' }}</dd></div>
          <div><dt>健康状况</dt><dd>{{ renderedState.person.personal.healthStatus || '—' }}</dd></div>
          <div><dt>通信地址</dt><dd>{{ renderedState.person.personal.mailingAddress || '—' }}</dd></div>
          <div><dt>邮政编码</dt><dd>{{ renderedState.person.personal.postalCode || '—' }}</dd></div>
          <div><dt>工作单位</dt><dd>{{ renderedState.person.employment.organization || '—' }}</dd></div>
          <div><dt>部门</dt><dd>{{ renderedState.person.employment.department || '—' }}</dd></div>
          <div><dt>参加工作时间</dt><dd>{{ renderedState.person.employment.workStartDate || '—' }}</dd></div>
          <div><dt>派入投标公司时间</dt><dd>{{ renderedState.person.employment.dispatchedToBiddingCompanyDate || '—' }}</dd></div>
          <div><dt>现任职务</dt><dd>{{ renderedState.person.employment.position || '—' }}</dd></div>
          <div><dt>职称 / 技能</dt><dd>{{ renderedState.person.employment.titleOrSkill || '—' }}</dd></div>
          <div><dt>取得时间</dt><dd>{{ renderedState.person.employment.titleOrSkillAcquiredDate || '—' }}</dd></div>
        </dl>
      </article>

      <ArchiveEducationSheet
        :full-time="renderedState.person.education.fullTime"
        :in-service="renderedState.person.education.inService"
        :main-education="renderedState.person.mainEducation"
      />
      <ArchiveCareerSheet
        :work-experiences="renderedState.person.workExperiences"
        :rewards-punishments="renderedState.person.rewardsPunishments"
      />
      <ArchiveFamilySheet :person="renderedState.person" :updated-at-label="updatedAtLabel" />
    </div>
  </aside>
</template>
