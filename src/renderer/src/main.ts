/** Renderer 组合根：集中安装 Vue、Pinia、Router、Element Plus 和 B 系列全局样式。 */
import "element-plus/dist/index.css"
import "./styles.css"
import ElementPlus from "element-plus"
import { createPinia } from "pinia"
import { createApp } from "vue"
import App from "../app/App.vue"
import { router } from "../app/router"

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(ElementPlus)
app.mount("#app")
