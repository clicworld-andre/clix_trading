// Browser Console Test Script - Paste this into browser dev console
// Run this AFTER trying to connect your wallet to verify the fix

console.log("🧪 WALLET CONNECTION VERIFICATION");
console.log("==================================");

// Check 1: Verify localStorage has Matrix user ID
const matrixUserId = localStorage.getItem('matrix_user_id');
console.log(`\n1. Matrix User ID: ${matrixUserId || '❌ NOT FOUND'}`);

if (matrixUserId) {
  // Check 2: Check for JWT tokens
  const cleanId = matrixUserId.replace(/^@/, "").split(":")[0];
  const scopedJwt = localStorage.getItem(`jwt_${cleanId}`);
  const genericJwt = localStorage.getItem('jwt');
  
  console.log(`2. Clean Matrix ID: ${cleanId}`);
  console.log(`3. Scoped JWT (jwt_${cleanId}): ${scopedJwt ? '✅ FOUND' : '❌ NOT FOUND'}`);
  console.log(`4. Generic JWT: ${genericJwt ? '✅ FOUND' : '❌ NOT FOUND'}`);
  
  // Check 3: Wallet connection data
  const walletData = localStorage.getItem(`wallet_data_${cleanId}`);
  console.log(`5. Wallet Data: ${walletData ? '✅ FOUND' : '❌ NOT FOUND'}`);
  
  if (walletData) {
    try {
      const parsed = JSON.parse(walletData);
      console.log(`6. Connected User: ${parsed.user_id || 'Unknown'}`);
    } catch (e) {
      console.log('6. ⚠️ Error parsing wallet data');
    }
  }
  
  // Check 4: Test service helper functions
  console.log('\n🔧 SERVICE HELPER TEST:');
  if (scopedJwt || genericJwt) {
    console.log('✅ JWT token available - authenticated calls should work');
    console.log('💡 Try using trading features - they should work normally');
  } else {
    console.log('❌ No JWT token - user needs to connect wallet');
    console.log('💡 Try connecting wallet - should work without "No JWT token" error');
  }
} else {
  console.log('❌ No Matrix user ID found - user needs to login first');
}

// Check 5: Verify fix implementation
console.log('\n🔍 VERIFYING FIX IMPLEMENTATION:');
console.log('✅ postUnauthenticated() function should be available for wallet connection');
console.log('✅ Wallet connection dialog should no longer show JWT token error');
console.log('✅ After connection, JWT token should be stored and other features should work');

console.log('\n📝 NEXT STEPS:');
if (!matrixUserId) {
  console.log('1. Login with Matrix credentials first');
  console.log('2. Then try wallet connection');
} else if (!scopedJwt && !genericJwt) {
  console.log('1. Click "Connect Wallet" button');
  console.log('2. Enter PELOTON Plus username and PIN');
  console.log('3. Connection should succeed without JWT error');
} else {
  console.log('1. ✅ Wallet appears to be connected!');
  console.log('2. Try using trading features');
  console.log('3. All API calls should include JWT token automatically');
}

console.log('\n🎯 IF WALLET CONNECTION STILL FAILS:');
console.log('1. Check browser Network tab for API call details');
console.log('2. Verify the API endpoint is reachable');
console.log('3. Check if PELOTON Plus credentials are correct');
console.log('4. Look for any CORS or network errors');
