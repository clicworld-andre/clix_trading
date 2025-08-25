import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params
    const { searchParams } = new URL(request.url)
    const chatroomId = searchParams.get('chatroom_id') // Optional OTC context filter
    
    if (!userId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'User ID is required'
        },
        { status: 400 }
      )
    }

    // This endpoint provides unified transaction history
    // In a real implementation, this would:
    // 1. Query Stellar network for user's transaction history
    // 2. If chatroomId provided, filter for OTC trades in that room
    // 3. Combine and format data from multiple sources
    // 4. Return paginated, sorted transaction history

    // Mock transaction history
    const mockHistory = [
      {
        id: `txn-${Date.now() - 1000000}`,
        type: 'buy',
        asset: 'XLM',
        amount: 100,
        currency: 'USDC',
        value: 12.50,
        timestamp: Date.now() - 1000000,
        status: 'completed',
        context: chatroomId ? 'otc' : 'stellar',
        chatroom_id: chatroomId || undefined
      },
      {
        id: `txn-${Date.now() - 2000000}`,
        type: 'sell',
        asset: 'USDC',
        amount: 25,
        currency: 'XLM', 
        value: 200,
        timestamp: Date.now() - 2000000,
        status: 'completed',
        context: chatroomId ? 'otc' : 'stellar',
        chatroom_id: chatroomId || undefined
      }
    ]

    return NextResponse.json({
      success: true,
      transactions: mockHistory,
      count: mockHistory.length,
      user_id: userId,
      chatroom_id: chatroomId,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error fetching transaction history:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch transaction history',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
