<!-- B 家庭成员查询：左侧保留每条匹配，右侧只呈现查询 DTO，显式进入完整档案。 -->
<script setup lang="ts">
import { Search } from "@element-plus/icons-vue"
import { computed, ref } from "vue"
import { useRouter } from "vue-router"
import FixedListPagination from "@/shared/components/FixedListPagination.vue"
import type { FamilySearchItem } from "./schemas"
import { useFamilySearchStore } from "./store"

const store = useFamilySearchStore()
const router = useRouter()
const selectedKey = ref("")
const selectedResult = computed(
  () => store.results.find((result) => resultKey(result) === selectedKey.value) ?? null,
)

async function search(page = 0): Promise<void> {
  await store.search(page)
  const first = store.results[0]
  selectedKey.value = first ? resultKey(first) : ""
}

function resultKey(result: FamilySearchItem): string {
  return `${result.personId}:${result.matchedMemberName}:${result.relationship}`
}

function selectResult(result: FamilySearchItem): void {
  selectedKey.value = resultKey(result)
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

    <div class="family-search-layout">
      <aside class="family-match-index">
        <header class="family-index-heading">
          <div>
            <span>MATCH INDEX</span>
            <h2>关系匹配</h2>
          </div>
          <strong>{{ store.searched ? `${store.total} 条匹配` : '待查询' }}</strong>
        </header>

        <form class="family-search-form" @submit.prevent="search(0)">
          <label for="family-search-query">家庭成员姓名</label>
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
            @click="search(0)"
          >
            查找相关档案
          </el-button>
        </form>

        <el-alert
          v-if="store.message"
          class="family-search-error"
          :title="store.message"
          type="error"
          :closable="false"
          show-icon
        />

        <div class="family-index-caption">
          <span>{{ store.searched ? `当前页 ${store.results.length} 条` : '尚未执行查询' }}</span>
          <small>同名匹配不合并</small>
        </div>

        <div v-if="store.loading && store.results.length === 0" class="family-index-loading">
          <el-skeleton :rows="7" animated />
        </div>
        <ol v-else-if="store.results.length" class="family-result-list">
          <li v-for="result in store.results" :key="resultKey(result)">
            <button
              type="button"
              :class="{ active: resultKey(result) === selectedKey }"
              :aria-current="resultKey(result) === selectedKey ? 'true' : undefined"
              @click="selectResult(result)"
            >
              <span class="family-result-badge">{{ result.relationship.slice(0, 1) || '亲' }}</span>
              <span class="family-result-copy">
                <span class="family-result-member">
                  <strong>{{ result.matchedMemberName }}</strong>
                  <small>{{ result.relationship || '关系未填写' }}</small>
                </span>
                <span class="family-result-owner">档案：{{ result.personName || '未填写姓名' }}</span>
                <span>{{ [result.organization, result.department].filter(Boolean).join(' · ') || '单位未填写' }}</span>
              </span>
            </button>
          </li>
        </ol>
        <div v-else class="family-index-empty">
          <strong>{{ store.searched ? '未找到匹配档案' : '输入姓名开始查询' }}</strong>
          <span>{{ store.searched ? '可减少姓名字符后再次查找。' : '支持成员姓名包含式模糊检索。' }}</span>
        </div>

        <FixedListPagination :page="store.page" :total="store.total" @change="search" />
      </aside>

      <section v-if="selectedResult" class="family-match-sheet">
        <header class="family-match-hero">
          <div>
            <span>MATCH RECORD</span>
            <p>匹配成员</p>
            <h2>{{ selectedResult.matchedMemberName }}</h2>
            <strong>{{ selectedResult.relationship || '关系未填写' }}</strong>
          </div>
          <div class="family-match-seal" aria-hidden="true">关系<br />命中</div>
        </header>

        <section class="family-match-owner">
          <p>关联有效档案</p>
          <h3>{{ selectedResult.personName || '未填写姓名' }}</h3>
          <span>人员档案 ID · {{ selectedResult.personId }}</span>
        </section>

        <dl class="family-match-fields">
          <div>
            <dt>工作单位</dt>
            <dd>{{ selectedResult.organization || '—' }}</dd>
          </div>
          <div>
            <dt>部门</dt>
            <dd>{{ selectedResult.department || '—' }}</dd>
          </div>
          <div>
            <dt>职务</dt>
            <dd>{{ selectedResult.position || '—' }}</dd>
          </div>
          <div>
            <dt>职称 / 技能</dt>
            <dd>{{ selectedResult.titleOrSkill || '—' }}</dd>
          </div>
        </dl>

        <footer class="family-match-actions">
          <div>
            <strong>查询结果仅含匹配摘要</strong>
            <span>完整字段和照片只在进入档案后读取。</span>
          </div>
          <el-button
            type="primary"
            data-test="view-matched-archive"
            @click="openMatchedArchive(selectedResult)"
          >
            查看档案
          </el-button>
        </footer>
      </section>
      <section v-else class="family-match-sheet family-match-empty">
        <span>RELATIONSHIP MATCH</span>
        <strong>{{ store.loading ? '正在检索关系索引' : '请选择一条匹配记录' }}</strong>
        <p>
          {{ store.searched ? '查询结果会保留每一条人员与成员关系。' : '先在左侧输入家庭成员姓名并执行查询。' }}
        </p>
      </section>
    </div>
  </section>
</template>
