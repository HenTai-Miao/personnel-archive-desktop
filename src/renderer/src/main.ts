/** Renderer 组合根：集中安装 Vue、Pinia、Router、Element Plus、Avue 和全局样式。 */
import "element-plus/dist/index.css"
import "@smallwei/avue/lib/index.css"
import "./styles.css"
import Avue from "@smallwei/avue"
import ElementPlus from "element-plus"
import { createPinia } from "pinia"
import { createApp } from "vue"
import App from "../app/App.vue"
import { router } from "../app/router"

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(ElementPlus)
app.use(Avue, { size: "default", menuType: "text", locale: "zh-cn" })
app.mount("#app")
