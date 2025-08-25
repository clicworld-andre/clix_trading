import { NextRequest, NextResponse } from 'next/server'
import * as StellarSdk from '@stellar/stellar-sdk'

// Mock Clic Wallet integration for development  
const DEMO_KEYPAIRS: { [userId: string]: string } = {
  'testuser1': 'SCEIWTDNEGZIYR5G4A5WIK5PGPWSW4IFGQUJ4APGTVXV6R7BRMLH32UR',
  'testuser2': 'SCEIWTDNEGZIYR5G4A5WIK5PGPWSW4IFGQUJ4APGTVXV6R7BRMLH32UR',
  'demo': 'SCEIWTDNEGZIYR5G4A5WIK5PGPWSW4IFGQUJ4APGTVXV6R7BRMLH32UR',
}

class ClicStellarWallet {
  async getPublicKey(userId: string): Promise<string | null> {
    try {
      // Get mock keypair for this user
      const secretKey = DEMO_KEYPAIRS[userId]
      if (!secretKey) {
        return null
      }

      const keypair = StellarSdk.Keypair.fromSecret(secretKey)
      return keypair.publicKey()
    } catch (error) {
      console.error('Error getting public key:', error)
      return null
    }
  }
}

const HORIZON_URL = 'https://horizon.stellar.org'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all' // 'open', 'closed', or 'all'
    const chatroomId = searchParams.get('chatroom_id') // Optional OTC context filter
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Determine if this is an OTC context request
    const isOtcContext = !!chatroomId

    const clicWallet = new ClicStellarWallet()
    
    // Get user's Stellar public key from Clic wallet
    const publicKey = await clicWallet.getPublicKey(userId)
    if (!publicKey) {
      return NextResponse.json(
        { error: 'User wallet not found' },
        { status: 404 }
      )
    }

    // Initialize Stellar server
    const server = new StellarSdk.Horizon.Server(HORIZON_URL)

    // Get open offers (active orders)
    const offersResponse = await server
      .offers()
      .forAccount(publicKey)
      .limit(100)
      .call()

    // Format orders for frontend
    const orders = offersResponse.records.map(offer => ({
      order_id: offer.id,
      direction: 'sell', // Stellar offers are always sell offers from the perspective of the selling asset
      base_asset: offer.selling.asset_code || 'XLM',
      base_asset_issuer: offer.selling.asset_issuer,
      counter_asset: offer.buying.asset_code || 'XLM', 
      counter_asset_issuer: offer.buying.asset_issuer,
      amount: offer.amount,
      price: offer.price,
      status: 'open',
      created_at: offer.last_modified_time,
      paging_token: offer.paging_token
    }))

    // Filter by status if requested
    let filteredOrders = orders
    if (status === 'open') {
      filteredOrders = orders.filter(order => order.status === 'open')
    }

    // Also get recent trade history for closed orders
    let tradeHistory: any[] = []
    if (status === 'closed' || status === 'all') {
      try {
        const tradesResponse = await server
          .trades()
          .forAccount(publicKey)
          .limit(50)
          .order('desc')
          .call()

        tradeHistory = tradesResponse.records.map(trade => ({
          order_id: trade.id,
          direction: trade.base_is_seller ? 'sell' : 'buy',
          base_asset: trade.base_asset_code || 'XLM',
          counter_asset: trade.counter_asset_code || 'XLM',
          amount: trade.base_amount,
          price: (trade.price as any)?.n || (trade as any).price_r?.n || '0',
          counter_amount: trade.counter_amount,
          status: 'closed',
          created_at: trade.ledger_close_time,
          transaction_hash: trade.paging_token
        }))
      } catch (error) {
        console.error('Error fetching trade history:', error)
        // Continue without trade history if there's an error
      }
    }

    // Combine orders and trade history
    let allOrders = filteredOrders
    if (status === 'all') {
      allOrders = [...filteredOrders, ...tradeHistory]
    } else if (status === 'closed') {
      allOrders = tradeHistory
    }

    // Sort by created_at descending
    allOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return NextResponse.json({
      success: true,
      orders: allOrders,
      count: allOrders.length,
      user_id: userId,
      stellar_public_key: publicKey
    })

  } catch (error: any) {
    console.error('Error fetching user orders:', error)
    
    let errorMessage = 'Failed to fetch orders'
    if (error.message) {
      errorMessage = error.message
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}