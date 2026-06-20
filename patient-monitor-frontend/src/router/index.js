import { createRouter, createWebHashHistory } from 'vue-router'
import PatientList from '../views/PatientList.vue'
import PatientDetail from '../views/PatientDetail.vue'

const routes = [
  {
    path: '/',
    name: 'PatientList',
    component: PatientList
  },
  {
    path: '/patient/:id',
    name: 'PatientDetail',
    component: PatientDetail
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router