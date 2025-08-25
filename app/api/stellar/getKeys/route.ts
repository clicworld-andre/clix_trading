import { NextRequest, NextResponse } from 'next/server'
import * as StellarSdk from '@stellar/stellar-sdk'

// Mock Clic Wallet Keys endpoint for development
// In production, this would authenticate with the actual Clic wallet backend

// For demo purposes, we'll use demo accounts
// In production, each user would have their own Stellar keypair stored securely in Clic wallet
const DEMO_KEYPAIRS: { [userId: string]: string } = {
  // These are DEMO keypairs for development only
  'testuser1': 'SCEIWTDNEGZIYR5G4A5WIK5PGPWSW4IFGQUJ4APGTVXV6R7BRMLH32UR',  // Demo account
  'testuser2': 'SCEIWTDNEGZIYR5G4A5WIK5PGPWSW4IFGQUJ4APGTVXV6R7BRMLH32UR',  // Same for demo
  'demo': 'SCEIWTDNEGZIYR5G4A5WIK5PGPWSW4IFGQUJ4APGTVXV6R7BRMLH32UR',      // Demo account
}

// Mock PIN validation (in production this would be properly secured)
const DEMO_PINS: { [userId: string]: string } = {
  'testuser1': '1234',
  'testuser2': '1234', 
  'demo': '1234'
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, password } = body

    if (!userId || !password) {
      return NextResponse.json(
        { error: 'Missing userId or password' },
        { status: 400 }
      )
    }

    // Mock PIN validation
    const expectedPin = DEMO_PINS[userId]
    if (!expectedPin || password !== expectedPin) {
      return NextResponse.json(
        { error: 'Invalid PIN' },
        { status: 401 }
      )
    }

    // Get mock keypair for this user
    const secretKey = DEMO_KEYPAIRS[userId]
    if (!secretKey) {
      // Generate a new test keypair for unknown users
      const keypair = StellarSdk.Keypair.random()
      
      return NextResponse.json({
        success: true,
        stellar_secret_key: keypair.secret(),
        stellar_public_key: keypair.publicKey(),
        note: 'Generated new test keypair for demo user'
      })
    }

    // Validate the secret key
    try {
      const keypair = StellarSdk.Keypair.fromSecret(secretKey)
      
      return NextResponse.json({
        success: true,
        stellar_secret_key: secretKey,
        stellar_public_key: keypair.publicKey()
      })
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid keypair stored for user' },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('Error in getKeys endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}