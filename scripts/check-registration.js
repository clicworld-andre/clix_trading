#!/usr/bin/env node

/**
 * Script to check if a Matrix server supports self-registration
 * 
 * Usage: node check-registration.js https://matrix.org
 */

const https = require('https');
const http = require('http');

// Get the homeserver URL from command line args
const homeserver = process.argv[2] || 'https://chat.clic2go.ug';

console.log(`Checking registration support for: ${homeserver}`);

// Ensure URL has protocol
let baseUrl = homeserver;
if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
  baseUrl = `https://${baseUrl}`;
}

// Parse the URL
const url = new URL(`${baseUrl}/_matrix/client/r0/register`);
const protocol = url.protocol === 'https:' ? https : http;

// Create request options
const options = {
  method: 'POST',
  hostname: url.hostname,
  port: url.port || (url.protocol === 'https:' ? 443 : 80),
  path: url.pathname,
  headers: {
    'Content-Type': 'application/json',
  },
};

// Send request to check registration flows
const req = protocol.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      
      console.log(`\nResponse status: ${res.statusCode}`);
      
      if (res.statusCode === 401 && response.flows) {
        console.log('\n✅ Server supports registration!');
        console.log('\nAvailable registration flows:');
        
        response.flows.forEach((flow, index) => {
          console.log(`\nFlow ${index + 1}:`);
          console.log(`Stages: ${flow.stages.join(', ')}`);
          
          // Check for simple registration
          if (flow.stages.length === 1 && flow.stages[0] === 'm.login.dummy') {
            console.log('→ Simple registration supported (no additional verification)');
          }
          
          // Check for email verification
          if (flow.stages.includes('m.login.email.identity')) {
            console.log('→ Requires email verification');
          }
          
          // Check for registration token
          if (flow.stages.includes('m.login.registration_token')) {
            console.log('→ Requires registration token');
          }
        });
        
        // Check if simple registration is possible
        const hasSimpleFlow = response.flows.some(flow => 
          flow.stages.length === 1 && flow.stages[0] === 'm.login.dummy'
        );
        
        if (hasSimpleFlow) {
          console.log('\n✅ Simple registration (username+password only) is supported!');
        } else {
          console.log('\n⚠️ No simple registration flow found. Additional verification steps required.');
        }
      } else if (response.errcode === 'M_FORBIDDEN') {
        console.log('\n❌ Registration is explicitly disabled on this server.');
        console.log(`Error: ${response.error}`);
      } else {
        console.log('\n⚠️ Unexpected response. Registration may be disabled.');
        console.log('Response data:', response);
      }
    } catch (e) {
      console.error('\n❌ Error parsing response:', e.message);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error(`\n❌ Error: ${e.message}`);
});

// Send empty request body to get flows
req.write(JSON.stringify({}));
req.end(); 