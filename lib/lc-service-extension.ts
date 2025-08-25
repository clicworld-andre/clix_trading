// LC Service Extension - Based on existing service.ts
// Extends the Clic World API service for Letter of Credit operations

const LC_BASE_URL = "https://api.clicworld.app/exchange/lc/" // Updated LC endpoint
const WALLET_BASE_URL = "https://api.clicworld.app/" // Your existing wallet API

// Helper function to get JWT token from localStorage (same as existing)
const getJwtToken = () => {
  if (typeof window === 'undefined') return null

  const rawId = localStorage.getItem('matrix_user_id')
  if (rawId) {
    const scopedFull = localStorage.getItem(`jwt_${rawId}`)
    if (scopedFull) return scopedFull

    const clean = rawId.replace(/^@/, '').split(':')[0]
    const scopedClean = localStorage.getItem(`jwt_${clean}`)
    if (scopedClean) return scopedClean
  }

  return localStorage.getItem('jwt')
}

// Helper function to make authenticated API requests
const apiRequest = async (baseUrl: string, endpoint: string, options: RequestInit = {}) => {
  const token = getJwtToken()
  
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "An error occurred" }))
    throw new Error(error.message || `API request failed with status ${response.status}`)
  }

  return response.json()
}

// Existing GET/POST helpers (same as your service.ts)
export const get = async (endpoint: string) => {
  return apiRequest(LC_BASE_URL, endpoint, { method: "GET" })
}

export const post = async (endpoint: string, data: any) => {
  return apiRequest(LC_BASE_URL, endpoint, {
    method: "POST",
    body: JSON.stringify(data)
  })
}

// New LC-specific API functions

export interface LCTerms {
  buyer: string
  seller: string
  commodity: string
  commodityToken: string
  quantity: string
  unitOfMeasure: string
  lcAmount: string
  currency: string
  tolerance: string
  deliveryTerms: string
  portOfLoading: string
  portOfDischarge: string
  latestShipmentDate: string
  requiredDocuments: string[]
  documentDeadline: string
  specialConditions?: string
  governingLaw: string
  arbitrationClause: string
}

export interface LCContract {
  id: string
  terms: LCTerms
  status: 'draft' | 'proposed' | 'negotiating' | 'agreed' | 'funded' | 'shipped' | 'documents_submitted' | 'completed' | 'disputed'
  contractAddress?: string
  escrowAddress?: string
  createdAt: string
  updatedAt: string
  messages: LCMessage[]
}

export interface LCMessage {
  id: string
  type: 'proposal' | 'counter_proposal' | 'agreement' | 'funding' | 'shipment' | 'documents' | 'delivery_confirmation' | 'dispute'
  sender: string
  timestamp: number
  data: any
  matrixMessageId?: string
  txHash?: string
}

// LC Management API Functions

/**
 * Create a new Letter of Credit proposal
 */
export const createLCProposal = async (terms: LCTerms): Promise<LCContract> => {
  return post('proposals', {
    terms,
    status: 'proposed',
    createdAt: new Date().toISOString()
  })
}

/**
 * Get LC by ID
 */
export const getLCById = async (lcId: string): Promise<LCContract> => {
  return get(`contracts/${lcId}`)
}

/**
 * Get all LCs for a user
 */
export const getUserLCs = async (userId: string): Promise<LCContract[]> => {
  return get(`users/${encodeURIComponent(userId)}/contracts`)
}

/**
 * Update LC status
 */
export const updateLCStatus = async (
  lcId: string, 
  status: LCContract['status'],
  message?: Partial<LCMessage>
): Promise<LCContract> => {
  return post(`contracts/${lcId}/status`, {
    status,
    message,
    updatedAt: new Date().toISOString()
  })
}

/**
 * Add message to LC conversation thread
 */
export const addLCMessage = async (lcId: string, message: LCMessage): Promise<void> => {
  return post(`contracts/${lcId}/messages`, message)
}

/**
 * Deploy smart contract for agreed LC
 */
export const deployLCContract = async (lcId: string, terms: LCTerms): Promise<{
  contractAddress: string
  escrowAddress: string
  txHash: string
}> => {
  return post(`contracts/${lcId}/deploy`, {
    terms,
    timestamp: Date.now()
  })
}

// Wallet Integration API Functions (extend your existing wallet API)

