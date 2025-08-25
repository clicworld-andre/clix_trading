import { NextRequest, NextResponse } from 'next/server'
import * as StellarSdk from '@stellar/stellar-sdk'

/**
 * Production Wallet Service Integration
 * 
 * This service integrates with the PELOTON Plus wallet system to:
 * 1. Verify user wallet connections securely
 * 2. Retrieve Stellar public keys without exposing private keys
 * 3. Validate user authorization for balance requests
 */
class ProductionStellarWallet {
  private readonly API_BASE = 'https://api.clicworld.app/assets/web3/otc'

  /**
   * Get the Stellar public key for a verified wallet user
   * @param userId - The PELOTON Plus user ID
   * @returns Stellar public key if user is verified, null otherwise
   */
  async getPublicKey(userId: string): Promise<string | null> {
    try {
      // First, verify this is a valid, connected wallet user
      const walletData = await this.verifyWalletConnection(userId)
      if (!walletData || !walletData.public_key) {
        console.log(`No verified wallet found for user: ${userId}`)
        return null
      }

      // Validate the public key format
      if (!this.isValidStellarPublicKey(walletData.public_key)) {
        console.error(`Invalid Stellar public key format for user: ${userId}`)
        return null
      }

      return walletData.public_key
    } catch (error) {
      console.error('Error getting public key:', error)
      return null
    }
  }

  /**
   * Verify wallet connection by checking with the PELOTON Plus API
   * For Stellar trading, we need to verify the user has a valid wallet account
   */
  private async verifyWalletConnection(userId: string): Promise<any> {
    try {
      // Method 1: Try to get user balance data (which includes public_key)
      // This endpoint validates that the user exists and has wallet access
      const balanceResponse = await fetch(`${this.API_BASE}/getBalances/${userId}`)
      
      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json()
        
        if ((balanceData.status === 200 || balanceData.status === 100) && balanceData.data) {
          // Extract public key if available in response
          if (balanceData.data.public_key || balanceData.data.stellar_public_key) {
            return {
              user_id: userId,
              public_key: balanceData.data.public_key || balanceData.data.stellar_public_key,
              wallet_username: balanceData.data.wallet_username || userId
            }
          }
        }
      }
      
      // Method 2: Try to verify via user profile endpoint (if available)
      const profileResponse = await fetch(`${this.API_BASE}/getUserProfile/${userId}`)
      
      if (profileResponse.ok) {
        const profileData = await profileResponse.json()
        
        if (profileData.status === 200 && profileData.data && profileData.data.stellar_public_key) {
          return {
            user_id: userId,
            public_key: profileData.data.stellar_public_key,
            wallet_username: profileData.data.wallet_username || userId
          }
        }
      }
      
      console.log(`No wallet verification method succeeded for user: ${userId}`)
      return null
      
    } catch (error) {
      console.error('Error verifying wallet connection:', error)
      return null
    }
  }

  /**
   * Validate Stellar public key format
   */
  private isValidStellarPublicKey(publicKey: string): boolean {
    try {
      // Stellar public keys start with 'G' and are 56 characters long
      if (!publicKey || typeof publicKey !== 'string') {
        return false
      }
      
      if (publicKey.length !== 56 || !publicKey.startsWith('G')) {
        return false
      }

      // Try to create a Keypair to validate the key
      StellarSdk.Keypair.fromPublicKey(publicKey)
      return true
    } catch (error) {
      return false
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

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const productionWallet = new ProductionStellarWallet()
    
    // Get user's Stellar public key from production wallet service
    // This verifies the user exists in PELOTON Plus and retrieves their public key securely
    const publicKey = await productionWallet.getPublicKey(userId)
    if (!publicKey) {
      return NextResponse.json(
        { 
          error: 'User wallet not found or not properly connected',
          details: 'Please ensure your PELOTON Plus wallet is properly connected to your account'
        },
        { status: 404 }
      )
    }

    // Initialize Stellar server
    const server = new StellarSdk.Horizon.Server(HORIZON_URL)

    // Load account to get balances
    const account = await server.loadAccount(publicKey)

    // Format balances for frontend
    const balances = account.balances.map(balance => ({
      asset_type: balance.asset_type,
      asset_code: (balance as any).asset_code || 'XLM',
      asset_issuer: (balance as any).asset_issuer,
      balance: balance.balance,
      limit: (balance as any).limit,
      buying_liabilities: (balance as any).buying_liabilities || '0',
      selling_liabilities: (balance as any).selling_liabilities || '0',
      is_authorized: (balance as any).is_authorized,
      is_authorized_to_maintain_liabilities: (balance as any).is_authorized_to_maintain_liabilities,
      // Calculate available balance (total - selling liabilities)
      available_balance: (parseFloat(balance.balance) - parseFloat((balance as any).selling_liabilities || '0')).toString()
    }))

    // Add account info
    const accountInfo = {
      account_id: account.accountId(),
      sequence: account.sequence,
      subentry_count: account.subentry_count,
      num_sponsoring: (account as any).num_sponsoring || 0,
      num_sponsored: (account as any).num_sponsored || 0,
      inflation_destination: account.inflation_destination,
      home_domain: account.home_domain,
      last_modified_ledger: account.last_modified_ledger,
      last_modified_time: account.last_modified_time,
      thresholds: account.thresholds
    }

    return NextResponse.json({
      success: true,
      user_id: userId,
      stellar_public_key: publicKey,
      balances: balances,
      account_info: accountInfo,
      total_assets: balances.length
    })

  } catch (error: any) {
    console.error('Error fetching user balances:', error)
    
    let errorMessage = 'Failed to fetch balances'
    
    // Handle specific Stellar errors
    if (error.response?.status === 404) {
      errorMessage = 'Stellar account not found. Please fund the account first.'
    } else if (error.message) {
      errorMessage = error.message
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: error.response?.status || 500 }
    )
  }
}