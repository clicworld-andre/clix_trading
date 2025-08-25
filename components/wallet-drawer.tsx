"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import WalletPanel from "@/components/account-panel"
import TradePanel from "@/components/trade-panel"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useWallet } from "@/hooks/use-wallet"
import WalletConnectionDialog from "@/components/wallet-connection-dialog"
import { useMatrixClient } from "@/lib/matrix-context"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Wallet } from "lucide-react"

export function WalletDrawer() {
  const [isOpen, setIsOpen] = useState(false)
  const [roomId, setRoomId] = useState<string | undefined>(undefined)
  const [isConnectionDialogOpen, setIsConnectionDialogOpen] = useState(false)
  const { isConnected, isLoading, connect, checkConnection, connectedUsername } = useWallet()
  const { client } = useMatrixClient()

  // Check connection status when drawer opens
  useEffect(() => {
    if (isOpen) {
      checkConnection()
    }
  }, [isOpen, checkConnection])

  useEffect(() => {
    const open = (e: Event) => {
      // CustomEvent may carry roomId
      const custom = e as CustomEvent<{ roomId?: string }>
      setRoomId(custom.detail?.roomId)
      setIsOpen(true)
      
      // If not connected and not loading, show connection dialog
      if (!isConnected && !isLoading) {
        setIsConnectionDialogOpen(true)
      }
    }

    const close = () => setIsOpen(false)

    window.addEventListener("open-wallet-drawer", open as EventListener)
    window.addEventListener("close-wallet-drawer", close)

    return () => {
      window.removeEventListener("open-wallet-drawer", open as EventListener)
      window.removeEventListener("close-wallet-drawer", close)
    }
  }, [isConnected, isLoading])

  // Close connection dialog when connected
  useEffect(() => {
    if (isConnected) {
      setIsConnectionDialogOpen(false)
    }
  }, [isConnected])

  // Listen for logout events
  useEffect(() => {
    const handleLogout = () => {
      setIsOpen(false)
    }

    // Listen for storage changes to detect logout
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'matrix_access_token' && !e.newValue) {
        handleLogout()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-4 right-4 h-16 w-16 rounded-full shadow-lg"
        >
          <Wallet className="h-6 w-6" />
          {isConnected && (
            <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-green-500">
              <span className="sr-only">Connected</span>
            </div>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>
            {isConnected
              ? `Connected: ${connectedUsername}`
              : "Connect PELOTON Plus Wallet"}
          </SheetTitle>
          {/* Add debug info */}
          <div className="text-xs text-muted-foreground">
            Status: {isLoading ? "Loading..." : isConnected ? "Connected" : "Disconnected"}
            {client?.getUserId() && (
              <div>Matrix ID: {client.getUserId()}</div>
            )}
          </div>
        </SheetHeader>
        <div className="mt-4">
          <WalletPanel 
            roomId={roomId}
            onRequestConnect={() => setIsConnectionDialogOpen(true)}
            onRequestClose={() => setIsOpen(false)}
          />
        </div>
      </SheetContent>

      <WalletConnectionDialog
        isOpen={isConnectionDialogOpen}
        onClose={() => setIsConnectionDialogOpen(false)}
        onConnect={async (username: string, pin: string) => {
          await connect(username, pin)
        }}
        matrixUserId={client?.getUserId() || ""}
      />
    </Sheet>
  )
} 