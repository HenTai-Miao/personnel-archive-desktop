<!-- B 卷宗索引：批量勾选与打开卷宗是两个独立、可键盘操作的动作。 -->
<script setup lang="ts">
import { computed, ref, watch } from "vue"
import type { PersonId } from "@/shared/api/schemas"
import FixedListPagination from "@/shared/components/FixedListPagination.vue"
import type { PersonListItem } from "./schemas"

const props = defineProps<{
  readonly rows: readonly PersonListItem[]
  readonly activePersonId: PersonId | null
  readonly selectedPersonIds: readonly PersonId[]
  readonly total: number
  readonly page: number
  readonly loading: boolean
  readonly name: string
  readonly employeeNo: string
  readonly department: string
}>()

const emit = defineEmits<{
  activate: [personId: PersonId]
  toggleSelection: [personId: PersonId]
  applyFilters: [filters: { name: string; employeeNo: string; department: string }]
  resetFilters: []
  changePage: [page: number]
}>()

const filterOpen = ref(
  props.name.trim().length > 0 ||
    props.employeeNo.trim().length > 0 ||
    props.department.trim().length > 0,
)
const draftName = ref(props.name)
const draftEmployeeNo = ref(props.employeeNo)
const draftDepartment = ref(props.department)
const hasDraftFilters = computed(
  () =>
    draftName.value.trim().length > 0 ||
    draftEmployeeNo.value.trim().length > 0 ||
    draftDepartment.value.trim().length > 0,
)

watch(
  () => [props.name, props.employeeNo, props.department] as const,
  ([name, employeeNo, department]) => {
    draftName.value = name
    draftEmployeeNo.value = employeeNo
    draftDepartment.value = department
  },
)

function applyFilters(): void {
  emit("applyFilters", {
    name: draftName.value,
    employeeNo: draftEmployeeNo.value,
    department: draftDepartment.value,
  })
}

function resetFilters(): void {
  draftName.value = ""
  draftEmployeeNo.value = ""
  draftDepartment.value = ""
  emit("resetFilters")
}

function updatedDate(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value))
}
</script>

<template>
  <aside class="person-record-index" aria-label="在册卷宗索引">
    <header class="record-index-heading">
      <div>
        <span>RECORD INDEX</span>
        <h2>在册卷宗</h2>
      </div>
      <strong>{{ total }}</strong>
    </header>

    <button
      class="record-filter-toggle"
      type="button"
      :aria-expanded="filterOpen"
      @click="filterOpen = !filterOpen"
    >
      <span>筛选条件</span>
      <i v-if="hasDraftFilters" aria-label="已设置筛选条件"></i>
      <small>{{ filterOpen ? '收起' : '展开' }}</small>
    </button>

    <form v-if="filterOpen" class="record-filter-panel" @submit.prevent="applyFilters">
      <label>
        <span>姓名</span>
        <el-input v-model="draftName" clearable placeholder="姓名片段" />
      </label>
      <label>
        <span>人员编号</span>
        <el-input v-model="draftEmployeeNo" clearable placeholder="编号片段" />
      </label>
      <label>
        <span>单位 / 部门</span>
        <el-input v-model="draftDepartment" clearable placeholder="单位或部门" />
      </label>
      <div class="record-filter-actions">
        <el-button type="primary" native-type="submit" :loading="loading">应用筛选</el-button>
        <el-button :disabled="!hasDraftFilters || loading" @click="resetFilters">重置</el-button>
      </div>
    </form>

    <div class="record-index-caption">
      <span>当前页 {{ rows.length }} 份</span>
      <small>勾选用于批量导出</small>
    </div>

    <div v-if="loading && rows.length === 0" class="record-index-loading">
      <el-skeleton :rows="8" animated />
    </div>
    <ol v-else-if="rows.length" class="person-record-list">
      <li
        v-for="person in rows"
        :key="person.id"
        :class="{
          active: activePersonId === person.id,
          selected: selectedPersonIds.includes(person.id),
        }"
      >
        <label class="record-selection-control">
          <input
            :data-test="`select-person-${person.id}`"
            type="checkbox"
            :checked="selectedPersonIds.includes(person.id)"
            :disabled="loading"
            :aria-label="`选择 ${person.name || '未填写姓名'} 用于批量导出`"
            @click.stop
            @change="emit('toggleSelection', person.id)"
          />
          <span aria-hidden="true"></span>
        </label>
        <button
          class="person-record-button"
          :data-test="`activate-person-${person.id}`"
          type="button"
          :disabled="loading"
          :class="{ active: activePersonId === person.id }"
          :aria-current="activePersonId === person.id ? 'true' : undefined"
          @click="emit('activate', person.id)"
        >
          <span class="person-initial">{{ person.name.slice(0, 1) || '档' }}</span>
          <span class="person-record-copy">
            <span class="person-record-primary">
              <strong>{{ person.name || '未填写姓名' }}</strong>
              <small>{{ person.employeeNo || '未填写编号' }}</small>
            </span>
            <span class="person-record-employment">
              {{ [person.organization, person.department].filter(Boolean).join(' · ') || '单位未填写' }}
            </span>
            <span class="person-record-meta">
              <span>{{ person.position || person.titleOrSkill || '任职未填写' }}</span>
              <time :datetime="person.updatedAt">{{ updatedDate(person.updatedAt) }}</time>
            </span>
          </span>
        </button>
      </li>
    </ol>
    <div v-else class="record-index-empty">
      <strong>当前页没有档案</strong>
      <span>可调整筛选条件或导入档案。</span>
    </div>

    <FixedListPagination :page="page" :total="total" @change="emit('changePage', $event)" />
  </aside>
</template>