/**
 * Check if user has sufficient balance for LC funding
 */
export const checkLCFundingCapacity = async (
  username: string, 
  amount: string, 
  currency: string
): Promise<{
  sufficient: boolean
  availableBalance: string
  requiredAmount: string
  currency: string
}> => {
  return apiRequest(WALLET_BASE_URL, `exchange/lc/check-funding`, {
    method: 'POST',
    body: JSON.stringify({
      username,
      amount,
      currency,
      timestamp: Date.now()
    })
  })
}

/**
 * Transfer funds to LC escrow account
 */
export const fundLCEscrow = async (
  buyerUsername: string,
  escrowAddress: string,
  amount: string,
  currency: string,
  lcId: string,
  password: string
): Promise<{
  success: boolean
  txHash: string
  escrowBalance: string
}> => {
  return apiRequest(WALLET_BASE_URL, `exchange/lc/fund-escrow`, {
    method: 'POST',
    body: JSON.stringify({
      from_username: buyerUsername,
      to_address: escrowAddress,
      amount,
      currency,
      lc_id: lcId,
      password_hash: btoa(password), // Basic encoding - would use proper hashing
      memo: `LC_FUNDING:${lcId}`,
      timestamp: Date.now()
    })
  })
}

/**
 * Release funds from escrow to seller
 */
export const releaseLCFunds = async (
  escrowAddress: string,
  sellerUsername: string,
  amount: string,
  currency: string,
  lcId: string,
  releaseKey: string
): Promise<{
  success: boolean
  txHash: string
  remainingBalance: string
}> => {
  return apiRequest(WALLET_BASE_URL, `exchange/lc/release-funds`, {
    method: 'POST',
    body: JSON.stringify({
      from_address: escrowAddress,
      to_username: sellerUsername,
      amount,
      currency,
      lc_id: lcId,
      release_key: releaseKey,
      memo: `LC_SETTLEMENT:${lcId}`,
      timestamp: Date.now()
    })
  })
}

/**
 * Get LC escrow balance
 */
export const getLCEscrowBalance = async (
  escrowAddress: string,
  currency: string
): Promise<{
  balance: string
  currency: string
  locked: boolean
}> => {
  return apiRequest(WALLET_BASE_URL, `exchange/lc/escrow-balance`, {
    method: 'GET'
  })
}

// Document Management API Functions

export interface TradeDocument {
  id: string
  type: string
  name: string
  ipfsHash: string
  uploadedBy: string
  uploadedAt: string
  verified: boolean
  verifiedBy?: string
  verifiedAt?: string
}

/**
 * Upload document to IPFS and register with LC
 */
export const uploadLCDocument = async (
  lcId: string,
  documentType: string,
  file: File
): Promise<TradeDocument> => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('lc_id', lcId)
  formData.append('document_type', documentType)
  formData.append('uploaded_by', localStorage.getItem('matrix_user_id') || '')

  const token = getJwtToken()
  const response = await fetch(`${LC_BASE_URL}documents/upload`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData
  })

  if (!response.ok) {
    throw new Error('Document upload failed')
  }

  return response.json()
}

/**
 * Get all documents for an LC
 */
export const getLCDocuments = async (lcId: string): Promise<TradeDocument[]> => {
  return get(`contracts/${lcId}/documents`)
}

/**
 * Verify a document (for authorized verifiers)
 */
export const verifyLCDocument = async (
  documentId: string,
  verified: boolean,
  notes?: string
): Promise<TradeDocument> => {
  return post(`documents/${documentId}/verify`, {
    verified,
    notes,
    verified_by: localStorage.getItem('matrix_user_id'),
    verified_at: new Date().toISOString()
  })
}

// Commodity Token Integration

export interface CommodityToken {
  id: string
  symbol: string
  name: string
  assetCode: string
  issuer: string
  priceOracle?: string
  lastPrice?: number
  lastUpdated?: string
}

/**
 * Get supported commodity tokens
 */
export const getCommodityTokens = async (): Promise<CommodityToken[]> => {
  return get('tokens/commodities')
}

/**
 * Get real-time commodity price
 */
export const getCommodityPrice = async (
  tokenSymbol: string,
  currency: string = 'USDC'
): Promise<{
  symbol: string
  price: number
  currency: string
  timestamp: string
  source: string
}> => {
  return get(`tokens/${tokenSymbol}/price?currency=${currency}`)
}

