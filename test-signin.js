#!/usr/bin/env node

const fetch = require('node-fetch');

// Test profiles
const profiles = [
  { name: "andrevanzyl", username: "andrevanzyl", password: "test123" },
  { name: "1596484353303c", username: "1596484353303c", password: "test123" }
];

// Test servers
const servers = [
  { name: "chat.clic2go.ug", url: "https://chat.clic2go.ug" },
  { name: "matrix.org", url: "https://matrix.org" }
];

async function testMatrixLogin(serverUrl, username, password) {
  console.log(`\n🔍 Testing Matrix login for ${username} on ${serverUrl}`);
  
  try {
    // First, check server availability
    console.log(`   Checking server availability...`);
    const pingResponse = await fetch(`${serverUrl}/_matrix/client/versions`);
    console.log(`   Server ping: ${pingResponse.status} ${pingResponse.statusText}`);
    
    if (pingResponse.status === 200) {
      const versions = await pingResponse.json();
      console.log(`   Server versions:`, versions.versions || 'No version info');
    }
    
    // Try login
    console.log(`   Attempting login...`);
    const loginResponse = await fetch(`${serverUrl}/_matrix/client/r0/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'm.login.password',
        identifier: {
          type: 'm.id.user',
          user: username
        },
        password: password
      })
    });
    
    const loginData = await loginResponse.json();
    console.log(`   Login response status: ${loginResponse.status}`);
    console.log(`   Login response:`, JSON.stringify(loginData, null, 2));
    
    return {
      success: loginResponse.ok,
      status: loginResponse.status,
      data: loginData
    };
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testAdminLogin(username, password) {
  console.log(`\n🔍 Testing Admin API login for ${username}`);
  
  try {
    const adminResponse = await fetch("https://api.clicstage.xyz/fedapi/admin/login", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const adminData = await adminResponse.json();
    console.log(`   Admin login status: ${adminResponse.status}`);
    console.log(`   Admin response:`, JSON.stringify(adminData, null, 2));
    
    return {
      success: adminResponse.ok,
      status: adminResponse.status,
      data: adminData
    };
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function checkServerRegistrationSupport(serverUrl) {
  console.log(`\n🔍 Checking registration support on ${serverUrl}`);
  
  try {
    const regResponse = await fetch(`${serverUrl}/_matrix/client/r0/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    
    const regData = await regResponse.json();
    console.log(`   Registration check status: ${regResponse.status}`);
    console.log(`   Registration flows:`, JSON.stringify(regData, null, 2));
    
    return {
      status: regResponse.status,
      data: regData
    };
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return { error: error.message };
  }
}

async function runTests() {
  console.log("🚀 Starting Sign-In Function Analysis\n");
  console.log("=" * 60);
  
  // Test server connectivity and registration support
  for (const server of servers) {
    await checkServerRegistrationSupport(server.url);
  }
  
  console.log("\n" + "=" * 60);
  console.log("MATRIX LOGIN TESTS");
  console.log("=" * 60);
  
  // Test Matrix login for each profile on each server
  for (const profile of profiles) {
    for (const server of servers) {
      await testMatrixLogin(server.url, profile.username, profile.password);
    }
  }
  
  console.log("\n" + "=" * 60);
  console.log("ADMIN API LOGIN TESTS");
  console.log("=" * 60);
  
  // Test admin login for each profile
  for (const profile of profiles) {
    await testAdminLogin(profile.username, profile.password);
  }
  
  console.log("\n" + "=" * 60);
  console.log("ANALYSIS COMPLETE");
  console.log("=" * 60);
}

// Run the tests
runTests().catch(console.error);
