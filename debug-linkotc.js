// Debug script to analyze linkOtc endpoint behavior
console.log("🔍 DEBUGGING LINKOTC ENDPOINT");
console.log("============================");

// Check localStorage state
console.log("\n1. 📋 Current localStorage state:");
if (typeof window !== 'undefined') {
  const matrixUserId = localStorage.getItem('matrix_user_id');
  const genericJwt = localStorage.getItem('jwt');
  const matrixToken = localStorage.getItem('matrix_access_token');
  
  console.log(`   matrix_user_id: ${matrixUserId || 'NOT FOUND'}`);
  console.log(`   jwt: ${genericJwt ? 'FOUND (' + genericJwt.substring(0, 20) + '...)' : 'NOT FOUND'}`);
  console.log(`   matrix_access_token: ${matrixToken ? 'FOUND (' + matrixToken.substring(0, 20) + '...)' : 'NOT FOUND'}`);
  
  if (matrixUserId) {
    const clean = matrixUserId.replace(/^@/, '').split(':')[0];
    const scopedJwt = localStorage.getItem(`jwt_${clean}`);
    const scopedFull = localStorage.getItem(`jwt_${matrixUserId}`);
    console.log(`   jwt_${clean}: ${scopedJwt ? 'FOUND (' + scopedJwt.substring(0, 20) + '...)' : 'NOT FOUND'}`);
    console.log(`   jwt_${matrixUserId}: ${scopedFull ? 'FOUND (' + scopedFull.substring(0, 20) + '...)' : 'NOT FOUND'}`);
  }
} else {
  console.log('   Running in server context - cannot access localStorage');
}

// Test different endpoint variations
const testEndpoints = [
  'https://api.clicworld.app/exchange/otc/linkOtc',
  'https://api.clicworld.app/otc/linkOtc',
  'https://api.clicworld.app/linkOtc',
  'https://api.clicstage.xyz/exchange/otc/linkOtc'
];

console.log("\n2. 🌐 Testing endpoint variations:");

const testData = {
  user_id: 'testuser',
  otc_user_id: 'testotc',
  password: 'testpin'
};

// Test function
async function testEndpoint(url, headers = {}) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: JSON.stringify(testData)
    });
    
    const data = await response.json();
    return { status: response.status, data };
  } catch (error) {
    return { error: error.message };
  }
}

// Test without auth headers
console.log("\n3. 🚫 Testing without authorization headers:");
for (const endpoint of testEndpoints) {
  console.log(`\n   Testing: ${endpoint}`);
  testEndpoint(endpoint).then(result => {
    console.log(`   Result: Status ${result.status}, Message: ${result.data?.message || 'No message'}`);
  }).catch(err => {
    console.log(`   Error: ${err}`);
  });
}

// Test with dummy auth header
console.log("\n4. 🔑 Testing with dummy authorization header:");
const dummyHeaders = { 'Authorization': 'Bearer dummy_token' };
for (const endpoint of testEndpoints) {
  console.log(`\n   Testing: ${endpoint} (with auth)`);
  testEndpoint(endpoint, dummyHeaders).then(result => {
    console.log(`   Result: Status ${result.status}, Message: ${result.data?.message || 'No message'}`);
  }).catch(err => {
    console.log(`   Error: ${err}`);
  });
}

// Check if there's an existing JWT token and test with it
if (typeof window !== 'undefined') {
  const token = localStorage.getItem('jwt') || 
    localStorage.getItem('matrix_access_token') ||
    (localStorage.getItem('matrix_user_id') ? 
      localStorage.getItem(`jwt_${localStorage.getItem('matrix_user_id').replace(/^@/, '').split(':')[0]}`) : 
      null);
      
  if (token) {
    console.log("\n5. 🎯 Testing with existing token:");
    const authHeaders = { 'Authorization': `Bearer ${token}` };
    
    testEndpoint('https://api.clicworld.app/exchange/otc/linkOtc', authHeaders).then(result => {
      console.log(`   Production with token: Status ${result.status}, Message: ${result.data?.message || 'No message'}`);
    });
    
    testEndpoint('https://api.clicstage.xyz/exchange/otc/linkOtc', authHeaders).then(result => {
      console.log(`   Staging with token: Status ${result.status}, Message: ${result.data?.message || 'No message'}`);
    });
  } else {
    console.log("\n5. ❌ No existing tokens found to test with");
  }
}

console.log("\n6. 🎯 ANALYSIS:");
console.log("   If all endpoints return 'No authorization header provided':");
console.log("   → The API has changed to ALWAYS require authorization");
console.log("   → Need to establish authentication session first");
console.log("   → May need Matrix login before wallet connection");
console.log("\n   If some endpoints work without auth:");
console.log("   → Found the correct endpoint pattern");
console.log("   → Can use that endpoint for initial wallet connection");
