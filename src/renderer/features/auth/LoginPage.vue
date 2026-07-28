<!-- 登录页面：收集凭据并展示登录、会话恢复和网络失败状态，不持久化密码。 -->
<script setup lang="ts">
import { reactive, ref } from "vue"
import { useRouter } from "vue-router"
import { errorMessage } from "@/shared/api/error"
import { useAuthStore } from "./store"

const router = useRouter()
const auth = useAuthStore()
const form = reactive({ username: "", password: "" })
const loading = ref(false)
const message = ref(auth.expired ? "登录已过期，请重新登录" : auth.restoreMessage)

async function submit(): Promise<void> {
  if (form.username.trim().length === 0 || form.password.length === 0) {
    message.value = "请输入用户名和密码"
    return
  }
  loading.value = true
  message.value = ""
  try {
    await auth.signIn(form.username, form.password)
    await router.replace({ name: "person-list" })
  } catch (error) {
    message.value = errorMessage(error)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-dossier-layout">
    <section class="login-system-identity">
      <div class="login-brand">
        <span class="login-brand-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
        <strong>人员档案助手</strong>
      </div>
      <p class="login-kicker">INTERNAL DOSSIER SERVICE · 内部卷宗服务</p>
      <h1>人员信息档案管理系统</h1>
      <p class="login-intro">面向内部授权人员的档案接收、检阅与安全导出工作台。</p>
      <div class="login-security-list" aria-label="系统安全说明">
        <p><i aria-hidden="true"></i>仅限内部授权账号访问</p>
        <p><i aria-hidden="true"></i>敏感字段默认遮罩</p>
        <p><i aria-hidden="true"></i>查看、导入与导出操作按权限留痕</p>
      </div>
      <footer>人员档案数据服务 · Personnel Archive Service</footer>
    </section>
    <section class="login-access-panel">
      <div class="login-dossier-card">
        <header>
          <p class="login-card-kicker">SECURE SIGN-IN</p>
          <h2>用户登录</h2>
          <p class="muted">使用内部账号进入卷宗检阅桌</p>
        </header>
        <el-form label-position="top" size="large" @submit.prevent="submit">
          <el-form-item label="用户名">
            <el-input v-model="form.username" autocomplete="username" placeholder="请输入用户名" />
          </el-form-item>
          <el-form-item label="密码">
            <el-input v-model="form.password" type="password" autocomplete="current-password" show-password placeholder="请输入密码" @keyup.enter="submit" />
          </el-form-item>
          <el-alert v-if="message" :title="message" type="error" :closable="false" show-icon />
          <el-button class="primary-action" type="primary" :loading="loading" @click="submit">登录</el-button>
        </el-form>
        <p class="login-card-foot">登录后将根据账号角色显示可执行操作。</p>
      </div>
    </section>
  </div>
</template>
