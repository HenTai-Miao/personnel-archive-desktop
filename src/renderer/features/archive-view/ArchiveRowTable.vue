<!-- 原表有序文本行：按工作簿的左右列和原始顺序展示，不重新解释用户文字。 -->
<script setup lang="ts">
import type { OrderedText } from "./schemas"

defineProps<{
  readonly title: string
  readonly rows: readonly OrderedText[]
  readonly leftLabel: string
  readonly rightLabel: string
  readonly emptyText: string
}>()
</script>

<template>
  <section class="dossier-subsection">
    <header class="subsection-heading">
      <h3>{{ title }}</h3>
      <span>{{ rows.length }} 条记录</span>
    </header>
    <div v-if="rows.length" class="dossier-table-wrap">
      <table class="dossier-table">
        <thead>
          <tr>
            <th class="row-number-column">序</th>
            <th class="period-column">{{ leftLabel }}</th>
            <th>{{ rightLabel }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.sortOrder">
            <td class="row-number">{{ String(row.sortOrder).padStart(2, '0') }}</td>
            <td>{{ row.leftText || '—' }}</td>
            <td class="primary-cell">{{ row.rightText || '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div v-else class="dossier-empty-row">{{ emptyText }}</div>
  </section>
</template>
