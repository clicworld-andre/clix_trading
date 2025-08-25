import { NextRequest, NextResponse } from 'next/server'
import { CreateLCRequest, CreateLCResponse, LetterOfCredit } from '@/lib/lc/types'

// Mock LC storage (in a real app, this would be a database)
const mockLCs: LetterOfCredit[] = []

export async function POST(request: NextRequest) {
  try {
    const body: CreateLCRequest = await request.json()
    
    // Generate LC number
    const lcNumber = `LC${Date.now().toString().slice(-6)}`
    
    // Create new LC
    const newLC: LetterOfCredit = {
      id: crypto.randomUUID(),
      lcNumber,
      terms: body.terms,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    
    // Store in mock database
    mockLCs.push(newLC)
    
    console.log('Created LC:', newLC)
    
    const response: CreateLCResponse = {
      success: true,
      lcId: newLC.id,
      roomId: `!room_${newLC.id}`, // Mock room ID
      message: 'Letter of Credit created successfully'
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Error creating LC:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to create Letter of Credit',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}