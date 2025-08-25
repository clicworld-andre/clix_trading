#!/usr/bin/env node

// Script to create and fund a test account on Stellar testnet for development

const StellarSdk = require('@stellar/stellar-sdk')

async function setupTestAccount() {
  try {
    // Switch to testnet for development
    const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org')
    StellarSdk.Networks.TESTNET

    // Generate a new keypair for testing
    const pair = StellarSdk.Keypair.random()
    
    console.log('Generated Test Account:')
    console.log('Secret Key:', pair.secret())
    console.log('Public Key:', pair.publicKey())
    
    // Fund the account using Friendbot (testnet only)
    console.log('\nFunding account via Friendbot...')
    
    const response = await fetch(`https://friendbot.stellar.org?addr=${encodeURIComponent(pair.publicKey())}`)
    
    if (response.ok) {
      console.log('✅ Account funded successfully!')
      
      // Check the account balance
      const account = await server.loadAccount(pair.publicKey())
      console.log('\nAccount Balances:')
      account.balances.forEach(balance => {
        console.log(`${balance.asset_code || 'XLM'}: ${balance.balance}`)
      })
      
      console.log('\n🎯 Ready for testing!')
      console.log(`\nUpdate your demo user credentials:`)
      console.log(`- User: demo`)
      console.log(`- PIN: 1234`) 
      console.log(`- Secret: ${pair.secret()}`)
      console.log(`- Public: ${pair.publicKey()}`)
      
    } else {
      console.error('❌ Failed to fund account:', await response.text())
    }
    
  } catch (error) {
    console.error('Error setting up test account:', error)
  }
}

setupTestAccount()