// API Types and Interfaces for Multi-Purpose Trading Platform

export interface ApiConfig {
  baseUrl: string
  timeout?: number
  retryAttempts?: number
  requiresAuth?: boolean
}

export interface ServiceResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  status: number
  message?: string // For backward compatibility with existing APIs
}

// Token/Asset Types
export interface Token {
  id: number
  token_name: string
  code: string
  asset_type: 'fiat' | 'security' | 'crypto' | 'commodity' | 'bond'
  img_url: string
  issuer_public: string
}

export interface StellarAsset {
  code: string
  issuer?: string
  name: string
  type: 'native' | 'credit_alphanum4' | 'credit_alphanum12'
}

// Order Types
export interface Order {
  auto_id: number
  order_id: string
  direction: 'buy' | 'sell'
  base_asset: string
  counter_asset: string
  amount: string
  price: string
  quantity: string
  status: 'open' | 'completed' | 'cancelled' | 'pending'
  created_at: string
  updated_at?: string
  chatroom_id?: string
}

export interface OrderDetails {
  orderId: string
  direction: 'buy' | 'sell'
  baseAsset: string
  counterAsset: string
  amount: string
  price: string
  total: string
  seller: string
  status?: string
}

// Trading API Request Types
export interface PlaceOrderRequest {
  userId: string
  seller_wallet_id?: string
  counter_user_id?: string
  base_asset: string
  counter_asset: string
  amount: number
  price: number
  chatroom_id?: string
  direction: 'buy' | 'sell'
  order_type?: 'market' | 'limit'
}

export interface TakeOfferRequest {
  order_id: string
  userId: string
  password: string
  chatroom_id?: string
}

export interface DeleteOrderRequest {
  order_id: string
}

// Stellar-specific types
export interface StellarBalance {
  asset_code?: string
  asset_issuer?: string
  balance: string
  available_balance?: string
  buying_liabilities?: string
  selling_liabilities?: string
  asset_type: 'native' | 'credit_alphanum4' | 'credit_alphanum12'
}

export interface StellarOrderRequest {
  userId: string
  password: string
  direction: 'buy' | 'sell'
  baseAsset: string
  counterAsset: string
  amount: number
  price?: number
  order_type: 'market' | 'limit'
}

export interface StellarCancelOrderRequest {
  userId: string
  password: string
  offerId: string
  sellingAsset: {
    code: string
    issuer?: string
  }
  buyingAsset: {
    code: string
    issuer?: string
  }
}

// Market Data Types
export interface OrderBook {
  bids: Array<{ price: string; amount: string }>
  asks: Array<{ price: string; amount: string }>
  base: StellarAsset
  counter: StellarAsset
}

export interface Trade {
  id: string
  price: string
  amount: string
  timestamp: number
  side: 'buy' | 'sell'
}

// Transaction History Types
export interface Transaction {
  id: string
  type: 'buy' | 'sell' | 'deposit' | 'withdraw'
  asset: string
  amount: number
  currency: string
  value: number
  timestamp: number
  status: 'completed' | 'pending' | 'failed'
  order_id?: string
  direction?: 'buy' | 'sell'
}

// API Response Types (matching existing API structure)
export interface ApiResponse<T = any> {
  status: number
  message?: string
  data?: T
  success?: boolean
  error?: string
}

// Unified Trading Types
export interface UnifiedOrderRequest {
  userId: string
  password?: string
  direction: 'buy' | 'sell'
  baseAsset: string
  counterAsset: string
  amount: number
  price?: number
  order_type: 'market' | 'limit'
  chatroomId?: string // Optional - if present, routes to OTC context
  context?: 'otc' | 'stellar' // Internal routing hint
}

export interface UnifiedCancelOrderRequest {
  userId: string
  password: string
  offerId?: string // For Stellar orders
  order_id?: string // For OTC orders
  sellingAsset?: {
    code: string
    issuer?: string
  }
  buyingAsset?: {
    code: string
    issuer?: string
  }
  chatroomId?: string // For OTC context
}

// Service Configuration Types
export type ServiceType = 'otc' | 'stellar' | 'market' | 'public'

export interface ServiceConfig {
  [key: string]: ApiConfig
}
