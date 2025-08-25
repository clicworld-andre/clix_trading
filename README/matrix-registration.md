# Matrix Registration Guide

This document explains how Matrix registration works in the CLIC chat application and how to troubleshoot common registration issues.

## Understanding Matrix Registration

Matrix servers can implement various registration flows, and not all servers allow self-registration. The most common registration flows are:

1. **Simple Registration**: Username and password only
2. **Email Verification**: Requires a valid email address that must be verified
3. **Registration Token**: Requires an invitation token (typically for private servers)
4. **reCAPTCHA**: Requires solving a CAPTCHA to prevent automated registrations
5. **Terms of Service**: Requires accepting terms of service

## Registration Support in CLIC

The CLIC chat application supports the following registration flows:

- Simple username/password registration
- Email verification flow

The application automatically detects what type of registration the server supports and will guide you through the process.

## Email Verification Process

If your Matrix server requires email verification (as chat.clic2go.ug does), the registration process works as follows:

1. Enter your username, display name, email, and password
2. Submit the registration form
3. The server sends a verification email to your address
4. You must click the verification link in the email
5. Return to the app and log in with your new credentials

### Important Notes on Email Verification

- The verification email may take a few minutes to arrive
- Check your spam/junk folder if you don't see the email
- Verification links typically expire after some time (usually 24 hours)
- Some email providers may block Matrix verification emails

## Debugging Registration Issues

If you're having trouble registering, you can use the browser console to check if your Matrix server supports registration:

1. Open the browser console (F12 or Ctrl+Shift+J)
2. Go to the "Console" tab
3. Load our debugging script by entering:
   ```javascript
   fetch('/check-registration.js').then(r => r.text()).then(t => eval(t))
   ```
4. Check your server by running:
   ```javascript
   checkRegistration('https://your-matrix-server.com')
   ```
   
The script will analyze the server's registration capabilities and provide detailed information about what registration flows are supported.

## Common Registration Error Codes

- **M_USER_IN_USE**: Username is already taken
- **M_INVALID_USERNAME**: Username contains invalid characters
- **M_EXCLUSIVE**: Username is reserved or not allowed
- **M_REGISTRATION_DISABLED**: Registration has been disabled on this server
- **M_THREEPID_IN_USE**: Email address is already associated with an account
- **M_WEAK_PASSWORD**: Password is too weak
- **M_THREEPID_AUTH_FAILED**: Email verification failed

## Server Administration

If you're a server administrator and want to enable or modify registration settings, you'll need to edit your Synapse configuration file (typically `homeserver.yaml`):

```yaml
# Enable or disable registration
enable_registration: true

# Require email verification for registration
enable_registration_without_verification: false

# Optional: Configure email settings
email:
  smtp_host: "smtp.example.com"
  smtp_port: 587
  smtp_user: "your-username"
  smtp_pass: "your-password"
  require_transport_security: true
  notif_from: "Your Matrix Server <noreply@example.com>"
```

After making changes, restart your Synapse server for them to take effect.

## Need More Help?

If you're still having trouble with registration, you can:

1. Ask your Matrix server administrator for help
2. Check the [Matrix Specification](https://matrix.org/docs/spec/client_server/latest#registration) for more details
3. Visit the Matrix community support channels on [#matrix:matrix.org](https://matrix.to/#/#matrix:matrix.org) 