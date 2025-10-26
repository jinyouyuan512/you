<template>
  <div class="search-results">
    <div class="search-header">
      <h2>搜索结果</h2>
      <p v-if="searchQuery">
        关于 "<span class="search-term">{{ searchQuery }}</span>" 的搜索结果
        <span class="result-count">(共 {{ totalResults }} 条)</span>
      </p>
    </div>

    <!-- 搜索筛选 -->
    <div class="search-filters">
      <el-radio-group v-model="activeTab" @change="handleTabChange">
        <el-radio-button label="all">全部 ({{ totalResults }})</el-radio-button>
        <el-radio-button label="games">游戏 ({{ gameResults.length }})</el-radio-button>
        <el-radio-button label="strategies">攻略 ({{ strategyResults.length }})</el-radio-button>
      </el-radio-group>
      
      <div class="filter-options">
        <el-select v-model="sortBy" placeholder="排序方式" @change="handleSort">
          <el-option label="相关度" value="relevance" />
          <el-option label="时间" value="time" />
          <el-option label="热度" value="popularity" />
        </el-select>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="5" animated />
    </div>

    <!-- 无结果 -->
    <div v-else-if="totalResults === 0" class="no-results">
      <el-empty description="没有找到相关内容">
        <el-button type="primary" @click="$router.push('/')">返回首页</el-button>
      </el-empty>
    </div>

    <!-- 搜索结果 -->
    <div v-else class="results-container">
      <!-- 游戏结果 -->
      <div v-if="activeTab === 'all' || activeTab === 'games'" class="results-section">
        <h3 v-if="activeTab === 'all' && gameResults.length > 0" class="section-title">
          <el-icon><Grid /></el-icon>
          游戏 ({{ gameResults.length }})
        </h3>
        <div class="game-results">
          <div
            v-for="game in displayedGames"
            :key="game.id"
            class="game-card"
            @click="$router.push(`/games/${game.id}`)"
          >
            <div class="game-image">
              <img :src="game.image_url || '/game-placeholder.svg'" :alt="game.name" />
            </div>
            <div class="game-info">
              <h4 class="game-title" v-html="highlightText(game.name)"></h4>
              <p class="game-description" v-html="highlightText(game.description)"></p>
              <div class="game-meta">
                <el-tag size="small">{{ game.category }}</el-tag>
                <span class="game-developer">{{ game.developer }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 攻略结果 -->
      <div v-if="activeTab === 'all' || activeTab === 'strategies'" class="results-section">
        <h3 v-if="activeTab === 'all' && strategyResults.length > 0" class="section-title">
          <el-icon><Document /></el-icon>
          攻略 ({{ strategyResults.length }})
        </h3>
        <div class="strategy-results">
          <div
            v-for="strategy in displayedStrategies"
            :key="strategy.id"
            class="strategy-card"
            @click="$router.push(`/strategies/${strategy.id}`)"
          >
            <div class="strategy-header">
              <h4 class="strategy-title" v-html="highlightText(strategy.title)"></h4>
              <div class="strategy-meta">
                <el-tag :type="getDifficultyType(strategy.difficulty)" size="small">
                  {{ getDifficultyText(strategy.difficulty) }}
                </el-tag>
                <span class="strategy-game">{{ strategy.game_name }}</span>
              </div>
            </div>
            <p class="strategy-content" v-html="highlightText(strategy.content_preview)"></p>
            <div class="strategy-footer">
              <span class="strategy-author">作者: {{ strategy.author }}</span>
              <span class="strategy-date">{{ formatDate(strategy.created_at) }}</span>
              <span class="strategy-views">{{ strategy.views || 0 }} 浏览</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div v-if="totalResults > pageSize" class="pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          :total="totalResults"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <!-- AI 搜索摘要 -->
    <div v-if="searchQuery && (gameResults.length > 0 || strategyResults.length > 0)" class="ai-summary-section">
      <div class="ai-summary-card">
        <div class="summary-header">
          <h3>
            <el-icon><MagicStick /></el-icon>
            AI 搜索摘要
          </h3>
          <el-button 
            size="small" 
            type="primary" 
            :loading="summaryLoading"
            @click="generateSummary"
          >
            {{ summaryLoading ? '生成中...' : '重新生成' }}
          </el-button>
        </div>
        
        <div v-if="summaryLoading" class="summary-loading">
          <el-skeleton :rows="3" animated />
        </div>
        
        <div v-else-if="aiSummary" class="summary-content">
          <div class="summary-text">{{ aiSummary }}</div>
          <div class="summary-tags">
            <el-tag 
              v-for="tag in summaryTags" 
              :key="tag" 
              size="small" 
              type="info"
            >
              {{ tag }}
            </el-tag>
          </div>
        </div>
        
        <div v-else class="summary-placeholder">
          <p>点击"重新生成"获取AI搜索摘要</p>
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import { ElMessage } from 'element-plus'
import { Grid, Document, MagicStick } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()

// 响应式数据
const loading = ref(false)
const summaryLoading = ref(false)
const searchQuery = ref('')
const activeTab = ref('all')
const sortBy = ref('relevance')
const currentPage = ref(1)
const pageSize = ref(20)
const gameResults = ref([])
const strategyResults = ref([])
const aiSummary = ref('')
const summaryTags = ref([])

// 计算属性
const totalResults = computed(() => gameResults.value.length + strategyResults.value.length)

const displayedGames = computed(() => {
  if (activeTab.value === 'strategies') return []
  const start = activeTab.value === 'all' ? 0 : (currentPage.value - 1) * pageSize.value
  const end = activeTab.value === 'all' ? 5 : start + pageSize.value
  return gameResults.value.slice(start, end)
})

const displayedStrategies = computed(() => {
  if (activeTab.value === 'games') return []
  const start = activeTab.value === 'all' ? 0 : (currentPage.value - 1) * pageSize.value
  const end = activeTab.value === 'all' ? 10 : start + pageSize.value
  return strategyResults.value.slice(start, end)
})

// 方法
const performSearch = async (query) => {
  if (!query.trim()) return
  
  loading.value = true
  try {
    await Promise.all([
      searchGames(query),
      searchStrategies(query)
    ])
    
    // 自动生成AI摘要
    if (totalResults.value > 0) {
      await generateSummary()
    }
  } catch (error) {
    console.error('搜索失败:', error)
    ElMessage.error('搜索失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

const searchGames = async (query) => {
  try {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .or(`name.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    gameResults.value = data || []
  } catch (error) {
    console.error('搜索游戏失败:', error)
    gameResults.value = []
  }
}

const searchStrategies = async (query) => {
  try {
    const { data, error } = await supabase
      .from('strategies')
      .select(`
        *,
        games!inner(name)
      `)
      .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    strategyResults.value = (data || []).map(strategy => ({
      ...strategy,
      game_name: strategy.games.name,
      content_preview: strategy.content.substring(0, 200) + '...',
      views: Math.floor(Math.random() * 5000) + 100 // 模拟浏览量
    }))
  } catch (error) {
    console.error('搜索攻略失败:', error)
    strategyResults.value = []
  }
}

const generateSummary = async () => {
  if (!searchQuery.value || totalResults.value === 0) return
  
  summaryLoading.value = true
  try {
    // 模拟AI生成摘要
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const gameCount = gameResults.value.length
    const strategyCount = strategyResults.value.length
    
    let summary = `根据您搜索的"${searchQuery.value}"，我们找到了 ${gameCount} 个相关游戏和 ${strategyCount} 个攻略。`
    
    if (gameCount > 0) {
      const categories = [...new Set(gameResults.value.map(g => g.category))]
      summary += ` 游戏主要涵盖${categories.join('、')}等类型。`
    }
    
    if (strategyCount > 0) {
      const difficulties = strategyResults.value.map(s => s.difficulty).filter(Boolean)
      if (difficulties.length > 0) {
        const difficultyMap = { easy: '简单', medium: '中等', hard: '困难' }
        const difficultyTexts = [...new Set(difficulties.map(d => difficultyMap[d] || d))]
        summary += ` 攻略难度包括${difficultyTexts.join('、')}级别。`
      }
    }
    
    summary += ' 建议您根据自己的游戏经验选择合适的内容。'
    
    aiSummary.value = summary
    
    // 生成相关标签
    const tags = []
    if (gameCount > 0) {
      const categories = [...new Set(gameResults.value.map(g => g.category))]
      tags.push(...categories.slice(0, 3))
    }
    if (strategyCount > 0) {
      tags.push('攻略指南')
    }
    tags.push('游戏推荐')
    
    summaryTags.value = [...new Set(tags)].slice(0, 5)
    
  } catch (error) {
    console.error('生成摘要失败:', error)
    ElMessage.error('生成摘要失败')
  } finally {
    summaryLoading.value = false
  }
}

const highlightText = (text) => {
  if (!searchQuery.value || !text) return text
  const regex = new RegExp(`(${searchQuery.value})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}

const getDifficultyType = (difficulty) => {
  const types = {
    easy: 'success',
    medium: 'warning',
    hard: 'danger'
  }
  return types[difficulty] || 'info'
}

const getDifficultyText = (difficulty) => {
  const texts = {
    easy: '简单',
    medium: '中等',
    hard: '困难'
  }
  return texts[difficulty] || '未知'
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('zh-CN')
}

const handleTabChange = (tab) => {
  activeTab.value = tab
  currentPage.value = 1
}

const handleSort = (sort) => {
  // 实现排序逻辑
  sortBy.value = sort
  // TODO: 重新排序结果
}

const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
}

const handleCurrentChange = (page) => {
  currentPage.value = page
}

// 监听路由变化
watch(() => route.query.q, (newQuery) => {
  if (newQuery) {
    searchQuery.value = newQuery
    performSearch(newQuery)
  }
}, { immediate: true })

// 生命周期
onMounted(() => {
  const query = route.query.q
  if (query) {
    searchQuery.value = query
    performSearch(query)
  }
})
</script>

<style scoped>
.search-results {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.search-header {
  margin-bottom: 30px;
}

.search-header h2 {
  margin: 0 0 10px 0;
  color: var(--text-color-primary);
}

.search-term {
  color: #409eff;
  font-weight: 600;
}

.result-count {
  color: #909399;
  font-size: 14px;
}

.search-filters {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
}

.filter-options {
  display: flex;
  gap: 15px;
}

.loading-container {
  padding: 40px 0;
}

.no-results {
  text-align: center;
  padding: 60px 0;
}

.results-container {
  min-height: 400px;
}

.results-section {
  margin-bottom: 40px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  color: #303133;
  font-size: 18px;
  font-weight: 600;
}

.game-results {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.game-card {
  display: flex;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.3s;
}

.game-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.game-image {
  width: 100px;
  height: 100px;
  flex-shrink: 0;
}

.game-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.game-info {
  padding: 15px;
  flex: 1;
}

.game-title {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.game-description {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #606266;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.game-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: #909399;
}

.strategy-results {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.strategy-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.3s;
}

.strategy-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.strategy-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.strategy-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  flex: 1;
}

.strategy-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: 15px;
}

.strategy-game {
  font-size: 14px;
  color: #606266;
}

.strategy-content {
  margin: 0 0 15px 0;
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
}

.strategy-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #909399;
}

.pagination {
  margin-top: 40px;
  display: flex;
  justify-content: center;
}

/* AI 搜索摘要 */
.ai-summary-section {
  margin-bottom: 30px;
}

.ai-summary-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 24px;
  color: white;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
}

.summary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.summary-header h3 {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}

.summary-loading {
  padding: 20px 0;
}

.summary-content {
  line-height: 1.8;
}

.summary-text {
  font-size: 16px;
  margin-bottom: 16px;
  line-height: 1.8;
}

.summary-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.summary-tags .el-tag {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
}

.summary-placeholder {
  text-align: center;
  padding: 20px;
  color: rgba(255, 255, 255, 0.8);
}

:deep(mark) {
  background-color: #fff3cd;
  color: #856404;
  padding: 2px 4px;
  border-radius: 3px;
}

/* 响应式设计优化 */
@media (max-width: 1200px) {
  .container {
    max-width: 960px;
    padding: 0 30px;
  }
  
  .game-results {
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 20px;
  }
  
  .search-filters {
    flex-direction: column;
    gap: 20px;
    align-items: stretch;
  }
  
  .filter-options {
    justify-content: flex-start;
  }
}

@media (max-width: 992px) {
  .search-header h2 {
    font-size: 2rem;
  }
  
  .game-results {
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 18px;
  }
  
  .strategy-card {
    padding: 18px;
  }
  
  .ai-summary-card {
    padding: 20px;
  }
  
  .summary-header h3 {
    font-size: 18px;
  }
}

@media (max-width: 768px) {
  .container {
    padding: 0 16px;
  }
  
  .search-header {
    padding: 20px 0;
    text-align: center;
  }
  
  .search-header h2 {
    font-size: 1.8rem;
    margin-bottom: 10px;
  }
  
  .search-header p {
    font-size: 14px;
  }
  
  .search-term {
    font-size: 16px;
  }
  
  .search-filters {
    padding: 20px 0;
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }
  
  .search-filters .el-radio-group {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 5px;
  }
  
  .search-filters .el-radio-button {
    flex: 1;
    min-width: 80px;
  }
  
  .filter-options {
    justify-content: center;
  }
  
  .section-title {
    font-size: 1.3rem;
    margin-bottom: 15px;
  }
  
  .game-results {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  
  .game-card {
    flex-direction: column;
    text-align: center;
  }
  
  .game-image {
    width: 100%;
    height: 200px;
    margin-bottom: 15px;
  }
  
  .game-info {
    padding: 0;
  }
  
  .game-title {
    font-size: 16px;
    margin-bottom: 10px;
  }
  
  .game-description {
    font-size: 13px;
    -webkit-line-clamp: 3;
  }
  
  .game-meta {
    justify-content: center;
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .strategy-card {
    padding: 15px;
  }
  
  .strategy-header {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }
  
  .strategy-title {
    font-size: 16px;
  }
  
  .strategy-meta {
    margin-left: 0;
    flex-wrap: wrap;
  }
  
  .strategy-content {
    font-size: 13px;
  }
  
  .strategy-footer {
    flex-direction: column;
    gap: 5px;
    align-items: flex-start;
  }
  
  .ai-summary-card {
    padding: 16px;
    border-radius: 12px;
  }
  
  .summary-header {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }
  
  .summary-header h3 {
    font-size: 16px;
  }
  
  .summary-text {
    font-size: 14px;
  }
  
  .pagination {
    margin-top: 30px;
  }
  
  .pagination :deep(.el-pagination) {
    justify-content: center;
    flex-wrap: wrap;
  }
}

@media (max-width: 576px) {
  .container {
    padding: 0 12px;
  }
  
  .search-header {
    padding: 15px 0;
  }
  
  .search-header h2 {
    font-size: 1.5rem;
  }
  
  .search-header p {
    font-size: 13px;
  }
  
  .search-filters {
    padding: 15px 0;
  }
  
  .search-filters .el-radio-group {
    flex-direction: column;
    gap: 8px;
  }
  
  .search-filters .el-radio-button {
    width: 100%;
  }
  
  .section-title {
    font-size: 1.2rem;
  }
  
  .game-card {
    padding: 12px;
  }
  
  .game-image {
    height: 150px;
    margin-bottom: 12px;
  }
  
  .game-title {
    font-size: 15px;
  }
  
  .game-description {
    font-size: 12px;
  }
  
  .game-meta {
    font-size: 11px;
  }
  
  .strategy-card {
    padding: 12px;
  }
  
  .strategy-title {
    font-size: 15px;
  }
  
  .strategy-content {
    font-size: 12px;
  }
  
  .strategy-footer {
    font-size: 11px;
  }
  
  .ai-summary-card {
    padding: 12px;
  }
  
  .summary-header h3 {
    font-size: 15px;
  }
  
  .summary-text {
    font-size: 13px;
  }
  
  .summary-tags .el-tag {
    font-size: 11px;
    padding: 2px 6px;
  }
}

@media (max-width: 480px) {
  .search-header h2 {
    font-size: 1.3rem;
  }
  
  .game-image {
    height: 120px;
  }
  
  .game-title {
    font-size: 14px;
  }
  
  .strategy-title {
    font-size: 14px;
  }
  
  .section-title {
    font-size: 1.1rem;
  }
}

/* 横屏模式优化 */
@media (max-height: 500px) and (orientation: landscape) {
  .search-header {
    padding: 10px 0;
  }
  
  .search-filters {
    padding: 10px 0;
  }
  
  .results-section {
    margin-bottom: 20px;
  }
  
  .ai-summary-card {
    padding: 12px;
  }
}

/* 高分辨率屏幕优化 */
@media (min-width: 1400px) {
  .container {
    max-width: 1320px;
  }
  
  .game-results {
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: 25px;
  }
  
  .strategy-card {
    padding: 25px;
  }
  
  .ai-summary-card {
    padding: 30px;
  }
}

/* 平板横屏优化 */
@media (min-width: 768px) and (max-width: 1024px) and (orientation: landscape) {
  .game-results {
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 18px;
  }
  
  .game-card {
    flex-direction: row;
  }
  
  .game-image {
    width: 120px;
    height: 120px;
    margin-bottom: 0;
    margin-right: 15px;
  }
}

/* 打印样式 */
@media print {
  .search-filters,
  .pagination,
  .ai-summary-card .el-button {
    display: none;
  }
  
  .search-header {
    background: none;
    color: black;
  }
  
  .game-card,
  .strategy-card {
    border: 1px solid #ccc;
    break-inside: avoid;
    margin-bottom: 15px;
  }
  
  .game-results {
    grid-template-columns: 1fr;
    gap: 15px;
  }
  
  .strategy-results {
    gap: 15px;
  }
  
  .ai-summary-card {
    background: #f5f5f5;
    color: black;
    border: 1px solid #ccc;
  }
}