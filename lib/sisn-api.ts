/**
 * SISN Hybrid Financial System API Service
 * Provides integration with the SISN settlement platform
 */

export interface SISNSystemMode {
  mode: string
  name: string
  description: string
  multiToken: boolean
  requiresEscrow: boolean
}

export interface SISNTokenInfo {
  mode: string
  supported: string[]
  primary: string | null
  issuers: Record<string, string>
  multiToken: boolean
  capabilities: {
    crossTokenExchange: boolean
    bankSpecificTokens: boolean
  }
}

export interface SISNAccountInfo {
  mode: string
  totalAccounts: number
  issuingAccounts: number
  settlementAccounts: number
  readyAccounts: number
  accounts: Record<string, {
    name: string
    userType: string
    permissions: string[]
    canIssue: boolean
    canSettle: boolean
    funded: boolean
    ready: string
  }>
}

export interface SISNBalance {
  account: string
  balances: Array<{
    asset_type: string
    asset_code: string
    balance: string
    limit?: string
    issuer?: string
  }>
  mode: string
  totalTokens: number
  multiToken: boolean
}

export interface SISNSettlementStatus {
  mode: string
  platform: string
  operational: boolean
  settlement: {
    type: string
    realTime: boolean
    centralClearance: boolean
    batchProcessing: boolean
  }
  tokens: {
    multiToken: boolean
    supported: string[]
    primary: string | null
    crossTokenExchange: boolean
  }
  accounts: {
    total: number
    canSettle: number
    canIssue: number
  }
  compliance: Record<string, boolean>
}

export interface SISNTransferRequest {
  fromAccount: string
  toAccount: string
  amount: string
  tokenCode?: string
  memo?: string
  fromSecretKey: string
}

export interface SISNTransferResponse {
  success: boolean
  data?: {
    transaction: string
    correlationId: string
    settlementType: string
    realTime: boolean
  }
  error?: string
  message?: string
}

class SISNApiService {
  private baseUrl: string
  private apiVersion: string

  constructor(baseUrl = 'http://localhost:3000', apiVersion = 'v1') {
    this.baseUrl = baseUrl
    this.apiVersion = apiVersion
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}/api/${this.apiVersion}${endpoint}`
    
    // Generate correlation ID with fallback for older browsers
    const correlationId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'X-Correlation-ID': correlationId,
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `SISN API Error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    if (!data.success && data.error) {
      throw new Error(data.error)
    }

    return data
  }

  /**
   * Get current system mode and configuration
   */
  async getSystemMode(): Promise<SISNSystemMode> {
    const response = await this.request<{ data: SISNSystemMode }>('/system/mode')
    return response.data
  }

  /**
   * Get supported tokens and issuers
   */
  async getTokenInfo(): Promise<SISNTokenInfo> {
    const response = await this.request<{ data: SISNTokenInfo }>('/system/tokens')
    return response.data
  }

  /**
   * Get account information
   */
  async getAccountInfo(): Promise<SISNAccountInfo> {
    const response = await this.request<{ data: SISNAccountInfo }>('/system/accounts')
    return response.data
  }

  /**
   * Get account balance for a specific account
   */
  async getAccountBalance(account: string, tokenCode?: string): Promise<SISNBalance> {
    let endpoint = `/settlement/balance/${encodeURIComponent(account)}`
    if (tokenCode) {
      endpoint += `?tokenCode=${encodeURIComponent(tokenCode)}`
    }
    
    const response = await this.request<{ data: SISNBalance }>(endpoint)
    return response.data
  }

  /**
   * Get settlement system status
   */
  async getSettlementStatus(): Promise<SISNSettlementStatus> {
    const response = await this.request<{ data: SISNSettlementStatus }>('/settlement/status')
    return response.data
  }

  /**
   * Initiate a token transfer
   */
  async transfer(transferRequest: SISNTransferRequest): Promise<SISNTransferResponse> {
    return this.request<SISNTransferResponse>('/settlement/transfer', {
      method: 'POST',
      body: JSON.stringify(transferRequest),
    })
  }

  /**
   * Create a trustline for a token
   */
  async createTrustline(account: string, secretKey: string, tokenCode?: string): Promise<any> {
    return this.request('/settlement/trustline', {
      method: 'POST',
      body: JSON.stringify({
        account,
        secretKey,
        tokenCode,
      }),
    })
  }

  /**
   * Get transaction history for an account
   */
  async getTransactionHistory(account: string, options?: {
    limit?: number
    cursor?: string
    tokenCode?: string
  }): Promise<any> {
    let endpoint = `/settlement/history/${encodeURIComponent(account)}`
    const params = new URLSearchParams()
    
    if (options?.limit) params.append('limit', options.limit.toString())
    if (options?.cursor) params.append('cursor', options.cursor)
    if (options?.tokenCode) params.append('tokenCode', options.tokenCode)
    
    if (params.toString()) {
      endpoint += `?${params.toString()}`
    }
    
    const response = await this.request<{ data: any }>(endpoint)
    return response.data
  }

  /**
   * Check if SISN system is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      return response.ok
    } catch {
      return false
    }
  }
}

// Export singleton instance
export const sisnApi = new SISNApiService()

// Helper functions
export function formatBalance(balance: string, decimals = 7): string {
  const num = parseFloat(balance)
  if (num === 0) return '0'
  
  // Show more precision for small amounts
  if (num < 1) {
    return num.toFixed(decimals).replace(/\.?0+$/, '')
  }
  
  // Show fewer decimals for larger amounts
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

export function getSISNTokenDisplayName(tokenCode: string): string {
  const tokenNames: Record<string, string> = {
    'XUGX': 'Uganda Shilling Token',
    'BAXUGX': 'Bank A Uganda Token',
    'BBXUGX': 'Bank B Uganda Token',
    'USDC': 'USD Coin',
  }
  
  return tokenNames[tokenCode] || tokenCode
}

export function getSISNModeDisplayName(mode: string): string {
  const modeNames: Record<string, string> = {
    'interbank': 'Interbank Settlement',
    'cbdc-wholesale': 'CBDC Wholesale',
    'cbdc-retail': 'CBDC Retail',
  }
  
  return modeNames[mode] || mode
}
