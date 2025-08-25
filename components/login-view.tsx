"use client"

import type React from "react"
import Image from "next/image"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { initializeMatrixClient, registerUser, checkRegistrationSupport, loginWithPassword } from "@/lib/matrix-client"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, Loader2, InfoIcon } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface LoginViewProps {
  onLoginSuccess: () => void
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const { toast } = useToast()
  const [homeserver, setHomeserver] = useState("https://chat.clic2go.ug")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [verificationSent, setVerificationSent] = useState(false)
  const [activeTab, setActiveTab] = useState("login")
  const [regSupport, setRegSupport] = useState<{
    loading: boolean;
    checked: boolean;
    enabled: boolean;
    requiresEmail: boolean;
    requiresToken: boolean;
  }>({
    loading: false,
    checked: false,
    enabled: false,
    requiresEmail: false,
    requiresToken: false,
  })

  // Check registration support when homeserver changes
  useEffect(() => {
    const checkSupport = async () => {
      if (!homeserver) return
      
      setRegSupport(prev => ({ ...prev, loading: true }))
      try {
        const support = await checkRegistrationSupport(homeserver)
        setRegSupport({
          loading: false,
          checked: true,
          enabled: support.registrationEnabled,
          requiresEmail: support.requiresEmail,
          requiresToken: support.requiresToken,
        })
      } catch (error) {
        console.error("Error checking registration support:", error)
        setRegSupport({
          loading: false,
          checked: true,
          enabled: false,
          requiresEmail: false,
          requiresToken: false,
        })
      }
    }
    
    checkSupport()
  }, [homeserver])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");

    try {
      // Use our new loginWithPassword function to handle the login
      const loginResponse = await loginWithPassword(homeserver, username, password);

      // Store the login data in localStorage
      localStorage.setItem("matrix_access_token", loginResponse.access_token);
      localStorage.setItem("matrix_user_id", loginResponse.user_id);
      localStorage.setItem("matrix_home_server", homeserver);
      localStorage.setItem("matrix_device_id", loginResponse.device_id);

      toast({
        title: "Login successful",
        description: "You've been logged in to your Matrix account",
      });

      onLoginSuccess();
    } catch (error: any) {
      console.error("Login error:", error);
      
      // More user-friendly error message
      let errorMsg = "Please check your credentials and try again";
      
      if (error.errcode === "M_FORBIDDEN") {
        errorMsg = "Invalid username or password";
      } else if (error.errcode === "M_USER_DEACTIVATED") {
        errorMsg = "This account has been deactivated";
      } else if (error.errcode === "M_LIMIT_EXCEEDED") {
        const waitSeconds = Math.ceil(error.retry_after_ms / 1000);
        errorMsg = `Too many login attempts. Please wait ${waitSeconds} seconds before trying again.`;
      } else if (error.name === "ConnectionError") {
        errorMsg = "Could not connect to the server. Please check your internet connection.";
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      setErrorMessage(errorMsg);
      toast({
        title: "Login failed",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add a function to reset the form
  const resetForm = () => {
    setUsername("");
    setPassword("");
    setDisplayName("");
    setConfirmPassword("");
    setEmail("");
    setVerificationSent(false);
    setErrorMessage("");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Registration form submitted");
    setIsLoading(true);
    setErrorMessage("");

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match");
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long");
      setIsLoading(false);
      return;
    }

    // Even if the email field is hidden in the UI, we still need to validate it when required
    if (regSupport.requiresEmail && !email) {
      // Instead of showing an error, prompt for email
      setEmail("");  // Clear any partial input
      const userEmail = prompt("Please enter your email address for verification:");
      
      if (!userEmail || !userEmail.includes('@')) {
        setErrorMessage("A valid email address is required for registration");
        setIsLoading(false);
        return;
      }
      
      setEmail(userEmail);
    }

    try {
      console.log("Attempting to register with:", { 
        homeserver, 
        username, 
        displayName, 
        hasEmail: !!email,
        requiresEmail: regSupport.requiresEmail 
      });
      
      const registerResponse = await registerUser(
        homeserver,
        username,
        password,
        displayName,
        regSupport.requiresEmail ? email : undefined
      );

      console.log("Registration response:", registerResponse);

      // Check if the response indicates email verification is required
      if (typeof registerResponse === 'object' && 'requiresEmailVerification' in registerResponse) {
        setVerificationSent(true);
        setIsLoading(false);
        // We don't need the toast notification anymore as we'll show a full page message
        return;
      }

      // Check if the response indicates email is required but not provided
      if (typeof registerResponse === 'object' && 'requiresEmail' in registerResponse && registerResponse.requiresEmail) {
        setErrorMessage("This server requires email verification. Please provide an email address.");
        toast({
          title: "Email Required",
          description: "This server requires email verification. Please provide an email address.",
          variant: "destructive",
        });
        return;
      }

      if (typeof registerResponse === 'object' && 'success' in registerResponse) {
        if (registerResponse.success) {
          // Attempt to log in with newly created credentials
          try {
            const client = await initializeMatrixClient(homeserver);
            let userId = username;
      if (!userId.startsWith("@")) {
              userId = `@${userId}`;
      }
      if (!userId.includes(":")) {
              // Extract domain from homeserver URL
              let domain = "chat.clic2go.ug";
              try {
                const url = new URL(homeserver);
                domain = url.hostname;
              } catch (e) {
                // Use default domain if URL parsing fails
              }
              userId = `${userId}:${domain}`;
      }

            console.log("Logging in with new credentials:", { userId });
      const loginResponse = await client.login("m.login.password", {
        user: userId,
        password: password,
        initial_device_display_name: "PELOTON Enterprise",
            });

            localStorage.setItem("matrix_access_token", loginResponse.access_token);
            localStorage.setItem("matrix_user_id", loginResponse.user_id);
            localStorage.setItem("matrix_home_server", homeserver);
            localStorage.setItem("matrix_device_id", loginResponse.device_id);

            toast({
              title: "Registration successful",
              description: "Your account has been created and you've been logged in",
            });

            onLoginSuccess();
          } catch (error) {
            console.error("Auto-login after registration failed:", error);
            toast({
              title: "Registration successful",
              description: "Your account has been created, but automatic login failed. Please try logging in manually.",
            });
          }
        } else {
          // Use type assertion to handle potential missing error property
          const errorMsg = (registerResponse as any).error || "Registration failed";
          console.error("Registration failed:", errorMsg);
          setErrorMessage(errorMsg);
          toast({
            title: "Registration failed",
            description: errorMsg,
            variant: "destructive",
          });
        }
      } else {
        // Handle the old response format (matrix-js-sdk register response)
        if (registerResponse && typeof registerResponse === 'object' && 'access_token' in registerResponse) {
          // Type assertion to access properties safely
          const response = registerResponse as { 
            access_token: string; 
            user_id: string; 
            device_id: string;
          };
          
          localStorage.setItem("matrix_access_token", response.access_token);
          localStorage.setItem("matrix_user_id", response.user_id);
          localStorage.setItem("matrix_home_server", homeserver);
          localStorage.setItem("matrix_device_id", response.device_id);

      toast({
            title: "Registration successful",
            description: "Your account has been created and you've been logged in",
          });

          onLoginSuccess();
        } else {
          console.error("Unknown registration response format:", registerResponse);
          setErrorMessage("Unknown registration response format");
          toast({
            title: "Registration failed",
            description: "Unknown response from server",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Registration error:", error);
      const errorMessage = error instanceof Error ? error.message : "Registration failed. Please try again.";
      setErrorMessage(errorMessage);
      toast({
        title: "Registration failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Render verification sent screen if email verification was sent
  if (verificationSent) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-b from-altx-100 to-white">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-1 flex items-center justify-center">
            <div className="w-32 h-32 relative mb-4">
              <Image
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Altx-map-1-EgXAppZERXApyZu1tnjQfCNBmDDx1N.png"
                alt="ALTX Logo"
                fill
                style={{ objectFit: "contain" }}
              />
            </div>
            <h2 className="text-2xl font-bold text-altx-500">
              <span className="text-3xl">PELOTON</span>
              <span className="text-sm ml-1">enterprise</span>
            </h2>
            <CardDescription className="text-center">Matrix Chat Client</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
              <div className="mb-4 text-blue-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto">
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-800">Verification Email Sent</h3>
              <p className="mb-4 text-gray-600">
                We've sent a verification email to <span className="font-bold">{email}</span>
              </p>
            </div>

            <Button 
              onClick={() => {
                resetForm();
                setActiveTab("login");
              }} 
              className="w-full bg-altx-500 hover:bg-altx-600"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-b from-altx-100 to-white">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 flex items-center justify-center">
          <div className="w-32 h-32 relative mb-4">
            <Image
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Altx-map-1-EgXAppZERXApyZu1tnjQfCNBmDDx1N.png"
              alt="ALTX Logo"
              fill
              style={{ objectFit: "contain" }}
            />
          </div>
          <h2 className="text-2xl font-bold text-altx-500">
            <span className="text-3xl">PELOTON</span>
            <span className="text-sm ml-1">enterprise</span>
          </h2>
          <CardDescription className="text-center">Matrix Chat Client</CardDescription>
        </CardHeader>
        <CardContent>
          {errorMessage && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
                  <Label htmlFor="login-homeserver">Homeserver</Label>
              <Input
                    id="login-homeserver"
                placeholder="https://chat.clic2go.ug"
                value={homeserver}
                onChange={(e) => setHomeserver(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
                  <Label htmlFor="login-username">Username</Label>
              <Input
                    id="login-username"
                placeholder="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">Enter your username (with or without @:domain)</p>
            </div>
            <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
              <Input
                    id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full bg-altx-500 hover:bg-altx-600" disabled={isLoading}>
              {isLoading ? (
                <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Login"
              )}
            </Button>
          </form>
            </TabsContent>

            <TabsContent value="register">
              {regSupport.checked && !regSupport.enabled && (
                <div className="mb-4">
                  <div className="p-3 rounded-md mb-4 bg-yellow-100 text-yellow-800">
                    <h3 className="font-medium">
                      Self-registration is disabled on this server
                    </h3>
                    <p className="text-sm mt-1">
                      This server may not allow self-registration.
                    </p>
                  </div>
                </div>
              )}

              {regSupport.requiresToken && (
                <Alert variant="destructive">
                  <InfoIcon className="h-4 w-4" />
                  <AlertDescription>
                    This server requires an invitation token for registration, which is not currently supported in this app.
                  </AlertDescription>
                </Alert>
              )}

              {(regSupport.enabled && !regSupport.requiresToken) && (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-username">Username</Label>
                    <Input
                      id="register-username"
                      placeholder="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                    <p className="text-xs text-muted-foreground">Choose a username (without @:domain)</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-display-name">Display Name (optional)</Label>
                    <Input
                      id="register-display-name"
                      placeholder="Your Name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2" style={{ display: regSupport.requiresEmail ? 'block' : 'none' }}>
                    <Label htmlFor="register-email">
                      Email Address {regSupport.requiresEmail && <span className="text-red-500">*</span>}
                    </Label>
                    <Input
                      id="register-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email Address"
                      required={regSupport.requiresEmail}
                      className={regSupport.requiresEmail ? "border-2 border-blue-300 focus:border-blue-500" : ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <Input
                      id="register-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-confirm-password">Confirm Password</Label>
                    <Input
                      id="register-confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full bg-altx-500 hover:bg-altx-600" disabled={isLoading || regSupport.requiresToken}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Registering...
                      </>
                    ) : (
                      "Register"
                    )}
                  </Button>
                </form>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Trouble signing in?{" "}
            <a
              href="mailto:support@PELOTON.co.ug"
              className="text-altx-500 hover:underline"
            >
              Get help
            </a>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
