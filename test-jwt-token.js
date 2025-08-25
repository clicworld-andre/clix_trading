// Test JWT token retrieval and API call
console.log("🔍 Testing JWT token retrieval and API authentication...\n");

// Simulate the getJwtToken function from service.ts
const getJwtToken = () => {
  console.log("📋 Checking localStorage for JWT tokens:");
  
  // Check if we're in a browser-like environment
  if (typeof window === 'undefined') {
    console.log("❌ Not in browser environment");
    return null;
  }
  
  console.log("This test needs to run in a browser console. Copy and paste this code:");
  console.log(`
// Test JWT token retrieval
const getJwtToken = () => {
  console.log("📋 Checking localStorage for JWT tokens:");
  
  // Check for matrix_user_id
  const rawId = localStorage.getItem('matrix_user_id');
  console.log("🔑 matrix_user_id:", rawId);
  
  if (rawId) {
    // Try scoped key with full id first
    const scopedFull = localStorage.getItem(\`jwt_\${rawId}\`);
    console.log("🔑 jwt_" + rawId + ":", scopedFull);
    if (scopedFull) return scopedFull;

    // Then try username without @ and domain
    const clean = rawId.replace(/^@/, "").split(":")[0];
    console.log("🧹 Cleaned Matrix ID:", clean);
    const scopedClean = localStorage.getItem(\`jwt_\${clean}\`);
    console.log("🔑 jwt_" + clean + ":", scopedClean);
    if (scopedClean) return scopedClean;
  }

  // Fallback to generic key
  const genericJwt = localStorage.getItem('jwt');
  console.log("🔑 jwt:", genericJwt);
  return genericJwt;
}

// Test the token
const token = getJwtToken();
console.log("\\n🎯 Final token:", token ? "Found (" + token.substring(0, 20) + "...)" : "❌ Not found");

// Test an API call with the token
if (token) {
  console.log("\\n🔧 Testing API call with authorization...");
  fetch("https://api.clicstage.xyz/exchange/otc/trades", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    }
  })
  .then(response => {
    console.log("📡 API Response status:", response.status);
    if (response.status === 401) {
      console.log("❌ Still getting 401 - token might be invalid");
    } else if (response.status === 200) {
      console.log("✅ API call successful!");
    }
    return response.json();
  })
  .then(data => console.log("📊 API Response:", data))
  .catch(error => console.log("❌ API Error:", error));
} else {
  console.log("\\n❌ Cannot test API - no JWT token found");
  console.log("\\n🔧 To fix this, you need to:");
  console.log("1. Sign in to Matrix to get a JWT token");
  console.log("2. Check that the token is stored correctly in localStorage");
  console.log("3. Ensure the Matrix user ID is also stored");
}
  `);
}

getJwtToken();
