export async function checkRegistrationSupport(homeserver: string): Promise<{
  registrationEnabled: boolean;
  requiresEmail: boolean;
  requiresToken: boolean;
}> {
  try {
    const url = `${ensureProtocol(homeserver)}/_matrix/client/r0/register`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ kind: 'm.login.password' }),
    });

    const data = await response.json();
    
    // If we got an error other than M_FORBIDDEN or flows data, registration might be disabled
    if (data.errcode && data.errcode !== 'M_FORBIDDEN') {
      return {
        registrationEnabled: false,
        requiresEmail: false,
        requiresToken: false,
      };
    }

    // Registration is enabled if we get flow data or a specific error
    const registrationEnabled = !!data.flows || data.errcode === 'M_FORBIDDEN';
    
    // Check if any flow requires email verification
    const requiresEmail = data.flows?.some((flow: any) => 
      flow.stages?.includes('m.login.email.identity')
    ) || false;
    
    // Check if any flow requires registration token
    const requiresToken = data.flows?.some((flow: any) => 
      flow.stages?.includes('m.login.registration_token')
    ) || false;

    return {
      registrationEnabled,
      requiresEmail,
      requiresToken,
    };
  } catch (error) {
    console.error('Error checking registration support:', error);
    return {
      registrationEnabled: false,
      requiresEmail: false,
      requiresToken: false,
    };
  }
}

export async function registerUser(
  homeserver: string,
  username: string,
  password: string,
  displayName: string,
  email?: string
): Promise<{ success: boolean; error?: string; session?: string; }> {
  try {
    const baseUrl = ensureProtocol(homeserver);
    
    // Step 1: Start registration flow
    const registerUrl = `${baseUrl}/_matrix/client/r0/register`;
    const initialResponse = await fetch(registerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ kind: 'm.login.password' }),
    });
    
    const initialData = await initialResponse.json();
    
    if (initialData.errcode === 'M_FORBIDDEN' && initialData.flows) {
      // This is expected - we need to follow the flow
      const session = initialData.session;
      
      // Check if email verification is required
      const needsEmail = initialData.flows.some((flow: any) => 
        flow.stages?.includes('m.login.email.identity')
      );
      
      if (needsEmail && !email) {
        return {
          success: false,
          error: 'Email address is required for registration on this server'
        };
      }
      
      // If email is required, we need to handle this multi-stage flow
      if (needsEmail && email) {
        // Step 2: Add email to the user's account
        const emailUrl = `${baseUrl}/_matrix/client/r0/register/email/requestToken`;
        const emailResponse = await fetch(emailUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            client_secret: generateClientSecret(),
            email: email,
            send_attempt: 1,
            session: session
          }),
        });
        
        const emailData = await emailResponse.json();
        
        if (emailData.errcode) {
          return {
            success: false,
            error: emailData.error || 'Failed to send verification email',
            session
          };
        }
        
        // At this point, the user needs to verify their email
        return {
          success: false,
          error: 'Please check your email and click the verification link',
          session
        };
      }
      
      // For simpler registration flow (no email required)
      const registerData = {
        auth: {
          type: 'm.login.dummy',
          session: session
        },
        username,
        password,
        initial_device_display_name: 'CLIC Web App'
      };
      
      const fullRegisterResponse = await fetch(registerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registerData),
      });
      
      const registrationResult = await fullRegisterResponse.json();
      
      if (registrationResult.errcode) {
        return {
          success: false,
          error: getRegistrationErrorMessage(registrationResult.errcode)
        };
      }
      
      // If registration succeeded, set the display name
      if (registrationResult.access_token) {
        try {
          const userIdUrl = `${baseUrl}/_matrix/client/r0/profile/${encodeURIComponent(registrationResult.user_id)}/displayname`;
          await fetch(userIdUrl, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${registrationResult.access_token}`
            },
            body: JSON.stringify({ displayname: displayName }),
          });
        } catch (e) {
          console.error('Failed to set display name:', e);
          // We don't fail the registration if setting display name fails
        }
        
        return { success: true };
      }
    }
    
    // Handle direct errors from the initial registration attempt
    if (initialData.errcode) {
      return {
        success: false,
        error: getRegistrationErrorMessage(initialData.errcode)
      };
    }
    
    return { success: false, error: 'Unknown registration error' };
  } catch (error) {
    console.error('Registration error:', error);
    return {
      success: false,
      error: 'Network error during registration'
    };
  }
}

// Helper to generate a client secret for email verification
function generateClientSecret() {
  return Math.random().toString(36).substring(2, 10) + 
         Math.random().toString(36).substring(2, 10);
}

// Ensure a URL has a protocol (http/https)
function ensureProtocol(url: string): string {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
}

// Get a user-friendly error message for registration errors
function getRegistrationErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'M_USER_IN_USE':
      return 'Username is already taken';
    case 'M_INVALID_USERNAME':
      return 'Username contains invalid characters';
    case 'M_EXCLUSIVE':
      return 'Username is reserved or not allowed';
    case 'M_REGISTRATION_DISABLED':
      return 'Registration has been disabled on this server';
    case 'M_THREEPID_IN_USE':
      return 'Email address is already associated with an account';
    case 'M_WEAK_PASSWORD':
      return 'Password is too weak. Please use a stronger password';
    case 'M_THREEPID_AUTH_FAILED':
      return 'Email verification failed';
    default:
      return `Registration failed: ${errorCode}`;
  }
} 