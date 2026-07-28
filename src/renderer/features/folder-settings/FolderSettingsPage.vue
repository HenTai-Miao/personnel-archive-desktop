<!-- B 文件夹设置页：目录只经系统选择器授权，并以本地流转纸页呈现。 -->
<script setup lang="ts">
import { Folder, FolderOpened } from "@element-plus/icons-vue"
import type { FolderKind, FolderSettings } from "@shared/ipc-contract"
import { computed, onMounted, ref } from "vue"
import DossierOutline from "@/shared/components/DossierOutline.vue"

const FOLDER_SECTIONS = [
  { id: "folder-pending", label: "待上传目录", code: "01" },
  { id: "folder-archive", label: "成功归档目录", code: "02" },
  { id: "folder-security", label: "安全规则", code: "03" },
] as const

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
        <p class="page-eyebrow">LOCAL FOLDER ROUTE / 自动扫描</p>
        <h1>文件夹设置</h1>
        <p class="page-summary">配置工作簿从待上传目录到完成归档目录的本地安全流转路径。</p>
      </div>
    </header>

    <el-alert
      v-if="errorMessage"
      class="folder-settings-alert"
      :title="errorMessage"
      type="error"
      :closable="false"
      show-icon
    />
    <el-alert
      v-else-if="message"
      class="folder-settings-alert"
      :title="message"
      type="success"
      :closable="false"
      show-icon
    />

    <div class="folder-reading-layout">
      <main v-loading="loading" class="folder-settings-sheet">
        <header class="folder-route-hero">
          <div>
            <span class="folder-route-kicker">LOCAL WORKBOOK FLOW</span>
            <h2>本地工作簿安全流转</h2>
            <p>只有自动扫描文件会在导入成功后移动，手动选择文件始终保留原位。</p>
          </div>
          <div class="folder-route" aria-label="工作簿流转路径">
            <div class="route-node">
              <span class="route-node-label">待上传</span>
              <strong>自动扫描</strong>
            </div>
            <div class="route-line"><span class="route-line-label">成功后移动</span></div>
            <div class="route-node is-archive">
              <span class="route-node-label">已完成</span>
              <strong>安全归档</strong>
            </div>
          </div>
        </header>

        <section id="folder-pending" class="folder-setting-section">
          <div class="folder-setting-icon"><el-icon><Folder /></el-icon></div>
          <div class="folder-setting-copy">
            <span class="folder-section-kicker">01 / PENDING DIRECTORY</span>
            <h2>待上传文件夹</h2>
            <p>登录后程序会持续扫描此目录中的 .xlsx，并自动加入导入队列。</p>
            <label>
              <small>当前授权路径</small>
              <el-input
                :model-value="settings.pendingDirectory ?? '尚未设置'"
                readonly
                aria-label="待上传文件夹路径"
              />
            </label>
          </div>
          <el-button
            data-test="choose-pending-folder"
            :loading="selecting === 'PENDING'"
            @click="chooseFolder('PENDING')"
          >
            选择文件夹
          </el-button>
        </section>

        <section id="folder-archive" class="folder-setting-section">
          <div class="folder-setting-icon archive"><el-icon><FolderOpened /></el-icon></div>
          <div class="folder-setting-copy">
            <span class="folder-section-kicker">02 / ARCHIVE DIRECTORY</span>
            <h2>上传完成归档文件夹</h2>
            <p>仅自动扫描的文件会在导入或覆盖成功后移动；移动失败时始终保留源文件。</p>
            <label>
              <small>当前授权路径</small>
              <el-input
                :model-value="settings.archiveDirectory ?? '尚未设置'"
                readonly
                aria-label="上传完成归档文件夹路径"
              />
            </label>
          </div>
          <el-button
            data-test="choose-archive-folder"
            :loading="selecting === 'ARCHIVE'"
            @click="chooseFolder('ARCHIVE')"
          >
            选择文件夹
          </el-button>
        </section>

        <section id="folder-security" class="folder-security-section" :class="{ ready: configured }">
          <div>
            <span class="folder-section-kicker">03 / SAFETY POLICY</span>
            <h2>安全规则</h2>
          </div>
          <strong>{{ configured ? '自动队列已就绪' : '还需完成两项设置' }}</strong>
          <ul>
            <li>归档目录被删除后会自动重建。</li>
            <li>遇到同名文件会追加序号，绝不覆盖已有文件。</li>
            <li>任何移动失败都会保留源文件并允许重试。</li>
          </ul>
        </section>
      </main>

      <DossierOutline class="folder-outline" title="目录与规则" :sections="FOLDER_SECTIONS" />
    </div>
  </section>
</template>
