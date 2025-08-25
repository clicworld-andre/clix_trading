// Test the service helper functionality
const { get, post } = require('./lib/service.ts')

// Mock localStorage for Node.js testing
global.localStorage = {
  getItem: (key) => {
    console.log(`📖 localStorage.getItem('${key}')`)
    if (key === 'matrix_user_id') return '@testuser:clic2go.ug'
    if (key === 'jwt_testuser') return 'test-jwt-token-123'
    if (key === 'jwt') return 'fallback-jwt-token'
    return null
  }
}

global.window = {}

async function testService() {
  console.log('🧪 Testing service helper...')
  
  try {
    console.log('🔍 Testing JWT token retrieval...')
    
    // This should fail gracefully since we're not in a browser
    const result = await get('getTokens')
    console.log('✅ Service call successful:', result)
  } catch (error) {
    console.log('❌ Service call failed (expected in Node.js):', error.message)
    console.log('   This is normal since we need browser environment and valid API')
  }
}

testService()
