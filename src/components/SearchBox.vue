<template>
  <div class="search-box">
    <el-input
      v-model="searchQuery"
      placeholder="搜索游戏、攻略..."
      class="search-input"
      clearable
      @input="handleSearch"
      @keyup.enter="handleEnterSearch"
    >
      <template #prefix>
        <el-icon class="search-icon"><Search /></el-icon>
      </template>
      <template #suffix>
        <el-button
          v-if="searchQuery"
          type="primary"
          size="small"
          @click="handleEnterSearch"
          class="search-button"
        >
          搜索
        </el-button>
      </template>
    </el-input>

    <!-- 搜索建议下拉框 -->
    <div v-if="showSuggestions && (gameSuggestions.length > 0 || strategySuggestions.length > 0)" class="search-suggestions">
      <div v-if="gameSuggestions.length > 0" class="suggestion-group">
        <div class="suggestion-title">
          <el-icon><Trophy /></el-icon>
          游戏推荐
        </div>
        <div
          v-for="game in gameSuggestions"
          :key="'game-' + game.id"
          class="suggestion-item"
          @click="selectSuggestion(game.name, 'game')"
        >
          <div class="suggestion-content">
            <span class="suggestion-name">{{ game.name }}</span>
            <span class="suggestion-category">{{ game.category }}</span>
          </div>
        </div>
      </div>
      
      <div v-if="strategySuggestions.length > 0" class="suggestion-group">
        <div class="suggestion-title">
          <el-icon><Document /></el-icon>
          攻略推荐
        </div>
        <div
          v-for="strategy in strategySuggestions"
          :key="'strategy-' + strategy.id"
          class="suggestion-item"
          @click="selectSuggestion(strategy.title, 'strategy')"
        >
          <div class="suggestion-content">
            <span class="suggestion-name">{{ strategy.title }}</span>
            <span class="suggestion-game">{{ strategy.games?.name }}</span>
          </div>
        </div>
      </div>
      
      <!-- 搜索历史 -->
      <div v-if="searchHistory.length > 0 && searchQuery.length === 0" class="suggestion-group">
        <div class="suggestion-title">
          <el-icon><Clock /></el-icon>
          搜索历史
        </div>
        <div
          v-for="(item, index) in searchHistory.slice(0, 5)"
          :key="'history-' + index"
          class="suggestion-item history-item"
          @click="selectSuggestion(item, 'history')"
        >
          <span class="suggestion-name">{{ item }}</span>
          <el-icon class="remove-history" @click.stop="removeFromHistory(index)">
            <Close />
          </el-icon>
        </div>
      </div>
    </div>

    <!-- 搜索历史 -->
    <div v-if="showHistory && searchHistory.length > 0" class="search-history">
      <div class="history-header">
        <span>搜索历史</span>
        <el-button text size="small" @click="clearHistory">
          清空
        </el-button>
      </div>
      <div class="history-list">
        <el-tag
          v-for="(item, index) in searchHistory"
          :key="index"
          class="history-tag"
          closable
          @click="searchQuery = item"
          @close="removeHistoryItem(index)"
        >
          {{ item }}
        </el-tag>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'
import { 
  Search, 
  Close, 
  Document, 
  Trophy,
  Clock
} from '@element-plus/icons-vue'

const router = useRouter()

// 响应式数据
const searchQuery = ref('')
const showSuggestions = ref(false)
const showHistory = ref(false)
const gameSuggestions = ref([])
const strategySuggestions = ref([])
const searchHistory = ref([])
const loading = ref(false)

// 计算属性
const hasHistory = computed(() => searchHistory.value.length > 0)

// 防抖搜索
let searchTimeout = null
const debouncedSearch = (query) => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    fetchSuggestions(query)
  }, 300)
}

// 方法
const handleSearch = (value) => {
  if (value.trim()) {
    showHistory.value = false
    debouncedSearch(value)
  } else {
    gameSuggestions.value = []
    strategySuggestions.value = []
    showSuggestions.value = false
    showHistory.value = true
  }
}

const handleEnterSearch = () => {
  if (!searchQuery.value.trim()) return
  
  performSearch(searchQuery.value.trim())
  addToHistory(searchQuery.value.trim())
  closeSuggestions()
}

