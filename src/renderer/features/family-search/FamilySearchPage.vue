<!-- B 家庭成员查询：逐行保留关系匹配，完整档案仅由用户显式进入。 -->
<script setup lang="ts">
import { Search } from "@element-plus/icons-vue"
import { useRouter } from "vue-router"
import FixedListPagination from "@/shared/components/FixedListPagination.vue"
import type { FamilySearchItem } from "./schemas"
import { useFamilySearchStore } from "./store"

const store = useFamilySearchStore()
const router = useRouter()

async function search(page = 0): Promise<void> {
  await store.search(page)
}

function openMatchedArchive(result: FamilySearchItem): void {
  void router.push({
    name: "person-detail",
    params: { personId: result.personId },
    query: { member: result.matchedMemberName, relationship: result.relationship },
  })
}
</script>

<template>
  <section class="page-stack search-page">
    <header class="page-header">
      <div>
        <p class="page-eyebrow">RELATIONSHIP SEARCH / 关系检索</p>
        <h1>家庭成员查询</h1>
        <p class="page-summary">按成员姓名模糊检索，逐条保留人员与家庭成员的匹配关系，不合并同名人员。</p>
      </div>
    </header>

    <form class="family-search-paper" @submit.prevent="search(0)">
      <label for="family-search-query">家庭成员姓名</label>
      <div class="family-search-control">
        <div class="family-search-input">
          <el-icon><Search /></el-icon>
          <input
            id="family-search-query"
            v-model="store.query"
            data-test="family-search-query"
            type="search"
            autocomplete="off"
            placeholder="例如：晓华"
          />
        </div>
        <el-button
          type="primary"
          data-test="family-search-submit"
          :loading="store.loading"
          native-type="submit"
        >
          查找相关档案
        </el-button>
      </div>
    </form>

    <el-alert
      v-if="store.message"
      class="family-search-error"
      :title="store.message"
      type="error"
      :closable="false"
      show-icon
    />

    <section class="family-result-sheet">
      <header class="family-result-heading">
        <div>
          <span>RELATIONSHIP LEDGER</span>
          <h2>查询结果</h2>
          <small>{{ store.searched ? `${store.total} 条匹配记录` : "等待查询" }} · 同名匹配不合并</small>
        </div>
      </header>
      <el-table
        v-if="store.results.length"
        v-loading="store.loading"
        data-test="family-search-results"
        :data="store.results"
        stripe
      >
        <el-table-column label="匹配成员" min-width="150">
          <template #default="scope">
            <strong class="matched-name">{{ scope.row.matchedMemberName }}</strong>
            <small class="relationship">{{ scope.row.relationship || "关系未填写" }}</small>
          </template>
        </el-table-column>
        <el-table-column label="档案姓名" min-width="130">
          <template #default="scope">{{ scope.row.personName || "未填写姓名" }}</template>
        </el-table-column>
        <el-table-column label="单位 / 部门" min-width="230">
          <template #default="scope">
            {{ scope.row.organization || "单位未填写" }}
            <small class="relationship">{{ scope.row.department || "部门未填写" }}</small>
          </template>
        </el-table-column>
        <el-table-column prop="position" label="职务" min-width="140" />
        <el-table-column prop="titleOrSkill" label="职称 / 技能" min-width="150" />
        <el-table-column label="档案操作" width="110" fixed="right">
          <template #default="scope">
            <el-button type="primary" link data-test="view-matched-archive" @click="openMatchedArchive(scope.row)">
              查看档案
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <div v-else-if="store.loading" class="list-loading" role="status">
        <span>正在检索家庭成员关系…</span>
        <el-skeleton :rows="5" animated />
      </div>
      <div v-else class="family-result-empty">
        <strong>{{ store.searched ? "未找到匹配档案" : "请输入家庭成员姓名进行查询" }}</strong>
        <span>{{ store.searched ? "可减少姓名字符后再次查找。" : "支持成员姓名包含式模糊检索。" }}</span>
      </div>
      <FixedListPagination
        v-if="store.results.length"
        :page="store.page"
        :total="store.total"
        @change="search"
      />
    </section>
  </section>
</template>
