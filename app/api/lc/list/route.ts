import { NextRequest, NextResponse } from 'next/server'
import { LetterOfCredit, LCListResponse, LCSearchFilters } from '@/lib/lc/types'

// Mock LCs data for demonstration
const mockLCs: LetterOfCredit[] = [
  {
    id: 'lc_demo_001',
    lcNumber: 'CLIX-LC-2025-001',
    terms: {
      lcType: 'sight',
      amount: '250000',
      currency: 'USDC',
      buyer: {
        name: 'Global Imports Inc.',
        address: '123 Trade Street, New York, NY 10001, USA',
        matrixId: '@buyer_demo:matrix.clicworld.app'
      },
      seller: {
        name: 'Premium Coffee Exports Ltd.',
        address: 'Zona Cafetera, Manizales, Colombia',
        matrixId: '@seller_demo:matrix.clicworld.app'
      },
      commodity: 'Premium Arabica Coffee Beans',
      quantity: '100 metric tons',
      unitPrice: '2500',
      totalValue: 250000,
      incoterms: 'FOB',
      portOfLoading: 'Port of Buenaventura, Colombia',
      portOfDestination: 'Port of New York, USA',
      expiryDate: '2025-04-15T23:59:59Z',
      latestShipmentDate: '2025-03-15T23:59:59Z',
      requiredDocuments: ['Commercial Invoice', 'Bill of Lading', 'Certificate of Origin'],
      partialShipments: true,
      transhipment: true
    },
    status: 'funded',
    matrixRoomId: '!lcroom_demo001:matrix.clicworld.app',
    createdAt: '2025-01-15T10:30:00Z',
    updatedAt: '2025-01-20T14:45:00Z',
    fundedAt: '2025-01-18T09:15:00Z'
  },
  {
    id: 'lc_demo_002',
    lcNumber: 'CLIX-LC-2025-002',
    terms: {
      lcType: 'usance',
      amount: '500000',
      currency: 'EUR',
      buyer: {
        name: 'European Foods Inc',
        address: '789 Food Street, Amsterdam, Netherlands',
        matrixId: '@eurobuyer:matrix.org'
      },
      seller: {
        name: 'Mediterranean Olive Co',
        address: '321 Olive Grove, Athens, Greece',
        matrixId: '@oliveseller:matrix.org'
      },
      commodity: 'Extra Virgin Olive Oil, Premium Grade',
      quantity: '500 Barrels',
      unitPrice: '1000',
      totalValue: 500000,
      incoterms: 'CIF',
      portOfLoading: 'Port of Piraeus, Greece',
      portOfDestination: 'Port of Amsterdam, Netherlands',
      expiryDate: '2024-10-15',
      latestShipmentDate: '2024-09-30',
      requiredDocuments: ['Commercial Invoice', 'Certificate of Origin', 'Quality Certificate'],
      partialShipments: true,
      transhipment: false
    },
    status: 'negotiating',
    matrixRoomId: '!room2:matrix.org',
    createdAt: '2024-02-01T09:00:00Z',
    updatedAt: '2024-02-05T14:20:00Z'
  },
  {
    id: '3',
    lcNumber: 'LC001236',
    terms: {
      lcType: 'sight',
      amount: '2500000',
      currency: 'USD',
      buyer: {
        name: 'Global Electronics Ltd',
        address: '555 Tech Park, San Francisco, USA',
        matrixId: '@techbuyer:matrix.org'
      },
      seller: {
        name: 'Asian Components Manufacturing',
        address: '777 Industrial Zone, Shenzhen, China',
        matrixId: '@components:matrix.org'
      },
      commodity: 'Electronic Components - Semiconductors and Circuit Boards',
      quantity: '10000 Units',
      unitPrice: '250',
      totalValue: 2500000,
      incoterms: 'EXW',
      portOfLoading: 'Port of Shenzhen, China',
      portOfDestination: 'Port of Los Angeles, USA',
      expiryDate: '2024-08-30',
      latestShipmentDate: '2024-08-15',
      requiredDocuments: ['Commercial Invoice', 'Packing List', 'Inspection Certificate'],
      partialShipments: false,
      transhipment: true
    },
    status: 'completed',
    matrixRoomId: '!room3:matrix.org',
    createdAt: '2024-01-01T08:00:00Z',
    updatedAt: '2024-01-30T16:45:00Z',
    fundedAt: '2024-01-05T12:00:00Z',
    shippedAt: '2024-01-15T10:30:00Z',
    completedAt: '2024-01-30T16:45:00Z'
  }
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    
    // Parse filters
    const statusFilter = searchParams.get('status')?.split(',')
    const currencyFilter = searchParams.get('currency')?.split(',')
    
    // Apply filters
    let filteredLCs = [...mockLCs]
    
    if (statusFilter && statusFilter.length > 0 && !statusFilter.includes('all')) {
      filteredLCs = filteredLCs.filter(lc => statusFilter.includes(lc.status))
    }
    
    if (currencyFilter && currencyFilter.length > 0 && !currencyFilter.includes('all')) {
      filteredLCs = filteredLCs.filter(lc => currencyFilter.includes(lc.terms.currency))
    }
    
    // Pagination
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedLCs = filteredLCs.slice(startIndex, endIndex)
    
    const response: LCListResponse = {
      success: true,
      letterOfCredits: paginatedLCs,
      pagination: {
        page,
        limit,
        total: filteredLCs.length
      }
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Error listing LCs:', error)
    return NextResponse.json(
      { 
        success: false, 
        letterOfCredits: [],
        message: 'Failed to list Letters of Credit',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}