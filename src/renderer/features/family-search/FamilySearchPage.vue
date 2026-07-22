<!-- 家庭成员查询页面：保留并展示每一条人员/成员匹配关系。 -->
<script setup lang="ts">
import { Search } from "@element-plus/icons-vue"
import { useRouter } from "vue-router"
import FixedListPagination from "@/shared/components/FixedListPagination.vue"
import { useFamilySearchStore } from "./store"

const store = useFamilySearchStore()
const router = useRouter()

function openMatchedArchive(personId: string, memberName: string, relationship: string): void {
  void router.push({
    name: "person-detail",
    params: { personId },
    query: { member: memberName, relationship },
  })
}
</script>

<template>
  <section class="page-stack search-page">
    <header class="page-header"><div><h1>家庭成员查询</h1></div></header>
    <div class="search-ledger">
      <el-input v-model="store.query" size="large" clearable placeholder="例如：输入“晓华”" @keyup.enter="store.search(0)">
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      <el-button type="primary" size="large" :loading="store.loading" @click="store.search(0)">查找相关档案</el-button>
    </div>
    <el-alert v-if="store.message" :title="store.message" type="error" :closable="false" show-icon />
    <div v-if="store.results.length" class="paper-card result-card">
      <div class="table-heading"><div><strong>查询结果</strong><span>共 {{ store.total }} 条匹配记录，不合并同名人员</span></div></div>
      <el-table v-loading="store.loading" :data="store.results" stripe>
        <el-table-column label="匹配成员" min-width="150"><template #default="scope"><strong class="matched-name">{{ scope.row.matchedMemberName }}</strong><small class="relationship">{{ scope.row.relationship }}</small></template></el-table-column>
        <el-table-column label="档案姓名" min-width="130"><template #default="scope">{{ scope.row.personName || '未填写姓名' }}</template></el-table-column>
        <el-table-column label="单位 / 部门" min-width="230"><template #default="scope">{{ scope.row.organization }}<small class="relationship">{{ scope.row.department }}</small></template></el-table-column>
        <el-table-column prop="position" label="职务" min-width="140" />
        <el-table-column prop="titleOrSkill" label="职称 / 技能" min-width="150" />
        <el-table-column label="档案操作" width="110" fixed="right"><template #default="scope"><el-button type="primary" link @click="openMatchedArchive(scope.row.personId, scope.row.matchedMemberName, scope.row.relationship)">查看档案</el-button></template></el-table-column>
      </el-table>
      <FixedListPagination :page="store.page" :total="store.total" @change="store.search" />
    </div>
    <div v-else-if="store.searched && !store.loading" class="empty-sheet"><span>未找到匹配档案</span><p>可减少姓名字符后再次查找。</p></div>
    <div v-else-if="!store.loading" class="empty-sheet"><span>请输入家庭成员姓名进行查询</span></div>
  </section>
</template>
