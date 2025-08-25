// Updated Clic API Client with correct URL structure
// Base URL: https://api.clicworld.app/
// Structure: BASEURL/MICRO_SERVICE/ROUTE/functionName
// Microservices: exchange, fedapi, payments, social banking

export class ClicAPIClient {
  private baseUrl = 'https://api.clicworld.app'

  // Exchange microservice endpoints
  exchange = {
    // OTC Trading endpoints
    otc: {
      getTokens: () => `${this.baseUrl}/exchange/otc/getTokens`,
      placeOrder: () => `${this.baseUrl}/exchange/otc/placeOrder`,
      takeOffer: () => `${this.baseUrl}/exchange/otc/takeOffer`,
      getOrder: (orderId: string) => `${this.baseUrl}/exchange/otc/getOrder/${orderId}`,
      getOrders: (userId: string) => `${this.baseUrl}/exchange/otc/orders/${userId}`,
      linkOtc: () => `${this.baseUrl}/exchange/otc/linkOtc`
    },
    
    // Stellar trading endpoints (new)
    stellar: {
      placeOrder: () => `${this.baseUrl}/exchange/stellar/placeOrder`,
      cancelOrder: () => `${this.baseUrl}/exchange/stellar/cancelOrder`,
      getKeys: () => `${this.baseUrl}/exchange/stellar/getKeys`,
      getPublicKey: (userId: string) => `${this.baseUrl}/exchange/stellar/getPublicKey/${userId}`,
      getBalances: (userId: string) => `${this.baseUrl}/exchange/stellar/balances/${userId}`,
      getOrders: (userId: string) => `${this.baseUrl}/exchange/stellar/orders/${userId}`,
      recordTransaction: () => `${this.baseUrl}/exchange/stellar/recordTransaction`
    }
  }

  // Payments microservice endpoints
  payments = {
    getBalance: () => `${this.baseUrl}/payments/balance/getBalance`,
    transfer: () => `${this.baseUrl}/payments/transfer/transfer`,
    getHistory: (userId: string) => `${this.baseUrl}/payments/history/getHistory/${userId}`
  }

  // Federation microservice endpoints
  fedapi = {
    lookup: () => `${this.baseUrl}/fedapi/federation/lookup`,
    resolve: () => `${this.baseUrl}/fedapi/federation/resolve`
  }

  // Social banking microservice endpoints
  socialbanking = {
    // Add social banking endpoints as needed
  }

  // QR code endpoints
  qr = {
    connect: () => `${this.baseUrl}/qr/connect`
  }
}

// Export singleton instance
export const clicAPI = new ClicAPIClient()

// Helper function for making API calls with proper error handling
export async function clicAPICall(url: string, options: RequestInit = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Clic API call error:', error)
    throw error
  }
}