"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useMatrixClient } from "@/lib/matrix-context"
import { RefreshCw, UserPlus, Shield } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"

interface SettingsDialogProps {
  isOpen: boolean
  onClose: () => void
}

export default function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const [newUsername, setNewUsername] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [newDisplayName, setNewDisplayName] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [isAdmin, setIsAdmin] = useState(false)
  const [isCreatingAccount, setIsCreatingAccount] = useState(false)
  const [registrationToken, setRegistrationToken] = useState("")
  const [homeServer, setHomeServer] = useState("")
  const { toast } = useToast()
  const { client } = useMatrixClient()

  // Get the homeserver URL when the component mounts
  useEffect(() => {
    if (client) {
      const homeServerUrl = (client as any).getHomeserverUrl()
      setHomeServer(homeServerUrl)
    } else {
      // Fallback to localStorage if client is not available
      const storedHomeServer = localStorage.getItem("matrix_home_server")
      if (storedHomeServer) {
        setHomeServer(storedHomeServer)
      }
    }
  }, [client])

  const handleCreateAccount = async () => {
    if (!newUsername || !newPassword) {
      toast({
        title: "Missing information",
        description: "Username and password are required",
        variant: "destructive",
      })
      return
    }

    setIsCreatingAccount(true)

    try {
      // Format the username correctly
      let formattedUsername = newUsername
      if (!formattedUsername.startsWith("@")) {
        formattedUsername = `@${formattedUsername}`
      }

      // Add domain if not present
      if (!formattedUsername.includes(":")) {
        let domain = "matrix.org" // Default fallback

        try {
          domain = new URL(homeServer).hostname
        } catch (error) {
          console.error("Error parsing homeserver URL:", error)
        }

        formattedUsername = `${formattedUsername}:${domain}`
      }

      // Get the access token of the current user (must be admin)
      const accessToken = localStorage.getItem("matrix_access_token")

      if (!accessToken) {
        throw new Error("You must be logged in to create accounts")
      }

      // Call the Matrix Admin API to create a new user
      // Note: This requires admin privileges on the homeserver
      const response = await fetch(`${homeServer}/_synapse/admin/v2/users/${encodeURIComponent(formattedUsername)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          password: newPassword,
          displayname: newDisplayName || undefined,
          threepids: newEmail ? [{ medium: "email", address: newEmail }] : [],
          admin: isAdmin,
          deactivated: false,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to create account: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      // Generate a registration token for the new user
      const tokenResponse = await fetch(`${homeServer}/_synapse/admin/v1/registration_tokens/new`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          uses_allowed: 1,
          expiry_time: Math.floor(Date.now() / 1000) + 86400, // 24 hours from now
        }),
      })

      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json()
        setRegistrationToken(tokenData.token)
      }

      toast({
        title: "Account created",
        description: `Account for ${formattedUsername} has been created successfully`,
      })

      // Reset form
      setNewUsername("")
      setNewPassword("")
      setNewDisplayName("")
      setNewEmail("")
      setIsAdmin(false)
    } catch (error) {
      console.error("Error creating account:", error)
      toast({
        title: "Failed to create account",
        description:
          error instanceof Error
            ? error.message
            : "You may not have admin privileges or the username may already be taken",
        variant: "destructive",
      })
    } finally {
      setIsCreatingAccount(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>PELOTON Enterprise Settings</DialogTitle>
          <DialogDescription>Configure your chat application settings</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="account-creation">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="account-creation">Account Creation</TabsTrigger>
            <TabsTrigger value="general">General</TabsTrigger>
          </TabsList>

          <TabsContent value="account-creation" className="space-y-4 py-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4 text-altx-brown" />
                <p className="text-sm font-medium">Admin Privileges Required</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Creating accounts for others requires admin privileges on the Matrix homeserver.
              </p>
            </div>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="new-username">Username</Label>
                <Input
                  id="new-username"
                  placeholder="newuser"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="new-password">Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="new-display-name">Display Name (Optional)</Label>
                <Input
                  id="new-display-name"
                  placeholder="John Doe"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="new-email">Email (Optional)</Label>
                <Input
                  id="new-email"
                  type="email"
                  placeholder="user@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox id="is-admin" checked={isAdmin} onCheckedChange={(checked) => setIsAdmin(checked === true)} />
                <Label
                  htmlFor="is-admin"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Make this user an admin
                </Label>
              </div>
            </div>

            {registrationToken && (
              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm font-medium mb-1">Registration Token:</p>
                <p className="text-xs break-all font-mono bg-background p-2 rounded">{registrationToken}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Share this token with the user. They will need it to complete their registration.
                </p>
              </div>
            )}

            <Button
              onClick={handleCreateAccount}
              disabled={isCreatingAccount || !newUsername || !newPassword}
              className="w-full bg-altx-500 hover:bg-altx-600"
            >
              {isCreatingAccount ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create Account
                </>
              )}
            </Button>
          </TabsContent>

          <TabsContent value="general" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Theme</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="justify-start">
                  Light
                </Button>
                <Button variant="outline" className="justify-start">
                  Dark
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notifications</Label>
              <div className="flex items-center space-x-2">
                <Checkbox id="notifications" />
                <Label htmlFor="notifications">Enable notifications</Label>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
