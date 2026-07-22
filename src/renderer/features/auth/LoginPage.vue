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
  <div class="login-page">
    <section class="login-identity">
      <div class="login-system-code">PA · 01</div>
      <h1>人员档案<br />妥善归柜</h1>
      <p>导入、检索与查看人员信息档案，在一处完成。</p>
      <div class="cabinet-lines" aria-hidden="true"><i /><i /><i /><i /></div>
    </section>
    <section class="login-panel">
      <div class="login-form-wrap">
        <div class="red-stamp">内部<br />系统</div>
        <span class="section-kicker">人员信息档案管理系统</span>
        <h2>登录人员档案助手</h2>
        <p class="muted">请使用单位分配的账号进入系统</p>
        <el-form label-position="top" size="large" @submit.prevent="submit">
          <el-form-item label="用户名">
            <el-input v-model="form.username" autocomplete="username" placeholder="请输入用户名" />
          </el-form-item>
          <el-form-item label="密码">
            <el-input v-model="form.password" type="password" autocomplete="current-password" show-password placeholder="请输入密码" @keyup.enter="submit" />
          </el-form-item>
          <el-alert v-if="message" :title="message" type="error" :closable="false" show-icon />
          <el-button class="primary-action" type="primary" :loading="loading" @click="submit">进入档案柜</el-button>
        </el-form>
        <small class="security-note">密码不会保存在本机；仅加密保存会话续期凭据</small>
      </div>
    </section>
  </div>
</template>
