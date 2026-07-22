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
      <h1>人员信息档案管理系统</h1>
      <p>内部业务系统</p>
    </section>
    <section class="login-panel">
      <div class="login-form-wrap">
        <h2>用户登录</h2>
        <p class="muted">请输入用户名和密码</p>
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
      </div>
    </section>
  </div>
</template>
