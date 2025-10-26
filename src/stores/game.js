import { defineStore } from 'pinia'
import { supabase } from '../lib/supabase'

export const useGameStore = defineStore('game', {
  state: () => ({
    games: [],
    currentGame: null,
    strategies: [],
    currentStrategy: null,
    tags: [],
    loading: false,
    error: null
  }),

  actions: {
    async fetchGames() {
      this.loading = true
      try {
        const { data, error } = await supabase
          .from('games')
          .select('*')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
        
        if (error) throw error
        this.games = data
      } catch (error) {
        this.error = error.message
        console.error('Error fetching games:', error)
      } finally {
        this.loading = false
      }
    },

    async fetchGameById(id) {
      this.loading = true
      try {
        const { data, error } = await supabase
          .from('games')
          .select('*')
          .eq('id', id)
          .single()
        
        if (error) throw error
        this.currentGame = data
      } catch (error) {
        this.error = error.message
        console.error('Error fetching game:', error)
      } finally {
        this.loading = false
      }
    },

    async fetchStrategiesByGame(gameId) {
      this.loading = true
      try {
        const { data, error } = await supabase
          .from('strategies')
          .select(`
            *,
            games(name),
            strategy_tags(tags(name, color))
          `)
          .eq('game_id', gameId)
          .eq('status', 'published')
          .order('created_at', { ascending: false })
        
        if (error) throw error
        this.strategies = data
      } catch (error) {
        this.error = error.message
        console.error('Error fetching strategies:', error)
      } finally {
        this.loading = false
      }
    },

    async fetchStrategyById(id) {
      this.loading = true
      try {
        const { data, error } = await supabase
          .from('strategies')
          .select(`
            *,
            games(name, description),
            strategy_tags(tags(name, color))
          `)
          .eq('id', id)
          .single()
        
        if (error) throw error
        this.currentStrategy = data
        
        // 增加浏览量
        await this.incrementViewCount(id)
      } catch (error) {
        this.error = error.message
        console.error('Error fetching strategy:', error)
      } finally {
        this.loading = false
      }
    },

    async incrementViewCount(strategyId) {
      try {
        const { error } = await supabase
          .from('strategies')
          .update({ view_count: this.currentStrategy.view_count + 1 })
          .eq('id', strategyId)
        
        if (error) throw error
      } catch (error) {
        console.error('Error incrementing view count:', error)
      }
    },

    async searchStrategies(query) {
      this.loading = true
      try {
        const { data, error } = await supabase
          .from('strategies')
          .select(`
            *,
            games(name)
          `)
          .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
          .eq('status', 'published')
          .order('created_at', { ascending: false })
        
        if (error) throw error
        this.strategies = data
      } catch (error) {
        this.error = error.message
        console.error('Error searching strategies:', error)
      } finally {
        this.loading = false
      }
    },

    async fetchTags() {
      try {
        const { data, error } = await supabase
          .from('tags')
          .select('*')
          .order('name')
        
        if (error) throw error
        this.tags = data
      } catch (error) {
        this.error = error.message
        console.error('Error fetching tags:', error)
      }
    }
  }
})