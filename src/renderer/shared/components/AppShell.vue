<!-- 登录后的应用外壳：提供业务导航、当前用户信息和就近退出操作。 -->
<script setup lang="ts">
import { DocumentAdd, Files, Search, SwitchButton } from "@element-plus/icons-vue"
import { computed, onMounted, onUnmounted, watch } from "vue"
import { RouterView, useRoute, useRouter } from "vue-router"
import { useImportStore } from "@/features/archive-import/store"
import { useAuthStore } from "@/features/auth/store"

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const imports = useImportStore()
const canImport = computed(() => {
  const roles = auth.user?.roles ?? []
  return roles.includes("ADMIN") || roles.includes("ARCHIVE_EDITOR")
})
const primaryRole = computed(() => auth.user?.roles[0] ?? "—")
const readingContextActive = computed(
  () => route.path.startsWith("/persons") || route.path.startsWith("/search"),
)
const batchContextActive = computed(() => route.path === "/import" || route.path === "/settings")

onMounted(syncAutomaticScan)
onUnmounted(imports.stopAutoScan)
watch(canImport, syncAutomaticScan)

function syncAutomaticScan(): void {
  if (canImport.value) {
    imports.startAutoScan()
  } else {
    imports.stopAutoScan()
  }
}

async function signOut(): Promise<void> {
  imports.stopAutoScan()
  try {
    await auth.signOut()
  } finally {
    await router.replace({ name: "login" })
  }
}
</script>

<template>
  <div class="reading-desk-shell">
    <header class="reading-desk-topbar">
      <div class="system-identity">
        <span class="identity-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
        <span class="identity-copy">
          <strong>人员档案助手</strong>
          <small>人员信息档案管理系统</small>
        </span>
      </div>
      <nav class="reading-desk-context-nav" aria-label="任务分组">
        <RouterLink to="/persons" :class="{ active: readingContextActive }">卷宗检阅</RouterLink>
        <RouterLink v-if="canImport" to="/import" :class="{ active: batchContextActive }">
          批处理
        </RouterLink>
      </nav>
      <div class="reading-desk-user-area">
        <span class="session-chip"><i aria-hidden="true"></i>安全会话已建立</span>
        <span class="user-avatar">{{ auth.user?.displayName.slice(0, 1) || '用' }}</span>
        <div class="user-identity">
          <strong :title="auth.user?.displayName">{{ auth.user?.displayName }}</strong>
          <small class="user-role">{{ primaryRole }}</small>
        </div>
        <button class="logout-button" type="button" title="退出登录" @click="signOut">
          <el-icon><SwitchButton /></el-icon><span>退出</span>
        </button>
      </div>
    </header>
    <aside class="reading-desk-sidebar">
      <div class="business-directory-label">业务目录</div>
      <nav aria-label="主导航">
        <RouterLink to="/persons" :class="{ active: route.path.startsWith('/persons') }">
          <el-icon><Files /></el-icon><span>人员档案</span>
        </RouterLink>
        <RouterLink to="/search" :class="{ active: route.path.startsWith('/search') }">
          <el-icon><Search /></el-icon><span>家庭成员查询</span>
        </RouterLink>
        <RouterLink v-if="canImport" to="/import" :class="{ active: route.path === '/import' }">
          <el-icon><DocumentAdd /></el-icon><span>批量导入档案</span>
        </RouterLink>
      </nav>
    </aside>
    <main class="reading-desk-workspace"><RouterView /></main>
  </div>
</template>
