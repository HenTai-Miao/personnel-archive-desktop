/**
 * 登录会话状态机：访问令牌驻留内存，刷新凭据由 main 进程加密保存，并统一处理过期清理。
 */
import { defineStore } from "pinia"
import { computed, ref } from "vue"
import { onSessionExpired, setAccessToken } from "@/shared/api/client"
import { ApiError, errorMessage } from "@/shared/api/error"
import type { User } from "@/shared/api/schemas"
import { login, logout, refresh } from "./api"

export const useAuthStore = defineStore("auth", () => {
  const user = ref<User | null>(null)
  const ready = ref(false)
  const expired = ref(false)
  const restoreMessage = ref("")
  let refreshTimer: ReturnType<typeof setTimeout> | null = null

  const isAuthenticated = computed(() => user.value !== null)

  async function clearSession(markExpired: boolean): Promise<void> {
    // 所有退出路径共用一次完整清理，避免 UI 已退出但令牌仍可用。
    if (refreshTimer !== null) clearTimeout(refreshTimer)
    refreshTimer = null
    setAccessToken(null)
    user.value = null
    expired.value = markExpired
    await window.personnelArchive.clearRefreshCredential()
  }

  async function applySession(tokens: Awaited<ReturnType<typeof login>>): Promise<void> {
    // 先安全落下刷新凭据，再对界面宣布已登录，防止重启后出现半会话。
    await window.personnelArchive.saveRefreshCredential(tokens.refreshToken)
    setAccessToken(tokens.accessToken)
    user.value = tokens.user
    expired.value = false
    restoreMessage.value = ""
    if (refreshTimer !== null) clearTimeout(refreshTimer)
    // 在有效期 80% 时主动轮换，给短暂断网保留一次恢复窗口。
    refreshTimer = setTimeout(
      () => void refreshInBackground(tokens.refreshToken),
      tokens.expiresIn * 800,
    )
  }

  async function signIn(username: string, password: string): Promise<void> {
    await applySession(await login({ username, password }))
  }

  async function restore(token?: string): Promise<void> {
    const refreshToken = token ?? (await window.personnelArchive.loadRefreshCredential())
    if (refreshToken === null) {
      ready.value = true
      return
    }
    try {
      await applySession(await refresh(refreshToken))
    } catch (error) {
      // 只有权威 401 清空凭据；瞬时网络失败保留当前会话并稍后重试。
      if (error instanceof ApiError && error.status === 401) {
        await clearSession(true)
        return
      }
      restoreMessage.value = errorMessage(error)
      if (user.value !== null) {
        refreshTimer = setTimeout(() => void refreshInBackground(refreshToken), 30_000)
      }
    } finally {
      ready.value = true
    }
  }

  async function signOut(): Promise<void> {
    try {
      const token = await window.personnelArchive.loadRefreshCredential()
      if (token !== null) await logout(token)
    } finally {
      await clearSession(false)
    }
  }

  async function expire(): Promise<void> {
    await clearSession(true)
  }

  async function refreshInBackground(token: string): Promise<void> {
    await restore(token)
  }

  onSessionExpired(expire)
  return {
    user,
    ready,
    expired,
    restoreMessage,
    isAuthenticated,
    signIn,
    restore,
    signOut,
    expire,
  }
})
