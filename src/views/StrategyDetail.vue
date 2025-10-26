<template>
  <div class="strategy-detail" v-loading="loading">
    <div v-if="strategy" class="strategy-content">
      <!-- 攻略头部信息 -->
      <div class="strategy-header">
        <div class="container">
          <div class="header-content">
            <div class="breadcrumb">
              <el-breadcrumb separator="/">
                <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
                <el-breadcrumb-item :to="{ path: '/games' }">游戏中心</el-breadcrumb-item>
                <el-breadcrumb-item v-if="strategy.games">
                  {{ strategy.games.name }}
                </el-breadcrumb-item>
                <el-breadcrumb-item>{{ strategy.title }}</el-breadcrumb-item>
              </el-breadcrumb>
            </div>
            
            <h1 class="strategy-title">{{ strategy.title }}</h1>
            
            <div class="strategy-meta">
              <div class="meta-left">
                <div class="game-info" v-if="strategy.games">
                  <img
                    :src="strategy.games.cover_image_url || '/game-placeholder.svg'"
                    :alt="strategy.games.name"
                    class="game-avatar"
                    @error="handleImageError"
                  />
                  <div class="game-details">
                    <h3 class="game-name">{{ strategy.games.name }}</h3>
                    <p class="game-developer">{{ strategy.games.developer }}</p>
                  </div>
                </div>
              </div>
              
              <div class="meta-right">
                <div class="strategy-stats">
                  <div class="stat-item">
                    <el-icon><View /></el-icon>
                    <span>{{ strategy.view_count || 0 }} 次浏览</span>
                  </div>
                  <div class="stat-item">
                    <el-icon><Clock /></el-icon>
                    <span>{{ formatDate(strategy.created_at) }}</span>
                  </div>
                  <div class="stat-item" v-if="strategy.difficulty_level">
                    <el-icon><Star /></el-icon>
                    <span>难度 {{ strategy.difficulty_level }}/5</span>
                  </div>
                </div>
                
                <div class="action-buttons">
                  <el-button @click="generateSummary" :loading="summaryLoading">
                    <el-icon><MagicStick /></el-icon>
                    AI摘要
                  </el-button>
                  <el-button @click="showAIChat">
                    <el-icon><ChatDotRound /></el-icon>
                    AI问答
                  </el-button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- AI 分析器 -->
      <AIAnalyzer 
        v-if="showAISummary"
        :strategy-content="strategy.content"
        :strategy-title="strategy.title"
        :game-info="strategy.game"
      />

      <!-- AI摘要区域 -->
      <div v-if="aiSummary" class="ai-summary-section">
        <div class="container">
          <div class="ai-summary-card">
            <div class="summary-header">
              <div class="summary-icon">
                <el-icon><Robot /></el-icon>
              </div>
              <h3>AI智能摘要</h3>
              <el-button
                size="small"
                type="info"
                text
                @click="aiSummary = ''"
              >
                <el-icon><Close /></el-icon>
              </el-button>
            </div>
            <div class="summary-content">
              {{ aiSummary }}
            </div>
          </div>
        </div>
      </div>

      <!-- 攻略标签 -->
      <div v-if="strategy.strategy_tags && strategy.strategy_tags.length > 0" class="tags-section">
        <div class="container">
          <div class="tags-wrapper">
            <span class="tags-label">标签：</span>
            <div class="tags-list">
              <el-tag
                v-for="tagRelation in strategy.strategy_tags"
                :key="tagRelation.tags.id"
                type="info"
                size="small"
              >
                {{ tagRelation.tags.name }}
              </el-tag>
            </div>
          </div>
        </div>
      </div>

      <!-- 攻略正文 -->
      <div class="strategy-body">
        <div class="container">
          <div class="content-wrapper">
            <article class="strategy-article">
              <div class="article-content" v-html="formattedContent"></div>
            </article>
            
            <!-- 侧边栏 -->
            <aside class="strategy-sidebar">
              <!-- 目录导航 -->
              <div class="sidebar-card toc-card" v-if="tocItems.length > 0">
                <h4 class="card-title">目录</h4>
                <ul class="toc-list">
                  <li
                    v-for="item in tocItems"
                    :key="item.id"
                    class="toc-item"
                    :class="{ active: activeSection === item.id }"
                    @click="scrollToSection(item.id)"
                  >
                    {{ item.text }}
                  </li>
                </ul>
              </div>
              
              <!-- 相关攻略 -->
              <div class="sidebar-card related-card" v-if="relatedStrategies.length > 0">
                <h4 class="card-title">相关攻略</h4>
                <div class="related-list">
                  <div
                    v-for="related in relatedStrategies"
                    :key="related.id"
                    class="related-item"
                    @click="goToStrategy(related.id)"
                  >
                    <h5 class="related-title">{{ related.title }}</h5>
                    <div class="related-meta">
                      <span class="view-count">
                        <el-icon><View /></el-icon>
                        {{ related.view_count || 0 }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- 快速操作 -->
              <div class="sidebar-card actions-card">
                <h4 class="card-title">快速操作</h4>
                <div class="action-list">
                  <el-button
                    type="primary"
                    @click="showAIChat"
                    block
                  >
                    <el-icon><ChatDotRound /></el-icon>
                    向AI提问
                  </el-button>
                  <el-button
                    @click="generateSummary"
                    :loading="summaryLoading"
                    block
                  >
                    <el-icon><MagicStick /></el-icon>
                    生成摘要
                  </el-button>
                  <el-button
                    @click="copyLink"
                    block
                  >
                    <el-icon><Share /></el-icon>
                    分享链接
                  </el-button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>

    <!-- 错误状态 -->
    <div v-else-if="!loading" class="error-state">
      <div class="container">
        <el-result
          icon="error"
          title="攻略不存在"
          sub-title="抱歉，您访问的攻略不存在或已被删除"
        >
          <template #extra>
            <el-button type="primary" @click="$router.push('/games')">
              返回游戏中心
            </el-button>
          </template>
        </el-result>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGameStore } from '../stores/game'
