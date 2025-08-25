// Enhanced Service Layer for Multi-Purpose Trading Platform
import type {
  ApiConfig,
  ServiceResponse,
  ServiceType,
  Token,
  Order,
  OrderDetails,
  PlaceOrderRequest,
  TakeOfferRequest,
  DeleteOrderRequest,
  StellarBalance,
  StellarOrderRequest,
  StellarCancelOrderRequest,
  Transaction,
  ApiResponse,
  UnifiedOrderRequest,
  UnifiedCancelOrderRequest
} from './api-types'

// Service configurations for unified trading architecture
const SERVICE_CONFIGS: Record<ServiceType, ApiConfig> = {
  otc: {
    // Legacy config - routes to stellar for backward compatibility
    baseUrl: "/api/stellar/",
    requiresAuth: true,
    retryAttempts: 3,
    timeout: 10000
  },
  stellar: {
    // Primary trading service - handles both OTC and direct Stellar trading
    baseUrl: "/api/stellar/",
    requiresAuth: true,
    retryAttempts: 3,
    timeout: 10000
  },
  market: {
    baseUrl: "https://api.clicworld.app/market/",
    requiresAuth: true,
    retryAttempts: 3,
    timeout: 10000
  },
  public: {
    baseUrl: "https://api.clicworld.app/public/",
    requiresAuth: false,
    retryAttempts: 1,
    timeout: 5000
  }
}

// Helper function to get clean Matrix ID
const getCleanMatrixId = (fullMatrixId: string): string => {
  return fullMatrixId
    .replace(/^@/, "") // Remove leading @
    .split(":")[0] // Remove domain part
}

// Helper function to get JWT token from localStorage
const getJwtToken = (): string | null => {
  if (typeof window === 'undefined') return null

  // Prefer a user-scoped token first if one exists
  const rawId = localStorage.getItem('matrix_user_id')
  if (rawId) {
    // Try scoped key with full id first
    const scopedFull = localStorage.getItem(`jwt_${rawId}`)
    if (scopedFull) return scopedFull

    // Then try username without @ and domain
    const clean = getCleanMatrixId(rawId)
    const scopedClean = localStorage.getItem(`jwt_${clean}`)
    if (scopedClean) return scopedClean
  }

  // Fallback to generic key
  return localStorage.getItem('jwt')
}

// Core API Service Class
class ApiService {
  private config: ApiConfig

  constructor(serviceType: ServiceType) {
    this.config = SERVICE_CONFIGS[serviceType]
  }

  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ServiceResponse<T>> {
    const { baseUrl, requiresAuth, retryAttempts = 1, timeout = 10000 } = this.config
    
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    }

    if (requiresAuth) {
      const token = getJwtToken()
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const requestOptions: RequestInit = {
      ...options,
      headers,
      signal: controller.signal
    }

    let lastError: Error | null = null

    // Retry logic
    for (let attempt = 0; attempt < retryAttempts; attempt++) {
      try {
        const response = await fetch(`${baseUrl}${endpoint}`, requestOptions)
        clearTimeout(timeoutId)
        
        let data: any
        try {
          data = await response.json()
        } catch {
          data = null
        }

        if (response.ok) {
          // Handle different API response formats for backward compatibility
          if (data && typeof data === 'object') {
            // New format - return structured response
            return {
              success: true,
              data: data.data || data,
              status: response.status,
              message: data.message
            }
          } else {
            // Legacy format
            return {
              success: true,
              data,
              status: response.status
            }
          }
        } else {
          return {
            success: false,
            error: data?.message || data?.error || `Request failed with status ${response.status}`,
            status: response.status,
            data
          }
        }
      } catch (error) {
        clearTimeout(timeoutId)
        lastError = error as Error
        
        // Don't retry on network errors immediately, wait a bit
        if (attempt < retryAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || "Network error",
      status: 0
    }
  }

  async get<T>(endpoint: string): Promise<ServiceResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: "GET" })
  }

  async post<T>(endpoint: string, data?: any): Promise<ServiceResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined
    })
  }

  async put<T>(endpoint: string, data?: any): Promise<ServiceResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined
    })
  }

  async delete<T>(endpoint: string): Promise<ServiceResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: "DELETE" })
  }
}

// Create service instances for different contexts
export const stellarService = new ApiService('stellar')
export const publicService = new ApiService('public')

