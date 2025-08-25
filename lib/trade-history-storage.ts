/**
 * Trade History Storage Service
 * 
 * This service manages local storage of trade records and chat archives,
 * providing functions to save, retrieve, query, and manage trade history data.
 */

import {
  TradeRecord,
  ChatArchive,
  TradeHistoryStorage,
  TradeHistoryFilters,
  TradeHistoryQueryOptions,
  TradeHistoryQueryResult,
  TradeHistoryOperationResult,
  TradeStatistics,
  TradeHistoryError,
  TradeStatus,
  TradeDirection,
  TradeType
} from './trade-history-types'

// Storage version for migration compatibility
const STORAGE_VERSION = '1.0.0'

// Storage keys
const TRADE_HISTORY_KEY = 'clix_trade_history'
const BACKUP_KEY = 'clix_trade_history_backup'

export class TradeHistoryStorageService {
  private userId: string
  private storageKey: string

  constructor(userId: string) {
    this.userId = userId
    this.storageKey = `${TRADE_HISTORY_KEY}_${this.cleanUserId(userId)}`
  }

  /**
   * Clean user ID for safe localStorage key usage
   */
  private cleanUserId(userId: string): string {
    return userId.replace(/[^a-zA-Z0-9]/g, '_')
  }

  /**
   * Initialize storage structure for new user
   */
  private initializeStorage(): TradeHistoryStorage {
    return {
      version: STORAGE_VERSION,
      userId: this.userId,
      lastUpdated: Date.now(),
      trades: {},
      chatArchives: {},
      metadata: {
        totalTrades: 0,
        completedTrades: 0,
        totalVolume: '0',
        favoriteAssets: []
      }
    }
  }

