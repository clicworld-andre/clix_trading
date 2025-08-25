// LC Invitation System Types

export type InvitationStatus = 
  | 'pending'
  | 'accepted' 
  | 'rejected'
  | 'expired'
  | 'cancelled'

export type UserRole = 'buyer' | 'seller'

export interface SystemUser {
  id: string
  matrixId: string
  displayName: string
  email?: string
  avatar?: string
  company?: string
  verified: boolean
  createdAt: string
  lastActive: string
  // Trading preferences
  preferredCurrencies?: string[]
  tradingRegions?: string[]
  businessType?: string
}

export interface LCInvitation {
  id: string
  lcTitle: string
  initiator: {
    userId: string
    matrixId: string
    displayName: string
    role: UserRole // What role the initiator will take
  }
  invitee: {
    userId: string
    matrixId: string
    displayName: string
    role: UserRole // What role the invitee will take
  }
  message?: string
  status: InvitationStatus
  
  // Timestamps
  createdAt: string
  expiresAt: string
  respondedAt?: string
  
  // Preliminary LC info (optional)
  preliminaryInfo?: {
    commodity?: string
    estimatedAmount?: string
    currency?: string
    timeline?: string
  }
  
  // Tracking
  notificationsSent: {
    matrix: boolean
    email: boolean
    inApp: boolean
  }
  
  // Response
  response?: {
    accepted: boolean
    message?: string
    respondedBy: string
    respondedAt: string
  }
}

export interface AuthorizedContact {
  userId: string
  matrixId: string
  displayName: string
  role: UserRole
  permissions: {
    canEdit: boolean
    canInviteOthers: boolean
    canApprove: boolean
  }
  addedAt: string
  addedBy: string
}

// API Request/Response Types
export interface SendInvitationRequest {
  inviteeUserId: string
  lcTitle: string
  message?: string
  initiatorRole: UserRole
  inviteeRole: UserRole
  preliminaryInfo?: LCInvitation['preliminaryInfo']
}

export interface SendInvitationResponse {
  success: boolean
  invitationId: string
  message: string
  expiresAt: string
}

export interface InvitationResponse {
  invitationId: string
  accepted: boolean
  message?: string
}

export interface InvitationResponseResult {
  success: boolean
  message: string
  lcId?: string // If accepted, the LC ID that can now be created
}

export interface UserDirectoryResponse {
  success: boolean
  users: SystemUser[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface PendingInvitationsResponse {
  success: boolean
  invitations: {
    sent: LCInvitation[]
    received: LCInvitation[]
  }
  counts: {
    sentPending: number
    receivedPending: number
    totalPending: number
  }
}

// System Settings
export interface InvitationSettings {
  defaultTimeoutDays: number
  maxPendingInvitations: number
  allowMultipleInvitationsPerLC: boolean
  requireEmailVerification: boolean
  enableAutoExpiration: boolean
  notificationChannels: {
    matrix: boolean
    email: boolean
    inApp: boolean
  }
}

// Utility Types
export interface InvitationStats {
  totalSent: number
  totalReceived: number
  acceptanceRate: number
  averageResponseTime: number // in hours
}

// Enhanced LC Types with Authorization
export interface EnhancedLCTerms {
  // Original LC terms
  lcType: 'sight' | 'usance' | 'revolving'
  lcNumber?: string
  amount: string
  currency: string
  
  // Enhanced party info with authorization
  authorizedContacts: AuthorizedContact[]
  
  // Trading pair (no banks)
  buyer: {
    userId: string
    matrixId: string
    displayName: string
    company: string
    address: string
    walletAddress?: string
  }
  seller: {
    userId: string
    matrixId: string
    displayName: string
    company: string
    address: string
    walletAddress?: string
  }
  
  // Rest of LC terms remain the same
  commodity: string
  quantity: string
  unitPrice: string
  totalValue?: number
  incoterms: string
  portOfLoading: string
  portOfDestination: string
  expiryDate: string
  latestShipmentDate: string
  requiredDocuments: string[]
  additionalTerms?: string
  partialShipments: boolean
  transhipment: boolean
}

export interface AuthorizedLC {
  id: string
  lcNumber: string
  terms: EnhancedLCTerms
  status: 'draft' | 'negotiating' | 'signed' | 'funded' | 'shipped' | 'documents_submitted' | 'delivered' | 'completed' | 'disputed' | 'cancelled'
  
  // Authorization info
  createdFromInvitation: string // invitation ID
  authorizedContacts: AuthorizedContact[]
  
  // Matrix integration
  matrixRoomId?: string
  
  // Timestamps
  createdAt: string
  updatedAt: string
  authorizedAt: string
}

// Error Types
export interface InvitationError {
  code: string
  message: string
  details?: any
}

export const INVITATION_ERROR_CODES = {
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  ALREADY_INVITED: 'ALREADY_INVITED',
  INVITATION_EXPIRED: 'INVITATION_EXPIRED',
  INVALID_ROLE: 'INVALID_ROLE',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  MAX_INVITATIONS_EXCEEDED: 'MAX_INVITATIONS_EXCEEDED',
  NOTIFICATION_FAILED: 'NOTIFICATION_FAILED'
} as const