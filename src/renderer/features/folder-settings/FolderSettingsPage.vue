<!-- 文件夹设置页：目录只能经系统选择器授权，选择完成后由主进程立即持久化。 -->
<script setup lang="ts">
import { Folder, FolderOpened } from "@element-plus/icons-vue"
import type { FolderKind, FolderSettings } from "@shared/ipc-contract"
import { computed, onMounted, ref } from "vue"

const settings = ref<FolderSettings>({ pendingDirectory: null, archiveDirectory: null })
const loading = ref(true)
const selecting = ref<FolderKind | null>(null)
const message = ref("")
const errorMessage = ref("")
const configured = computed(
  () => settings.value.pendingDirectory !== null && settings.value.archiveDirectory !== null,
)

onMounted(loadSettings)

async function loadSettings(): Promise<void> {
  loading.value = true
  try {
    settings.value = await window.personnelArchive.loadFolderSettings()
  } catch (error) {
    if (!(error instanceof Error)) throw error
    errorMessage.value = error.message
  } finally {
    loading.value = false
  }
}

async function chooseFolder(kind: FolderKind): Promise<void> {
  selecting.value = kind
  message.value = ""
  errorMessage.value = ""
  try {
    const result = await window.personnelArchive.selectFolder(kind)
    settings.value = result.settings
    switch (result.status) {
      case "CANCELED":
        return
      case "SAVED":
        message.value = "文件夹设置已保存，新的工作簿会自动加入导入队列"
        return
      case "REJECTED":
        errorMessage.value = result.message
        return
      default:
        return assertNever(result)
    }
  } catch (error) {
    if (!(error instanceof Error)) throw error
    errorMessage.value = error.message
  } finally {
    selecting.value = null
  }
}

function assertNever(value: never): never {
  throw new TypeError(`未知目录选择结果：${String(value)}`)
}
</script>

<template>
  <section class="page-stack folder-settings-page">
    <header class="page-header">
      <div>
        <span class="section-kicker">本机流转规则</span>
        <h1>文件夹设置</h1>
        <p>指定工作簿从哪里进入上传队列，以及导入成功后存放到哪里。</p>
      </div>
      <div class="header-stamp">本机<br />专用</div>
    </header>

    <div class="folder-route" aria-label="工作簿流转路径">
      <div class="route-node">
        <span>待上传</span>
        <strong>自动扫描</strong>
      </div>
      <div class="route-line"><span>上传成功后移动</span></div>
      <div class="route-node is-archive">
        <span>已完成</span>
        <strong>安全归档</strong>
      </div>
    </div>

    <div v-loading="loading" class="paper-card folder-settings-card">
      <div class="folder-setting-row">
        <div class="folder-setting-icon"><el-icon><Folder /></el-icon></div>
        <div class="folder-setting-copy">
          <strong>待上传文件夹</strong>
          <p>登录后程序会持续扫描此目录中的 .xlsx，并自动加入导入队列。</p>
          <el-input
            :model-value="settings.pendingDirectory ?? '尚未设置'"
            readonly
            aria-label="待上传文件夹路径"
          />
        </div>
        <el-button
          data-test="choose-pending-folder"
          :loading="selecting === 'PENDING'"
          @click="chooseFolder('PENDING')"
        >选择文件夹</el-button>
      </div>

      <div class="folder-setting-row">
        <div class="folder-setting-icon archive"><el-icon><FolderOpened /></el-icon></div>
        <div class="folder-setting-copy">
          <strong>上传完成归档文件夹</strong>
          <p>仅自动扫描的文件会在导入或覆盖成功后移动；手动选择的文件始终保留原位。</p>
          <el-input
            :model-value="settings.archiveDirectory ?? '尚未设置'"
            readonly
            aria-label="上传完成归档文件夹路径"
          />
        </div>
        <el-button
          data-test="choose-archive-folder"
          :loading="selecting === 'ARCHIVE'"
          @click="chooseFolder('ARCHIVE')"
        >选择文件夹</el-button>
      </div>
    </div>

    <el-alert v-if="errorMessage" :title="errorMessage" type="error" :closable="false" show-icon />
    <el-alert v-else-if="message" :title="message" type="success" :closable="false" show-icon />
    <div class="folder-rule-note" :class="{ ready: configured }">
      <strong>{{ configured ? "自动队列已就绪" : "还需完成两项设置" }}</strong>
      <span>归档目录被删除后会自动重建；遇到同名文件会追加序号，任何移动失败都保留源文件。</span>
    </div>
  </section>
</template>
