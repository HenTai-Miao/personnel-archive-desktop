<!-- 档案首卷：展示照片、个人基本情况和当前任职字段。 -->
<script setup lang="ts">
import type { PersonDetail, SensitiveField } from "./schemas"

defineProps<{
  readonly person: PersonDetail
  readonly photoUrl: string
  readonly photoLoading: boolean
  readonly photoError: string
  readonly sensitiveValues: Readonly<Record<SensitiveField, string>>
  readonly sensitiveLoading: SensitiveField | null
  readonly sensitiveError: string
}>()

const emit = defineEmits<{
  retryPhoto: []
  toggleSensitive: [field: SensitiveField]
}>()
</script>

<template>
  <article id="identity" class="paper-card dossier-section identity-sheet">
    <header class="dossier-section-heading"><h2>基本情况与任职信息</h2></header>

    <div class="identity-layout">
      <figure class="archive-photo">
        <div class="photo-stage">
          <img v-if="photoUrl" :src="photoUrl" :alt="`${person.name}的档案照片`" />
          <div v-else-if="photoLoading" class="photo-placeholder photo-loading">正在读取照片</div>
          <div v-else-if="photoError" class="photo-placeholder photo-error">
            <span>照片读取失败</span>
            <button type="button" @click="emit('retryPhoto')">重新读取</button>
          </div>
          <div v-else class="photo-placeholder">原表未附照片</div>
        </div>
        <figcaption v-if="person.photo">
          原始照片 · {{ person.photo.widthPixels }} × {{ person.photo.heightPixels }} px ·
          {{ (person.photo.byteSize / 1024).toFixed(1) }} KiB
        </figcaption>
      </figure>

      <div class="identity-records">
        <section class="dossier-subsection">
          <header class="subsection-heading"><h3>个人基本信息</h3><span>敏感信息默认脱敏，查看操作将被记录</span></header>
          <dl class="dossier-field-grid">
            <div><dt>姓名</dt><dd>{{ person.name || '—' }}</dd></div>
            <div><dt>人员编号</dt><dd>{{ person.employeeNo || '—' }}</dd></div>
            <div class="wide-field">
              <dt>身份证号码</dt>
              <dd class="sensitive-value-row">
                <span class="masked-value">{{ sensitiveValues.IDENTITY_CARD || person.identityCardMasked || '—' }}</span>
                <button
                  v-if="person.identityCardMasked"
                  class="sensitive-toggle"
                  type="button"
                  :disabled="sensitiveLoading !== null"
                  :aria-label="sensitiveValues.IDENTITY_CARD ? '隐藏完整身份证号码' : '显示完整身份证号码'"
                  @click="emit('toggleSensitive', 'IDENTITY_CARD')"
                >{{ sensitiveLoading === 'IDENTITY_CARD' ? '读取中' : sensitiveValues.IDENTITY_CARD ? '隐藏' : '显示' }}</button>
              </dd>
            </div>
            <div><dt>性别</dt><dd>{{ person.personal.gender || '—' }}</dd></div>
            <div><dt>出生年月</dt><dd>{{ person.personal.birthDate || '—' }}</dd></div>
            <div><dt>民族</dt><dd>{{ person.personal.nation || '—' }}</dd></div>
            <div><dt>籍贯</dt><dd>{{ person.personal.nativePlace || '—' }}</dd></div>
            <div><dt>出生地</dt><dd>{{ person.personal.birthPlace || '—' }}</dd></div>
            <div><dt>政治面貌</dt><dd>{{ person.personal.politicalStatus || '—' }}</dd></div>
            <div><dt>加入时间</dt><dd>{{ person.personal.politicalJoinDate || '—' }}</dd></div>
            <div><dt>婚姻状况</dt><dd>{{ person.personal.maritalStatus || '—' }}</dd></div>
            <div><dt>健康状况</dt><dd>{{ person.personal.healthStatus || '—' }}</dd></div>
            <div class="wide-field"><dt>通信地址</dt><dd>{{ person.personal.mailingAddress || '—' }}</dd></div>
            <div><dt>邮政编码</dt><dd>{{ person.personal.postalCode || '—' }}</dd></div>
            <div>
              <dt>联系电话</dt>
              <dd class="sensitive-value-row">
                <span class="masked-value">{{ sensitiveValues.PHONE_NUMBER || person.personal.phoneNumberMasked || '—' }}</span>
                <button
                  v-if="person.personal.phoneNumberMasked"
                  class="sensitive-toggle"
                  type="button"
                  :disabled="sensitiveLoading !== null"
                  :aria-label="sensitiveValues.PHONE_NUMBER ? '隐藏完整手机号码' : '显示完整手机号码'"
                  @click="emit('toggleSensitive', 'PHONE_NUMBER')"
                >{{ sensitiveLoading === 'PHONE_NUMBER' ? '读取中' : sensitiveValues.PHONE_NUMBER ? '隐藏' : '显示' }}</button>
              </dd>
            </div>
          </dl>
          <p v-if="sensitiveError" class="sensitive-field-error">{{ sensitiveError }}</p>
        </section>

        <section class="dossier-subsection employment-block">
          <header class="subsection-heading"><h3>任职信息</h3><span>当前有效任职记录</span></header>
          <dl class="dossier-field-grid employment-grid">
            <div><dt>工作单位</dt><dd>{{ person.employment.organization || '—' }}</dd></div>
            <div><dt>部门</dt><dd>{{ person.employment.department || '—' }}</dd></div>
            <div><dt>参加工作时间</dt><dd>{{ person.employment.workStartDate || '—' }}</dd></div>
            <div><dt>派入投标公司时间</dt><dd>{{ person.employment.dispatchedToBiddingCompanyDate || '—' }}</dd></div>
            <div><dt>现任职务</dt><dd>{{ person.employment.position || '—' }}</dd></div>
            <div><dt>职称 / 技能</dt><dd>{{ person.employment.titleOrSkill || '—' }}</dd></div>
            <div><dt>取得时间</dt><dd>{{ person.employment.titleOrSkillAcquiredDate || '—' }}</dd></div>
          </dl>
        </section>
      </div>
    </div>
  </article>
</template>
