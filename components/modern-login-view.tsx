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
import { AlertCircle, Loader2, InfoIcon, Eye, EyeOff, TrendingUp, Shield, Zap, Globe, CheckCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface LoginViewProps {
  onLoginSuccess: () => void
}

export default function ModernLoginView({ onLoginSuccess }: LoginViewProps) {
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
  const [showPassword, setShowPassword] = useState(false)
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
        console.error("Failed to check registration support:", error)
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
    e.preventDefault()
    if (!username || !password) {
      setErrorMessage("Please enter both username and password")
      return
    }

    setIsLoading(true)
    setErrorMessage("")

    try {
      const result = await loginWithPassword(homeserver, username, password)
      console.log("Login successful:", result)
      toast({
        title: "Login successful",
        description: "Welcome to Trade Finance Platform",
      })
      onLoginSuccess()
    } catch (error: any) {
      console.error("Login failed:", error)
      
      if (error.errcode === 'M_LIMIT_EXCEEDED') {
        const retryAfterSeconds = Math.ceil((error.retry_after_ms || 30000) / 1000)
        setErrorMessage(`Too many attempts. Please wait ${retryAfterSeconds} seconds before trying again.`)
      } else {
        setErrorMessage(error.message || "Login failed. Please check your credentials.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password || !displayName) {
      setErrorMessage("Please fill in all required fields")
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match")
      return
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long")
      return
    }

    setIsLoading(true)
    setErrorMessage("")

    try {
      const result = await registerUser(homeserver, username, password, displayName, email)
      
      if (result.awaitingEmail) {
        setVerificationSent(true)
        toast({
          title: "Email verification sent",
          description: "Please check your email and click the verification link.",
        })
      } else if (result.success) {
        toast({
          title: "Registration successful",
          description: "Welcome to Trade Finance Platform",
        })
        onLoginSuccess()
      }
    } catch (error: any) {
      console.error("Registration failed:", error)
      setErrorMessage(error.message || "Registration failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const features = [
    {
      icon: <Shield className="h-5 w-5 text-green-500" />,
      title: "Bank-Grade Security",
      description: "End-to-end encryption for all communications"
    },
    {
      icon: <TrendingUp className="h-5 w-5 text-blue-500" />,
      title: "Real-Time Trading",
      description: "Live market data and instant trade execution"
    },
    {
      icon: <Globe className="h-5 w-5 text-purple-500" />,
      title: "Global Markets",
      description: "Access to international commodity markets"
    },
    {
      icon: <Zap className="h-5 w-5 text-yellow-500" />,
      title: "Smart Contracts",
      description: "Automated trade settlement and compliance"
    }
  ]

  return (
    <div className="min-h-screen flex items-center justify-center p-4 gradient-subtle dark:gradient-subtle-dark">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        
        {/* Left Side - Branding & Features */}
        <div className="hidden lg:flex flex-col justify-center space-y-8 pr-8">
          {/* Logo & Branding */}
          <div className="space-y-6">
            <div className="flex items-center gap-6">
              <div className="flex items-center justify-center w-28 h-28 rounded-2xl bg-white shadow-glow p-3">
                <Image
                  src="/clix_token_new_01.svg"
                  alt="CLIX Logo"
                  width={88}
                  height={88}
                  className="w-22 h-22"
                  priority
                />
              </div>
              <div>
                <h1 className="text-3xl font-semibold text-gray-600 dark:text-gray-400 tracking-wide">TRADE FINANCE</h1>
                <p className="text-lg text-muted-foreground font-medium mt-1">Blockchain-Powered Platform</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">
                Welcome to the Future of Trade Finance
              </h2>
              <p className="text-muted-foreground text-lg">
                Secure, efficient, and transparent international trade through blockchain technology and smart contracts.
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <div key={index} className="p-4 rounded-xl bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm border border-white/20 dark:border-zinc-800/50">
                <div className="flex items-center gap-3 mb-2">
                  {feature.icon}
                  <h3 className="font-semibold text-sm">{feature.title}</h3>
                </div>
                <p className="text-xs text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 pt-4 border-t border-zinc-200/50 dark:border-zinc-700/50">
            <div className="text-center">
              <div className="text-2xl font-bold text-altx-500">$2.4B+</div>
              <div className="text-xs text-muted-foreground">Trade Volume</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-altx-500">50k+</div>
              <div className="text-xs text-muted-foreground">Transactions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-altx-500">99.9%</div>
              <div className="text-xs text-muted-foreground">Uptime</div>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full max-w-md mx-auto lg:mx-0">
          <Card className="card-luxury shadow-luxury">
            <CardHeader className="text-center pb-6">
              <div className="flex lg:hidden items-center justify-center gap-4 mb-4">
                <div className="flex items-center justify-center w-20 h-20 rounded-xl bg-white shadow-lg p-2">
                  <Image
                    src="/clix_token_new_01.svg"
                    alt="CLIX Logo"
                    width={64}
                    height={64}
                    className="w-16 h-16"
                    priority
                  />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-600 dark:text-gray-400 tracking-wide">TRADE FINANCE</h1>
                </div>
              </div>
              <h2 className="text-xl font-semibold">Access Your Account</h2>
              <p className="text-muted-foreground">
                Sign in to continue to your trading dashboard
              </p>
            </CardHeader>

            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login" className="font-medium">Sign In</TabsTrigger>
                  <TabsTrigger value="register" className="font-medium">Register</TabsTrigger>
                </TabsList>

                {/* Login Tab */}
                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="homeserver" className="font-medium">Server</Label>
                      <Input
                        id="homeserver"
                        type="url"
                        placeholder="https://chat.clic2go.ug"
                        value={homeserver}
                        onChange={(e) => setHomeserver(e.target.value)}
                        className="input-modern"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="username" className="font-medium">Username</Label>
                      <Input
                        id="username"
                        placeholder="Enter your username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="input-modern"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="password" className="font-medium">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="input-modern pr-10"
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    {errorMessage && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{errorMessage}</AlertDescription>
                      </Alert>
                    )}

                    <Button type="submit" className="w-full btn-primary" disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Signing In...
                        </>
                      ) : (
                        "Sign In"
                      )}
                    </Button>
                  </form>
                </TabsContent>

                {/* Register Tab */}
                <TabsContent value="register">
                  {!regSupport.checked ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : !regSupport.enabled ? (
                    <Alert>
                      <InfoIcon className="h-4 w-4" />
                      <AlertTitle>Registration Not Available</AlertTitle>
                      <AlertDescription>
                        This server does not support self-registration. Please contact your administrator.
                      </AlertDescription>
                    </Alert>
                  ) : verificationSent ? (
                    <div className="text-center space-y-4">
                      <div className="flex items-center justify-center w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/20">
                        <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-semibold">Check Your Email</h3>
                        <p className="text-muted-foreground text-sm">
                          We've sent a verification link to {email}. Click the link to complete your registration.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleRegister} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="reg-username" className="font-medium">Username</Label>
                        <Input
                          id="reg-username"
                          placeholder="Choose a username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="input-modern"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="display-name" className="font-medium">Display Name</Label>
                        <Input
                          id="display-name"
                          placeholder="Your display name"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="input-modern"
                          required
                        />
                      </div>

                      {regSupport.requiresEmail && (
                        <div className="space-y-2">
                          <Label htmlFor="email" className="font-medium">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="your@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="input-modern"
                            required
                          />
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        <Label htmlFor="reg-password" className="font-medium">Password</Label>
                        <div className="relative">
                          <Input
                            id="reg-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Create a strong password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="input-modern pr-10"
                            required
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password" className="font-medium">Confirm Password</Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          placeholder="Confirm your password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="input-modern"
                          required
                        />
                      </div>

                      {errorMessage && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{errorMessage}</AlertDescription>
                        </Alert>
                      )}

                      <Button type="submit" className="w-full btn-primary" disabled={isLoading}>
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating Account...
                          </>
                        ) : (
                          "Create Account"
                        )}
                      </Button>
                    </form>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>

            <CardFooter className="text-center">
              <p className="text-xs text-muted-foreground">
                By signing in, you agree to our Terms of Service and Privacy Policy
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}