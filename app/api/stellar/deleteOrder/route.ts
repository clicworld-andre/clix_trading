import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      order_id,
      chatroom_id,
      userId
    } = body

    // Validate required fields
    if (!order_id) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required field: order_id'
        },
        { status: 400 }
      )
    }

    // This endpoint handles order deletion/cancellation
    // In a real implementation, this would:
    // 1. Validate the user's ownership of the order
    // 2. For OTC orders: mark as cancelled in chat room context
    // 3. For Stellar orders: submit cancellation transaction to Stellar SDEX
    // 4. Update order status in all relevant systems

    // Mock successful order deletion
    const result = {
      order_id,
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      context: chatroom_id ? 'otc' : 'stellar'
    }

    return NextResponse.json({
      success: true,
      result,
      message: `Order ${order_id} cancelled successfully`,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error deleting order:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to delete order',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
