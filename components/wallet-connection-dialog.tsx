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
import { RefreshCw, Lock, QrCode, User } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const [qrCodePollingId, setQrCodePollingId] = useState<string | null>(null)
  const [isPolling, setIsPolling] = useState(false)
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

  

  

  const generateQrCode = async () => {
    try {
      // Get the matrix username without the @ and domain part
      const cleanMatrixId = matrixUserId
        .replace(/^@/, "") // Remove leading @
        .split(":")[0] // Remove domain part
        .replace(/[^a-zA-Z0-9_]/g, "") // Remove any special characters

      // Generate a unique session ID for QR code
      const sessionId = `qr_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`

      // In a real implementation, you would call an API to generate a QR code
      // For now, we'll create a mock QR code URL
      setQrCodeUrl(`https://api.clicworld.app/qr/connect?session=${sessionId}&user=${cleanMatrixId}`)
      setQrCodePollingId(sessionId)

      // Start polling for QR code scan
      startPolling(sessionId, cleanMatrixId)
    } catch (error) {
      console.error("Error generating QR code:", error)
      toast({
        title: "QR Code Generation Failed",
        description: "Could not generate QR code for wallet connection",
        variant: "destructive",
      })
    }
  }

  const startPolling = (sessionId: string, matrixUserId: string) => {
    setIsPolling(true)

    // In a real implementation, you would poll an API endpoint to check if the QR code has been scanned
    // For demonstration purposes, we'll simulate a successful scan after 10 seconds
    const pollingInterval = setInterval(() => {
      // Simulate checking if QR code has been scanned
      console.log("Polling for QR code scan...", sessionId)

      // For demo purposes, we'll simulate a successful scan after 10 seconds
      setTimeout(() => {
        if (Math.random() > 0.7) {
          // 30% chance of success on each poll
          clearInterval(pollingInterval)
          setIsPolling(false)

          // Simulate a successful connection
          const mockUsername = "demo_user_" + Math.floor(Math.random() * 1000)
          toast({
            title: "Wallet Connected via QR Code",
            description: `Successfully connected wallet for user ${mockUsername}`,
          })

          onConnect(mockUsername, "1234") // In a real implementation, the PIN would be handled securely
        }
      }, 10000)
    }, 3000)

    // Store the interval ID for cleanup
    setQrCodePollingId(sessionId)
  }

 

  // Update handleConnect to show error messages from API
  const handleConnect = async () => {
    if (!username.trim()) {
      toast({
        title: "Username required",
        description: "Please enter your PELOTON Plus username",
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

      // Handle wallet format - if username doesn't contain :, add :100 for default wallet
      const walletUsername = username.includes(':') ? username : `${username}:100`
      
      console.log("🔗 WalletConnectionDialog: Linking OTC account with:", {
        user_id: walletUsername,
        original_input: username,
        otc_user_id: cleanMatrixId,
        matrix_user_id: matrixUserId,
        clean_matrix_id: cleanMatrixId
        // Don't log the actual PIN
      })

      // Link the OTC account using unauthenticated service call (no JWT token needed)
      console.log("🔑 WalletConnectionDialog: Using unauthenticated API call for wallet connection")
      
      // Use unauthenticated service call for initial wallet connection
      const data = await postUnauthenticated('linkOtc', {
        user_id: walletUsername,
        otc_user_id: cleanMatrixId,
        password: pin,
      }) as any
      
      console.log("🔗 WalletConnectionDialog: Response data:", data)

      if (data.status === 200 || (data.message && data.message.includes("already linked"))) {
        // Show specific message for already linked accounts
        if (data.message && data.message.toLowerCase().includes("already linked")) {
          toast({
            title: "Account Already Linked",
            description: data.message,
          })
        } else {
          toast({
            title: "Wallet connected",
            description: data.message || "Your PELOTON Plus wallet has been successfully connected",
          })
        }
        
        // Store JWT token if provided by the API
        if (data.jwt) {
          localStorage.setItem(`jwt_${cleanMatrixId}`, data.jwt)
          localStorage.setItem('jwt', data.jwt)
        }

        // Save basic connection info for immediate use (use the full wallet format)
        localStorage.setItem(`otc_chat_${cleanMatrixId}`, walletUsername)
        
        // Store full wallet data for useWallet hook compatibility
        const connectionData = {
          user_id: walletUsername,
          otc_user_id: cleanMatrixId,
          public_key: data.public_key || '',
          wallet_username: walletUsername
        }
        localStorage.setItem(`wallet_data_${cleanMatrixId}`, JSON.stringify(connectionData))
        
        // Trigger wallet-connected event for all components to sync
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("wallet-connected", { 
            detail: { username, connectionData } 
          }))
        }

        // Call the onConnect callback with the full wallet username and PIN
        onConnect(walletUsername, pin)

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
      setError(error instanceof Error ? error.message : "Failed to connect to your PELOTON Plus wallet")
      toast({
        title: "Connection failed",
        description: error instanceof Error ? error.message : "Failed to connect to your PELOTON Plus wallet",
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
          <DialogTitle>Connect Wallet</DialogTitle>
          <DialogDescription>Connect your PELOTON Plus wallet to access your account</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">
              <User className="h-4 w-4 mr-2" />
              Manual Entry
            </TabsTrigger>
            <TabsTrigger value="qrcode">
              <QrCode className="h-4 w-4 mr-2" />
              Scan QR
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4 py-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="Enter your PELOTON Plus username"
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

            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
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
          </TabsContent>

          <TabsContent value="qrcode" className="space-y-4 py-4">
            <div className="flex flex-col items-center justify-center">
              {qrCodeUrl ? (
                <>
                  <div className="border-2 border-muted p-2 rounded-md mb-4">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeUrl)}`}
                      alt="Scan this QR code with your PELOTON Plus mobile app"
                      width={200}
                      height={200}
                    />
                  </div>
                  <p className="text-sm text-center mb-4">
                    Scan this QR code with your PELOTON Plus mobile app to connect your wallet
                  </p>
                  {isPolling && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                      Waiting for scan...
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mb-4" />
                  <p>Generating QR code...</p>
                </div>
              )}
            </div>

            <Button onClick={generateQrCode} variant="outline" className="w-full" disabled={isPolling}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh QR Code
            </Button>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
