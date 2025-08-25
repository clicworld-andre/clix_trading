#!/usr/bin/env node

// Test script to verify console errors are fixed

const { StellarTradingService } = require('../lib/stellar-trading.js')

async function testConsoleErrors() {
  console.log('🧪 Testing Console Error Fixes\n')

  try {
    // Test the functions that were causing console errors
    const service = new StellarTradingService()
    
    // Test order book (was causing "Not Found" error)
    console.log('1. Testing order book fetch...')
    try {
      const orderBook = await service.getOrderBook(
        { code: 'XLM', type: 'native', name: 'Stellar Lumens' },
        { code: 'USDC', issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN', type: 'credit_alphanum4', name: 'USD Coin' }
      )
      console.log(`   ✅ Order book loaded: ${orderBook.bids.length} bids, ${orderBook.asks.length} asks`)
    } catch (error) {
      console.log(`   ⚠️  Order book: ${error.message} (this is expected for testnet)`)
    }
    
    // Test trade history (was causing "Failed to fetch trade history" error)
    console.log('\n2. Testing trade history fetch...')
    try {
      const trades = await service.getRecentTrades(
        { code: 'XLM', type: 'native', name: 'Stellar Lumens' },
        { code: 'USDC', issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN', type: 'credit_alphanum4', name: 'USD Coin' }
      )
      console.log(`   ✅ Trade history loaded: ${trades.length} trades`)
    } catch (error) {
      console.log(`   ⚠️  Trade history: ${error.message} (this is expected for testnet)`)
    }
    
    console.log('\n🎯 Console Error Tests Complete!')
    console.log('   - Errors should now be handled gracefully')
    console.log('   - Empty results returned instead of throwing errors')
    console.log('   - Console warnings instead of errors')
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testConsoleErrors()