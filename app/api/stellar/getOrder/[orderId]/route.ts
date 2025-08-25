import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params
    
    if (!orderId) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Order ID is required'
        },
        { status: 400 }
      )
    }

    // This endpoint provides individual order details
    // In a real implementation, this would:
    // 1. Query Stellar network for offer details by ID
    // 2. Check OTC system for additional order metadata
    // 3. Combine and format data from all sources
    // 4. Return comprehensive order information

    // Mock order details
    const mockOrder = {
      order_id: orderId,
      direction: 'buy',
      base_asset: 'XLM',
      counter_asset: 'USDC',
      amount: '100',
      price: '0.125',
      total: '12.5',
      status: 'open',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      updated_at: new Date().toISOString(),
      context: orderId.startsWith('otc-') ? 'otc' : 'stellar'
    }

    return NextResponse.json({
      success: true,
      order: mockOrder,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error fetching order details:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch order details',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
