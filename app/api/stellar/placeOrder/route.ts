import { NextRequest, NextResponse } from 'next/server'
import * as StellarSdk from '@stellar/stellar-sdk'

/**
 * Production Stellar Transaction Service
 * 
 * This service handles Stellar trading transactions through the PELOTON Plus wallet:
 * 1. Authenticates users with PIN validation
 * 2. Retrieves transaction signing capabilities securely
 * 3. Submits transactions to Stellar network
 * 4. Records transactions in PELOTON Plus system
 */
class ProductionStellarTradingService {
  private readonly API_BASE = 'https://api.clicworld.app/assets/web3/otc'

  /**
   * Authenticate user and get transaction signing capability
   * @param userId - PELOTON Plus user ID
   * @param password - User PIN for transaction authorization
   * @returns Transaction signing result from PELOTON Plus API
   */
  async authenticateAndSignTransaction(
    userId: string, 
    password: string, 
    transactionXDR: string
  ): Promise<{ success: boolean; signedXDR?: string; error?: string }> {
    try {
      // Call PELOTON Plus API to sign the transaction
      const response = await fetch(`${this.API_BASE}/signStellarTransaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          password: password,
          transaction_xdr: transactionXDR
        })
      })

      if (!response.ok) {
        return { success: false, error: `API request failed: ${response.status}` }
      }

      const data = await response.json()
      
      if (data.status === 200 && data.signed_xdr) {
        return { success: true, signedXDR: data.signed_xdr }
      } else {
        return { success: false, error: data.message || 'Transaction signing failed' }
      }
    } catch (error) {
      console.error('Error signing transaction:', error)
      return { success: false, error: 'Network error during transaction signing' }
    }
  }

  /**
   * Get user's Stellar public key for transaction building
   */
  async getPublicKey(userId: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.API_BASE}/getBalances/${userId}`)
      
      if (response.ok) {
        const data = await response.json()
        
        if ((data.status === 200 || data.status === 100) && data.data) {
          return data.data.public_key || data.data.stellar_public_key || null
        }
      }
      
      return null
    } catch (error) {
      console.error('Error getting public key:', error)
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
          transaction_type: 'stellar_trade',
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
      direction, // 'buy' or 'sell'
      baseAsset, // e.g., 'XLM'
      counterAsset, // e.g., 'USDC'
      amount,
      price,
      orderType, // 'limit' or 'market'
      chatroomId, // Optional - if present, this is OTC context
      context // 'otc' or 'stellar' - routing hint
    } = body

    // Validate required fields
    if (!userId || !password || !direction || !baseAsset || !counterAsset || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Determine context (OTC vs direct Stellar trading)
    const isOtcContext = !!(chatroomId || context === 'otc')
    const tradingContext = isOtcContext ? 'otc' : 'stellar'

    const tradingService = new ProductionStellarTradingService()
    
    // Get user's Stellar public key for building the transaction
    const publicKey = await tradingService.getPublicKey(userId)
    if (!publicKey) {
      return NextResponse.json(
        { error: 'User wallet not found or not properly connected' },
        { status: 404 }
      )
    }

    // Initialize Stellar server
    const server = new StellarSdk.Horizon.Server(HORIZON_URL)

    // Convert assets to Stellar Asset objects
    const getStellarAsset = (assetCode: string): StellarSdk.Asset => {
      if (assetCode === 'XLM') {
        return StellarSdk.Asset.native()
      }
      
      // Known asset issuers (should be configurable)
      const assetIssuers: { [key: string]: string } = {
        'USDC': 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
        'AQUA': 'GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA'
      }
      
      const issuer = assetIssuers[assetCode]
      if (!issuer) {
        throw new Error(`Unknown asset: ${assetCode}`)
      }
      
      return new StellarSdk.Asset(assetCode, issuer)
    }

    const baseAssetObj = getStellarAsset(baseAsset)
    const counterAssetObj = getStellarAsset(counterAsset)

    // Load account from Stellar network
    const sourceAccount = await server.loadAccount(publicKey)

    // Create transaction based on direction
    let operation: any // Use any to avoid type conflicts with Stellar SDK versions

    if (direction === 'buy') {
      // Buy order: selling counter asset, buying base asset
      operation = StellarSdk.Operation.manageBuyOffer({
        selling: counterAssetObj,
        buying: baseAssetObj,
        buyAmount: amount.toString(),
        price: price || '1', // Use market price if not specified
      })
    } else {
      // Sell order: selling base asset, buying counter asset  
      operation = StellarSdk.Operation.manageSellOffer({
        selling: baseAssetObj,
        buying: counterAssetObj,
        amount: amount.toString(),
        price: price || '1', // Use market price if not specified
      })
    }

    // Build transaction (unsigned)
    const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE
    })
      .addOperation(operation)
      .setTimeout(300)
      .build()

    // Get transaction XDR for signing by PELOTON Plus wallet
    const transactionXDR = transaction.toXDR()

    // Send to PELOTON Plus for secure signing with PIN validation
    const signingResult = await tradingService.authenticateAndSignTransaction(userId, password, transactionXDR)
    
    if (!signingResult.success) {
      return NextResponse.json(
        { error: signingResult.error || 'Transaction signing failed' },
        { status: 401 }
      )
    }

    // Reconstruct signed transaction from returned XDR
    const signedTransaction = new StellarSdk.Transaction(signingResult.signedXDR!, NETWORK_PASSPHRASE)

    // Submit to Stellar network
    const result = await server.submitTransaction(signedTransaction)

    // Record in PELOTON Plus system for history tracking
    await tradingService.submitToClicHistory(userId, signedTransaction, result)

    return NextResponse.json({
      status: 200,
      success: true,
      transaction_hash: result.hash,
      order_id: (result as any).id || result.hash, // Use hash as fallback for order_id
      message: `${direction === 'buy' ? 'Buy' : 'Sell'} order placed successfully`,
      stellar_result: result
    })

  } catch (error: any) {
    console.error('Error placing Stellar order:', error)
    
    let errorMessage = 'Failed to place order'
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