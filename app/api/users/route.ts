import { NextRequest, NextResponse } from 'next/server'
import { SystemUser, UserDirectoryResponse } from '@/lib/lc/invitation-types'

// Mock system users - in production this would come from Matrix homeserver user directory
const mockSystemUsers: SystemUser[] = [
  {
    id: 'user_001',
    matrixId: '@alice_trader:matrix.clicworld.app',
    displayName: 'Alice Cooper',
    email: 'alice@globaltrading.com',
    company: 'Global Trading Corp',
    verified: true,
    createdAt: '2024-12-01T10:00:00Z',
    lastActive: '2025-01-10T14:30:00Z',
    preferredCurrencies: ['USDC', 'EURC', 'XLM'],
    tradingRegions: ['North America', 'Europe'],
    businessType: 'Importer'
  },
  {
    id: 'user_002',
    matrixId: '@bob_exports:matrix.clicworld.app',
    displayName: 'Bob Martinez',
    email: 'bob@premiumexports.co',
    company: 'Premium Exports Ltd',
    verified: true,
    createdAt: '2024-11-15T08:00:00Z',
    lastActive: '2025-01-10T16:45:00Z',
    preferredCurrencies: ['USDC', 'XAU', 'XCOF'],
    tradingRegions: ['South America', 'North America'],
    businessType: 'Exporter'
  },
  {
    id: 'user_003',
    matrixId: '@carol_coffee:matrix.clicworld.app',
    displayName: 'Carol Santos',
    email: 'carol@coffeebrazil.com',
    company: 'Brazilian Coffee Co',
    verified: true,
    createdAt: '2024-10-20T12:00:00Z',
    lastActive: '2025-01-09T11:20:00Z',
    preferredCurrencies: ['USDC', 'XCOF'],
    tradingRegions: ['South America'],
    businessType: 'Producer'
  },
  {
    id: 'user_004',
    matrixId: '@david_metals:matrix.clicworld.app',
    displayName: 'David Kim',
    email: 'david@metalstrading.asia',
    company: 'Asian Metals Exchange',
    verified: true,
    createdAt: '2024-09-10T07:00:00Z',
    lastActive: '2025-01-10T09:15:00Z',
    preferredCurrencies: ['USDC', 'XAU', 'XLM'],
    tradingRegions: ['Asia Pacific'],
    businessType: 'Trader'
  },
  {
    id: 'user_005',
    matrixId: '@emma_grains:matrix.clicworld.app',
    displayName: 'Emma Johnson',
    email: 'emma@europeangrains.eu',
    company: 'European Grains Ltd',
    verified: false, // Unverified user example
    createdAt: '2025-01-05T15:30:00Z',
    lastActive: '2025-01-10T18:00:00Z',
    preferredCurrencies: ['EURC', 'USDC'],
    tradingRegions: ['Europe'],
    businessType: 'Importer'
  },
  {
    id: 'user_006',
    matrixId: '@frank_oils:matrix.clicworld.app',
    displayName: 'Frank Hassan',
    email: 'frank@mideastoils.ae',
    company: 'Middle East Oils Trading',
    verified: true,
    createdAt: '2024-08-12T13:45:00Z',
    lastActive: '2025-01-08T20:30:00Z',
    preferredCurrencies: ['USDC', 'XLM'],
    tradingRegions: ['Middle East', 'Europe'],
    businessType: 'Exporter'
  },
  {
    id: 'user_007',
    matrixId: '@grace_textiles:matrix.clicworld.app',
    displayName: 'Grace Patel',
    email: 'grace@indiantextiles.in',
    company: 'Indian Textiles Export',
    verified: true,
    createdAt: '2024-07-08T09:20:00Z',
    lastActive: '2025-01-10T12:10:00Z',
    preferredCurrencies: ['USDC', 'EURC'],
    tradingRegions: ['Asia Pacific', 'Europe'],
    businessType: 'Manufacturer'
  },
  {
    id: 'user_008',
    matrixId: '@henry_logistics:matrix.clicworld.app',
    displayName: 'Henry Chen',
    email: 'henry@globallogistics.sg',
    company: 'Global Logistics Solutions',
    verified: true,
    createdAt: '2024-06-25T11:00:00Z',
    lastActive: '2025-01-09T17:45:00Z',
    preferredCurrencies: ['USDC', 'XLM', 'CLIX'],
    tradingRegions: ['Asia Pacific'],
    businessType: 'Logistics'
  }
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const businessType = searchParams.get('businessType') || ''
    const region = searchParams.get('region') || ''
    const verifiedOnly = searchParams.get('verified') === 'true'
    const excludeUserId = searchParams.get('exclude') || '' // Exclude current user

    // Filter users based on search criteria
    let filteredUsers = mockSystemUsers.filter(user => {
      // Exclude specific user (usually current user)
      if (excludeUserId && user.id === excludeUserId) return false
      
      // Search in name, company, or matrixId
      if (search) {
        const searchLower = search.toLowerCase()
        const matchesSearch = 
          user.displayName.toLowerCase().includes(searchLower) ||
          user.company?.toLowerCase().includes(searchLower) ||
          user.matrixId.toLowerCase().includes(searchLower) ||
          user.email?.toLowerCase().includes(searchLower)
        if (!matchesSearch) return false
      }
      
      // Filter by business type
      if (businessType && user.businessType !== businessType) return false
      
      // Filter by region
      if (region && !user.tradingRegions?.includes(region)) return false
      
      // Filter verified users only
      if (verifiedOnly && !user.verified) return false
      
      return true
    })

    // Sort by last active (most recent first)
    filteredUsers.sort((a, b) => 
      new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime()
    )

    // Pagination
    const total = filteredUsers.length
    const totalPages = Math.ceil(total / limit)
    const startIndex = (page - 1) * limit
    const endIndex = Math.min(startIndex + limit, total)
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex)

    // Add simulated delay to mimic real API
    await new Promise(resolve => setTimeout(resolve, 150))

    const response: UserDirectoryResponse = {
      success: true,
      users: paginatedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error fetching users:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch user directory',
        users: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
      },
      { status: 500 }
    )
  }
}

// Get current user info (for profile/auth purposes)
export async function POST(request: NextRequest) {
  try {
    const { matrixId } = await request.json()
    
    // Find user by Matrix ID
    const user = mockSystemUsers.find(u => u.matrixId === matrixId)
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      user
    })

  } catch (error) {
    console.error('Error fetching user info:', error)
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user info' },
      { status: 500 }
    )
  }
}