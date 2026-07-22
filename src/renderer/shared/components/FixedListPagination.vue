<!-- 固定分页控件：统一显示每页 20 条，并把 Element Plus 页码转换为后端使用的零基页码。 -->
<script setup lang="ts">
import { LIST_PAGE_SIZE } from "./list-pagination"

defineProps<{ readonly page: number; readonly total: number }>()
const emit = defineEmits<{ change: [page: number] }>()

function changePage(oneBasedPage: number): void {
  emit("change", oneBasedPage - 1)
}
</script>

<template>
  <footer v-if="total > 0" class="fixed-list-pagination" data-test="list-pagination">
    <span>每页 {{ LIST_PAGE_SIZE }} 条，共 {{ total }} 条</span>
    <el-pagination
      background
      layout="prev, pager, next"
      :current-page="page + 1"
      :page-size="LIST_PAGE_SIZE"
      :total="total"
      @current-change="changePage"
    />
  </footer>
</template>