  /**
   * Get storage data or initialize if not exists
   */
  private getStorage(): TradeHistoryOperationResult<TradeHistoryStorage> {
    try {
      const stored = localStorage.getItem(this.storageKey)
      
      if (!stored) {
        const newStorage = this.initializeStorage()
        this.saveStorage(newStorage)
        return { success: true, data: newStorage }
      }

      const parsed: TradeHistoryStorage = JSON.parse(stored)
      
      // Version migration if needed
      if (parsed.version !== STORAGE_VERSION) {
        const migrated = this.migrateStorage(parsed)
        this.saveStorage(migrated)
        return { success: true, data: migrated }
      }

      return { success: true, data: parsed }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'STORAGE_ERROR',
          message: 'Failed to load trade history storage',
          details: error
        }
      }
    }
  }

  /**
   * Save storage data to localStorage
   */
  private saveStorage(storage: TradeHistoryStorage): TradeHistoryOperationResult<void> {
    try {
      storage.lastUpdated = Date.now()
      const serialized = JSON.stringify(storage)
      
      // Create backup before saving
      const existing = localStorage.getItem(this.storageKey)
      if (existing) {
        localStorage.setItem(`${this.storageKey}_backup`, existing)
      }

      localStorage.setItem(this.storageKey, serialized)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'STORAGE_ERROR',
          message: 'Failed to save trade history storage',
          details: error
        }
      }
    }
  }

  /**
   * Migrate storage from older versions
   */
  private migrateStorage(oldStorage: any): TradeHistoryStorage {
    // For now, just initialize new storage
    // In future versions, add proper migration logic
    return {
      ...this.initializeStorage(),
      trades: oldStorage.trades || {},
      chatArchives: oldStorage.chatArchives || {}
    }
  }

  /**
   * Save a new trade record
   */
  async saveTradeRecord(trade: TradeRecord): Promise<TradeHistoryOperationResult<TradeRecord>> {
    const storageResult = this.getStorage()
    if (!storageResult.success || !storageResult.data) {
      return {
        success: false,
        error: storageResult.error
      }
    }

    try {
      const storage = storageResult.data
      storage.trades[trade.id] = trade
      
      // Update metadata
      storage.metadata.totalTrades = Object.keys(storage.trades).length
      storage.metadata.completedTrades = Object.values(storage.trades)
        .filter(t => t.status === 'completed').length

      // Calculate total volume
      const totalVolume = Object.values(storage.trades)
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + parseFloat(t.totalValue), 0)
      storage.metadata.totalVolume = totalVolume.toString()

      // Update favorite assets
      const assetCounts: Record<string, number> = {}
      Object.values(storage.trades).forEach(t => {
        assetCounts[t.baseAsset.code] = (assetCounts[t.baseAsset.code] || 0) + 1
      })
      
      storage.metadata.favoriteAssets = Object.entries(assetCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([asset]) => asset)

      const saveResult = this.saveStorage(storage)
      if (!saveResult.success) {
        return {
          success: false,
          error: saveResult.error
        }
      }

      return { success: true, data: trade }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'STORAGE_ERROR',
          message: 'Failed to save trade record',
          details: error
        }
      }
    }
  }

  /**
   * Update an existing trade record
   */
  async updateTradeRecord(tradeId: string, updates: Partial<TradeRecord>): Promise<TradeHistoryOperationResult<TradeRecord>> {
    const storageResult = this.getStorage()
    if (!storageResult.success || !storageResult.data) {
      return {
        success: false,
        error: storageResult.error
      }
    }

    try {
      const storage = storageResult.data
      const existingTrade = storage.trades[tradeId]
      
      if (!existingTrade) {
        return {
          success: false,
          error: {
            code: 'TRADE_NOT_FOUND',
            message: `Trade with ID ${tradeId} not found`
          }
        }
      }

      const updatedTrade = { ...existingTrade, ...updates }
      storage.trades[tradeId] = updatedTrade

      const saveResult = this.saveStorage(storage)
      if (!saveResult.success) {
        return {
          success: false,
          error: saveResult.error
        }
      }

      return { success: true, data: updatedTrade }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'STORAGE_ERROR',
          message: 'Failed to update trade record',
          details: error
        }
      }
    }
  }

  /**
   * Get a specific trade record by ID
   */
  async getTradeRecord(tradeId: string): Promise<TradeHistoryOperationResult<TradeRecord>> {
    const storageResult = this.getStorage()
    if (!storageResult.success || !storageResult.data) {
      return {
        success: false,
        error: storageResult.error
      }
    }

    const trade = storageResult.data.trades[tradeId]
    if (!trade) {
      return {
        success: false,
        error: {
          code: 'TRADE_NOT_FOUND',
          message: `Trade with ID ${tradeId} not found`
        }
      }
    }

    return { success: true, data: trade }
  }

  /**
   * Query trade records with filters and pagination
   */
  async queryTradeRecords(options: TradeHistoryQueryOptions = {}): Promise<TradeHistoryOperationResult<TradeHistoryQueryResult>> {
    const storageResult = this.getStorage()
    if (!storageResult.success || !storageResult.data) {
      return {
        success: false,
        error: storageResult.error
      }
    }

    try {
      const storage = storageResult.data
      let trades = Object.values(storage.trades)

      // Apply filters
      if (options.filters) {
        trades = this.applyFilters(trades, options.filters)
      }

      // Sort results
      const sortBy = options.sortBy || 'createdAt'
      const sortOrder = options.sortOrder || 'desc'
      trades.sort((a, b) => {
        let aValue: any = a[sortBy]
        let bValue: any = b[sortBy]

        // Handle different data types
        if (sortBy === 'amount' || sortBy === 'price' || sortBy === 'totalValue') {
          aValue = parseFloat(aValue)
          bValue = parseFloat(bValue)
        }

        if (sortOrder === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
        }
      })

      // Apply pagination
      const totalCount = trades.length
      const limit = options.limit || 50
      const offset = options.offset || 0
      const paginatedTrades = trades.slice(offset, offset + limit)
      const hasMore = offset + limit < totalCount

      return {
        success: true,
        data: {
          trades: paginatedTrades,
          totalCount,
          hasMore
        }
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'STORAGE_ERROR',
          message: 'Failed to query trade records',
          details: error
        }
      }
    }
  }

  /**
   * Apply filters to trade records
   */
  private applyFilters(trades: TradeRecord[], filters: TradeHistoryFilters): TradeRecord[] {
    return trades.filter(trade => {
      // Status filter
      if (filters.status && filters.status.length > 0) {
        if (!filters.status.includes(trade.status)) return false
      }

      // Direction filter
      if (filters.direction && filters.direction.length > 0) {
        if (!filters.direction.includes(trade.direction)) return false
      }

      // Type filter
      if (filters.type && filters.type.length > 0) {
        if (!filters.type.includes(trade.type)) return false
      }

      // Asset code filter
      if (filters.assetCode) {
        if (trade.baseAsset.code.toLowerCase() !== filters.assetCode.toLowerCase() &&
            trade.counterAsset.code.toLowerCase() !== filters.assetCode.toLowerCase()) {
          return false
        }
      }

      // Counterparty filter
      if (filters.counterparty) {
        if (!trade.counterparty ||
            !trade.counterparty.username.toLowerCase().includes(filters.counterparty.toLowerCase())) {
          return false
        }
      }

      // Date range filter
      if (filters.dateRange) {
        if (trade.createdAt < filters.dateRange.from || trade.createdAt > filters.dateRange.to) {
          return false
        }
      }

      // Search term filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase()
        const searchableText = [
          trade.baseAsset.code,
          trade.counterAsset.code,
          trade.counterparty?.username || '',
          trade.notes || '',
          ...(trade.tags || [])
        ].join(' ').toLowerCase()

        if (!searchableText.includes(searchLower)) return false
      }

      return true
    })
  }

  /**
   * Save chat archive
   */
  async saveChatArchive(archive: ChatArchive): Promise<TradeHistoryOperationResult<ChatArchive>> {
    const storageResult = this.getStorage()
    if (!storageResult.success || !storageResult.data) {
      return {
        success: false,
        error: storageResult.error
      }
    }

    try {
      const storage = storageResult.data
      storage.chatArchives[archive.roomId] = archive

      const saveResult = this.saveStorage(storage)
      if (!saveResult.success) {
        return {
          success: false,
          error: saveResult.error
        }
      }

      return { success: true, data: archive }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'STORAGE_ERROR',
          message: 'Failed to save chat archive',
          details: error
        }
      }
    }
  }

  /**
   * Get chat archive by room ID
   */
  async getChatArchive(roomId: string): Promise<TradeHistoryOperationResult<ChatArchive>> {
    const storageResult = this.getStorage()
    if (!storageResult.success || !storageResult.data) {
      return {
        success: false,
        error: storageResult.error
      }
    }

    const archive = storageResult.data.chatArchives[roomId]
    if (!archive) {
      return {
        success: false,
        error: {
          code: 'ARCHIVE_FAILED',
          message: `Chat archive for room ${roomId} not found`
        }
      }
    }

    return { success: true, data: archive }
  }

  /**
   * Get trade statistics
   */
  async getTradeStatistics(): Promise<TradeHistoryOperationResult<TradeStatistics>> {
    const storageResult = this.getStorage()
    if (!storageResult.success || !storageResult.data) {
      return {
        success: false,
        error: storageResult.error
      }
    }

    try {
      const storage = storageResult.data
      const trades = Object.values(storage.trades)
      const completedTrades = trades.filter(t => t.status === 'completed')

      // Calculate basic stats
      const totalTrades = trades.length
      const completedCount = completedTrades.length
      const totalVolume = completedTrades.reduce((sum, t) => sum + parseFloat(t.totalValue), 0)
      const averageTradeValue = completedCount > 0 ? totalVolume / completedCount : 0

      // Find most traded asset
      const assetCounts: Record<string, number> = {}
      completedTrades.forEach(t => {
        assetCounts[t.baseAsset.code] = (assetCounts[t.baseAsset.code] || 0) + 1
      })
      const mostTradedAsset = Object.entries(assetCounts)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'

      // Calculate top counterparties
      const counterpartyStats: Record<string, { username: string, tradeCount: number, totalVolume: number }> = {}
      completedTrades.forEach(t => {
        if (t.counterparty) {
          const key = t.counterparty.matrixUserId
          if (!counterpartyStats[key]) {
            counterpartyStats[key] = {
              username: t.counterparty.username,
              tradeCount: 0,
              totalVolume: 0
            }
          }
          counterpartyStats[key].tradeCount++
          counterpartyStats[key].totalVolume += parseFloat(t.totalValue)
        }
      })

      const topCounterparties = Object.entries(counterpartyStats)
        .sort(([,a], [,b]) => b.tradeCount - a.tradeCount)
        .slice(0, 5)
        .map(([userId, stats]) => ({
          userId,
          ...stats
        }))

      const statistics: TradeStatistics = {
        totalTrades,
        completedTrades: completedCount,
        totalVolume,
        averageTradeValue,
        mostTradedAsset,
        topCounterparties
      }

      return { success: true, data: statistics }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'STORAGE_ERROR',
          message: 'Failed to calculate trade statistics',
          details: error
        }
      }
    }
  }

  /**
   * Delete a trade record
   */
  async deleteTradeRecord(tradeId: string): Promise<TradeHistoryOperationResult<void>> {
    const storageResult = this.getStorage()
    if (!storageResult.success || !storageResult.data) {
      return {
        success: false,
        error: storageResult.error
      }
    }

    try {
      const storage = storageResult.data
      if (!storage.trades[tradeId]) {
        return {
          success: false,
          error: {
            code: 'TRADE_NOT_FOUND',
            message: `Trade with ID ${tradeId} not found`
          }
        }
      }

      delete storage.trades[tradeId]
      const saveResult = this.saveStorage(storage)
      return saveResult
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'STORAGE_ERROR',
          message: 'Failed to delete trade record',
          details: error
        }
      }
    }
  }

  /**
   * Clear all trade history (with confirmation)
   */
  async clearAllTradeHistory(): Promise<TradeHistoryOperationResult<void>> {
    try {
      const newStorage = this.initializeStorage()
      const saveResult = this.saveStorage(newStorage)
      return saveResult
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'STORAGE_ERROR',
          message: 'Failed to clear trade history',
          details: error
        }
      }
    }
  }

  /**
   * Export trade history data
   */
  async exportTradeHistory(options: TradeHistoryQueryOptions = {}): Promise<TradeHistoryOperationResult<string>> {
    const queryResult = await this.queryTradeRecords(options)
    if (!queryResult.success || !queryResult.data) {
      return {
        success: false,
        error: queryResult.error
      }
    }

    try {
      const exportData = {
        exportDate: new Date().toISOString(),
        userId: this.userId,
        trades: queryResult.data.trades,
        totalCount: queryResult.data.totalCount
      }

      return {
        success: true,
        data: JSON.stringify(exportData, null, 2)
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'EXPORT_FAILED',
          message: 'Failed to export trade history',
          details: error
        }
      }
    }
  }
}

// Export singleton factory
export function createTradeHistoryStorage(userId: string): TradeHistoryStorageService {
  return new TradeHistoryStorageService(userId)
}
