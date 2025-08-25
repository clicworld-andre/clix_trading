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
import { useToast } from "@/hooks/use-toast"
import { RefreshCw, Lock } from "lucide-react"
import { postUnauthenticated } from "@/lib/service"

interface WalletConnectionDialogProps {
  isOpen: boolean
  onClose: () => void
  onConnect: (username: string, pin: string) => void
  matrixUserId: string
}

export default function WalletConnectionDialog({
  isOpen,
  onClose,
  onConnect,
  matrixUserId,
}: WalletConnectionDialogProps) {
  const [username, setUsername] = useState("")
  const [pin, setPin] = useState("")
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  
  // Clear PIN field when dialog opens
  useEffect(() => {
    if (isOpen) {
      // Clear all fields when dialog opens
      setUsername("")
      setPin("") // Clear PIN when the dialog opens
      setError(null) // Also clear any error messages
      setIsConnecting(false) // Reset connecting state
      
      // Force clear the input fields after a short delay to override browser autocomplete
      setTimeout(() => {
        const pinInput = document.getElementById('pin') as HTMLInputElement
        const usernameInput = document.getElementById('username') as HTMLInputElement
        if (pinInput) {
          pinInput.value = ''
          pinInput.setAttribute('value', '')
        }
        if (usernameInput) {
          usernameInput.value = ''
          usernameInput.setAttribute('value', '')
        }
      }, 100)
    }
  }, [isOpen])

  // Update handleConnect to show error messages from API
  const handleConnect = async () => {
    if (!username.trim()) {
      toast({
        title: "Username required",
        description: "Please enter your Clix username",
        variant: "destructive",
      })
      return
    }

    if (!pin.trim()) {
      toast({
        title: "PIN required",
        description: "Please enter your PIN",
        variant: "destructive",
      })
      return
    }
    setIsConnecting(true)
    setError(null)

    try {
      // Get the matrix username without the @ and domain part
      // Make sure to properly clean the Matrix ID - remove all special characters
      const cleanMatrixId = matrixUserId
        .replace(/^@/, "") // Remove leading @
        .split(":")[0] // Remove domain part
        .replace(/[^a-zA-Z0-9_]/g, "") // Remove any special characters

      console.log("Linking OTC account with:", {
        user_id: username,
        otc_user_id: cleanMatrixId,
        // Don't log the actual PIN
      })

      // Link the OTC account using unauthenticated service call (no JWT required for initial connection)
      const data = await postUnauthenticated('linkOtc', {
        user_id: username,
        otc_user_id: cleanMatrixId,
        password: pin,
      }) as any

      if (data.status === 200) {
        // Store JWT token if provided by the API
        if (data.jwt) {
          localStorage.setItem(`jwt_${cleanMatrixId}`, data.jwt)
          localStorage.setItem('jwt', data.jwt)
        }

        // Save to localStorage for future use
        localStorage.setItem(`otc_chat_${cleanMatrixId}`, username)
        
        toast({
          title: "Wallet connected",
          description: data.message || "Your Clix wallet has been successfully connected",
        })

        // Call the onConnect callback with the username and PIN
        onConnect(username, pin)

        // Close the dialog
        onClose()
      } else {
        // Show error message from API response
        setError(data.message || `Failed to link wallet: Status ${data.status}`)
        toast({
          title: "Connection failed",
          description: data.message || `Error: ${data.status}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error connecting wallet:", error)
      setError(error instanceof Error ? error.message : "Failed to connect to your Clix wallet")
      toast({
        title: "Connection failed",
        description: error instanceof Error ? error.message : "Failed to connect to your Clix wallet",
        variant: "destructive",
      })
    } finally {
      setIsConnecting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Clix Wallet</DialogTitle>
          <DialogDescription>Enter your Clix wallet credentials to connect your account</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              placeholder="Enter your Clix username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="off"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="pin">PIN</Label>
            <Input
              id="pin"
              name="pin"
              type="password"
              placeholder="Enter your PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              autoComplete="new-password"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              data-form-type="other"
            />
            <p className="text-xs text-muted-foreground">Your PIN is used to secure your wallet access</p>
          </div>

          {error && <div className="text-sm text-red-500 mt-2">{error}</div>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isConnecting}>
            Cancel
          </Button>
          <Button 
            onClick={handleConnect} 
            disabled={isConnecting} 
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isConnecting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 mr-2" />
                Connect Wallet
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
