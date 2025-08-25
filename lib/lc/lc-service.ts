// Letter of Credit Service - API Client and Business Logic

import { 
  LetterOfCredit, 
  LCTerms, 
  CreateLCRequest, 
  CreateLCResponse, 
  LCListResponse,
  LCDetailsResponse,
  LCStatus,
  LCDocument,
  LCDispute,
  LCSearchFilters,
  LCAnalytics
} from './types'

export class LCService {
  private baseUrl: string
  
  constructor(baseUrl: string = '/api/lc') {
    this.baseUrl = baseUrl
  }

  // Create new Letter of Credit
  async createLC(terms: LCTerms, participants: { buyerMatrixId: string; sellerMatrixId: string }): Promise<CreateLCResponse> {
    try {
      const request: CreateLCRequest = {
        terms,
        participants
      }

      const response = await fetch(`${this.baseUrl}/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        throw new Error(`Failed to create LC: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating LC:', error)
      throw error
    }
  }

  // Get LC details by ID
  async getLC(lcId: string): Promise<LCDetailsResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/${lcId}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch LC: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching LC:', error)
      throw error
    }
  }

  // Alias for getLC for consistency
  async getLCById(lcId: string): Promise<LCDetailsResponse> {
    return this.getLC(lcId)
  }

  // List LCs with optional filters
  async listLCs(filters?: LCSearchFilters, page = 1, limit = 20): Promise<LCListResponse> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      })

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined) {
            if (Array.isArray(value)) {
              params.append(key, value.join(','))
            } else if (typeof value === 'object') {
              params.append(key, JSON.stringify(value))
            } else {
              params.append(key, value.toString())
            }
          }
        })
      }

      const response = await fetch(`${this.baseUrl}/list?${params}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch LCs: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching LCs:', error)
      throw error
    }
  }

  // Update LC terms (during negotiation phase)
  async updateLC(lcId: string, updates: Partial<LCTerms>): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/${lcId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        throw new Error(`Failed to update LC: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error updating LC:', error)
      throw error
    }
  }

  // Sign LC terms
  async signLC(lcId: string, signature: string, userType: 'buyer' | 'seller'): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/${lcId}/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ signature, userType })
      })

      if (!response.ok) {
        throw new Error(`Failed to sign LC: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error signing LC:', error)
      throw error
    }
  }

  // Fund LC escrow
  async fundLC(lcId: string, txHash: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/${lcId}/fund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ txHash })
      })

      if (!response.ok) {
        throw new Error(`Failed to fund LC: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error funding LC:', error)
      throw error
    }
  }

  // Confirm shipment
  async confirmShipment(lcId: string, shipmentDetails: {
    billOfLadingNumber: string
    shipmentDate: string
    carrier: string
    trackingNumber?: string
  }): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/${lcId}/ship`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(shipmentDetails)
      })

      if (!response.ok) {
        throw new Error(`Failed to confirm shipment: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error confirming shipment:', error)
      throw error
    }
  }

  // Confirm delivery and release payment
  async confirmDelivery(lcId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/${lcId}/deliver`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      })

      if (!response.ok) {
        throw new Error(`Failed to confirm delivery: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error confirming delivery:', error)
      throw error
    }
  }

  // Raise dispute
  async raiseDispute(lcId: string, dispute: {
    reason: string
    evidence: string[]
    requestedResolution: string
  }): Promise<{ success: boolean; disputeId: string; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/${lcId}/dispute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dispute)
      })

      if (!response.ok) {
        throw new Error(`Failed to raise dispute: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error raising dispute:', error)
      throw error
    }
  }

  // Cancel LC (only possible in draft/negotiating status)
  async cancelLC(lcId: string, reason: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/${lcId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason })
      })

      if (!response.ok) {
        throw new Error(`Failed to cancel LC: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error cancelling LC:', error)
      throw error
    }
  }

  // Get LC analytics
  async getAnalytics(dateRange?: { from: string; to: string }): Promise<LCAnalytics> {
    try {
      const params = new URLSearchParams()
      if (dateRange) {
        params.append('from', dateRange.from)
        params.append('to', dateRange.to)
      }

      const response = await fetch(`${this.baseUrl}/analytics?${params}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.statusText}`)
      }

      const data = await response.json()
      return data.analytics
    } catch (error) {
      console.error('Error fetching analytics:', error)
      throw error
    }
  }

  // Generate LC number
  async generateLCNumber(): Promise<{ lcNumber: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/generate-number`)
      
      if (!response.ok) {
        throw new Error(`Failed to generate LC number: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error generating LC number:', error)
      throw error
    }
  }

  // Validate LC terms
  async validateLCTerms(terms: LCTerms): Promise<{ isValid: boolean; errors: string[] }> {
    try {
      const response = await fetch(`${this.baseUrl}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(terms)
      })

      if (!response.ok) {
        throw new Error(`Failed to validate LC terms: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error validating LC terms:', error)
      throw error
    }
  }

  // Get LC status history
  async getLCStatusHistory(lcId: string): Promise<Array<{
    status: LCStatus
    timestamp: string
    triggeredBy: string
    transactionHash?: string
    notes?: string
  }>> {
    try {
      const response = await fetch(`${this.baseUrl}/${lcId}/status-history`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch status history: ${response.statusText}`)
      }

      const data = await response.json()
      return data.history
    } catch (error) {
      console.error('Error fetching status history:', error)
      throw error
    }
  }
}

// Document Service for LC document management
export class LCDocumentService {
  private baseUrl: string
  
  constructor(baseUrl: string = '/api/documents') {
    this.baseUrl = baseUrl
  }

  // Upload document to IPFS
  async uploadDocument(
    lcId: string,
    file: File,
    documentType: string
  ): Promise<{ success: boolean; documentId: string; ipfsHash: string }> {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('lcId', lcId)
      formData.append('documentType', documentType)

      const response = await fetch(`${this.baseUrl}/upload`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Failed to upload document: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error uploading document:', error)
      throw error
    }
  }

  // Get document by IPFS hash
  async getDocument(ipfsHash: string): Promise<Blob> {
    try {
      const response = await fetch(`${this.baseUrl}/${ipfsHash}`)
      
      if (!response.ok) {
        throw new Error(`Failed to retrieve document: ${response.statusText}`)
      }

      return await response.blob()
    } catch (error) {
      console.error('Error retrieving document:', error)
      throw error
    }
  }

  // List documents for LC
  async listDocuments(lcId: string): Promise<LCDocument[]> {
    try {
      const response = await fetch(`${this.baseUrl}/list/${lcId}`)
      
      if (!response.ok) {
        throw new Error(`Failed to list documents: ${response.statusText}`)
      }

      const data = await response.json()
      return data.documents
    } catch (error) {
      console.error('Error listing documents:', error)
      throw error
    }
  }

  // Verify document
  async verifyDocument(
    documentId: string,
    verified: boolean,
    notes?: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/${documentId}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ verified, notes })
      })

      if (!response.ok) {
        throw new Error(`Failed to verify document: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error verifying document:', error)
      throw error
    }
  }
}

// Utility functions
export function formatLCNumber(lcNumber: string): string {
  return lcNumber.replace(/(\w{2})(\d{4})(\d{6})/, '$1-$2-$3')
}

export function getLCStatusColor(status: LCStatus): "default" | "destructive" | "outline" | "secondary" | "success" | "warning" {
  const colors = {
    draft: 'secondary' as const,
    negotiating: 'default' as const,
    signed: 'outline' as const,
    funded: 'success' as const,
    shipped: 'warning' as const,
    documents_submitted: 'warning' as const,
    delivered: 'success' as const,
    completed: 'success' as const,
    disputed: 'destructive' as const,
    cancelled: 'secondary' as const
  }
  return colors[status] || 'secondary'
}

export function calculateLCProgress(status: LCStatus): number {
  const progressMap = {
    draft: 10,
    negotiating: 25,
    signed: 40,
    funded: 55,
    shipped: 70,
    documents_submitted: 85,
    delivered: 95,
    completed: 100,
    disputed: 50, // Variable based on dispute resolution
    cancelled: 0
  }
  return progressMap[status] || 0
}

export function isLCEditable(status: LCStatus): boolean {
  return ['draft', 'negotiating'].includes(status)
}

export function canFundLC(status: LCStatus): boolean {
  return status === 'signed'
}

export function canShipGoods(status: LCStatus): boolean {
  return status === 'funded'
}

export function canSubmitDocuments(status: LCStatus): boolean {
  return status === 'shipped'
}

export function canConfirmDelivery(status: LCStatus): boolean {
  return status === 'documents_submitted'
}

export function canRaiseDispute(status: LCStatus): boolean {
  return !['completed', 'cancelled', 'disputed'].includes(status)
}

// Export singleton instances
export const lcService = new LCService()
export const lcDocumentService = new LCDocumentService()