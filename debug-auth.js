// Debug script to test authorization headers
const fs = require('fs');
const path = require('path');

console.log("🔍 Checking for authorization header usage in components...\n");

// Define the components that should be using the service helpers
const componentsToCheck = [
  'components/wallet-connection-dialog.tsx',
  'components/account-connection-dialog.tsx', 
  'hooks/use-wallet.ts',
  'components/otc-trade-panel.tsx',
  'components/account-panel.tsx',
  'components/order-confirmation-dialog.tsx',
  'components/chat-room.tsx',
  'components/trade-panel.tsx'
];

// Check each component
componentsToCheck.forEach(componentPath => {
  const fullPath = path.join(__dirname, componentPath);
  
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    
    console.log(`📄 ${componentPath}:`);
    
    // Check for service imports
    const hasServiceImport = content.includes('import { get, post }') || 
                           content.includes('from "@/lib/service"') ||
                           content.includes('from "../lib/service"');
    console.log(`  ✅ Service import: ${hasServiceImport ? 'YES' : '❌ NO'}`);
    
    // Check for direct fetch calls to the API
    const hasFetchCalls = content.match(/fetch\([^)]*api\.clicstage\.xyz[^)]*\)/g);
    if (hasFetchCalls) {
      console.log(`  ⚠️  Direct fetch calls found: ${hasFetchCalls.length}`);
      hasFetchCalls.forEach(call => console.log(`    - ${call.substring(0, 80)}...`));
    } else {
      console.log(`  ✅ No direct API fetch calls`);
    }
    
    // Check for service helper usage
    const getUsage = (content.match(/\bget\(/g) || []).length;
    const postUsage = (content.match(/\bpost\(/g) || []).length;
    console.log(`  📊 Service usage: get(${getUsage}), post(${postUsage})`);
    
    console.log('');
  } else {
    console.log(`❌ File not found: ${componentPath}\n`);
  }
});

// Check the service helper itself
console.log("🔧 Checking service helper...");
const servicePath = path.join(__dirname, 'lib/service.ts');
if (fs.existsSync(servicePath)) {
  const serviceContent = fs.readFileSync(servicePath, 'utf8');
  
  const hasAuthHeader = serviceContent.includes('Authorization: `Bearer ${token}`');
  console.log(`  ✅ Authorization header: ${hasAuthHeader ? 'YES' : '❌ NO'}`);
  
  const baseUrl = serviceContent.match(/BASE_URL\s*=\s*["']([^"']+)["']/);
  console.log(`  🌐 Base URL: ${baseUrl ? baseUrl[1] : 'NOT FOUND'}`);
  
  console.log('');
} else {
  console.log("❌ Service helper not found!\n");
}

console.log("🎯 Next steps:");
console.log("1. Check browser dev tools Network tab for actual requests");
console.log("2. Verify JWT token exists in localStorage");
console.log("3. Check if requests are going to the right endpoints");
