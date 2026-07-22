<!-- 经历卷：按原工作簿顺序展示工作经历和奖惩原文。 -->
<script setup lang="ts">
import ArchiveRowTable from "./ArchiveRowTable.vue"
import type { OrderedText } from "./schemas"

defineProps<{
  readonly workExperiences: readonly OrderedText[]
  readonly rewardsPunishments: readonly OrderedText[]
}>()
</script>

<template>
  <article id="career" class="paper-card dossier-section">
    <header class="dossier-section-heading">
      <span class="section-index">03</span>
      <div><small>基本情况表 · 第三部分</small><h2>工作经历与奖惩情况</h2></div>
    </header>
    <ArchiveRowTable
      title="工作经历"
      :rows="workExperiences"
      left-label="起止时间"
      right-label="工作单位及职务"
      empty-text="原表未填写工作经历"
    />
    <ArchiveRowTable
      title="奖惩情况"
      :rows="rewardsPunishments"
      left-label="时间"
      right-label="奖惩内容"
      empty-text="原表未填写奖惩记录"
    />
  </article>
</template>
