// Letter of Credit Types and Interfaces

export type LCStatus = 
  | 'draft'
  | 'negotiating'
  | 'signed'
  | 'funded'
  | 'shipped'
  | 'documents_submitted'
  | 'delivered'
  | 'completed'
  | 'disputed'
  | 'cancelled'

export type LCType = 'sight' | 'usance' | 'revolving'

export type Currency = 
  | 'USD' | 'EUR' | 'GBP' | 'JPY' 
  | 'XLM' | 'USDC' | 'EURC' | 'CLIX' | 'USD1' | 'XAU' | 'XCOF'

export type Incoterms = 
  | 'FOB' | 'CIF' | 'CFR' | 'EXW' | 'FCA' 
  | 'CPT' | 'CIP' | 'DAT' | 'DAP' | 'DDP'

export type DocumentStatus = 'pending' | 'uploaded' | 'verified' | 'rejected'

export interface LCParty {
  name: string
  address: string
  matrixId: string
  walletAddress?: string
  bankDetails?: {
    bankName: string
    swiftCode: string
    accountNumber: string
  }
}

export interface LCTerms {
  // Basic Information
  lcType: LCType
  lcNumber?: string
  amount: string
  currency: Currency
  
  // Parties
  buyer: LCParty
  seller: LCParty
  issuingBank?: LCParty
  confirmingBank?: LCParty
  
  // Commodity Details
  commodity: string
  quantity: string
  unitPrice: string
  totalValue?: number
  
  // Trade Terms
  incoterms: Incoterms
  portOfLoading: string
  portOfDestination: string
  
  // Timeline
  expiryDate: string
  latestShipmentDate: string
  
  // Documents
  requiredDocuments: string[]
  
  // Additional Terms
  additionalTerms?: string
  partialShipments: boolean
  transhipment: boolean
}

export interface LetterOfCredit {
  id: string
  lcNumber: string
  contractAddress?: string
  terms: LCTerms
  status: LCStatus
  matrixRoomId?: string
  
  // Blockchain Data
  deploymentTx?: string
  fundingTx?: string
  settlementTx?: string
  
  // Workflow Timestamps
  createdAt: string
  updatedAt: string
  fundedAt?: string
  shippedAt?: string
  completedAt?: string
  
  // Documents
  documents?: LCDocument[]
  
  // Dispute Information
  dispute?: LCDispute
}

export interface LCDocument {
  id: string
  lcId: string
  documentType: string
  documentName: string
  ipfsHash: string
  uploadedBy: string
  status: DocumentStatus
  verifiedBy?: string
  uploadedAt: string
  verifiedAt?: string
  metadata?: {
    fileSize: number
    mimeType: string
    checksum: string
  }
}

export interface LCDispute {
  id: string
  lcId: string
  raisedBy: string
  disputeReason: string
  evidenceIpfsHashes: string[]
  arbiter?: string
  status: 'open' | 'in_review' | 'resolved' | 'appealed'
  resolution?: {
    decision: string
    ruling: string
    fundsDistribution: {
      buyer: number
      seller: number
    }
  }
  createdAt: string
  resolvedAt?: string
}

// Matrix Message Types for LC Operations
export interface LCMatrixMessage {
  type: 'lc_proposal' | 'lc_amendment' | 'lc_agreement' | 'lc_funding' | 
        'lc_shipment' | 'lc_documents' | 'lc_dispute' | 'lc_status_update'
  lcId: string
  content: any
  sender: string
  timestamp: number
  cryptographicProof?: string
}

// LC Room Configuration for Matrix
export interface LCRoom {
  roomId: string
  lcId: string
  participants: {
    buyer: string
    seller: string
    bank?: string
    arbiter?: string
  }
  lcTerms: LCTerms
  status: LCStatus
  conversationHash: string
  encryptionEnabled: boolean
}

// API Request/Response Types
export interface CreateLCRequest {
  terms: LCTerms
  participants: {
    buyerMatrixId: string
    sellerMatrixId: string
  }
}

export interface CreateLCResponse {
  success: boolean
  lcId: string
  roomId: string
  contractAddress?: string
  message: string
}

export interface LCListResponse {
  success: boolean
  letterOfCredits: LetterOfCredit[]
  pagination?: {
    page: number
    limit: number
    total: number
  }
}

export interface LCDetailsResponse {
  success: boolean
  letterOfCredit: LetterOfCredit
}

// Smart Contract Types
export interface LCContractData {
  // Parties
  buyer: string
  seller: string
  issuingBank?: string
  confirmingBank?: string
  
