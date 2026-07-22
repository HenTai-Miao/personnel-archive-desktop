<!-- 登录后的应用外壳：提供业务导航、当前用户信息和就近退出操作。 -->
<script setup lang="ts">
import { DocumentAdd, Files, Search, Setting, SwitchButton } from "@element-plus/icons-vue"
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
  <div class="app-shell">
    <aside class="archive-nav">
      <div class="brand-block">
        <div class="brand-seal">档</div>
        <div>
          <strong>人员档案助手</strong>
          <span>人员信息档案管理系统</span>
        </div>
      </div>
      <div class="cabinet-label">业务档案柜</div>
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
        <RouterLink v-if="canImport" to="/settings" :class="{ active: route.path === '/settings' }">
          <el-icon><Setting /></el-icon><span>文件夹设置</span>
        </RouterLink>
      </nav>
      <div class="nav-foot">
        <div class="user-card">
          <span class="user-avatar">{{ auth.user?.displayName.slice(0, 1) }}</span>
          <div class="user-identity">
            <div class="user-name-row">
              <strong :title="auth.user?.displayName">{{ auth.user?.displayName }}</strong>
              <button class="logout-button" type="button" title="退出登录" @click="signOut">
                <el-icon><SwitchButton /></el-icon><span>退出</span>
              </button>
            </div>
            <small>{{ auth.user?.username }}</small>
          </div>
        </div>
      </div>
    </aside>
    <main class="paper-workspace"><RouterView /></main>
  </div>
</template>
