"use client"

import * as StellarSdk from '@stellar/stellar-sdk'

// Stellar network configuration (using mainnet for production)
const HORIZON_URL = 'https://horizon.stellar.org' // Mainnet
const NETWORK_PASSPHRASE = StellarSdk.Networks.PUBLIC

// Initialize Stellar Server
const server = new StellarSdk.Horizon.Server(HORIZON_URL)

// Asset definitions for CLIX trading
export interface StellarAsset {
  code: string
  issuer?: string
  name: string
  type: 'native' | 'credit_alphanum4' | 'credit_alphanum12'
}

// TRADING_ASSETS removed - assets now come from connected wallet balances only

// Order book entry interface
export interface OrderBookEntry {
  price: string
  amount: string
}

export interface OrderBook {
  bids: OrderBookEntry[]
  asks: OrderBookEntry[]
  base: StellarAsset
  counter: StellarAsset
}

// Trade history interface
export interface Trade {
  id: string
  base_amount: string
  counter_amount: string
  price: string
  timestamp: string
  side: 'buy' | 'sell'
}

// Stellar trading service
export class StellarTradingService {
  private server: StellarSdk.Horizon.Server

  constructor() {
    this.server = new StellarSdk.Horizon.Server(HORIZON_URL)
  }

  // Convert asset to Stellar Asset object
  private toStellarAsset(asset: StellarAsset): StellarSdk.Asset {
    if (asset.type === 'native') {
      return StellarSdk.Asset.native()
    }
    return new StellarSdk.Asset(asset.code, asset.issuer!)
  }

  // Get order book for trading pair
  async getOrderBook(base: StellarAsset, counter: StellarAsset): Promise<OrderBook> {
    try {
      const baseAsset = this.toStellarAsset(base)
      const counterAsset = this.toStellarAsset(counter)

      const orderBookResponse = await this.server
        .orderbook(baseAsset, counterAsset)
        .limit(20)
        .call()

      return {
        bids: orderBookResponse.bids.map(bid => ({
          price: bid.price,
          amount: bid.amount
        })),
        asks: orderBookResponse.asks.map(ask => ({
          price: ask.price,
          amount: ask.amount
        })),
        base,
        counter
      }
    } catch (error) {
      console.warn('No order book found for trading pair:', error)
      // Return empty order book instead of throwing error
      return {
        bids: [],
        asks: [],
        base,
        counter
      }
    }
  }

  // Get recent trades for trading pair
  async getRecentTrades(base: StellarAsset, counter: StellarAsset): Promise<Trade[]> {
    try {
      const baseAsset = this.toStellarAsset(base)
      const counterAsset = this.toStellarAsset(counter)

      const tradesResponse = await this.server
        .trades()
        .forAssetPair(baseAsset, counterAsset)
        .limit(50)
        .order('desc')
        .call()

      return tradesResponse.records.map(trade => ({
        id: trade.id,
        base_amount: trade.base_amount,
        counter_amount: trade.counter_amount,
        price: trade.price?.n?.toString() || '0',
        timestamp: trade.ledger_close_time,
        side: trade.base_is_seller ? 'sell' : 'buy'
      }))
    } catch (error) {
      console.warn('No trades found for trading pair:', error)
      // Return empty array instead of throwing error
      return []
    }
  }

  // Get account balances
  async getAccountBalances(publicKey: string): Promise<any[]> {
    try {
      const account = await this.server.loadAccount(publicKey)
      return account.balances
    } catch (error) {
      console.error('Error fetching account balances:', error)
      throw new Error('Failed to fetch account balances')
    }
  }

  // Create buy offer transaction (returns unsigned transaction)
  async createBuyOffer(
    sourceKeys: StellarSdk.Keypair,
    selling: StellarAsset,
    buying: StellarAsset,
    amount: string,
    price: string
  ): Promise<StellarSdk.Transaction> {
    try {
      const sourceAccount = await this.server.loadAccount(sourceKeys.publicKey())
      const sellingAsset = this.toStellarAsset(selling)
      const buyingAsset = this.toStellarAsset(buying)

      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE
      })
        .addOperation(
          StellarSdk.Operation.manageBuyOffer({
            selling: sellingAsset,
            buying: buyingAsset,
            buyAmount: amount,
            price: price,
          })
        )
        .setTimeout(300)
        .build()

      return transaction
    } catch (error) {
      console.error('Error creating buy offer:', error)
      throw new Error('Failed to create buy offer')
    }
  }

  // Create sell offer transaction (returns unsigned transaction)
  async createSellOffer(
    sourceKeys: StellarSdk.Keypair,
    selling: StellarAsset,
    buying: StellarAsset,
    amount: string,
    price: string
  ): Promise<StellarSdk.Transaction> {
    try {
      const sourceAccount = await this.server.loadAccount(sourceKeys.publicKey())
      const sellingAsset = this.toStellarAsset(selling)
      const buyingAsset = this.toStellarAsset(buying)

      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE
      })
        .addOperation(
          StellarSdk.Operation.manageSellOffer({
            selling: sellingAsset,
            buying: buyingAsset,
            amount: amount,
            price: price,
          })
        )
        .setTimeout(300)
        .build()

      return transaction
    } catch (error) {
      console.error('Error creating sell offer:', error)
      throw new Error('Failed to create sell offer')
    }
  }

  // Submit signed transaction to network
  async submitTransaction(transaction: StellarSdk.Transaction): Promise<any> {
    try {
      const result = await this.server.submitTransaction(transaction)
      return result
    } catch (error) {
      console.error('Error submitting transaction:', error)
      throw new Error('Failed to submit transaction')
    }
  }

  // Get open offers for account
  async getOpenOffers(publicKey: string): Promise<any[]> {
    try {
      const offersResponse = await this.server
        .offers()
        .forAccount(publicKey)
        .limit(100)
        .call()

      return offersResponse.records
    } catch (error) {
      console.error('Error fetching open offers:', error)
      throw new Error('Failed to fetch open offers')
    }
  }

  // Cancel offer
  async cancelOffer(
    sourceKeys: StellarSdk.Keypair,
    offerId: string,
    selling: StellarAsset,
    buying: StellarAsset
  ): Promise<StellarSdk.Transaction> {
    try {
      const sourceAccount = await this.server.loadAccount(sourceKeys.publicKey())
      const sellingAsset = this.toStellarAsset(selling)
      const buyingAsset = this.toStellarAsset(buying)

      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE
      })
        .addOperation(
          StellarSdk.Operation.manageSellOffer({
            selling: sellingAsset,
            buying: buyingAsset,
            amount: '0',
            price: '1',
            offerId: offerId
          })
        )
        .setTimeout(300)
        .build()

      return transaction
    } catch (error) {
      console.error('Error canceling offer:', error)
      throw new Error('Failed to cancel offer')
    }
  }
}

// Export singleton instance
export const stellarTradingService = new StellarTradingService()