import './assets/main.css'
import './styles/app.css'
import './styles/chat.css'
import './styles/sidebar.css'  // 添加这一行
import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'

const app = createApp(App)
app.use(ElementPlus)
app.mount('#app')