import { ElMessage } from 'element-plus'
import AIAnalyzer from '../components/AIAnalyzer.vue'

const route = useRoute()
const router = useRouter()
const gameStore = useGameStore()

const loading = ref(true)
const strategy = ref(null)
const aiSummary = ref('')
const summaryLoading = ref(false)
const tocItems = ref([])
const activeSection = ref('')
const relatedStrategies = ref([])

// 计算属性
const formattedContent = computed(() => {
  if (!strategy.value?.content) return ''
  
  // 简单的Markdown到HTML转换（实际项目中建议使用专业的Markdown解析器）
  let html = strategy.value.content
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^### (.*$)/gim, '<h3 id="heading-$1">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 id="heading-$1">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 id="heading-$1">$1</h1>')
  
  return html
})

// 方法
const fetchStrategy = async () => {
  try {
    loading.value = true
    const strategyId = route.params.id
    
    await gameStore.fetchStrategy(strategyId)
    strategy.value = gameStore.strategies.find(s => s.id === parseInt(strategyId))
    
    if (strategy.value) {
      // 获取相关攻略
      if (strategy.value.game_id) {
        await gameStore.fetchStrategiesByGame(strategy.value.game_id)
        relatedStrategies.value = gameStore.strategies
          .filter(s => s.id !== strategy.value.id)
          .slice(0, 5)
      }
      
      // 生成目录
      generateTOC()
    }
  } catch (error) {
    console.error('获取攻略失败:', error)
    ElMessage.error('获取攻略失败')
  } finally {
    loading.value = false
  }
}

