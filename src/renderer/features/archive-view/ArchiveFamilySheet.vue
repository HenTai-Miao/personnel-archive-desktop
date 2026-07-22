<!-- 家庭与申报卷：展示家庭成员完整字段、申报签署和快照来源。 -->
<script setup lang="ts">
import type { PersonDetail } from "./schemas"

const props = defineProps<{
  readonly person: PersonDetail
  readonly updatedAtLabel: string
  readonly highlightedMemberName?: string
  readonly highlightedRelationship?: string
}>()

function isHighlightedMember(member: PersonDetail["familyMembers"][number]): boolean {
  if (!props.highlightedMemberName || member.name !== props.highlightedMemberName) return false
  return !props.highlightedRelationship || member.relationship === props.highlightedRelationship
}
</script>

<template>
  <article id="family" class="paper-card dossier-section">
    <header class="dossier-section-heading"><h2>家庭成员与申报信息</h2></header>

    <section class="dossier-subsection">
      <header class="subsection-heading"><h3>家庭成员</h3><span>{{ person.familyMembers.length }} 人</span></header>
      <div v-if="person.familyMembers.length" class="dossier-table-wrap family-table-wrap">
        <table class="dossier-table family-table">
          <thead><tr><th>称谓</th><th>姓名</th><th>出生日期</th><th>年龄</th><th>政治面貌</th><th>工作单位及职务</th></tr></thead>
          <tbody>
            <tr
              v-for="(member, index) in person.familyMembers"
              :key="`${member.relationship}-${member.name}-${index}`"
              class="family-member-row"
              :class="{ 'is-search-match': isHighlightedMember(member) }"
            >
              <td>{{ member.relationship || '—' }}</td>
              <td class="primary-cell">{{ member.name || '—' }}</td>
              <td>{{ member.birthDate || '—' }}</td>
              <td>{{ member.age === null ? '—' : `${member.age} 岁` }}</td>
              <td>{{ member.politicalStatus || '—' }}</td>
              <td>{{ member.organizationAndPosition || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="dossier-empty-row">原表未填写家庭成员记录</div>
    </section>

    <section class="declaration-panel">
      <div><span>申报信息</span></div>
      <dl>
        <div><dt>承诺人</dt><dd>{{ person.declaration.signer || '—' }}</dd></div>
        <div><dt>申报日期</dt><dd>{{ person.declaration.date || '—' }}</dd></div>
      </dl>
    </section>

    <footer class="snapshot-note">
      <span>当前有效快照</span>
      <span>模板 {{ person.archive.templateVersion }}</span>
      <span>版本 {{ person.archive.snapshotVersion }}</span>
      <span>更新于 {{ updatedAtLabel }}</span>
    </footer>
  </article>
</template>
