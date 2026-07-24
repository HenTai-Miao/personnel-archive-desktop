<!-- 卷宗预览分栏：承载预览面板和可访问的尺寸调节边界。 -->
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue"
import type { PersonDetail } from "@/features/archive-view/schemas"
import type { PersonId } from "@/shared/api/schemas"
import PersonArchivePreview from "./PersonArchivePreview.vue"
import type { PersonPreviewState } from "./use-person-preview"

const props = defineProps<{
  readonly state: PersonPreviewState
  readonly openingPersonId: PersonId | null
  readonly initialWidth?: number | undefined
}>()

const emit = defineEmits<{
  close: []
  retry: [personId: PersonId]
  retryPhoto: []
  view: [personId: PersonId]
  exportPerson: [person: PersonDetail]
  widthChange: [width: number]
}>()

const PREVIEW_WIDTH = {
  default: 320,
  min: 280,
  keyboardStep: 16,
} as const

const initialWidth = Math.max(PREVIEW_WIDTH.min, props.initialWidth ?? PREVIEW_WIDTH.default)
const width = ref(initialWidth)
const maxWidth = ref(Math.max(initialWidth, window.innerWidth))
const resizing = ref(false)
const dockElement = ref<HTMLElement | null>(null)
const dockStyle = computed(() => ({ "--person-preview-width": `${width.value}px` }))
let resizePointerId: number | null = null
let resizeStartX = 0
let resizeStartWidth: number = PREVIEW_WIDTH.default
let workbenchResizeObserver: ResizeObserver | null = null

onMounted(() => {
  const workbench = dockElement.value?.closest<HTMLElement>(".person-workbench")
  if (!workbench) return
  syncWorkbenchWidth(workbench)
  if (typeof ResizeObserver === "undefined") return
  workbenchResizeObserver = new ResizeObserver(() => syncWorkbenchWidth(workbench))
  workbenchResizeObserver.observe(workbench)
})

onBeforeUnmount(() => workbenchResizeObserver?.disconnect())

function clampWidth(value: number): number {
  return Math.min(maxWidth.value, Math.max(PREVIEW_WIDTH.min, value))
}

function configuredOpenGap(workbench: HTMLElement): number {
  const value = Number.parseFloat(
    window.getComputedStyle(workbench).getPropertyValue("--person-workbench-open-gap"),
  )
  return Number.isFinite(value) ? value : 0
}

function syncWorkbenchWidth(workbench: HTMLElement): void {
  const availableWidth = Math.floor(workbench.clientWidth - configuredOpenGap(workbench))
  if (availableWidth <= 0) return
  maxWidth.value = Math.max(PREVIEW_WIDTH.min, availableWidth)
  if (width.value > maxWidth.value) setWidth(maxWidth.value)
}

function beginResize(event: PointerEvent): void {
  resizePointerId = event.pointerId
  resizeStartX = event.clientX
  resizeStartWidth = width.value
  resizing.value = true
  const target = event.currentTarget
  if (target instanceof HTMLElement && typeof target.setPointerCapture === "function") {
    target.setPointerCapture(event.pointerId)
  }
}

function resize(event: PointerEvent): void {
  if (event.pointerId !== resizePointerId) return
  setWidth(resizeStartWidth + resizeStartX - event.clientX)
}

function endResize(event: PointerEvent): void {
  if (event.pointerId !== resizePointerId) return
  const target = event.currentTarget
  if (
    target instanceof HTMLElement &&
    typeof target.hasPointerCapture === "function" &&
    typeof target.releasePointerCapture === "function" &&
    target.hasPointerCapture(event.pointerId)
  ) {
    target.releasePointerCapture(event.pointerId)
  }
  resizePointerId = null
  resizing.value = false
}

function resizeFromKeyboard(event: KeyboardEvent): void {
  let delta = 0
  if (event.key === "ArrowLeft") delta = PREVIEW_WIDTH.keyboardStep
  if (event.key === "ArrowRight") delta = -PREVIEW_WIDTH.keyboardStep
  if (delta === 0) return
  event.preventDefault()
  setWidth(width.value + delta)
}

function setWidth(value: number): void {
  width.value = clampWidth(value)
  emit("widthChange", width.value)
}
</script>

<template>
  <div
    ref="dockElement"
    class="person-preview-dock"
    :class="{ 'is-preview-resizing': resizing }"
    :style="dockStyle"
    data-test="person-preview-dock"
  >
    <div
      class="person-preview-resizer"
      data-test="person-preview-resizer"
      role="separator"
      tabindex="0"
      aria-label="调整卷宗预览宽度"
      aria-orientation="vertical"
      :aria-valuemin="PREVIEW_WIDTH.min"
      :aria-valuemax="maxWidth"
      :aria-valuenow="width"
      @pointerdown="beginResize"
      @pointermove="resize"
      @pointerup="endResize"
      @pointercancel="endResize"
      @keydown="resizeFromKeyboard"
    />
    <PersonArchivePreview
      :state="state"
      :opening-person-id="openingPersonId"
      @close="emit('close')"
      @retry="emit('retry', $event)"
      @retry-photo="emit('retryPhoto')"
      @view="emit('view', $event)"
      @export-person="emit('exportPerson', $event)"
    />
  </div>
</template>
