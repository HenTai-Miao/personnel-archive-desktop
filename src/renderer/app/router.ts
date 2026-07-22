/** 应用路由与登录体验守卫；服务端 Spring Security 仍是最终授权边界。 */
import { createRouter, createWebHashHistory } from "vue-router"
import { useAuthStore } from "@/features/auth/store"

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/login", name: "login", component: () => import("@/features/auth/LoginPage.vue") },
    {
      path: "/",
      component: () => import("@/shared/components/AppShell.vue"),
      meta: { requiresAuth: true },
      children: [
        { path: "", redirect: "/persons" },
        {
          path: "persons",
          name: "person-list",
          component: () => import("@/features/person-list/PersonListPage.vue"),
        },
        {
          path: "search",
          name: "search",
          component: () => import("@/features/family-search/FamilySearchPage.vue"),
        },
        {
          path: "import",
          name: "import",
          component: () => import("@/features/archive-import/ImportPage.vue"),
          meta: { editorOnly: true },
        },
        {
          path: "settings",
          name: "folder-settings",
          component: () => import("@/features/folder-settings/FolderSettingsPage.vue"),
          meta: { editorOnly: true },
        },
        {
          path: "persons/:personId",
          name: "person-detail",
          component: () => import("@/features/archive-view/ArchiveDetailPage.vue"),
        },
      ],
    },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (!auth.ready) await auth.restore()
  if (to.meta["requiresAuth"] && !auth.isAuthenticated) return { name: "login" }
  if (to.name === "login" && auth.isAuthenticated) return { name: "person-list" }
  if (to.meta["editorOnly"]) {
    const roles = auth.user?.roles ?? []
    if (!roles.includes("ADMIN") && !roles.includes("ARCHIVE_EDITOR")) {
      return { name: "person-list" }
    }
  }
  return true
})
