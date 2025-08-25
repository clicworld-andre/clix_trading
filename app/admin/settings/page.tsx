"use client"

import { useState } from "react"
import AdminLayout from "@/components/admin/admin-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { RefreshCw, Shield, Smartphone } from "lucide-react"

export default function SettingsPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [is2FAEnabled, setIs2FAEnabled] = useState(false)
  const [showQRCode, setShowQRCode] = useState(false)
  const [verificationCode, setVerificationCode] = useState("")
  const { toast } = useToast()

  const handleEnable2FA = async () => {
    setIsLoading(true)
    try {
      // In a real app, you would call your API to enable 2FA
      await new Promise((resolve) => setTimeout(resolve, 1500))
      setShowQRCode(true)
      toast({
        title: "2FA setup initiated",
        description: "Scan the QR code with your authenticator app to complete setup.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to enable 2FA. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerify2FA = async () => {
    setIsLoading(true)
    try {
      // In a real app, you would call your API to verify the 2FA code
      if (verificationCode.length !== 6) {
        throw new Error("Please enter a valid 6-digit code")
      }

      await new Promise((resolve) => setTimeout(resolve, 1500))
      setIs2FAEnabled(true)
      setShowQRCode(false)
      setVerificationCode("")
      toast({
        title: "2FA enabled",
        description: "Two-factor authentication has been successfully enabled for your account.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to verify 2FA code. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisable2FA = async () => {
    setIsLoading(true)
    try {
      // In a real app, you would call your API to disable 2FA
      await new Promise((resolve) => setTimeout(resolve, 1500))
      setIs2FAEnabled(false)
      toast({
        title: "2FA disabled",
        description: "Two-factor authentication has been disabled for your account.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disable 2FA. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your account settings and preferences.</p>
        </div>

        <Tabs defaultValue="security">
          <TabsList className="grid w-full grid-cols-3 md:w-[400px]">
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Two-Factor Authentication (2FA)</CardTitle>
                <CardDescription>
                  Add an extra layer of security to your account by enabling two-factor authentication.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!is2FAEnabled && !showQRCode && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Shield className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Enable 2FA</p>
                        <p className="text-sm text-muted-foreground">Protect your account with an authenticator app</p>
                      </div>
                    </div>
                    <Button onClick={handleEnable2FA} disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Enable"
                      )}
                    </Button>
                  </div>
                )}

                {showQRCode && (
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <div className="bg-white p-4 rounded-lg">
                        {/* This would be a real QR code in a production app */}
                        <div className="w-48 h-48 bg-gray-200 flex items-center justify-center">
                          <Smartphone className="h-16 w-16 text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                    <p className="text-center text-sm">
                      Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="verification-code">Verification Code</Label>
                      <Input
                        id="verification-code"
                        placeholder="Enter 6-digit code"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        maxLength={6}
                      />
                    </div>
                    <Button
                      onClick={handleVerify2FA}
                      disabled={isLoading || verificationCode.length !== 6}
                      className="w-full"
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        "Verify and Enable 2FA"
                      )}
                    </Button>
                  </div>
                )}

                {is2FAEnabled && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Shield className="h-8 w-8 text-green-500" />
                        <div>
                          <p className="font-medium">2FA is enabled</p>
                          <p className="text-sm text-muted-foreground">
                            Your account is protected with two-factor authentication
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" onClick={handleDisable2FA} disabled={isLoading}>
                        {isLoading ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          "Disable"
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Password</CardTitle>
                <CardDescription>Change your password to keep your account secure.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input id="current-password" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input id="new-password" type="password" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input id="confirm-password" type="password" />
                </div>
              </CardContent>
              <CardFooter>
                <Button>Update Password</Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="appearance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Customize the appearance of the application.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="theme">Theme</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button variant="outline" className="justify-start">
                      Light
                    </Button>
                    <Button variant="outline" className="justify-start">
                      Dark
                    </Button>
                    <Button variant="outline" className="justify-start">
                      System
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Configure how you receive notifications.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="email-notifications">Email Notifications</Label>
                  <Switch id="email-notifications" />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="push-notifications">Push Notifications</Label>
                  <Switch id="push-notifications" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  )
}
