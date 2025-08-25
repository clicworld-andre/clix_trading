import { NextRequest, NextResponse } from 'next/server'
import * as StellarSdk from '@stellar/stellar-sdk'

const HORIZON_URL = 'https://horizon.stellar.org'

// Unified trading assets supporting both OTC and Stellar SDEX trading
const CLIX_TRADING_ASSETS = [
  {
    id: 1,
    token_name: 'Stellar Lumens',
    code: 'XLM',
    asset_type: 'native',
    img_url: 'https://cryptologos.cc/logos/stellar-xlm-logo.png',
    issuer_public: '',
    description: 'Native Stellar network token',
    trading_contexts: ['stellar', 'otc']
  },
  {
    id: 2,
    token_name: 'USD Coin',
    code: 'USDC',
    asset_type: 'credit_alphanum4',
    img_url: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
    issuer_public: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
    description: 'Circle USD Coin - available on Stellar SDEX and OTC',
    trading_contexts: ['stellar', 'otc']
  },
  {
    id: 3,
    token_name: 'Bitcoin',
    code: 'BTC',
    asset_type: 'external',
    img_url: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png',
    issuer_public: '',
    description: 'Bitcoin - primarily for OTC trading',
    trading_contexts: ['otc']
  },
  {
    id: 4,
    token_name: 'Ethereum',
    code: 'ETH',
    asset_type: 'external', 
    img_url: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
    issuer_public: '',
    description: 'Ethereum - primarily for OTC trading',
    trading_contexts: ['otc']
  },
  {
    id: 5,
    token_name: 'Aquarius',
    code: 'AQUA',
    asset_type: 'credit_alphanum4',
    img_url: 'https://aqua.network/assets/img/aqua-logo.svg',
    issuer_public: 'GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA',
    description: 'Aquarius voting token on Stellar',
    trading_contexts: ['stellar']
  },
  {
    id: 6,
    token_name: 'Euro Token',
    code: 'EURT',
    asset_type: 'credit_alphanum4',
    img_url: 'https://cryptologos.cc/logos/tether-usdt-logo.png',
    issuer_public: 'GAP5LETOV6YIE62YAM56STDANPRDO7ZFDBGSNHJQIYGGKSMOZAHOOS2S',
    description: 'Euro Token on Stellar',
    trading_contexts: ['stellar']
  },
  {
    id: 7,
    token_name: 'StellarTerm',
    code: 'YCHT',
    asset_type: 'credit_alphanum4',
    img_url: 'https://stellarterm.com/directory/logos/YCHT.png',
    issuer_public: 'GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V',
    description: 'StellarTerm community token',
    trading_contexts: ['stellar']
  }
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeMarketData = searchParams.get('includeMarketData') === 'true'

    let tokensWithMarketData = [...CLIX_TRADING_ASSETS]

    // If requested, add current market data from Horizon
    if (includeMarketData) {
      const server = new StellarSdk.Horizon.Server(HORIZON_URL)

      // Add market data for each asset
      const tokensWithPrices = await Promise.allSettled(
        tokensWithMarketData.map(async (token) => {
          try {
            if (token.code === 'XLM') {
              // For XLM, get price against USDC if available
              const baseAsset = StellarSdk.Asset.native()
              const counterAsset = new StellarSdk.Asset(
                'USDC',
                'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'
              )

              const orderBook = await server
                .orderbook(baseAsset, counterAsset)
                .limit(1)
                .call()

              const currentPrice = orderBook.bids.length > 0 ? orderBook.bids[0].price : null
              const volume24h = await get24hVolume(server, baseAsset, counterAsset)

              return {
                ...token,
                current_price_usd: currentPrice ? parseFloat(currentPrice) : null,
                price_change_24h: 0, // Would need historical data
                volume_24h: volume24h,
                market_cap: null,
                last_updated: new Date().toISOString()
              }
            } else {
              // For other assets, try to get price against XLM
              const baseAsset = new StellarSdk.Asset(token.code, token.issuer_public)
              const counterAsset = StellarSdk.Asset.native()

              const orderBook = await server
                .orderbook(baseAsset, counterAsset)
                .limit(1)
                .call()

              const currentPriceXLM = orderBook.bids.length > 0 ? orderBook.bids[0].price : null
              const volume24h = await get24hVolume(server, baseAsset, counterAsset)

              return {
                ...token,
                current_price_xlm: currentPriceXLM ? parseFloat(currentPriceXLM) : null,
                current_price_usd: null, // Would need XLM/USD rate to calculate
                price_change_24h: 0,
                volume_24h: volume24h,
                market_cap: null,
                last_updated: new Date().toISOString()
              }
            }
          } catch (error) {
            console.error(`Error fetching market data for ${token.code}:`, error)
            return {
              ...token,
              current_price_xlm: null,
              current_price_usd: null,
              price_change_24h: 0,
              volume_24h: '0',
              market_cap: null,
              last_updated: new Date().toISOString()
            }
          }
        })
      )

      // Extract successful results
      tokensWithMarketData = tokensWithPrices
        .map((result) => result.status === 'fulfilled' ? result.value : null)
        .filter((token): token is NonNullable<typeof token> => token !== null)
    }

    return NextResponse.json({
      success: true,
      tokens: tokensWithMarketData,
      count: tokensWithMarketData.length,
      timestamp: new Date().toISOString(),
      includes_market_data: includeMarketData
    })

  } catch (error: any) {
    console.error('Error fetching tokens:', error)
    
    return NextResponse.json(
      { error: 'Failed to fetch tokens' },
      { status: 500 }
    )
  }
}

// Helper function to get 24h volume for a trading pair
async function get24hVolume(
  server: StellarSdk.Horizon.Server,
  baseAsset: StellarSdk.Asset,
  counterAsset: StellarSdk.Asset
): Promise<string> {
  try {
    // Get trades from the last 24 hours
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)

    const tradesResponse = await server
      .trades()
      .forAssetPair(baseAsset, counterAsset)
      .limit(200)
      .order('desc')
      .call()

    // Filter trades from last 24h and sum volume
    const recent24hTrades = tradesResponse.records.filter(trade => 
      new Date(trade.ledger_close_time) > oneDayAgo
    )

    const totalVolume = recent24hTrades.reduce((sum, trade) => {
      return sum + parseFloat(trade.base_amount)
    }, 0)

    return totalVolume.toFixed(2)
  } catch (error) {
    console.error('Error calculating 24h volume:', error)
    return '0'
  }
}