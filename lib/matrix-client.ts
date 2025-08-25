// Update the matrix-client.ts file to avoid matrix-events-sdk dependency issues

// Use dynamic imports for matrix-js-sdk to avoid SSR issues
let matrixSdk: any = null;
let createClient: any = null;

// Initialize matrix-js-sdk dynamically
async function getMatrixSdk() {
  if (!matrixSdk) {
    try {
      // Dynamic import to prevent SSR issues
      matrixSdk = await import('matrix-js-sdk');
      createClient = matrixSdk.createClient;
      return { matrixSdk, createClient };
    } catch (error) {
      console.error("Failed to import matrix-js-sdk:", error);
      throw new Error("Failed to load Matrix SDK");
    }
  }
  return { matrixSdk, createClient };
}

// Helper function to ensure proper Matrix ID format
function ensureValidMatrixId(userId: string, homeserver: string): string {
  // If userId already starts with @, use it as is
  if (userId.startsWith('@')) {
    // If it has a domain, use it as is, otherwise append the homeserver domain
    return userId.includes(':') ? userId : `${userId}:${homeserver.replace(/^https?:\/\//, '')}`
  }
  // Add @ prefix and domain
  return `@${userId}:${homeserver.replace(/^https?:\/\//, '')}`
}

// Import Olm conditionally to avoid Node.js module errors in the browser
let Olm: any = null;
let olmInitialized = false;
let olmInitializationPromise: Promise<void> | null = null;

async function initializeOlm() {
  if (olmInitialized) return;
  
  if (!olmInitializationPromise) {
    olmInitializationPromise = new Promise<void>(async (resolve, reject) => {
      try {
        // Check if we're in a browser environment
        if (typeof window !== 'undefined') {
          try {
            // Dynamic import to prevent webpack from trying to bundle it at build time
            const olmModule = await import('@matrix-org/olm');
            Olm = olmModule.default || olmModule;
            // Pass a locateFile callback so the Olm runtime knows where to load the wasm asset
            await Olm.init({
              locateFile: (file: string): string => {
                // In the browser we serve the wasm asset from the public root
                if (typeof window !== 'undefined') {
                  return `/olm.wasm`;
                }
                // Fallback – let Olm figure it out in Node.js / SSR environments
                return file;
              },
            });
            olmInitialized = true;
            resolve();
          } catch (error) {
            console.warn("Failed to initialize Olm encryption:", error);
            // Continue without encryption capabilities
            resolve();
          }
        } else {
          // We're in a Node.js environment, where the standard import should work
          try {
            const olmModule = await import('@matrix-org/olm');
            Olm = olmModule.default || olmModule;
            // In a Node.js environment the default resolution works fine
            await Olm.init();
            olmInitialized = true;
            resolve();
          } catch (error) {
            console.warn("Failed to initialize Olm encryption in Node.js:", error);
            resolve();
          }
        }
      } catch (error) {
        console.error("Error during Olm initialization:", error);
        reject(error);
      }
    });
  }
  
  return olmInitializationPromise;
}

