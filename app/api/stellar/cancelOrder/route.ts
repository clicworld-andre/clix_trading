import { NextRequest, NextResponse } from 'next/server'
import * as StellarSdk from '@stellar/stellar-sdk'

// Mock Clic Wallet integration for development
const DEMO_KEYPAIRS: { [userId: string]: string } = {
  'testuser1': 'SCEIWTDNEGZIYR5G4A5WIK5PGPWSW4IFGQUJ4APGTVXV6R7BRMLH32UR',
  'testuser2': 'SCEIWTDNEGZIYR5G4A5WIK5PGPWSW4IFGQUJ4APGTVXV6R7BRMLH32UR',
  'demo': 'SCEIWTDNEGZIYR5G4A5WIK5PGPWSW4IFGQUJ4APGTVXV6R7BRMLH32UR',
}

const DEMO_PINS: { [userId: string]: string } = {
  'testuser1': '1234',
  'testuser2': '1234',
  'demo': '1234'
}

class ClicStellarWallet {
  async getClicWalletKeys(userId: string, password: string): Promise<StellarSdk.Keypair | null> {
    try {
      // Mock PIN validation
      const expectedPin = DEMO_PINS[userId]
      if (!expectedPin || password !== expectedPin) {
        return null
      }

      // Get mock keypair for this user
      const secretKey = DEMO_KEYPAIRS[userId]
      if (!secretKey) {
        return null
      }

      return StellarSdk.Keypair.fromSecret(secretKey)
    } catch (error) {
      console.error('Error getting Clic wallet keys:', error)
      return null
    }
  }

  async submitToClicHistory(userId: string, transaction: any, result: any): Promise<void> {
    try {
      // Record transaction locally (in production, this would call the Clic API)
      await fetch('/api/stellar/recordTransaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          transaction_hash: result.hash,
          transaction_type: 'stellar_cancel_order',
          details: {
            operations: transaction.operations,
            result: result
          }
        })
      })
    } catch (error) {
      console.error('Error recording transaction in local system:', error)
    }
  }
}

const HORIZON_URL = 'https://horizon.stellar.org'
const NETWORK_PASSPHRASE = StellarSdk.Networks.PUBLIC

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      userId, 
      password, // PIN 
      offerId,
      sellingAsset, // { code, issuer }
      buyingAsset   // { code, issuer }
    } = body

    // Validate required fields
    if (!userId || !password || !offerId || !sellingAsset || !buyingAsset) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const clicWallet = new ClicStellarWallet()
    
    // Authenticate and get Stellar keypair from Clic wallet
    const keypair = await clicWallet.getClicWalletKeys(userId, password)
    if (!keypair) {
      return NextResponse.json(
        { error: 'Authentication failed or wallet not found' },
        { status: 401 }
      )
    }

    // Initialize Stellar server
    const server = new StellarSdk.Horizon.Server(HORIZON_URL)

    // Convert assets to Stellar Asset objects
    const getStellarAsset = (asset: { code: string, issuer?: string }): StellarSdk.Asset => {
      if (asset.code === 'XLM') {
        return StellarSdk.Asset.native()
      }
      return new StellarSdk.Asset(asset.code, asset.issuer!)
    }

    const sellingAssetObj = getStellarAsset(sellingAsset)
    const buyingAssetObj = getStellarAsset(buyingAsset)

    // Load account
    const sourceAccount = await server.loadAccount(keypair.publicKey())

    // Create cancel order operation (amount = 0 cancels the offer)
    const operation = StellarSdk.Operation.manageSellOffer({
      selling: sellingAssetObj,
      buying: buyingAssetObj,
      amount: '0', // Setting amount to 0 cancels the offer
      price: '1',  // Price doesn't matter when canceling
      offerId: offerId
    })

    // Build transaction
    const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE
    })
      .addOperation(operation)
      .setTimeout(300)
      .build()

    // Sign transaction
    transaction.sign(keypair)

    // Submit to Stellar network
    const result = await server.submitTransaction(transaction)

    // Record in Clic system for history tracking
    await clicWallet.submitToClicHistory(userId, transaction, result)

    return NextResponse.json({
      success: true,
      transaction_hash: result.hash,
      offer_id: offerId,
      message: 'Order canceled successfully',
      stellar_result: result
    })

  } catch (error: any) {
    console.error('Error canceling Stellar order:', error)
    
    let errorMessage = 'Failed to cancel order'
    if (error.response?.data?.extras?.result_codes) {
      errorMessage = `Stellar error: ${error.response.data.extras.result_codes.operations?.[0] || 'Unknown error'}`
    } else if (error.message) {
      errorMessage = error.message
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}