// Unified Trading API - handles both OTC and direct Stellar trading
export const tradingApi = {
  // Asset and token management
  getTokens: (context?: 'otc' | 'stellar'): Promise<ServiceResponse<Token[]>> => {
    // Use Stellar endpoint as the source of truth for all tokens
    return stellarService.get<Token[]>('getTokens')
  },
  
  // Account and wallet operations
  getBalances: (username: string): Promise<ServiceResponse<{balances: StellarBalance[]}>> => 
    stellarService.get<{balances: StellarBalance[]}>(`balances/${username}`),
    
  getOrders: (username: string, options?: {chatroomId?: string, status?: string}): Promise<ServiceResponse<any[]>> => {
    const params = new URLSearchParams({ status: options?.status || 'open' })
    if (options?.chatroomId) {
      params.append('chatroom_id', options.chatroomId)
    }
    return stellarService.get<any[]>(`orders/${username}?${params.toString()}`)
  },
  
  // Order placement (unified for both OTC and direct trading)
  placeOrder: (orderData: UnifiedOrderRequest): Promise<ServiceResponse<any>> => {
    // Route to appropriate endpoint based on context
    if (orderData.chatroomId) {
      // OTC context: chat-room specific trading
      return stellarService.post<any>('placeOrder', {
        ...orderData,
        context: 'otc'
      })
    } else {
      // Direct Stellar SDEX trading
      return stellarService.post<any>('placeOrder', {
        ...orderData,
        context: 'stellar'
      })
    }
  },
  
  // Offer taking (primarily OTC, but could be extended)
  takeOffer: (offerData: TakeOfferRequest): Promise<ServiceResponse<any>> => 
    stellarService.post<any>('takeOffer', offerData),
    
  // Order management
  cancelOrder: (cancelData: UnifiedCancelOrderRequest): Promise<ServiceResponse<any>> => 
    stellarService.post<any>('cancelOrder', cancelData),
    
  deleteOrder: (orderId: string, chatroomId?: string): Promise<ServiceResponse<any>> => 
    stellarService.post<any>('deleteOrder', { 
      order_id: orderId,
      ...(chatroomId && { chatroom_id: chatroomId })
    }),
  
  // History and analytics
  getHistory: (username: string, chatroomId?: string): Promise<ServiceResponse<Transaction[]>> => {
    const params = chatroomId ? `?chatroom_id=${chatroomId}` : ''
    return stellarService.get<Transaction[]>(`getHistory/${username}${params}`)
  },
  
  // Order details
  getOrder: (orderId: string): Promise<ServiceResponse<Order>> => 
    stellarService.get<Order>(`getOrder/${orderId}`)
}

// Legacy APIs for backward compatibility
export const otcApi = {
  getTokens: (): Promise<ServiceResponse<Token[]>> => 
    tradingApi.getTokens('otc'),
    
  getOrders: (username: string, roomId: string): Promise<ServiceResponse<Order[]>> => 
    tradingApi.getOrders(username, { chatroomId: roomId }) as Promise<ServiceResponse<Order[]>>,
    
  placeOrder: (orderData: PlaceOrderRequest): Promise<ServiceResponse<{order_id: string}>> => 
    tradingApi.placeOrder({
      userId: orderData.userId,
      direction: orderData.direction,
      baseAsset: orderData.base_asset,
      counterAsset: orderData.counter_asset,
      amount: orderData.amount,
      price: orderData.price,
      order_type: orderData.order_type || 'limit',
      chatroomId: orderData.chatroom_id
    } as UnifiedOrderRequest) as Promise<ServiceResponse<{order_id: string}>>,
    
  takeOffer: (offerData: TakeOfferRequest): Promise<ServiceResponse<any>> => 
    tradingApi.takeOffer(offerData),
    
  getOrder: (orderId: string): Promise<ServiceResponse<Order>> => 
    tradingApi.getOrder(orderId),
    
  deleteOrder: (orderId: string): Promise<ServiceResponse<any>> => 
    tradingApi.deleteOrder(orderId),
    
  getHistory: (username: string): Promise<ServiceResponse<Transaction[]>> => 
    tradingApi.getHistory(username)
}

export const stellarApi = {
  getBalances: (username: string): Promise<ServiceResponse<{balances: StellarBalance[]}>> => 
    tradingApi.getBalances(username),
    
  placeOrder: (orderData: StellarOrderRequest): Promise<ServiceResponse<any>> => 
    tradingApi.placeOrder({
      userId: orderData.userId,
      password: orderData.password,
      direction: orderData.direction,
      baseAsset: orderData.baseAsset,
      counterAsset: orderData.counterAsset,
      amount: orderData.amount,
      price: orderData.price,
      order_type: orderData.order_type
    } as UnifiedOrderRequest),
    
  cancelOrder: (cancelData: StellarCancelOrderRequest): Promise<ServiceResponse<any>> => 
    tradingApi.cancelOrder({
      userId: cancelData.userId,
      password: cancelData.password,
      offerId: cancelData.offerId,
      sellingAsset: cancelData.sellingAsset,
      buyingAsset: cancelData.buyingAsset
    } as UnifiedCancelOrderRequest),
    
  getOrders: (username: string): Promise<ServiceResponse<any[]>> => 
    tradingApi.getOrders(username)
}

// Legacy exports for backward compatibility (deprecated - use tradingApi instead)
export const get = async (endpoint: string) => {
  const response = await stellarService.get(endpoint)
  if (response.success) {
    return response.data
  } else {
    throw new Error(response.error || 'API request failed')
  }
}

export const post = async (endpoint: string, data: any) => {
  const response = await stellarService.post(endpoint, data)
  if (response.success) {
    return response.data
  } else {
    throw new Error(response.error || 'API request failed')
  }
}

export const postUnauthenticated = async (endpoint: string, data: any) => {
  const response = await publicService.post(endpoint, data)
  if (response.success) {
    return response.data
  } else {
    throw new Error(response.error || 'API request failed')
  }
}