export async function initializeMatrixClient(
  homeserver: string,
  credentials?: { accessToken: string; userId: string; deviceId?: string },
) {
  // Get the matrix-js-sdk dynamically
  const { createClient } = await getMatrixSdk();
  
  // Ensure homeserver has a valid URL format
  if (!homeserver.startsWith("http://") && !homeserver.startsWith("https://")) {
    homeserver = `https://${homeserver}`
  }

  // Create client config with VoIP enabled but auto-rejection disabled
  const clientConfig: {
    baseUrl: string;
    accessToken?: string;
    userId?: string;
    deviceId?: string;
    // Allow VoIP but prevent auto-rejections
    supportsCallTransfer?: boolean;
    useE2eForGroupCall?: boolean;
    fallbackICEServerAllowed?: boolean;
    disableCallHandling?: boolean;
    // Disable crypto entirely to prevent room_keys API calls
    cryptoEnabled?: boolean;
    storeName?: string;
  } = {
    baseUrl: homeserver,
    // Enable VoIP but with limited features to prevent auto-rejections
    supportsCallTransfer: false,
    useE2eForGroupCall: false,
    fallbackICEServerAllowed: true,
    disableCallHandling: false, // Enable call handling but we'll override rejection
    // Explicitly disable encryption to prevent room_keys API calls
    cryptoEnabled: false,
    storeName: undefined, // Disable IndexedDB storage for crypto
  }

  // Add credentials if provided
  if (credentials) {
    clientConfig.accessToken = credentials.accessToken
    // Ensure userId is properly formatted
    clientConfig.userId = ensureValidMatrixId(credentials.userId, homeserver)
    
    // Add device ID if provided, or get from localStorage
    if (credentials.deviceId) {
      clientConfig.deviceId = credentials.deviceId
    } else if (typeof window !== 'undefined') {
      const storedDeviceId = localStorage.getItem('matrix_device_id')
      if (storedDeviceId) {
        clientConfig.deviceId = storedDeviceId
      }
    }
    
    // Store the properly formatted user ID and device ID
    if (typeof window !== 'undefined') {
      localStorage.setItem('matrix_user_id', clientConfig.userId)
      if (clientConfig.deviceId) {
        localStorage.setItem('matrix_device_id', clientConfig.deviceId)
      }
    }
  }

  // Log the final client configuration
  console.log('Creating Matrix client with config:', {
    baseUrl: clientConfig.baseUrl,
    hasAccessToken: !!clientConfig.accessToken,
    userId: clientConfig.userId,
    deviceId: clientConfig.deviceId
  })

  // Create the Matrix client instance
  const client = createClient(clientConfig)

  // Enable Matrix SDK VoIP handling but prevent auto-rejections only
  try {
    // Keep VoIP enabled but override rejection behavior
    if (client.on) {
      // Enable VoIP capabilities
      ;(client as any).supportsVoip = true
      ;(client as any).canSupportVoip = true
      ;(client as any).isVoipSupported = true
      
      // Override only the rejection behavior to prevent auto-rejection
      const originalSendEvent = client.sendEvent.bind(client)
      client.sendEvent = function(roomId: string, eventType: string, content: any, ...args: any[]) {
        // REMOVED: Don't block m.call.reject events - they're legitimate Matrix protocol events
        // Element and other clients need these events for proper call state management
        
        // Log all call events for debugging but don't block them
        if (eventType.startsWith('m.call.')) {
          console.log(`Matrix client: Sending ${eventType} event:`, content)
        }
        return originalSendEvent(roomId, eventType, content, ...args)
      }
      
      // Keep call event handlers enabled but log their activity
      console.log('Matrix client: VoIP enabled with auto-rejection prevention')
    }
  } catch (error) {
    console.warn('Could not configure VoIP handling:', error)
  }

  // Disable encryption initialization entirely to prevent room_keys API calls
  // This avoids 404 errors on Matrix servers that don't support encryption
  console.log("Matrix encryption is disabled to prevent room_keys API calls")
  // We don't initialize Olm or crypto at all

  return client
}

