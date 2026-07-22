<!-- 学历卷：并列展示全日制、在职学历摘要，并保留主要学历原文行。 -->
<script setup lang="ts">
import ArchiveRowTable from "./ArchiveRowTable.vue"
import type { EducationSummary, OrderedText } from "./schemas"

defineProps<{
  readonly fullTime: EducationSummary
  readonly inService: EducationSummary
  readonly mainEducation: readonly OrderedText[]
}>()
</script>

<template>
  <article id="education" class="paper-card dossier-section">
    <header class="dossier-section-heading"><h2>学历与教育经历</h2></header>

    <div class="education-summary-grid">
      <section class="education-card">
        <header><span>全日制教育</span></header>
        <dl>
          <div><dt>学历</dt><dd>{{ fullTime.educationLevel || '—' }}</dd></div>
          <div><dt>毕业院校</dt><dd>{{ fullTime.institutionName || '—' }}</dd></div>
          <div><dt>学位</dt><dd>{{ fullTime.degreeName || '—' }}</dd></div>
          <div><dt>系及专业</dt><dd>{{ fullTime.departmentAndMajor || '—' }}</dd></div>
        </dl>
      </section>
      <section class="education-card in-service-card">
        <header><span>在职教育</span></header>
        <dl>
          <div><dt>学历</dt><dd>{{ inService.educationLevel || '—' }}</dd></div>
          <div><dt>毕业院校</dt><dd>{{ inService.institutionName || '—' }}</dd></div>
          <div><dt>学位</dt><dd>{{ inService.degreeName || '—' }}</dd></div>
          <div><dt>系及专业</dt><dd>{{ inService.departmentAndMajor || '—' }}</dd></div>
        </dl>
      </section>
    </div>

    <ArchiveRowTable
      title="主要学历"
      :rows="mainEducation"
      left-label="起止时间"
      right-label="院校、专业及学历"
      empty-text="原表未填写主要学历记录"
    />
  </article>
</template>