  // LC Details
  lcNumber: string
  amount: bigint
  currency: string
  commodity: string
  quantity: string
  
  // Terms
  termsHash: string
  expiryDate: bigint
  latestShipmentDate: bigint
  requiredDocuments: string[]
  
  // Status
  status: number // Enum value as number
  fundingTx?: string
  settlementTx?: string
  
  // Workflow
  createdAt: bigint
  fundedAt?: bigint
  shippedAt?: bigint
  completedAt?: bigint
}

// Wallet Integration Types
export interface LCWalletOperations {
  checkFunding(amount: string, currency: string): Promise<FundingCheck>
  fundEscrow(lcId: string, amount: string, currency: string): Promise<Transaction>
  releasePayment(lcId: string, recipient: string): Promise<Transaction>
  getMultiCurrencyBalance(): Promise<CurrencyBalance[]>
  convertCurrency(from: string, to: string, amount: string): Promise<Conversion>
}

export interface FundingCheck {
  hasSufficientFunds: boolean
  availableBalance: string
  requiredAmount: string
  currency: string
}

export interface Transaction {
  hash: string
  status: 'pending' | 'confirmed' | 'failed'
  amount: string
  currency: string
  from: string
  to: string
  timestamp: string
  networkFee?: string
}

export interface CurrencyBalance {
  currency: string
  balance: string
  usdValue?: string
}

export interface Conversion {
  fromCurrency: string
  toCurrency: string
  fromAmount: string
  toAmount: string
  exchangeRate: string
  fees: string
  transactionHash?: string
}

// Form Validation Schemas Export Types
export interface LCFormValidationErrors {
  [key: string]: string | undefined
}

// Search and Filter Types
export interface LCSearchFilters {
  status?: LCStatus[]
  currency?: Currency[]
  dateRange?: {
    from: string
    to: string
  }
  amountRange?: {
    min: number
    max: number
  }
  parties?: string[]
  commodity?: string
}

// Analytics and Reporting Types
export interface LCAnalytics {
  totalValue: number
  completedLCs: number
  averageProcessingTime: number
  topCurrencies: Array<{
    currency: string
    count: number
    totalValue: number
  }>
  topCommodities: Array<{
    commodity: string
    count: number
    totalValue: number
  }>
  monthlyTrends: Array<{
    month: string
    count: number
    value: number
  }>
}

// Event Types for Real-time Updates
export type LCEvent = {
  type: 'lc_created' | 'lc_updated' | 'lc_funded' | 'lc_shipped' | 'lc_completed' | 'lc_disputed'
  lcId: string
  data: any
  timestamp: string
  userId: string
}

// Error Types
export interface LCError {
  code: string
  message: string
  details?: any
  timestamp: string
}

// Constants
export const LC_CURRENCIES: Array<{code: Currency, name: string, symbol: string}> = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'XLM', name: 'Stellar Lumens', symbol: 'XLM' },
  { code: 'USDC', name: 'USD Coin', symbol: 'USDC' },
  { code: 'EURC', name: 'Euro Coin', symbol: 'EURC' },
  { code: 'CLIX', name: 'CLIX Token', symbol: 'CLIX' },
  { code: 'USD1', name: 'USD1', symbol: 'USD1' },
  { code: 'XAU', name: 'Gold Token', symbol: 'XAU' },
  { code: 'XCOF', name: 'CFA Franc', symbol: 'XCOF' }
]

export const DOCUMENT_TYPES = [
  'Commercial Invoice',
  'Packing List',
  'Bill of Lading',
  'Certificate of Origin',
  'Insurance Policy',
  'Inspection Certificate',
  'Weight Certificate',
  'Quality Certificate',
  'Health Certificate',
  'Phytosanitary Certificate'
] as const

export const INCOTERMS_OPTIONS: Array<{code: Incoterms, name: string}> = [
  { code: 'FOB', name: 'Free On Board' },
  { code: 'CIF', name: 'Cost, Insurance & Freight' },
  { code: 'CFR', name: 'Cost & Freight' },
  { code: 'EXW', name: 'Ex Works' },
  { code: 'FCA', name: 'Free Carrier' },
  { code: 'CPT', name: 'Carriage Paid To' },
  { code: 'CIP', name: 'Carriage & Insurance Paid To' },
  { code: 'DAT', name: 'Delivered At Terminal' },
  { code: 'DAP', name: 'Delivered At Place' },
  { code: 'DDP', name: 'Delivered Duty Paid' }
]