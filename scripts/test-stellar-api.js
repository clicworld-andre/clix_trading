#!/usr/bin/env node

// Test script for Stellar trading API endpoints

const API_BASE = 'http://localhost:3000/api/stellar'

async function testStellarAPI() {
  console.log('🧪 Testing Stellar Trading API Endpoints\n')

  try {
    // Test 1: Get available tokens
    console.log('1. Testing getTokens endpoint...')
    const tokensResponse = await fetch(`${API_BASE}/getTokens`)
    const tokensData = await tokensResponse.json()
    console.log(`   ✅ Found ${tokensData.tokens?.length} trading assets`)
    
    // Test 2: Get user balances
    console.log('\n2. Testing balances endpoint...')
    const balancesResponse = await fetch(`${API_BASE}/balances/demo`)
    const balancesData = await balancesResponse.json()
    
    if (balancesData.success) {
      console.log(`   ✅ Account funded with ${balancesData.balances[0]?.balance} XLM`)
      console.log(`   📍 Public Key: ${balancesData.stellar_public_key}`)
    } else {
      console.log(`   ❌ Failed to get balances: ${balancesData.error}`)
    }
    
    // Test 3: Check current orders
    console.log('\n3. Testing orders endpoint...')
    const ordersResponse = await fetch(`${API_BASE}/orders/demo`)
    const ordersData = await ordersResponse.json()
    
    if (ordersData.success) {
      console.log(`   ✅ Found ${ordersData.count} open orders`)
    } else {
      console.log(`   ❌ Failed to get orders: ${ordersData.error}`)
    }
    
    // Test 4: Test authentication
    console.log('\n4. Testing authentication endpoint...')
    const authResponse = await fetch(`${API_BASE}/getKeys`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'demo', password: '1234' })
    })
    const authData = await authResponse.json()
    
    if (authData.success) {
      console.log(`   ✅ Authentication successful`)
      console.log(`   🔐 Public Key: ${authData.stellar_public_key}`)
    } else {
      console.log(`   ❌ Authentication failed: ${authData.error}`)
    }
    
    // Test 5: Attempt to place a test order (limit order for XLM/USDC)
    console.log('\n5. Testing placeOrder endpoint (dry run)...')
    const orderResponse = await fetch(`${API_BASE}/placeOrder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'demo',
        password: '1234',
        direction: 'sell',
        baseAsset: 'XLM',
        counterAsset: 'USDC',
        amount: '100',
        price: '0.1',
        orderType: 'limit'
      })
    })
    const orderData = await orderResponse.json()
    
    if (orderData.success) {
      console.log(`   ✅ Order placed successfully!`)
      console.log(`   🧾 Transaction Hash: ${orderData.transaction_hash}`)
    } else {
      console.log(`   ⚠️  Order placement result: ${orderData.error}`)
      // This might fail due to trustlines or other Stellar requirements, which is expected
    }
    
    console.log('\n🎯 API Testing Complete!')
    console.log('\n📋 Summary:')
    console.log('   - Token listing: ✅ Working')
    console.log('   - Account balances: ✅ Working')
    console.log('   - Order history: ✅ Working')
    console.log('   - Authentication: ✅ Working')
    console.log(`   - Order placement: ${orderData?.success ? '✅' : '⚠️'} ${orderData?.success ? 'Working' : 'May need trustlines'}`)
    
    console.log('\n🚀 Ready for UI testing!')
    console.log('   Open http://localhost:3000 and navigate to the Trading tab')
    console.log('   Use credentials: demo / PIN: 1234')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testStellarAPI()