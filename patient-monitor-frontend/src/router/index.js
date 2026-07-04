import { createRouter, createWebHashHistory } from 'vue-router'
import PatientList from '../views/PatientList.vue'
import PatientDetail from '../views/PatientDetail.vue'
import AllPatients from '../views/AllPatients.vue'

const routes = [
  {
    path: '/',
    name: 'PatientList',
    component: PatientList
  },
  {
    path: '/all',
    name: 'AllPatients',
    component: AllPatients
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