// Add user registration function
export async function registerUser(
  homeserver: string,
  username: string,
  password: string,
  displayName: string = "", // Make displayName default to empty string
  email?: string // Add optional email parameter
) {
  // Get the matrix-js-sdk dynamically
  const { createClient } = await getMatrixSdk();
  
  // Ensure homeserver has a valid URL format
  let baseUrl = homeserver;
  if (!homeserver.startsWith("http://") && !homeserver.startsWith("https://")) {
    baseUrl = `https://${homeserver}`;
  }

  // Create a client for registration
  const client = createClient({ baseUrl });

  // Format username correctly
  const userId = ensureValidMatrixId(username, baseUrl);

  try {
    // Check if username is available
    // Note: Some servers may not support this endpoint
    try {
      const available = await client.isUsernameAvailable(userId.substring(1).split(':')[0]);
      if (!available) {
        throw new Error("Username is already taken. Please choose another one.");
      }
    } catch (availabilityError) {
      // If the server doesn't support the availability check, we'll try registration anyway
      console.warn("Could not check username availability:", availabilityError);
    }

    // For servers that require email verification, we need a different flow
    if (email) {
      try {
        console.log("Attempting registration with email verification:", { userId, hasEmail: !!email });
        
        // Start registration flow to get the session ID
        const initialResponse = await fetch(`${baseUrl}/_matrix/client/r0/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind: 'm.login.password' }),
        });
        
        const initialData = await initialResponse.json();
        console.log("Initial registration response:", initialData);
        
        if (initialData.errcode === 'M_FORBIDDEN' && initialData.flows) {
          const needsEmail = initialData.flows.some((flow: any) => 
            flow.stages?.includes('m.login.email.identity')
          );
          
          if (needsEmail) {
            // We need to send an email verification
            const sessionId = initialData.session;
            
            // Generate a random client_secret
            const clientSecret = Math.random().toString(36).substring(2, 10) + 
                                Math.random().toString(36).substring(2, 10);
            
            // Request email verification
            const emailResponse = await fetch(`${baseUrl}/_matrix/client/r0/register/email/requestToken`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                client_secret: clientSecret,
                email: email,
                send_attempt: 1,
                next_link: null // Optional callback URL
              }),
            });
            
            const emailData = await emailResponse.json();
            console.log("Email verification response:", emailData);
            
            if (emailData.sid) {
              return {
                success: false,
                awaitingEmail: true,
                sessionId,
                clientSecret,
                sid: emailData.sid
              };
            }
          }
        }
      } catch (error) {
        console.error("Error during email verification flow:", error);
        throw error;
      }
    }

    // Proceed with standard registration
    const registerResponse = await fetch(`${baseUrl}/_matrix/client/r0/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: userId.substring(1).split(':')[0],
        password,
        auth: { type: 'm.login.dummy' },
        inhibit_login: false,
      }),
    });

    const registerData = await registerResponse.json();

    if (registerData.access_token) {
      // Registration successful
      return {
        success: true,
        userId: registerData.user_id,
        accessToken: registerData.access_token,
        deviceId: registerData.device_id,
      };
    } else {
      throw new Error(registerData.error || 'Registration failed');
    }
  } catch (error) {
    console.error("Registration error:", error);
    throw error;
  }
}

/**
 * Check if a Matrix homeserver supports self-registration
 * @param homeserver The URL of the Matrix homeserver
 * @returns Object with registration info including whether it's enabled
 */
export async function checkRegistrationSupport(homeserver: string): Promise<{
  registrationEnabled: boolean;
  requiresEmail: boolean;
  requiresToken: boolean;
  error?: string;
}> {
  // Skip checks during server-side rendering
  if (typeof window === 'undefined') {
    // Return default values for SSR
    console.log("Skipping registration check during SSR");
    return {
      registrationEnabled: true,
      requiresEmail: false,
      requiresToken: false,
    };
  }
  
  // Ensure homeserver has a valid URL format
  let baseUrl = homeserver;
  if (!homeserver.startsWith("http://") && !homeserver.startsWith("https://")) {
    baseUrl = `https://${homeserver}`;
  }

  try {
    // Get registration capabilities
    const registerUrl = `${baseUrl}/_matrix/client/r0/register`;
    const response = await fetch(registerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // Empty request to get flow information
      })
    });

    const data = await response.json();

    // If the server doesn't return 401 with flows, registration is likely disabled
    if (response.status !== 401 || !data.flows) {
      console.error("Unexpected registration response:", data);
      return {
        registrationEnabled: false,
        requiresEmail: false,
        requiresToken: false,
        error: data.error || "Registration appears to be disabled"
      };
    }

    // Check if there's a simple registration flow (m.login.dummy)
    const hasDummyFlow = data.flows.some((flow: any) => 
      flow.stages && flow.stages.length === 1 && flow.stages[0] === 'm.login.dummy'
    );

    // Check if email verification is required
    const requiresEmail = data.flows.some((flow: any) => 
      flow.stages && flow.stages.includes('m.login.email.identity')
    );

    // Check if registration token is required
    const requiresToken = data.flows.some((flow: any) => 
      flow.stages && flow.stages.includes('m.login.registration_token')
    );

    return {
      registrationEnabled: true,
      requiresEmail,
      requiresToken,
    };
  } catch (error) {
    console.error("Error checking registration support:", error);
    return {
      registrationEnabled: false,
      requiresEmail: false,
      requiresToken: false,
      error: error instanceof Error ? error.message : "Network error checking registration"
    };
  }
}