const generateTOC = () => {
  if (!strategy.value?.content) return
  
  const headings = strategy.value.content.match(/^#{1,3} (.+)$/gm)
  if (headings) {
    tocItems.value = headings.map((heading, index) => ({
      id: `heading-${heading.replace(/^#{1,3} /, '')}`,
      text: heading.replace(/^#{1,3} /, ''),
      level: heading.match(/^#{1,3}/)[0].length
    }))
  }
}

const generateSummary = async () => {
  if (!strategy.value) return
  
  try {
    summaryLoading.value = true
    
    // 模拟AI摘要生成
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    aiSummary.value = `基于《${strategy.value.title}》攻略内容，AI为您总结以下要点：
    
1. 核心策略：本攻略主要介绍了游戏中的关键玩法和技巧
2. 适用场景：适合中级以上玩家参考学习
3. 重点提示：注意资源分配和时机把握
4. 预期效果：按照攻略执行可显著提升游戏体验

建议结合实际游戏情况灵活运用攻略内容。`
    
    ElMessage.success('AI摘要生成成功')
  } catch (error) {
    console.error('生成摘要失败:', error)
    ElMessage.error('生成摘要失败')
  } finally {
    summaryLoading.value = false
  }
}

const showAIChat = () => {
  const event = new CustomEvent('show-ai-chat')
  window.dispatchEvent(event)
}

const scrollToSection = (sectionId) => {
  const element = document.getElementById(sectionId)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' })
    activeSection.value = sectionId
  }
}

const goToStrategy = (strategyId) => {
  router.push(`/strategies/${strategyId}`)
}

const copyLink = async () => {
  try {
    await navigator.clipboard.writeText(window.location.href)
    ElMessage.success('链接已复制到剪贴板')
  } catch (error) {
    ElMessage.error('复制链接失败')
  }
}

const handleImageError = (event) => {
  event.target.src = '/game-placeholder.svg'
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('zh-CN')
}

// 滚动监听
const handleScroll = () => {
  const sections = tocItems.value.map(item => document.getElementById(item.id)).filter(Boolean)
  
  for (let i = sections.length - 1; i >= 0; i--) {
    const section = sections[i]
    const rect = section.getBoundingClientRect()
    
    if (rect.top <= 100) {
      activeSection.value = section.id
      break
    }
  }
}

onMounted(async () => {
  await fetchStrategy()
  
  // 添加滚动监听
  window.addEventListener('scroll', handleScroll)
  
  // 初始化目录高亮
  nextTick(() => {
    handleScroll()
  })
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
.strategy-detail {
  background: var(--bg-color-page);
  color: var(--text-color-primary);
  min-height: 100vh;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.strategy-header {
  background: var(--tech-bg-dark);
  padding: 40px 0;
  border-bottom: 1px solid var(--border-color);
}

.breadcrumb {
  margin-bottom: 20px;
}

:deep(.el-breadcrumb__item) {
  color: var(--text-color-secondary);
}

:deep(.el-breadcrumb__item.is-link) {
  color: var(--primary-color);
}

.strategy-title {
  font-size: 2.5rem;
  margin-bottom: 30px;
  background: linear-gradient(45deg, #00d4ff, #00ffff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1.2;
}

.strategy-meta {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 30px;
}

.game-info {
  display: flex;
  align-items: center;
  gap: 15px;
}

.game-avatar {
  width: 60px;
  height: 60px;
  border-radius: 10px;
  object-fit: cover;
  border: 2px solid var(--border-color-light);
}

.game-name {
  font-size: 1.2rem;
  color: var(--primary-color);
  margin-bottom: 5px;
}

.game-developer {
  color: var(--text-color-secondary);
  font-size: 14px;
}

.meta-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 15px;
}

.strategy-stats {
  display: flex;
  gap: 20px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--text-color-secondary);
  font-size: 14px;
}

.action-buttons {
  display: flex;
  gap: 10px;
}

.ai-summary-section {
  padding: 30px 0;
  background: var(--fill-color-light);
  border-bottom: 1px solid var(--border-color-light);
}

.ai-summary-card {
  background: var(--fill-color);
  border: 1px solid var(--border-color-light);
  border-radius: 15px;
  padding: 25px;
}

.summary-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 15px;
}

.summary-icon {
  width: 30px;
  height: 30px;
  background: var(--primary-color);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.summary-icon .el-icon {
  color: white;
  font-size: 16px;
}

.summary-header h3 {
  flex: 1;
  color: var(--primary-color);
  margin: 0;
}

.summary-content {
  color: var(--text-color-primary);
  line-height: 1.8;
  white-space: pre-line;
}

.tags-section {
  padding: 20px 0;
  border-bottom: 1px solid var(--border-color);
}

.tags-wrapper {
  display: flex;
  align-items: center;
  gap: 15px;
}

.tags-label {
  color: rgba(255, 255, 255, 0.7);
  font-weight: bold;
}

.tags-list {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.strategy-body {
  padding: 40px 0;
}

.content-wrapper {
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 40px;
}

.strategy-article {
  background: rgba(255, 255, 255, 0.02);
  border-radius: 15px;
  padding: 40px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.article-content {
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.9);
}

.article-content :deep(h1),
.article-content :deep(h2),
.article-content :deep(h3) {
  color: #00d4ff;
  margin: 30px 0 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(0, 212, 255, 0.2);
}

.article-content :deep(h1) {
  font-size: 1.8rem;
}

.article-content :deep(h2) {
  font-size: 1.5rem;
}

.article-content :deep(h3) {
  font-size: 1.3rem;
}

.article-content :deep(strong) {
  color: #00d4ff;
  font-weight: bold;
}

.article-content :deep(em) {
  color: #00ffff;
  font-style: italic;
}

.strategy-sidebar {
  display: flex;
  flex-direction: column;
  gap: 25px;
}

.sidebar-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  padding: 20px;
}

.card-title {
  color: #00d4ff;
  margin-bottom: 15px;
  font-size: 1.1rem;
  font-weight: bold;
}

.toc-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.toc-item {
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.3s ease;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
}

.toc-item:hover {
  background: rgba(0, 212, 255, 0.1);
  color: #00d4ff;
}

.toc-item.active {
  background: rgba(0, 212, 255, 0.2);
  color: #00d4ff;
  font-weight: bold;
}

.related-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.related-item {
  padding: 15px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.related-item:hover {
  background: rgba(0, 212, 255, 0.1);
  border-color: #00d4ff;
}

.related-title {
  color: #ffffff;
  margin-bottom: 8px;
  font-size: 14px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.related-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.view-count {
  display: flex;
  align-items: center;
  gap: 4px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 12px;
}

.action-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.error-state {
  padding: 100px 0;
}

@media (max-width: 1024px) {
  .content-wrapper {
    grid-template-columns: 1fr;
    gap: 30px;
  }
  
  .strategy-sidebar {
    order: -1;
  }
  
  .sidebar-card {
    display: none;
  }
  
  .actions-card {
    display: block;
  }
  
  .action-list {
    flex-direction: row;
    flex-wrap: wrap;
  }
}

@media (max-width: 768px) {
  .strategy-title {
    font-size: 1.8rem;
  }
  
  .strategy-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 20px;
  }
  
  .meta-right {
    align-items: flex-start;
    width: 100%;
  }
  
  .strategy-stats {
    flex-wrap: wrap;
  }
  
  .action-buttons {
    width: 100%;
    justify-content: flex-start;
  }
  
  .strategy-article {
    padding: 25px;
  }
}
</style>