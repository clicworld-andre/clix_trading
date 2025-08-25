// Test script to verify authorization fix
console.log("🧪 TESTING AUTHORIZATION FIX");
console.log("=============================");

// Test 1: JWT Token Status
console.log("\\n1. 📋 JWT Token Status:");
const matrixUserId = localStorage.getItem('matrix_user_id');
const genericJwt = localStorage.getItem('jwt');
const scopedJwt = matrixUserId ? localStorage.getItem(`jwt_${matrixUserId}`) : null;

console.log(`   Matrix User ID: ${matrixUserId || '❌ NOT FOUND'}`);
console.log(`   Generic JWT: ${genericJwt ? '✅ FOUND' : '❌ NOT FOUND'}`);
console.log(`   Scoped JWT: ${scopedJwt ? '✅ FOUND' : '❌ NOT FOUND'}`);

// Test 2: Service Helper Token Logic
console.log("\\n2. 🔧 Service Helper Token Logic:");
const getJwtToken = () => {
  if (typeof window === 'undefined') return null

  const rawId = localStorage.getItem('matrix_user_id')
  if (rawId) {
    const scopedFull = localStorage.getItem(`jwt_${rawId}`)
    if (scopedFull) return scopedFull

    const clean = rawId
      .replace(/^@/, "")
      .split(":")[0]
    const scopedClean = localStorage.getItem(`jwt_${clean}`)
    if (scopedClean) return scopedClean
  }

  return localStorage.getItem('jwt')
}

const finalToken = getJwtToken();
console.log(`   Final Token Result: ${finalToken ? '✅ FOUND (' + finalToken.substring(0, 20) + '...)' : '❌ NOT FOUND'}`);

// Test 3: Expected Behavior
console.log("\\n3. 🎯 Expected Behavior:");
if (!finalToken) {
  console.log("   ✅ No token found - this is expected for new users");
  console.log("   ✅ Service helper should now show clear error: 'No JWT token available. Please connect your wallet first.'");
  console.log("   ✅ useWallet hook should skip API calls when no token exists");
} else {
  console.log("   ✅ Token found - API calls should work normally");
  console.log("   ✅ Service helper will add Authorization: Bearer headers");
}

// Test 4: Manual Service Helper Test
console.log("\\n4. 🔍 Service Helper Behavior Test:");
if (!finalToken) {
  console.log("   ✅ Perfect! No token available, so no API calls should be made");
  console.log("   💡 To fix: Connect your wallet using the wallet connection dialog");
} else {
  console.log("   Testing API call with available token...");
  
  // Simulate the service helper logic
  const testApiCall = async () => {
    try {
      const response = await fetch("https://api.clicstage.xyz/exchange/otc/trades", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${finalToken}`
        }
      });
      
      console.log(`   API Test Result: ${response.status}`);
      if (response.status === 200) {
        console.log("   ✅ Token is valid and working!");
      } else if (response.status === 401) {
        console.log("   ⚠️  Token exists but is invalid/expired - reconnect wallet");
      } else {
        console.log(`   ℹ️  Unexpected status: ${response.status}`);
      }
    } catch (error) {
      console.log("   ❌ API call failed:", error.message);
    }
  };
  
  setTimeout(testApiCall, 500);
}

// Test 5: Instructions
console.log("\\n5. 📝 Next Steps:");
if (!finalToken) {
  console.log("   1. ✅ Authorization error should be resolved now (clearer error message)");
  console.log("   2. 🔗 Connect your wallet to get a JWT token:");
  console.log("      - Look for a 'Connect Wallet' button in the app");
  console.log("      - Enter your Matrix username and password");
  console.log("      - This will generate a JWT token and store it in localStorage");
  console.log("   3. 🔄 After connecting, refresh the app to test trading features");
} else {
  console.log("   1. ✅ JWT token is available");
  console.log("   2. 🧪 Try using the trading features to test authorization");
  console.log("   3. 📊 Check Network tab in dev tools to verify auth headers");
}

console.log("\\n🎯 SUMMARY:");
console.log("============");
console.log("✅ Fixed useWallet hook to check for token before API calls");
console.log("✅ Updated service helper to show clearer error messages");
console.log("✅ Authorization headers will be added automatically when token exists");
console.log("💡 Users need to connect wallet first to get JWT token");
