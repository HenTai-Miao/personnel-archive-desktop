<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue"

export type DossierSection = {
  readonly id: string
  readonly label: string
  readonly code: string
}

const props = defineProps<{
  readonly title: string
  readonly sections: readonly DossierSection[]
}>()

const activeSection = ref(props.sections[0]?.id ?? "")
let observer: IntersectionObserver | null = null

onMounted(() => {
  if (typeof IntersectionObserver === "undefined") return
  observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top)[0]
      if (visible?.target.id) activeSection.value = visible.target.id
    },
    { rootMargin: "-88px 0px -62% 0px", threshold: [0, 0.15, 1] },
  )
  for (const section of props.sections) {
    const element = document.getElementById(section.id)
    if (element !== null) observer.observe(element)
  }
})

onBeforeUnmount(() => observer?.disconnect())

function navigate(sectionId: string): void {
  activeSection.value = sectionId
  const reducedMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  document.getElementById(sectionId)?.scrollIntoView({
    behavior: reducedMotion ? "auto" : "smooth",
    block: "start",
  })
}
</script>

<template>
  <div class="dossier-navigation">
    <aside class="dossier-outline" aria-label="卷宗章节目录">
      <header>
        <span>CONTENTS</span>
        <h2>{{ title }}</h2>
      </header>
      <nav>
        <button
          v-for="section in sections"
          :key="section.id"
          type="button"
          :data-section="section.id"
          :class="{ active: activeSection === section.id }"
          :aria-current="activeSection === section.id ? 'location' : undefined"
          @click="navigate(section.id)"
        >
          <span>{{ section.code }}</span>
          <strong>{{ section.label }}</strong>
        </button>
      </nav>
      <footer><i aria-hidden="true"></i>当前有效卷宗</footer>
    </aside>

    <nav class="dossier-mobile-index" aria-label="卷宗章节快捷导航">
      <span>{{ title }}</span>
      <button
        v-for="section in sections"
        :key="section.id"
        type="button"
        :data-section="section.id"
        :class="{ active: activeSection === section.id }"
        :aria-current="activeSection === section.id ? 'location' : undefined"
        @click="navigate(section.id)"
      >
        {{ section.code }} {{ section.label }}
      </button>
    </nav>
  </div>
</template>