/**
 * Convert between commodity tokens and stablecoins
 */
export const convertCommodityToken = async (
  fromToken: string,
  toToken: string,
  amount: string,
  userAddress: string
): Promise<{
  conversion_rate: number
  output_amount: string
  fees: string
  estimated_tx_hash: string
}> => {
  return post('tokens/convert', {
    from_token: fromToken,
    to_token: toToken,
    amount,
    user_address: userAddress,
    timestamp: Date.now()
  })
}

// Stellar DEX Integration

/**
 * Get SDEX liquidity for LC currency pairs
 */
export const getSDEXLiquidity = async (
  baseAsset: string,
  counterAsset: string
): Promise<{
  base_asset: string
  counter_asset: string
  bid_price: number
  ask_price: number
  spread: number
  base_volume: number
  counter_volume: number
  last_updated: string
}> => {
  return get(`sdex/liquidity?base=${baseAsset}&counter=${counterAsset}`)
}

/**
 * Execute trade on SDEX for LC currency requirements
 */
export const executeSDEXTrade = async (
  userAddress: string,
  sellAsset: string,
  buyAsset: string,
  amount: string,
  maxPrice: string
): Promise<{
  success: boolean
  tx_hash: string
  executed_price: number
  executed_amount: string
  fees: string
}> => {
  return post('sdex/trade', {
    user_address: userAddress,
    sell_asset: sellAsset,
    buy_asset: buyAsset,
    amount,
    max_price: maxPrice,
    timestamp: Date.now()
  })
}

// Dispute Resolution API Functions

export interface DisputeCase {
  id: string
  lcId: string
  raisedBy: string
  raisedAt: string
  reason: string
  evidence: string[]
  status: 'open' | 'under_review' | 'resolved' | 'appealed'
  arbiter?: string
  resolution?: {
    decision: string
    buyerAmount: string
    sellerAmount: string
    reasoning: string
    resolvedAt: string
    resolvedBy: string
  }
}

/**
 * Raise a dispute for an LC
 */
export const raiseLCDispute = async (
  lcId: string,
  reason: string,
  evidence: string[]
): Promise<DisputeCase> => {
  return post(`contracts/${lcId}/dispute`, {
    reason,
    evidence,
    raised_by: localStorage.getItem('matrix_user_id'),
    raised_at: new Date().toISOString(),
    status: 'open'
  })
}

/**
 * Get dispute details
 */
export const getDispute = async (disputeId: string): Promise<DisputeCase> => {
  return get(`disputes/${disputeId}`)
}

/**
 * Submit additional evidence to dispute
 */
export const submitDisputeEvidence = async (
  disputeId: string,
  evidence: string[]
): Promise<DisputeCase> => {
  return post(`disputes/${disputeId}/evidence`, {
    evidence,
    submitted_by: localStorage.getItem('matrix_user_id'),
    submitted_at: new Date().toISOString()
  })
}

/**
 * Resolve dispute (arbiter only)
 */
export const resolveDispute = async (
  disputeId: string,
  decision: string,
  buyerAmount: string,
  sellerAmount: string,
  reasoning: string
): Promise<DisputeCase> => {
  return post(`disputes/${disputeId}/resolve`, {
    decision,
    buyer_amount: buyerAmount,
    seller_amount: sellerAmount,
    reasoning,
    resolved_by: localStorage.getItem('matrix_user_id'),
    resolved_at: new Date().toISOString()
  })
}

// Analytics and Reporting

/**
 * Get LC statistics for user
 */
export const getLCStats = async (userId: string): Promise<{
  total_lcs: number
  active_lcs: number
  completed_lcs: number
  total_volume: number
  average_amount: number
  success_rate: number
  currencies_used: string[]
  commodities_traded: string[]
}> => {
  return get(`users/${encodeURIComponent(userId)}/stats`)
}

/**
 * Get LC performance metrics
 */
export const getLCMetrics = async (timeframe: string = '30d'): Promise<{
  period: string
  total_volume: number
  transaction_count: number
  average_completion_time: number
  dispute_rate: number
  currency_breakdown: Record<string, number>
  commodity_breakdown: Record<string, number>
  geographic_distribution: Record<string, number>
}> => {
  return get(`analytics/metrics?timeframe=${timeframe}`)
}