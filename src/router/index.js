import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/games',
    name: 'GameCenter',
    component: () => import('../views/GameCenter.vue')
  },
  {
    path: '/games/:id',
    name: 'GameDetail',
    component: () => import('../views/GameDetail.vue'),
    props: true
  },
  {
    path: '/strategies/:id',
    name: 'StrategyDetail',
    component: () => import('../views/StrategyDetail.vue'),
    props: true
  },
  {
      path: '/admin',
      redirect: '/admin/login'
    },
    {
      path: '/admin/login',
      name: 'AdminLogin',
      component: () => import('../views/AdminLogin.vue')
    },
    {
      path: '/admin',
      component: () => import('../layouts/AdminLayout.vue'),
      children: [
        {
          path: 'dashboard',
          name: 'AdminDashboard',
          component: () => import('../views/AdminDashboard.vue')
        },
        {
          path: 'games',
          name: 'AdminGameManage',
          component: () => import('../views/AdminGameManage.vue')
        },
        {
          path: 'strategies',
          name: 'AdminStrategyManage',
          component: () => import('../views/AdminStrategyManage.vue')
        }
      ]
    },
  {
    path: '/ai-test',
    name: 'AITest',
    component: () => import('../views/AITest.vue')
  },
  {
    path: '/search',
    name: 'SearchResults',
    component: () => import('../views/SearchResults.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const isAuthenticated = localStorage.getItem('admin_token')
  
  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/admin/login')
  } else {
    next()
  }
})

export default router