import { NextRequest, NextResponse } from 'next/server'
import * as StellarSdk from '@stellar/stellar-sdk'

// Mock Clic Wallet public key lookup for development
// In production, this would query the actual Clic wallet backend

// Demo keypairs (same as in getKeys)
const DEMO_KEYPAIRS: { [userId: string]: string } = {
  // These are DEMO keypairs for development only 
  'testuser1': 'SCEIWTDNEGZIYR5G4A5WIK5PGPWSW4IFGQUJ4APGTVXV6R7BRMLH32UR',  // Demo account
  'testuser2': 'SCEIWTDNEGZIYR5G4A5WIK5PGPWSW4IFGQUJ4APGTVXV6R7BRMLH32UR',  // Same for demo
  'demo': 'SCEIWTDNEGZIYR5G4A5WIK5PGPWSW4IFGQUJ4APGTVXV6R7BRMLH32UR',      // Demo account
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get mock keypair for this user
    const secretKey = DEMO_KEYPAIRS[userId]
    if (!secretKey) {
      // For unknown users, generate and store a new test keypair
      const keypair = StellarSdk.Keypair.random()
      
      // In a real system, you'd store this in the database
      DEMO_KEYPAIRS[userId] = keypair.secret()
      
      return NextResponse.json({
        success: true,
        stellar_public_key: keypair.publicKey(),
        user_id: userId,
        note: 'Generated new test keypair for demo user'
      })
    }

    // Get public key from secret key
    try {
      const keypair = StellarSdk.Keypair.fromSecret(secretKey)
      
      return NextResponse.json({
        success: true,
        stellar_public_key: keypair.publicKey(),
        user_id: userId
      })
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid keypair stored for user' },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('Error in getPublicKey endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}