const fetchSuggestions = async (query) => {
  try {
    // 搜索游戏
    const { data: games } = await supabase
      .from('games')
      .select('id, name, category')
      .ilike('name', `%${query}%`)
      .eq('status', 'published')
      .limit(5)
    
    // 搜索攻略
    const { data: strategies } = await supabase
      .from('strategies')
      .select(`
        id, 
        title,
        games(name)
      `)
      .ilike('title', `%${query}%`)
      .eq('status', 'published')
      .limit(5)
    
    gameSuggestions.value = games || []
    strategySuggestions.value = strategies || []
    showSuggestions.value = (games && games.length > 0) || (strategies && strategies.length > 0)
  } catch (error) {
    console.error('搜索建议获取失败:', error)
    gameSuggestions.value = []
    strategySuggestions.value = []
    showSuggestions.value = false
  }
}

const selectSuggestion = (text, type) => {
  searchQuery.value = text
  addToHistory(text)
  performSearch(text)
  closeSuggestions()
}

const performSearch = (query) => {
  const searchTerm = query || searchQuery.value
  router.push({
    name: 'SearchResults',
    query: { q: searchTerm }
  })
}

const addToHistory = (query) => {
  if (!query || searchHistory.value.includes(query)) return
  
  searchHistory.value.unshift(query)
  if (searchHistory.value.length > 10) {
    searchHistory.value = searchHistory.value.slice(0, 10)
  }
  
  localStorage.setItem('searchHistory', JSON.stringify(searchHistory.value))
}

const removeHistoryItem = (index) => {
  searchHistory.value.splice(index, 1)
  localStorage.setItem('searchHistory', JSON.stringify(searchHistory.value))
}

const removeFromHistory = (index) => {
  searchHistory.value.splice(index, 1)
  localStorage.setItem('searchHistory', JSON.stringify(searchHistory.value))
}

const clearHistory = () => {
  searchHistory.value = []
  localStorage.removeItem('searchHistory')
  showHistory.value = false
}

const closeSuggestions = () => {
  showSuggestions.value = false
  showHistory.value = false
}

const handleClickOutside = (event) => {
  if (!event.target.closest('.search-box')) {
    closeSuggestions()
  }
}

// 生命周期
onMounted(() => {
  // 加载搜索历史
  const saved = localStorage.getItem('searchHistory')
  if (saved) {
    try {
      searchHistory.value = JSON.parse(saved)
    } catch (error) {
      console.error('加载搜索历史失败:', error)
    }
  }
  
  // 监听点击外部事件
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// 监听输入框焦点
watch(searchQuery, (newValue) => {
  if (!newValue.trim() && searchHistory.value.length > 0) {
    showHistory.value = true
  }
})
</script>

<style scoped>
.search-box {
  position: relative;
  width: 100%;
  max-width: 500px;
}

.search-input {
  width: 100%;
}

.search-input :deep(.el-input__inner) {
  border-radius: 25px;
  padding-left: 45px;
  padding-right: 80px;
}

.search-icon {
  color: #909399;
}

.search-button {
  margin-right: 8px;
  border-radius: 15px;
}

.search-suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e4e7ed;
  border-top: none;
  border-radius: 0 0 8px 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  max-height: 400px;
  overflow-y: auto;
  z-index: 1000;
}

.search-history {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  margin-top: 4px;
  max-height: 300px;
  overflow-y: auto;
}

.suggestion-group {
  padding: 8px 0;
}

.suggestion-group:not(:last-child) {
  border-bottom: 1px solid #f0f2f5;
}

.suggestion-title {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 600;
  color: #909399;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.suggestions-header,
.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  font-size: 14px;
  font-weight: 500;
  color: #606266;
}

.suggestions-list {
  padding: 8px 0;
}

.suggestion-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.suggestion-item:hover {
  background-color: #f5f7fa;
}

.suggestion-icon {
  margin-right: 12px;
  color: #909399;
}

.suggestion-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.suggestion-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.suggestion-category,
.suggestion-game {
  font-size: 12px;
  color: #909399;
}

.suggestion-type {
  font-size: 12px;
  color: #909399;
}

.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.remove-history {
  color: #c0c4cc;
  cursor: pointer;
  transition: color 0.2s;
}

.remove-history:hover {
  color: #f56c6c;
}

.history-list {
  padding: 12px 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.history-tag {
  cursor: pointer;
  transition: all 0.3s;
}

.history-tag:hover {
  background-color: #409eff;
  color: white;
}
</style>