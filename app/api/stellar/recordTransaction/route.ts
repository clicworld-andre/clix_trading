import { NextRequest, NextResponse } from 'next/server'

// Mock transaction recording endpoint for development
// In production, this would record transactions in Clic wallet's database

// Simple in-memory storage for demo (in production, use a proper database)
let transactionHistory: any[] = []

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      userId, 
      transaction_hash,
      transaction_type,
      details 
    } = body

    if (!userId || !transaction_hash || !transaction_type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create transaction record
    const transactionRecord = {
      id: transactionHistory.length + 1,
      user_id: userId,
      transaction_hash,
      transaction_type,
      details,
      created_at: new Date().toISOString(),
      status: 'confirmed'
    }

    // Store in memory (in production, save to database)
    transactionHistory.push(transactionRecord)

    console.log(`Recorded ${transaction_type} transaction for user ${userId}:`, transaction_hash)

    return NextResponse.json({
      success: true,
      transaction_id: transactionRecord.id,
      message: 'Transaction recorded successfully'
    })

  } catch (error: any) {
    console.error('Error recording transaction:', error)
    return NextResponse.json(
      { error: 'Failed to record transaction' },
      { status: 500 }
    )
  }
}

// Optional: GET endpoint to retrieve transaction history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    let filteredHistory = transactionHistory
    
    if (userId) {
      filteredHistory = transactionHistory.filter(tx => tx.user_id === userId)
    }

    return NextResponse.json({
      success: true,
      transactions: filteredHistory,
      count: filteredHistory.length
    })

  } catch (error: any) {
    console.error('Error fetching transaction history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transaction history' },
      { status: 500 }
    )
  }
}