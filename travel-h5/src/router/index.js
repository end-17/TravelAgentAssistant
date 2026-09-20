import {createRouter,createWebHistory} from 'vue-router'

const routes = [
  {
    path:'/',
    name: 'Home',
    component:()=>import('../views/Home.vue')
  },
  {
    path:'/chat',
    name: 'Chat',
    component:()=>import('../views/Chat.vue')
  },
  {
    path:'/profile',
    name: 'Profile',
    component:()=>import('../views/profile.vue')
  },
  {
    path:'/detail',
    name: 'Detail',
    component:()=>import('../views/Detail.vue')
  }
]

const router = createRouter({
  history:createWebHistory(),
  routes
})

export default router