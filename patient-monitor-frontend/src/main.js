import { createApp } from 'vue'
import 'nes.css/css/nes.min.css'
import './assets/main.css'
import App from './App.vue'
import router from './router'

createApp(App).use(router).mount('#app')
