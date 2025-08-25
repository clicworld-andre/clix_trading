#!/usr/bin/env node

// Verification script for authorization fixes
console.log('🔍 Verifying Authorization Fix Implementation...\n')

const fs = require('fs')
const path = require('path')

// Files that should have been updated
const filesToCheck = [
  'components/wallet-connection-dialog.tsx',
  'components/account-connection-dialog.tsx', 
  'hooks/use-wallet.ts',
  'components/otc-trade-panel.tsx',
  'components/account-panel.tsx',
  'components/order-confirmation-dialog.tsx',
  'components/chat-room.tsx',
  'components/trade-panel.tsx'
]

// Check each file
filesToCheck.forEach(filePath => {
  const fullPath = path.join(__dirname, filePath)
  
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8')
    
    console.log(`📁 ${filePath}`)
    
    // Check for service import
    const hasServiceImport = content.includes('from "@/lib/service"')
    console.log(`  ✅ Service import: ${hasServiceImport ? '✓' : '❌'}`)
    
    // Check if it still has raw fetch calls to the OTC API
    const hasRawOtcFetch = content.includes('fetch(`https://api.clicstage.xyz/exchange/otc/')
    console.log(`  ✅ No raw OTC fetch: ${!hasRawOtcFetch ? '✓' : '❌'}`)
    
    // Count service helper usage
    const getUsage = (content.match(/await get\(/g) || []).length
    const postUsage = (content.match(/await post\(/g) || []).length
    console.log(`  📊 Service usage: get(${getUsage}), post(${postUsage})`)
    
    console.log('')
  } else {
    console.log(`❌ ${filePath} - File not found`)
  }
})

// Check service.ts for proper JWT handling
const servicePath = path.join(__dirname, 'lib/service.ts')
if (fs.existsSync(servicePath)) {
  const serviceContent = fs.readFileSync(servicePath, 'utf8')
  
  console.log('📁 lib/service.ts')
  console.log(`  ✅ Has getJwtToken: ${serviceContent.includes('getJwtToken') ? '✓' : '❌'}`)
  console.log(`  ✅ Has Authorization header: ${serviceContent.includes('Authorization: `Bearer ${token}`') ? '✓' : '❌'}`)
  console.log(`  ✅ Has smart token hierarchy: ${serviceContent.includes('jwt_${rawId}') && serviceContent.includes('jwt_${clean}') ? '✓' : '❌'}`)
  console.log('')
}

console.log('🎉 Authorization Fix Verification Complete!')
console.log('')
console.log('📋 Summary:')
console.log('- All components should now use service helpers (get/post)')
console.log('- Raw fetch calls to OTC API should be eliminated')
console.log('- JWT authorization headers will be added automatically')
console.log('- This should resolve "No authorization header provided" errors')