/**
 * Complete registration after email verification
 * This function should be called after the user has verified their email
 * @param homeserver The Matrix homeserver URL
 * @param username The username to register
 * @param password The password to use
 * @param sessionId The session ID from the initial registration attempt
 * @param auth The authentication data including the verification data
 */
export async function completeRegistration(
  homeserver: string,
  username: string,
  password: string,
  sessionId: string,
  auth: any
) {
  // Get the matrix-js-sdk dynamically
  const { createClient } = await getMatrixSdk();
  
  // Ensure homeserver has a valid URL format
  let baseUrl = homeserver;
  if (!homeserver.startsWith("http://") && !homeserver.startsWith("https://")) {
    baseUrl = `https://${homeserver}`;
  }

  try {
    // Create a client for registration
    const client = createClient({ baseUrl });
    
    // Format username correctly if needed
    let userId = username;
    if (userId.startsWith("@")) {
      userId = userId.substring(1);
    }
    
    // Extract domain part if present in username
    if (userId.includes(":")) {
      userId = userId.split(":")[0];
    }
    
    // Complete the registration with the session ID and auth data
    const registerResponse = await client.register(
      userId,
      password,
      sessionId,
      auth,
      {
        initial_device_display_name: "PELOTON Enterprise",
      } as any
    );
    
    return registerResponse;
  } catch (error) {
    console.error("Error completing registration:", error);
    throw error;
  }
}

/**
 * Login to a Matrix account
 * @param homeserver The Matrix homeserver URL
 * @param username The username (with or without @ or domain)
 * @param password The password
 * @returns The login response with access token
 */
export async function loginWithPassword(
  homeserver: string,
  username: string,
  password: string
) {
  // Ensure homeserver has a valid URL format
  if (!homeserver.startsWith("http://") && !homeserver.startsWith("https://")) {
    homeserver = `https://${homeserver}`;
  }

  // Format username correctly - remove @ if present and get localpart
  let localpart = username;
  if (localpart.startsWith("@")) {
    localpart = localpart.substring(1);
  }
  if (localpart.includes(":")) {
    localpart = localpart.split(":")[0];
  }

  try {
    console.log("Attempting login with:", { homeserver, localpart });
    
    // Check if this is an admin login attempt
    if (username.includes('@gmail.com') || username.includes('@admin')) {
      // Use the admin login endpoint
      const response = await fetch(`${homeserver}/api/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username,
          password: password
        })
      });

      const data = await response.json();
      console.log("Admin login response:", { status: response.status, data });

      if (!response.ok) {
        throw new Error(data.error || 'Admin login failed');
      }

      // Store admin credentials
      localStorage.setItem('admin_access_token', data.jwt);
      localStorage.setItem('admin_user_id', data.user_id.toString());
      localStorage.setItem('admin_username', data.username);
      localStorage.setItem('admin_role', data.role);
      localStorage.setItem('admin_fullname', data.fullname);
      localStorage.setItem('admin_email', data.email);

      return data;
    }

    // Regular Matrix login
    const response = await fetch(`${homeserver}/_matrix/client/r0/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'm.login.password',
        identifier: {
          type: 'm.id.user',
          user: localpart
        },
        password: password
      })
    });

    const data = await response.json();
    console.log("Matrix login response:", { status: response.status, data });

    if (!response.ok) {
      if (data.errcode === 'M_LIMIT_EXCEEDED') {
        throw {
          errcode: 'M_LIMIT_EXCEEDED',
          error: 'Too many login attempts',
          retry_after_ms: data.retry_after_ms
        };
      }
      throw new Error(data.error || 'Login failed');
    }

    // Store Matrix credentials
    localStorage.setItem('matrix_access_token', data.access_token);
    localStorage.setItem('matrix_user_id', data.user_id);
    localStorage.setItem('matrix_device_id', data.device_id);
    localStorage.setItem('matrix_home_server', homeserver);

    // Initialize the client with device_id for calls support
    const client = await initializeMatrixClient(homeserver, {
      accessToken: data.access_token,
      userId: data.user_id,
      deviceId: data.device_id
    });

    // Start the client without waiting for encryption
    client.startClient({ lazyLoadMembers: true });

    return data;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
}
