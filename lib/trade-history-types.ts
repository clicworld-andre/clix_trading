/**
 * Trade History Data Models and Types
 * 
 * This file defines the TypeScript interfaces and types used throughout
 * the Trade History feature, including trade records, chat archives,
 * and storage structures.
 */

// Trade status enumeration
export type TradeStatus = 'pending' | 'completed' | 'failed' | 'cancelled' | 'expired'

// Trade direction enumeration  
export type TradeDirection = 'buy' | 'sell'

// Trade type enumeration
export type TradeType = 'otc' | 'market' | 'limit'

// Participant information in a trade
export interface TradeParticipant {
  matrixUserId: string
  username: string
  publicKey?: string
  role: 'initiator' | 'counterparty'
}

// Asset information for trades
export interface TradeAsset {
  code: string
  name: string
  issuer?: string
  type: 'native' | 'credit_alphanum4' | 'credit_alphanum12'
}

// Stellar transaction details
export interface StellarTransactionDetails {
  transactionHash?: string
  ledger?: number
  sourceAccount: string
  sequence?: number
  fee?: string
  memo?: string
  timestamp?: string
  operationType: string
  success: boolean
  errorMessage?: string
}

// Archived chat message
export interface ArchivedChatMessage {
  id: string
  sender: string
  senderName?: string
  content: string
  timestamp: number
  messageType: string // 'm.text', 'm.notice', etc.
  eventId: string
  isEncrypted: boolean
  decryptedContent?: string
}

// Chat archive metadata
export interface ChatArchive {
  roomId: string
  roomName?: string
  participants: string[]
  messageCount: number
  archiveTimestamp: number
  archiveHash: string
  encryptionKey?: string
  messages: ArchivedChatMessage[]
  startTimestamp: number
  endTimestamp: number
}

// Main trade record structure
export interface TradeRecord {
  // Unique identifiers
  id: string // UUID for the trade record
  orderId?: string // Order ID from API if applicable
  roomId: string // Matrix room where trade occurred
  
  // Trade metadata
  createdAt: number // Unix timestamp
  completedAt?: number // Unix timestamp when trade was completed
  expiresAt?: number // Unix timestamp when trade expires
  status: TradeStatus
  type: TradeType
  direction: TradeDirection
  
  // Participants
  initiator: TradeParticipant
  counterparty?: TradeParticipant // May be null for market orders
  
  // Trade details
  baseAsset: TradeAsset
  counterAsset: TradeAsset
  amount: string // Amount of base asset
  price: string // Price per unit
  totalValue: string // Total trade value
  
  // Execution details
  stellarTransaction?: StellarTransactionDetails
  chatArchive?: ChatArchive
  
  // Additional metadata
  notes?: string
  tags?: string[]
  isArchived: boolean
}

// Trade history query filters
export interface TradeHistoryFilters {
  status?: TradeStatus[]
  direction?: TradeDirection[]
  type?: TradeType[]
  assetCode?: string
  counterparty?: string
  dateRange?: {
    from: number
    to: number
  }
  searchTerm?: string
}

// Trade history query options
export interface TradeHistoryQueryOptions {
  filters?: TradeHistoryFilters
  sortBy?: 'createdAt' | 'completedAt' | 'amount' | 'price' | 'totalValue' | 'status'
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

// Trade history query result
export interface TradeHistoryQueryResult {
  trades: TradeRecord[]
  totalCount: number
  hasMore: boolean
}

// Local storage structure for trade history
export interface TradeHistoryStorage {
  version: string
  userId: string
  lastUpdated: number
  trades: Record<string, TradeRecord>
  chatArchives: Record<string, ChatArchive>
  metadata: {
    totalTrades: number
    completedTrades: number
    totalVolume: string
    favoriteAssets: string[]
  }
}

// Trade statistics
export interface TradeStatistics {
  totalTrades: number
  completedTrades: number
  totalVolume: number
  averageTradeValue: number
  mostTradedAsset: string
  totalProfit?: number
  winRate?: number
  topCounterparties: Array<{
    userId: string
    username: string
    tradeCount: number
    totalVolume: number
  }>
}

// Export configuration for trade history
export interface TradeHistoryExport {
  format: 'json' | 'csv' | 'pdf'
  includeMessages: boolean
  dateRange?: {
    from: number
    to: number
  }
  filters?: TradeHistoryFilters
}

// Error types for trade history operations
export type TradeHistoryError = 
  | 'STORAGE_ERROR'
  | 'ENCRYPTION_ERROR'
  | 'INVALID_DATA'
  | 'TRADE_NOT_FOUND'
  | 'ARCHIVE_FAILED'
  | 'EXPORT_FAILED'

// Trade history operation result
export interface TradeHistoryOperationResult<T = any> {
  success: boolean
  data?: T
  error?: {
    code: TradeHistoryError
    message: string
    details?: any
  }
}
