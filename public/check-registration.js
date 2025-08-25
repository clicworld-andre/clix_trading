/**
 * Matrix Registration Support Checker
 * 
 * This script can be loaded in the browser console to check if a Matrix server supports registration
 * and what registration flows are available.
 * 
 * Usage:
 * 1. Open your browser console (F12 or Ctrl+Shift+J)
 * 2. Copy and paste this entire script
 * 3. Call checkRegistration() or checkRegistration("https://your-matrix-server.com")
 */

async function checkRegistration(homeserver = "https://chat.clic2go.ug") {
  console.log(`Checking registration support for: ${homeserver}`);
  
  // Ensure homeserver has a protocol
  if (!homeserver.startsWith("http://") && !homeserver.startsWith("https://")) {
    homeserver = `https://${homeserver}`;
  }
  
  try {
    // First, check if registration is available at all
    const response = await fetch(`${homeserver}/_matrix/client/r0/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ kind: 'm.login.password' }),
    });
    
    const data = await response.json();
    console.log(`Response status: ${response.status}`);
    
    if (response.status === 401 || response.status === 400) {
      console.log("✅ Server responds to registration endpoint!");
      
      if (data.flows && data.flows.length > 0) {
        console.log("\nAvailable registration flows:");
        
        let hasSimpleRegistration = false;
        let requiresEmail = false;
        let requiresToken = false;
        
        data.flows.forEach((flow, index) => {
          console.log(`\nFlow ${index + 1}:`);
          console.log(`Stages: ${flow.stages.join(', ')}`);
          
          // Check for simple registration (just m.login.dummy)
          if (flow.stages.length === 1 && flow.stages[0] === 'm.login.dummy') {
            hasSimpleRegistration = true;
            console.log("→ Simple registration with username/password");
          }
          
          // Check for email verification
          if (flow.stages.includes('m.login.email.identity')) {
            requiresEmail = true;
            console.log("→ Requires email verification");
          }
          
          // Check for registration token
          if (flow.stages.includes('m.login.registration_token')) {
            requiresToken = true;
            console.log("→ Requires registration token");
          }
        });
        
        if (!hasSimpleRegistration) {
          console.log("\n⚠️ No simple registration flow found. Additional verification steps required.");
        }
        
        console.log("\nSummary:");
        console.log(`- Simple registration: ${hasSimpleRegistration ? '✅ Available' : '❌ Not available'}`);
        console.log(`- Email verification: ${requiresEmail ? '✅ Required' : '❌ Not required'}`);
        console.log(`- Registration token: ${requiresToken ? '✅ Required' : '❌ Not required'}`);
        
        return {
          registrationEnabled: true,
          flows: data.flows,
          requiresEmail,
          requiresToken,
          hasSimpleRegistration
        };
      } else if (data.errcode === 'M_FORBIDDEN') {
        console.log("⚠️ Server returned M_FORBIDDEN but no flows - partial registration support");
        return {
          registrationEnabled: true,
          requiresEmail: false,
          requiresToken: false,
          hasSimpleRegistration: false,
          error: "Incomplete registration flow information"
        };
      }
    } else if (data.errcode === 'M_REGISTRATION_DISABLED') {
      console.log("❌ Registration is explicitly disabled on this server");
      return {
        registrationEnabled: false,
        error: "Registration is disabled on this server"
      };
    } else {
      console.log("❌ Server doesn't support standard registration");
      console.log(`Error code: ${data.errcode || 'none'}`);
      console.log(`Error message: ${data.error || 'none'}`);
      return {
        registrationEnabled: false,
        error: data.error || "Unknown registration error"
      };
    }
  } catch (error) {
    console.error("❌ Error checking registration:", error);
    return {
      registrationEnabled: false,
      error: error.message
    };
  }
}

// Print instructions when loaded
console.log("Matrix Registration Checker loaded!");
console.log("To check a server, run: checkRegistration() or checkRegistration('https://your-server.url')"); 