// Comprehensive debugging script for authorization issues
console.log("🔍 DEBUGGING: Authorization Header Issues");
console.log("==========================================");

// 1. Test JWT Token Availability
console.log("\\n1. 📋 TESTING JWT TOKEN AVAILABILITY:");

const testJWTTokens = () => {
  // Check matrix_user_id
  const matrixUserId = localStorage.getItem('matrix_user_id');
  console.log(`   matrix_user_id: ${matrixUserId ? matrixUserId : '❌ NOT FOUND'}`);
  
  if (matrixUserId) {
    // Try scoped tokens
    const fullScopedToken = localStorage.getItem(`jwt_${matrixUserId}`);
    console.log(`   jwt_${matrixUserId}: ${fullScopedToken ? '✅ FOUND' : '❌ NOT FOUND'}`);
    
    // Try cleaned scoped tokens
    const cleaned = matrixUserId.replace(/^@/, "").split(":")[0];
    console.log(`   Cleaned Matrix ID: ${cleaned}`);
    const cleanScopedToken = localStorage.getItem(`jwt_${cleaned}`);
    console.log(`   jwt_${cleaned}: ${cleanScopedToken ? '✅ FOUND' : '❌ NOT FOUND'}`);
    
    // Show which token would be used
    const finalToken = fullScopedToken || cleanScopedToken || localStorage.getItem('jwt');
    console.log(`   🎯 FINAL TOKEN USED: ${finalToken ? finalToken.substring(0, 30) + '...' : '❌ NONE'}`);
  }
  
  // Check generic jwt
  const genericJwt = localStorage.getItem('jwt');
  console.log(`   jwt (generic): ${genericJwt ? '✅ FOUND' : '❌ NOT FOUND'}`);
};

testJWTTokens();

// 2. Test Service Helper Function
console.log("\\n2. 🔧 TESTING SERVICE HELPER FUNCTION:");

// Simulate the getJwtToken function from service.ts
const simulateGetJwtToken = () => {
  const rawId = localStorage.getItem('matrix_user_id');
  if (rawId) {
    const scopedFull = localStorage.getItem(`jwt_${rawId}`);
    if (scopedFull) return scopedFull;

    const clean = rawId.replace(/^@/, "").split(":")[0];
    const scopedClean = localStorage.getItem(`jwt_${clean}`);
    if (scopedClean) return scopedClean;
  }
  return localStorage.getItem('jwt');
};

const simulatedToken = simulateGetJwtToken();
console.log(`   Simulated service.ts token: ${simulatedToken ? '✅ FOUND' : '❌ NOT FOUND'}`);

// 3. Test Network Monitoring
console.log("\\n3. 🌐 SETTING UP NETWORK MONITORING:");
console.log("   Setting up fetch() interception to monitor API calls...");

// Override fetch to monitor all requests
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const [url, options = {}] = args;
  
  // Check if this is an API call to clicstage.xyz
  if (typeof url === 'string' && url.includes('api.clicstage.xyz')) {
    console.log(`\\n🚨 API CALL DETECTED:`);
    console.log(`   URL: ${url}`);
    console.log(`   Method: ${options.method || 'GET'}`);
    
    // Check headers
    const headers = options.headers || {};
    console.log(`   Headers:`, headers);
    
    // Specifically check for Authorization header
    const authHeader = headers['Authorization'] || headers['authorization'];
    if (authHeader) {
      console.log(`   ✅ Authorization header: ${authHeader.substring(0, 20)}...`);
    } else {
      console.log(`   ❌ NO AUTHORIZATION HEADER!`);
      console.log(`   🔍 Available token: ${simulateGetJwtToken() ? 'YES' : 'NO'}`);
    }
  }
  
  // Make the actual request
  try {
    const response = await originalFetch(...args);
    
    // Log response if it's an API error
    if (typeof url === 'string' && url.includes('api.clicstage.xyz') && !response.ok) {
      console.log(`   ❌ Response Status: ${response.status}`);
      try {
        const errorText = await response.clone().text();
        if (errorText.includes('authorization')) {
          console.log(`   🚨 AUTHORIZATION ERROR CONFIRMED!`);
          console.log(`   Error: ${errorText}`);
        }
      } catch (e) {
        console.log(`   Could not read error response`);
      }
    }
    
    return response;
  } catch (error) {
    console.log(`   ❌ Request failed:`, error);
    throw error;
  }
};

console.log("   ✅ Fetch monitoring active!");

// 4. Test Service Helper Directly
console.log("\\n4. 🧪 TESTING SERVICE HELPER DIRECTLY:");

const testServiceHelper = async () => {
  try {
    console.log("   Testing import of service helper...");
    
    // Try to make a test call using the service helper
    const response = await fetch('/test-service-helper', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 'service-helper' })
    });
    
    console.log("   Service helper test response:", response.status);
  } catch (error) {
    console.log("   Service helper test failed:", error);
  }
};

// 5. Manual API Test
console.log("\\n5. 🔍 MANUAL API TEST:");

const testManualAPICall = async () => {
  const token = simulateGetJwtToken();
  if (!token) {
    console.log("   ❌ Cannot test - no JWT token available");
    return;
  }
  
  console.log("   Making test API call with token...");
  
  try {
    const response = await fetch("https://api.clicstage.xyz/exchange/otc/trades", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });
    
    console.log(`   Response Status: ${response.status}`);
    
    if (response.status === 401) {
      console.log("   🚨 401 Unauthorized - Token is invalid or expired!");
      console.log("   💡 You need to reconnect your wallet to get a fresh token");
    } else if (response.status === 200) {
      console.log("   ✅ API call successful - token is working!");
    } else {
      console.log(`   ⚠️  Unexpected status: ${response.status}`);
    }
    
    const responseText = await response.text();
    console.log(`   Response: ${responseText.substring(0, 200)}...`);
    
  } catch (error) {
    console.log("   ❌ API call failed:", error);
  }
};

// Run tests
console.log("\\n🎯 RUNNING TESTS:");
console.log("=================");

setTimeout(testManualAPICall, 1000);

console.log("\\n💡 NEXT STEPS:");
console.log("==============");
console.log("1. Check the console output above");
console.log("2. Try using the app (place an order, check balances, etc.)");
console.log("3. Watch for API call logs with missing authorization headers");
console.log("4. If token is missing/invalid, reconnect your wallet");
console.log("5. If service helper isn't being used, check component imports");

console.log("\\n📝 TO RECONNECT WALLET:");
console.log("1. Go to wallet connection dialog");
console.log("2. Re-enter your Matrix username and password"); 
console.log("3. This will generate a fresh JWT token");
