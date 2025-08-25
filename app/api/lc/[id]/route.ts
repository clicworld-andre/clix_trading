import { NextRequest, NextResponse } from 'next/server'
import { LetterOfCredit, LCDetailsResponse } from '@/lib/lc/types'

// Mock LC data for demonstration - in production this would come from a database
const mockLCs: { [key: string]: LetterOfCredit } = {
  'lc_demo_001': {
    id: 'lc_demo_001',
    lcNumber: 'CLIX-LC-2025-001',
    contractAddress: 'CCONTRACTADDRESS123456789ABCDEFGHIJK',
    terms: {
      lcType: 'sight',
      lcNumber: 'CLIX-LC-2025-001',
      amount: '250000',
      currency: 'USDC',
      buyer: {
        name: 'Global Imports Inc.',
        address: '123 Trade Street, New York, NY 10001, USA',
        matrixId: '@buyer_demo:matrix.clicworld.app',
        walletAddress: 'GBUYERDEMOACCOUNT123456789ABCDEFGHIJKLMNOP',
        bankDetails: {
          bankName: 'International Trade Bank',
          swiftCode: 'ITBKUS33',
          accountNumber: '1234567890'
        }
      },
      seller: {
        name: 'Premium Coffee Exports Ltd.',
        address: 'Zona Cafetera, Manizales, Colombia',
        matrixId: '@seller_demo:matrix.clicworld.app',
        walletAddress: 'GSELLERDEMOACCOUNT123456789ABCDEFGHIJKLMNO',
        bankDetails: {
          bankName: 'Banco de Colombia',
          swiftCode: 'BDCOCO22',
          accountNumber: '9876543210'
        }
      },
      issuingBank: {
        name: 'International Trade Bank',
        address: '456 Financial District, New York, NY 10005, USA',
        matrixId: '@issuing_bank_demo:matrix.clicworld.app',
        walletAddress: 'GISSUINGBANKACCOUNT123456789ABCDEFGHIJKLM'
      },
      confirmingBank: {
        name: 'Local Commerce Bank',
        address: '789 Commerce Ave, Miami, FL 33101, USA',
        matrixId: '@advising_bank_demo:matrix.clicworld.app',
        walletAddress: 'GADVISINGBANKACCOUNT123456789ABCDEFGHIJK'
      },
      commodity: 'Premium Arabica Coffee Beans',
      quantity: '100 metric tons',
      unitPrice: '2500 USD per metric ton',
      totalValue: 250000,
      incoterms: 'FOB',
      portOfLoading: 'Port of Buenaventura, Colombia',
      portOfDestination: 'Port of New York, USA',
      expiryDate: '2025-04-15T23:59:59Z',
      latestShipmentDate: '2025-03-15T23:59:59Z',
      requiredDocuments: [
        'Commercial Invoice (3 copies)',
        'Full set of Clean On Board Bills of Lading',
        'Certificate of Origin',
        'Quality Certificate',
        'Phytosanitary Certificate',
        'Insurance Policy covering 110% of invoice value',
        'Packing List'
      ],
      additionalTerms: `1. Coffee must be of Grade A quality as per ICO standards
2. Moisture content not to exceed 12%
3. Documents must be presented within 21 days of shipment date
4. Partial shipments and transshipment allowed
5. All banking charges outside issuing bank for buyer's account`,
      partialShipments: true,
      transhipment: true
    },
    status: 'funded',
    matrixRoomId: '!lcroom_demo001:matrix.clicworld.app',
    deploymentTx: 'TX123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    fundingTx: 'TX987654321ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    createdAt: '2025-01-15T10:30:00Z',
    updatedAt: '2025-01-20T14:45:00Z',
    fundedAt: '2025-01-18T09:15:00Z'
  },
  'lc_demo_002': {
    id: 'lc_demo_002',
    lcNumber: 'CLIX-LC-2025-002',
    terms: {
      lcType: 'usance',
      lcNumber: 'CLIX-LC-2025-002',
      amount: '500000',
      currency: 'EURC',
      buyer: {
        name: 'European Traders GmbH',
        address: 'Handelstraße 1, 10115 Berlin, Germany',
        matrixId: '@buyer_eu:matrix.clicworld.app',
        walletAddress: 'GBUYEREUDEMOACCOUNT123456789ABCDEFGHIJKLM'
      },
      seller: {
        name: 'Gold Mining Corp',
        address: 'Johannesburg, South Africa',
        matrixId: '@seller_za:matrix.clicworld.app',
        walletAddress: 'GSELLERZADEMOACCOUNT123456789ABCDEFGHIJKL'
      },
      commodity: 'Gold Bullion (999.9 Fine)',
      quantity: '250 troy ounces',
      unitPrice: '2000 EUR per troy ounce',
      totalValue: 500000,
      incoterms: 'CIF',
      portOfLoading: 'Port of Durban, South Africa',
      portOfDestination: 'Port of Hamburg, Germany',
      expiryDate: '2025-05-30T23:59:59Z',
      latestShipmentDate: '2025-04-30T23:59:59Z',
      requiredDocuments: [
        'Commercial Invoice',
        'Bill of Lading',
        'Certificate of Origin',
        'Assay Certificate',
        'Insurance Certificate'
      ],
      partialShipments: false,
      transhipment: false
    },
    status: 'documents_submitted',
    matrixRoomId: '!lcroom_demo002:matrix.clicworld.app',
    createdAt: '2025-01-10T08:00:00Z',
    updatedAt: '2025-01-25T16:30:00Z',
    fundedAt: '2025-01-12T11:20:00Z',
    shippedAt: '2025-01-22T14:00:00Z'
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const lcId = resolvedParams.id
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200))
    
    // Look up the LC in our mock data
    const lc = mockLCs[lcId]
    
    if (!lc) {
      return NextResponse.json(
        { success: false, error: 'Letter of Credit not found' },
        { status: 404 }
      )
    }

    const response: LCDetailsResponse = {
      success: true,
      letterOfCredit: lc
    }

    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Error fetching LC details:', error)
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT endpoint for updating LC (future implementation)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const lcId = resolvedParams.id
    const updates = await request.json()
    
    // TODO: Implement LC update logic
    console.log('Updating LC:', lcId, 'with:', updates)
    
    return NextResponse.json({
      success: true,
      message: 'LC update functionality will be implemented here'
    })
    
  } catch (error) {
    console.error('Error updating LC:', error)
    
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}