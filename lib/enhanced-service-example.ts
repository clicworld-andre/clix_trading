// Enhanced Service Layer for Multi-Purpose Trading Platform
// This shows how to structure your service layer for better scalability

interface ApiConfig {
  baseUrl: string
  timeout?: number
  retryAttempts?: number
  requiresAuth?: boolean
}

interface ServiceResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  status: number
}

// Different service configurations for different trading types
const SERVICE_CONFIGS = {
  otc: {
    baseUrl: "https://api.clicworld.app/assets/web3/otc/",
    requiresAuth: true,
    retryAttempts: 3,
  },
  stellar: {
    baseUrl: "https://api.clicworld.app/stellar/",
    requiresAuth: true,
    retryAttempts: 2,
  },
  market: {
    baseUrl: "https://api.clicworld.app/market/",
    requiresAuth: true,
    retryAttempts: 3,
  },
  public: {
    baseUrl: "https://api.clicworld.app/public/",
    requiresAuth: false,
    retryAttempts: 1,
  }
} as const

type ServiceType = keyof typeof SERVICE_CONFIGS

class ApiService {
  private config: ApiConfig

  constructor(serviceType: ServiceType) {
    this.config = SERVICE_CONFIGS[serviceType]
  }

  private getJwtToken(): string | null {
    if (typeof window === 'undefined') return null

    const rawId = localStorage.getItem('matrix_user_id')
    if (rawId) {
      const scopedFull = localStorage.getItem(`jwt_${rawId}`)
      if (scopedFull) return scopedFull

      const clean = rawId.replace(/^@/, "").split(":")[0]
      const scopedClean = localStorage.getItem(`jwt_${clean}`)
      if (scopedClean) return scopedClean
    }

    return localStorage.getItem('jwt')
  }

  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ServiceResponse<T>> {
    const { baseUrl, requiresAuth, retryAttempts = 1 } = this.config
    
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    }

    if (requiresAuth) {
      const token = this.getJwtToken()
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }
    }

    const requestOptions: RequestInit = {
      ...options,
      headers,
    }

    let lastError: Error | null = null

    // Retry logic
    for (let attempt = 0; attempt < retryAttempts; attempt++) {
      try {
        const response = await fetch(`${baseUrl}${endpoint}`, requestOptions)
        
        let data: any
        try {
          data = await response.json()
        } catch {
          data = null
        }

        if (response.ok) {
          return {
            success: true,
            data,
            status: response.status
          }
        } else {
          return {
            success: false,
            error: data?.message || `Request failed with status ${response.status}`,
            status: response.status,
            data
          }
        }
      } catch (error) {
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

// Create service instances for different trading types
export const otcService = new ApiService('otc')
export const stellarService = new ApiService('stellar')
export const marketService = new ApiService('market')
export const publicService = new ApiService('public')

// Typed service methods for better DX
export const otcApi = {
  getTokens: () => otcService.get<any[]>('getTokens'),
  getOrders: (username: string, roomId: string) => 
    otcService.get<any[]>(`orders/${username}?status=open&chatroom_id=${roomId}`),
  placeOrder: (orderData: any) => 
    otcService.post<any>('placeOrder', orderData),
  takeOffer: (offerData: any) => 
    otcService.post<any>('takeOffer', offerData),
  getOrder: (orderId: string) => 
    otcService.get<any>(`getOrder/${orderId}`),
  deleteOrder: (orderId: string) => 
    otcService.post<any>('deleteOrder', { order_id: orderId }),
  getHistory: (username: string) => 
    otcService.get<any[]>(`getHistory/${username}`)
}

export const stellarApi = {
  getBalances: (username: string) => 
    stellarService.get<any[]>(`balances/${username}`),
  placeOrder: (orderData: any) => 
    stellarService.post<any>('placeOrder', orderData),
  cancelOrder: (cancelData: any) => 
    stellarService.post<any>('cancelOrder', cancelData),
  getOrders: (username: string) => 
    stellarService.get<any[]>(`orders/${username}`)
}

// Usage examples:
// 
// // OTC Trading
// const tokens = await otcApi.getTokens()
// if (tokens.success) {
//   setTokens(tokens.data)
// } else {
//   toast({ title: "Error", description: tokens.error })
// }
//
// // Stellar Trading  
// const balances = await stellarApi.getBalances(username)
// if (balances.success) {
//   setBalances(balances.data)
// }
