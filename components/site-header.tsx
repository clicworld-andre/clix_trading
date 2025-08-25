"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, useEffect } from "react"
import { Home, FileText, Settings, LogOut, Bell, Search, TrendingUp, Shield, User, Phone, Wallet } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { useMatrixCalls } from "@/lib/call-context"
import CallMenu from "@/components/call-menu"
import CallDialog from "@/components/call-dialog"
import WalletConnectionDialog from "@/components/account-connection-dialog"
import { WorldClock } from "@/components/world-clock"
import { useMatrixClient } from "@/lib/matrix-context"
import { useWallet } from "@/hooks/use-wallet"

export function SiteHeader() {
  const [userName, setUserName] = useState("User")
  const [mounted, setMounted] = useState(false)
  const [isCallMenuOpen, setIsCallMenuOpen] = useState(false)
  const [isWalletDialogOpen, setIsWalletDialogOpen] = useState(false)
  
  const { callState, endCall } = useMatrixCalls()
  
  // Add debugging to see call state changes
  useEffect(() => {
    console.log('SiteHeader: Call state changed:', callState)
  }, [callState])
  const { client } = useMatrixClient()
  const { isConnected, connectedUsername, connect } = useWallet()

  useEffect(() => {
    setMounted(true)
    
    // Get user info from localStorage
    const userId = localStorage.getItem("matrix_user_id")
    if (userId) {
      setUserName(userId.replace("@", "").split(":")[0])
    }
  }, [])

  const handleLogout = () => {
    localStorage.clear()
    window.location.reload()
  }

  const handleWalletConnect = async (username: string, pin: string) => {
    await connect(username, pin)
    setIsWalletDialogOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 w-full glass dark:glass-dark border-b border-white/10 dark:border-zinc-800/50">
      <div className="container flex h-16 items-center justify-between px-6">
        {/* Brand Section */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            {/* Clix Logo - Made bigger */}
            <div className="flex items-center justify-center w-20 h-20 rounded-xl bg-white shadow-lg p-2">
              <img
                src="/clix_token_new_01.svg"
                alt="CLIX Logo"
                className="w-16 h-16"
              />
            </div>
            {/* Trade Finance text next to logo */}
            <div className="flex items-center">
              <span className="text-lg font-semibold text-gray-600 dark:text-gray-400 tracking-wide">TRADING & FINANCE</span>
            </div>
          </div>
          

        </div>

        {/* Center - Search */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search trades, users, or markets..." 
              className="pl-10 input-modern"
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          {/* Phone Call */}
          <Popover open={isCallMenuOpen} onOpenChange={setIsCallMenuOpen}>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className={`relative ${callState.isCallActive ? 'bg-green-500/20 text-green-600' : ''}`}
              >
                <Phone className="h-5 w-5" />
                {callState.isCallActive && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-green-500 hover:bg-green-600 text-xs">
                    !
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <CallMenu onClose={() => setIsCallMenuOpen(false)} />
            </PopoverContent>
          </Popover>

          {/* World Clock */}
          <WorldClock className="hidden sm:flex" />

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-altx-500 hover:bg-altx-600">
              3
            </Badge>
          </Button>


          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-altx-500 text-white font-semibold">
                    {userName.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:block text-sm font-medium">{userName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 card-luxury">
              <DropdownMenuLabel className="font-semibold">
                <div className="flex flex-col">
                  <span>{userName}</span>
                  <span className="text-xs text-muted-foreground font-normal">Authenticated User</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="h-4 w-4 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Shield className="h-4 w-4 mr-2" />
                Security
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 dark:text-red-400">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Call Dialog */}
      {callState.isCallActive && (
        <CallDialog
          isOpen={callState.isCallActive}
          roomId={callState.roomId || ""}
          peerId={callState.peerId || undefined}
          peerName={callState.peerName || undefined}
          peerAvatar={callState.peerAvatar || undefined}
          isIncoming={callState.isIncoming}
          onClose={endCall}
        />
      )}

      {/* Wallet Connection Dialog */}
      <WalletConnectionDialog
        isOpen={isWalletDialogOpen}
        onClose={() => setIsWalletDialogOpen(false)}
        onConnect={handleWalletConnect}
        matrixUserId={client?.getUserId() || ""}
      />
    </header>
  )
} 