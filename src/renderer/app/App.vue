<!-- 应用根组件：恢复加密会话后再呈现路由，避免受保护页面短暂闪现。 -->
<script setup lang="ts">
import { watch } from "vue"
import { RouterView, useRouter } from "vue-router"
import { useAuthStore } from "@/features/auth/store"

const auth = useAuthStore()
const router = useRouter()

watch(
  () => auth.expired,
  (expired) => {
    if (!expired) return
    void router.replace({ name: "login" })
  },
)
</script>

<template>
  <RouterView />
</template>
