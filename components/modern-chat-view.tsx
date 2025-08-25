"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { useMatrixClient } from "@/lib/matrix-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useMobile } from "@/hooks/use-mobile"
import { SiteHeader } from "./site-header"
import RoomList from "./room-list"
import ChatRoom from "./chat-room"
import StellarTradePanel from "./stellar-trade-panel"
import OTCTradePanel from "./otc-trade-panel"
import RoomMembers from "./room-members"
import UserSearchDialog from "./user-search-dialog"
import AccountPanel from "./account-panel"
import { LCMainView } from "./lc/lc-main-view"
import LiveMarketsTabbed from "./live-markets-tabbed"
import TradeHistoryList from "./trade-history-list"
import TradeDetailsModal from "./trade-details-modal"
import { WalletPanel } from "./wallet-panel"
import AnalyticsDashboard from "./analytics/analytics-dashboard"
import {
  MessageSquarePlus,
  DollarSign,
  ArrowLeft,
  Menu,
  Wallet,
  FileText,
  TrendingUp,
  BarChart3,
  Settings,
  Search,
  Filter,
  Plus,
  X,
  Activity,
  History,
  Info,
  Calculator,
  ArrowUpDown,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { leaveAndForgetRoom } from "@/lib/matrix-helpers"
import { createTradeHistoryStorage } from "@/lib/trade-history-storage"
import OTCSessionCloseDialog from "./otc-session-close-dialog"

interface Room {
  roomId: string
  name?: string
  unreadCount?: number
  lastMessage?: {
    content: string
    sender: string
    timestamp: number
  }
  isInvite?: boolean
}

export default function ModernChatView() {
  const { client, isInitialized, syncState } = useMatrixClient()
  const [rooms, setRooms] = useState<Room[]>([])
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [activePanel, setActivePanel] = useState("wallet")
  const [showMembersPanel, setShowMembersPanel] = useState(false)
  const [showTradePanel, setShowTradePanel] = useState(false)
  const [isUserSearchOpen, setIsUserSearchOpen] = useState(false)
  const [isOTCTradeSearch, setIsOTCTradeSearch] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)
  const [incomingCall, setIncomingCall] = useState<{
    roomId: string
    callerId: string
    callerName?: string
  } | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTrade, setSelectedTrade] = useState<any>(null)
  const [isTradeDetailsOpen, setIsTradeDetailsOpen] = useState(false)
  const [otcActiveTab, setOtcActiveTab] = useState("trade")
  // Wallet connection state
  const [connectedUsername, setConnectedUsername] = useState<string | null>(null)
  const { toast } = useToast()
  const isMobile = useMobile()

  // Add a new state for the delete confirmation dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [roomToDelete, setRoomToDelete] = useState<string | null>(null)

  // OTC Session close dialog state
  const [isOTCCloseDialogOpen, setIsOTCCloseDialogOpen] = useState(false)
  const [hasActiveTrades, setHasActiveTrades] = useState(false)

  // OTC Room Management
  const getOTCRoomsKey = () => {
    const matrixUserId = client?.getUserId() || ""
    const cleanMatrixId = matrixUserId.replace(/^@/, "").split(":")[0]
    return `otc_rooms_${cleanMatrixId}`
  }

  const getOTCRooms = (): string[] => {
    try {
      const stored = localStorage.getItem(getOTCRoomsKey())
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  const markRoomAsOTC = (roomId: string) => {
    const otcRooms = getOTCRooms()
    if (!otcRooms.includes(roomId)) {
      otcRooms.push(roomId)
      localStorage.setItem(getOTCRoomsKey(), JSON.stringify(otcRooms))
    }
  }

  const unmarkRoomAsOTC = (roomId: string) => {
    const otcRooms = getOTCRooms()
    const filtered = otcRooms.filter(id => id !== roomId)
    localStorage.setItem(getOTCRoomsKey(), JSON.stringify(filtered))
  }

  // Function to check if a room is OTC-related
  const isOTCRoom = (roomId: string) => {
    if (!roomId) return false
    return getOTCRooms().includes(roomId)
  }

  // Handle room selection with automatic tab switching
  const handleRoomSelection = (roomId: string | null) => {
    setSelectedRoomId(roomId)
    if (roomId) {
      if (isOTCRoom(roomId)) {
        setActivePanel("otc")
        // Auto-open trade panel for OTC rooms
        setShowTradePanel(true)
      } else {
        setActivePanel("chat")
        // Close trade panel for non-OTC rooms
        setShowTradePanel(false)
      }
    }
  }

  // Handlers for accepting and declining invites
  const handleAcceptInvite = async (roomId: string) => {
    if (!client) return
    try {
      await client.joinRoom(roomId)
      toast({
        title: "Room joined",
        description: "You have accepted the invitation.",
      })
    } catch (error) {
      console.error("Error accepting invite:", error)
      toast({
        title: "Failed to join room",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    }
  }

  const handleDeclineInvite = async (roomId: string) => {
    if (!client) return
    try {
      if (client.leave) {
        await client.leave(roomId)
      }
      toast({
        title: "Invite declined",
        description: "You have declined the invitation.",
      })
    } catch (error) {
      console.error("Error declining invite:", error)
      toast({
        title: "Failed to decline invite",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    }
  }

  // Update rooms when client changes
  useEffect(() => {
    if (!client || !isInitialized) return

    const updateRooms = () => {
      try {
        // Get all rooms including archived/left rooms for call history
        let clientRooms = []
        try {
          // Try to get all rooms including archived ones
          clientRooms = (client as any).getRooms() || []
          
          // Also try to get visible rooms if available
          const visibleRooms = (client as any).getVisibleRooms?.()
          if (visibleRooms && Array.isArray(visibleRooms)) {
            // Merge without duplicates
            const existingRoomIds = new Set(clientRooms.map((r: any) => r.roomId))
            visibleRooms.forEach((room: any) => {
              if (room && room.roomId && !existingRoomIds.has(room.roomId)) {
                clientRooms.push(room)
              }
            })
          }
        } catch (roomError) {
          console.warn("Error getting rooms:", roomError)
          clientRooms = []
        }
        
        const roomData = clientRooms
          .filter((room: any) => room && room.roomId) // Filter out null/undefined rooms
          .map((room: any): Room => {
            try {
              const roomState = room.currentState
              const membership = room.getMyMembership?.()
              const isInvite = membership === "invite"
              const isLeft = membership === "leave" || membership === "ban"
              
              // Get room name with fallback
              let roomName = room.name || "Unnamed Room"
              
              // Clean up "Chat with" prefixes and get proper display names
              if (roomName.startsWith("Chat with @") || roomName.startsWith("Chat with ")) {
                let userId = roomName
                if (roomName.startsWith("Chat with @")) {
                  userId = roomName.substring(10) // Remove "Chat with @" prefix
                } else if (roomName.startsWith("Chat with ")) {
                  userId = roomName.substring(10) // Remove "Chat with " prefix
                }
                
                // Try to get the actual member's display name
                try {
                  const members = room.getJoinedMembers?.()
                  if (members) {
                    const currentUser = client.getUserId()
                    const otherMember = Object.values(members).find((member: any) => 
                      member.userId !== currentUser && 
                      (member.userId === userId || member.userId === `@${userId}` || member.userId.includes(userId.split(':')[0]))
                    ) as any
                    
                    if (otherMember && otherMember.name && otherMember.name !== otherMember.userId) {
                      roomName = otherMember.name
                    } else {
                      // Fallback to cleaning the user ID
                      if (userId.includes(":")) {
                        roomName = userId.split(":")[0]
                        if (roomName.startsWith("@")) {
                          roomName = roomName.substring(1)
                        }
                      } else {
                        roomName = userId
                      }
                    }
                  }
                } catch (memberError) {
                  console.warn(`Error processing room name for ${room.roomId}:`, memberError)
                  // Fallback to cleaning the user ID
                  if (userId.includes(":")) {
                    roomName = userId.split(":")[0]
                    if (roomName.startsWith("@")) {
                      roomName = roomName.substring(1)
                    }
                  } else {
                    roomName = userId
                  }
                }
              }
              
              // For DM rooms without proper names, try to get the other user's display name
              if (!room.name || room.name === "Empty Room" || roomName === "Unnamed Room") {
                try {
                  const members = room.getJoinedMembers?.()
                  if (members && Object.keys(members).length === 2) {
                    const currentUser = client.getUserId()
                    const otherUser = Object.keys(members).find(userId => userId !== currentUser)
                    if (otherUser) {
                      const member = members[otherUser]
                      // Use display name if available, otherwise clean up the user ID
                      if (member.name && member.name !== member.userId) {
                        roomName = member.name
                      } else {
                        roomName = otherUser.split(':')[0].substring(1)
                      }
                    }
                  }
                } catch (memberError) {
                  console.warn(`Error getting members for room ${room.roomId}:`, memberError)
                }
              }
              
              return {
                roomId: room.roomId,
                name: roomName,
                unreadCount: isLeft ? 0 : (room.getUnreadNotificationCount?.() || 0),
                isInvite,
                lastMessage: (() => {
                  try {
                    const timeline = room.timeline
                    if (!timeline || timeline.length === 0) return undefined
                    
                    // Look for the last meaningful event (message or call)
                    for (let i = timeline.length - 1; i >= 0; i--) {
                      const event = timeline[i]
                      if (!event) continue
                      
                      const eventType = event.getType()
                      const content = event.getContent()
                      const sender = event.getSender() || "Unknown"
                      const timestamp = event.getTs() || 0
                      
                      if (eventType === "m.room.message") {
                        return {
                          content: content.body || "Message",
                          sender,
                          timestamp
                        }
                      } else if (eventType === "m.call.invite") {
                        return {
                          content: "📞 Call started",
                          sender,
                          timestamp
                        }
                      } else if (eventType === "m.call.hangup") {
                        return {
                          content: "📞 Call ended",
                          sender,
                          timestamp
                        }
                      }
                    }
                    
                    return undefined
                  } catch (error) {
                    console.warn(`Error processing last message for room ${room.roomId}:`, error)
                    return undefined
                  }
                })()
              }
            } catch (error) {
              console.warn(`Error processing room ${room.roomId}:`, error)
              return {
                roomId: room.roomId,
                name: "Error loading room",
                unreadCount: 0,
                isInvite: false,
                lastMessage: undefined
              }
            }
          })
        setRooms(roomData)
      } catch (error) {
        console.error("Error updating rooms:", error)
      }
    }

    const safeUpdateRooms = (...args: any[]) => {
      try {
        updateRooms()
      } catch (error) {
        console.warn("Error in room update event handler:", error)
      }
    }

    updateRooms()
    client.on("Room", safeUpdateRooms)
    client.on("Room.timeline", safeUpdateRooms)
    client.on("Room.name", safeUpdateRooms)
    client.on("RoomState.members", safeUpdateRooms)
    
    // Add error handler for room state events
    const handleRoomStateError = (event: any, state: any, prevEvent: any) => {
      if (!state || !state.roomId) {
        console.warn("Received room state event for unknown/invalid room", event)
        return
      }
      
      // Check if we actually have this room
      const room = client.getRoom(state.roomId)
      if (!room) {
        console.warn(`Received room state event for unknown room: ${state.roomId}`)
        return
      }
      
      safeUpdateRooms()
    }
    
    client.on("RoomState.events", handleRoomStateError)

    return () => {
      ;(client as any).off("Room", safeUpdateRooms)
      ;(client as any).off("Room.timeline", safeUpdateRooms)
      ;(client as any).off("Room.name", safeUpdateRooms)
      ;(client as any).off("RoomState.members", safeUpdateRooms)
      ;(client as any).off("RoomState.events", handleRoomStateError)
    }
  }, [client, isInitialized])

  // Check for wallet connection status
  useEffect(() => {
    const matrixUserId = client?.getUserId() || ""
    const cleanMatrixId = matrixUserId.replace(/^@/, "").split(":")[0]

    if (cleanMatrixId) {
      const savedUsername = localStorage.getItem(`otc_chat_${cleanMatrixId}`)
      setConnectedUsername(savedUsername)
    }
  }, [client])

  // Auto-hide sidebar on mobile when room is selected
  useEffect(() => {
    if (isMobile && selectedRoomId) {
      setShowSidebar(false)
    }
  }, [isMobile, selectedRoomId])

  // Function to check for active trades in current room
  const checkForActiveTrades = async (roomId: string): Promise<boolean> => {
    // For now, return false as we don't have the implementation ready
    // This will be implemented when the trade history storage service is complete
    return false
  }

  // Handle starting new OTC session
  const handleStartNewOTCSession = () => {
    setIsOTCTradeSearch(true)
    setIsUserSearchOpen(true)
  }

  // Handle closing OTC session
  const handleCloseOTCSession = async () => {
    if (!selectedRoomId) return
    
    // Check for active trades
    const hasActive = await checkForActiveTrades(selectedRoomId)
    setHasActiveTrades(hasActive)
    setIsOTCCloseDialogOpen(true)
  }

  // Confirm OTC session close
  const confirmCloseOTCSession = async () => {
    if (!selectedRoomId || !client) return

    try {
      // Remove room from OTC rooms list
      unmarkRoomAsOTC(selectedRoomId)
      
      // Leave and forget the room
      await leaveAndForgetRoom(client, selectedRoomId)
      
      // Clear selected room and switch away from OTC tab
      setSelectedRoomId(null)
      setActivePanel("wallet")
      
      toast({
        title: "OTC Session Closed",
        description: "The trading session has been closed successfully.",
      })
    } catch (error) {
      console.error("Error closing OTC session:", error)
      throw error // Re-throw to be handled by the dialog
    }
  }

  const handleDeleteRoom = async () => {
    if (!roomToDelete || !client) return

    try {
      await leaveAndForgetRoom(client, roomToDelete)
      if (selectedRoomId === roomToDelete) {
        setSelectedRoomId(null)
      }
      toast({
        title: "Room deleted",
        description: "You have left and forgotten the room.",
      })
    } catch (error) {
      console.error("Error deleting room:", error)
      toast({
        title: "Failed to delete room",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    }
    
    setIsDeleteDialogOpen(false)
    setRoomToDelete(null)
  }

  const filteredRooms = rooms.filter(room =>
    room.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.lastMessage?.content.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getTotalUnreadCount = () => {
    return rooms.reduce((total, room) => total + (room.unreadCount || 0), 0)
  }

  const getInviteCount = () => {
    return rooms.filter(room => room.isInvite).length
  }

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen gradient-subtle dark:gradient-subtle-dark">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-altx-200 border-t-altx-500"></div>
          <div className="text-center space-y-2">
            <p className="font-medium">Connecting to CLIX Network...</p>
            <p className="text-sm text-muted-foreground">
              Status: {syncState || "Initializing"}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <SiteHeader />
      
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          
          {/* Left Sidebar */}
          {(showSidebar || !isMobile) && (
            <>
              <ResizablePanel defaultSize={16} minSize={14} maxSize={25} className="min-w-[260px]">
                <div className="flex flex-col h-full border-r border-border bg-card/30 backdrop-blur-sm">
                  
                  {/* Sidebar Header */}
                  <div className="p-4 border-b border-border">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="font-semibold flex items-center gap-2">
                        <MessageSquarePlus className="h-5 w-5 text-altx-500" />
                        Conversations
                        {getTotalUnreadCount() > 0 && (
                          <Badge variant="default" className="bg-altx-500 hover:bg-altx-600">
                            {getTotalUnreadCount()}
                          </Badge>
                        )}
                      </h2>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsUserSearchOpen(true)}
                        className="h-8 w-8"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search conversations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 input-modern"
                      />
                    </div>
                  </div>

                  {/* Room List */}
                  <div className="flex-1 overflow-y-auto">
                    <RoomList
                      rooms={filteredRooms}
                      selectedRoomId={selectedRoomId}
                      onSelectRoom={handleRoomSelection}
                      onNewChat={() => setIsUserSearchOpen(true)}
                      onAcceptInvite={handleAcceptInvite}
                      onDeclineInvite={handleDeclineInvite}
                      onDeleteRoom={(roomId) => {
                        setRoomToDelete(roomId)
                        setIsDeleteDialogOpen(true)
                      }}
                      isOTCRoom={isOTCRoom}
                    />
                  </div>

                  {/* Sidebar Footer */}
                  <div className="p-4 border-t border-border">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsUserSearchOpen(true)}
                        className="flex-1"
                      >
                        <MessageSquarePlus className="h-4 w-4 mr-2" />
                        New Chat
                      </Button>
                    </div>
                  </div>
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
            </>
          )}

          {/* Main Content Area */}
          <ResizablePanel defaultSize={
            showMembersPanel ? 79 : 84
          }>
            <div className="flex flex-col h-full">
              
              {/* Main Content Header */}
              <div className="p-4 border-b border-border bg-card/50 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isMobile && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowSidebar(true)}
                        className="md:hidden"
                      >
                        <Menu className="h-5 w-5" />
                      </Button>
                    )}
                    
                    <Tabs value={activePanel} onValueChange={setActivePanel}>
                      <TabsList className="bg-muted/50">
                        <TabsTrigger value="wallet" className="flex items-center gap-2">
                          <Wallet className="h-4 w-4" />
                          Wallet
                        </TabsTrigger>
                        <TabsTrigger value="trading" className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Market Trading
                        </TabsTrigger>
                        <TabsTrigger value="otc" className="flex items-center gap-2">
                          <ArrowUpDown className="h-4 w-4" />
                          OTC Trading
                        </TabsTrigger>
                        <TabsTrigger value="lc" className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Trading Escrow (LC)
                        </TabsTrigger>
                        <TabsTrigger value="tradeinfo" className="flex items-center gap-2">
                          <Info className="h-4 w-4" />
                          Trade Info
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Trade button moved to OTC Trading content area */}
                  </div>
                </div>
              </div>

              {/* Main Content */}
              <div className="flex-1 overflow-hidden">
                {/* Always show tabs, with special handling for chat content */}
                <Tabs value={activePanel} onValueChange={setActivePanel} className="h-full">
                  {/* Chat content - special handling when room is selected */}
                  <TabsContent value="chat" className="h-full m-0">
                    {selectedRoomId && <ChatRoom roomId={selectedRoomId} />}
                  </TabsContent>
                  
                  <TabsContent value="trading" className="h-full m-0">
                    <div className="h-full overflow-auto">
                      <StellarTradePanel />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="otc" className="h-full m-0">
                    {selectedRoomId && isOTCRoom(selectedRoomId) ? (
                      <div className="h-full overflow-y-auto">
                        <div className="flex flex-col lg:flex-row h-full">
                          {/* Chat Area */}
                          <div className="flex-1 min-h-0">
                            <ChatRoom 
                              roomId={selectedRoomId} 
                              onToggleTrade={() => setShowTradePanel(!showTradePanel)}
                              showTradePanel={showTradePanel}
                              onStartNewOTCSession={handleStartNewOTCSession}
                              onCloseOTCSession={handleCloseOTCSession}
                            />
                          </div>
                          
                          {/* Integrated Trade Panel */}
                          {showTradePanel && (
                            <div className="lg:w-96 border-l border-border bg-background flex flex-col">
                              <div className="p-3 border-b border-border flex items-center justify-between bg-muted/30">
                                <Tabs value={otcActiveTab} onValueChange={setOtcActiveTab} className="w-full">
                                  <TabsList className="grid w-full grid-cols-4 h-10 bg-muted/50 rounded-md border">
                                    <TabsTrigger 
                                      value="trade" 
                                      className="flex items-center gap-1 h-full data-[state=active]:bg-background data-[state=active]:shadow-sm"
                                    >
                                      <ArrowUpDown className="h-4 w-4" />
                                      Trade
                                    </TabsTrigger>
                                    <TabsTrigger 
                                      value="orders" 
                                      className="flex items-center gap-1 h-full data-[state=active]:bg-background data-[state=active]:shadow-sm"
                                    >
                                      <Activity className="h-4 w-4" />
                                      Orders
                                    </TabsTrigger>
                                    <TabsTrigger 
                                      value="history" 
                                      className="flex items-center gap-1 h-full data-[state=active]:bg-background data-[state=active]:shadow-sm"
                                    >
                                      <History className="h-4 w-4" />
                                      History
                                    </TabsTrigger>
                                    <TabsTrigger 
                                      value="calculator" 
                                      className="flex items-center gap-1 h-full data-[state=active]:bg-background data-[state=active]:shadow-sm"
                                    >
                                      <Calculator className="h-4 w-4" />
                                      Calculator
                                    </TabsTrigger>
                                  </TabsList>
                                </Tabs>
                              </div>
                              <div className="flex-1 min-h-0 overflow-y-auto">
                                <OTCTradePanel roomId={selectedRoomId} activeTab={otcActiveTab} onTabChange={setOtcActiveTab} />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center space-y-4 max-w-md">
                          <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                            <ArrowUpDown className="h-8 w-8 text-blue-500" />
                          </div>
                          <div className="space-y-2">
                            <h3 className="text-lg font-semibold">OTC Trading</h3>
                            <p className="text-muted-foreground">
                              Start a private trading session with a specific contact.
                            </p>
                          </div>
                          <Button 
                            onClick={() => {
                              setIsOTCTradeSearch(true)
                              setIsUserSearchOpen(true)
                            }}
                            className="bg-blue-500 hover:bg-blue-600 text-white"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Start OTC Trading Session
                          </Button>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                  
                  <TabsContent value="lc" className="h-full m-0">
                    <div className="h-full overflow-auto">
                      <LCMainView />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="tradeinfo" className="h-full m-0">
                    <div className="h-full overflow-auto p-4">
                      <Tabs defaultValue="analytics" className="h-full">
                        <TabsList className="grid w-full grid-cols-2 mb-4">
                          <TabsTrigger value="analytics" className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" />
                            Analytics
                          </TabsTrigger>
                          <TabsTrigger value="history" className="flex items-center gap-2">
                            <History className="h-4 w-4" />
                            Trade History
                          </TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="analytics" className="h-full m-0">
                          <div className="h-full overflow-auto">
                            <AnalyticsDashboard />
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="history" className="h-full m-0">
                          <div className="h-full overflow-auto">
                            <Tabs defaultValue="all" className="h-full">
                              <TabsList className="grid w-full grid-cols-3 mb-4">
                                <TabsTrigger value="all" className="flex items-center gap-2">
                                  <History className="h-4 w-4" />
                                  All Trades
                                </TabsTrigger>
                                <TabsTrigger value="market" className="flex items-center gap-2">
                                  <TrendingUp className="h-4 w-4" />
                                  Market Trading
                                </TabsTrigger>
                                <TabsTrigger value="otc" className="flex items-center gap-2">
                                  <ArrowUpDown className="h-4 w-4" />
                                  OTC Trading
                                </TabsTrigger>
                              </TabsList>
                              
                              <TabsContent value="all" className="h-full m-0">
                                <div className="h-full overflow-auto">
                                  <TradeHistoryList
                                    userId={client?.getUserId() || ''}
                                    onTradeSelect={(trade) => {
                                      setSelectedTrade(trade)
                                      setIsTradeDetailsOpen(true)
                                    }}
                                    onTradeDelete={async (tradeId) => {
                                      try {
                                        const userId = client?.getUserId() || ''
                                        const tradeHistoryStorage = createTradeHistoryStorage(userId)
                                        const result = await tradeHistoryStorage.deleteTradeRecord(tradeId)
                                        
                                        if (result.success) {
                                          toast({
                                            title: "Trade Deleted",
                                            description: "Trade record has been successfully deleted.",
                                          })
                                          // Trigger refresh by calling the trade history list refresh
                                          window.location.reload() // Simple approach for now
                                        } else {
                                          toast({
                                            title: "Delete Failed",
                                            description: result.error?.message || "Could not delete trade record",
                                            variant: "destructive",
                                          })
                                        }
                                      } catch (error) {
                                        console.error('Error deleting trade:', error)
                                        toast({
                                          title: "Delete Failed",
                                          description: "An error occurred while deleting the trade",
                                          variant: "destructive",
                                        })
                                      }
                                    }}
                                    onRefresh={async () => {
                                      try {
                                        // Force refresh by reloading the page for now
                                        // In a full implementation, you would trigger a re-fetch of the trade history
                                        window.location.reload()
                                        
                                        toast({
                                          title: "Trade History Refreshed",
                                          description: "Trade history has been updated.",
                                        })
                                      } catch (error) {
                                        console.error('Error refreshing trade history:', error)
                                        toast({
                                          title: "Refresh Failed",
                                          description: "Could not refresh trade history",
                                          variant: "destructive",
                                        })
                                      }
                                    }}
                                  />
                                </div>
                              </TabsContent>
                              
                              <TabsContent value="market" className="h-full m-0">
                                <Tabs defaultValue="active" className="h-full">
                                  <TabsList className="grid w-full grid-cols-2 mb-4">
                                    <TabsTrigger value="active">Active Orders</TabsTrigger>
                                    <TabsTrigger value="history">Trade History</TabsTrigger>
                                  </TabsList>
                                  
                                  <TabsContent value="active" className="h-full m-0">
                                    <div className="flex items-center justify-center h-full">
                                      <div className="text-center space-y-4 max-w-md">
                                        <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                                          <TrendingUp className="h-8 w-8 text-blue-500" />
                                        </div>
                                        <div className="space-y-2">
                                          <h3 className="text-lg font-semibold">Market Trading Active Orders</h3>
                                          <p className="text-muted-foreground">
                                            View and manage your active orders on Stellar DEX and other markets.
                                          </p>
                                        </div>
                                        <Badge variant="outline" className="text-xs">
                                          Coming Soon
                                        </Badge>
                                      </div>
                                    </div>
                                  </TabsContent>
                                  
                                  <TabsContent value="history" className="h-full m-0">
                                    <div className="flex items-center justify-center h-full">
                                      <div className="text-center space-y-4 max-w-md">
                                        <div className="w-16 h-16 mx-auto rounded-2xl bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                                          <History className="h-8 w-8 text-green-500" />
                                        </div>
                                        <div className="space-y-2">
                                          <h3 className="text-lg font-semibold">Market Trading History</h3>
                                          <p className="text-muted-foreground">
                                            View your completed trades from Stellar DEX and other markets.
                                          </p>
                                        </div>
                                        <Badge variant="outline" className="text-xs">
                                          Coming Soon
                                        </Badge>
                                      </div>
                                    </div>
                                  </TabsContent>
                                </Tabs>
                              </TabsContent>
                              
                              <TabsContent value="otc" className="h-full m-0">
                                <Tabs defaultValue="active" className="h-full">
                                  <TabsList className="grid w-full grid-cols-2 mb-4">
                                    <TabsTrigger value="active">Active Orders</TabsTrigger>
                                    <TabsTrigger value="history">Trade History</TabsTrigger>
                                  </TabsList>
                                  
                                  <TabsContent value="active" className="h-full m-0">
                                    <div className="h-full overflow-auto">
                                      <TradeHistoryList
                                        userId={client?.getUserId() || ''}
                                        filterStatus={['pending']}
                                        filterType={['otc']}
                                        onTradeSelect={(trade) => {
                                          setSelectedTrade(trade)
                                          setIsTradeDetailsOpen(true)
                                        }}
                                        onTradeDelete={async (tradeId) => {
                                          try {
                                            const userId = client?.getUserId() || ''
                                            const tradeHistoryStorage = createTradeHistoryStorage(userId)
                                            const result = await tradeHistoryStorage.deleteTradeRecord(tradeId)
                                            
                                            if (result.success) {
                                              toast({
                                                title: "Trade Deleted",
                                                description: "Trade record has been successfully deleted.",
                                              })
                                              window.location.reload()
                                            } else {
                                              toast({
                                                title: "Delete Failed",
                                                description: result.error?.message || "Could not delete trade record",
                                                variant: "destructive",
                                              })
                                            }
                                          } catch (error) {
                                            console.error('Error deleting trade:', error)
                                            toast({
                                              title: "Delete Failed",
                                              description: "An error occurred while deleting the trade",
                                              variant: "destructive",
                                            })
                                          }
                                        }}
                                        onRefresh={async () => {
                                          try {
                                            window.location.reload()
                                            toast({
                                              title: "Trade History Refreshed",
                                              description: "Active OTC orders have been updated.",
                                            })
                                          } catch (error) {
                                            console.error('Error refreshing trade history:', error)
                                            toast({
                                              title: "Refresh Failed",
                                              description: "Could not refresh active orders",
                                              variant: "destructive",
                                            })
                                          }
                                        }}
                                      />
                                    </div>
                                  </TabsContent>
                                  
                                  <TabsContent value="history" className="h-full m-0">
                                    <div className="h-full overflow-auto">
                                      <TradeHistoryList
                                        userId={client?.getUserId() || ''}
                                        filterStatus={['completed']}
                                        filterType={['otc']}
                                        onTradeSelect={(trade) => {
                                          setSelectedTrade(trade)
                                          setIsTradeDetailsOpen(true)
                                        }}
                                        onTradeDelete={async (tradeId) => {
                                          try {
                                            const userId = client?.getUserId() || ''
                                            const tradeHistoryStorage = createTradeHistoryStorage(userId)
                                            const result = await tradeHistoryStorage.deleteTradeRecord(tradeId)
                                            
                                            if (result.success) {
                                              toast({
                                                title: "Trade Deleted",
                                                description: "Trade record has been successfully deleted.",
                                              })
                                              // Trigger refresh by calling the trade history list refresh
                                              window.location.reload() // Simple approach for now
                                            } else {
                                              toast({
                                                title: "Delete Failed",
                                                description: result.error?.message || "Could not delete trade record",
                                                variant: "destructive",
                                              })
                                            }
                                          } catch (error) {
                                            console.error('Error deleting trade:', error)
                                            toast({
                                              title: "Delete Failed",
                                              description: "An error occurred while deleting the trade",
                                              variant: "destructive",
                                            })
                                          }
                                        }}
                                        onRefresh={async () => {
                                          try {
                                            // Force refresh by reloading the page for now
                                            // In a full implementation, you would trigger a re-fetch of the trade history
                                            window.location.reload()
                                            
                                            toast({
                                              title: "Trade History Refreshed",
                                              description: "Trade history has been updated.",
                                            })
                                          } catch (error) {
                                            console.error('Error refreshing trade history:', error)
                                            toast({
                                              title: "Refresh Failed",
                                              description: "Could not refresh trade history",
                                              variant: "destructive",
                                            })
                                          }
                                        }}
                                      />
                                    </div>
                                  </TabsContent>
                                </Tabs>
                              </TabsContent>
                            </Tabs>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="wallet" className="h-full m-0">
                    <div className="h-full bg-card/50 backdrop-blur-sm border rounded-lg">
                      <WalletPanel />
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </ResizablePanel>

          {/* Right Sidebar - Members Panel */}
          {showMembersPanel && selectedRoomId && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={20} minSize={15} maxSize={30} className="min-w-[200px]">
                <div className="h-full border-l border-border bg-card/30 backdrop-blur-sm">
                  <RoomMembers 
                    roomId={selectedRoomId} 
                    onClose={() => setShowMembersPanel(false)}
                  />
                </div>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>

      {/* Dialogs */}
      <UserSearchDialog
        isOpen={isUserSearchOpen}
        onClose={() => {
          setIsUserSearchOpen(false)
          setIsOTCTradeSearch(false)
        }}
        onStartChat={(roomId) => {
          if (isOTCTradeSearch) {
            // Mark room as OTC trading room
            markRoomAsOTC(roomId)
            
            // For OTC Trading, select the room
            handleRoomSelection(roomId)
            
            // Send initial OTC trading message
            if (client) {
              client.sendEvent(roomId, "m.room.message", {
                msgtype: "m.notice",
                body: "🔄 OTC Trading Session Started - You can now create trade orders using the Trade button in this private chat room"
              })
            }
            
            toast({
              title: "OTC Trading Session Started",
              description: "Private chat room created. Use the Trade button to access trading tools."
            })
          } else {
            // Regular chat - select the room to show chat interface
            handleRoomSelection(roomId)
          }
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="card-luxury">
          <DialogHeader>
            <DialogTitle>Delete Conversation</DialogTitle>
            <DialogDescription>
              Are you sure you want to leave and delete this conversation? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteRoom}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Trade Details Modal */}
      <TradeDetailsModal
        trade={selectedTrade}
        isOpen={isTradeDetailsOpen}
        onClose={() => {
          setIsTradeDetailsOpen(false)
          setSelectedTrade(null)
        }}
        onChatArchiveLoad={async (roomId: string) => {
          try {
            const userId = client?.getUserId() || ''
            const tradeHistoryStorage = createTradeHistoryStorage(userId)
            const result = await tradeHistoryStorage.getChatArchive(roomId)
            
            if (result.success && result.data) {
              return result.data
            } else {
              console.warn('Chat archive not found for room:', roomId, result.error)
              return null
            }
          } catch (error) {
            console.error('Error loading chat archive for room:', roomId, error)
            return null
          }
        }}
      />

      {/* OTC Session Close Confirmation Dialog */}
      <OTCSessionCloseDialog
        isOpen={isOTCCloseDialogOpen}
        onClose={() => {
          setIsOTCCloseDialogOpen(false)
          setHasActiveTrades(false)
        }}
        onConfirm={confirmCloseOTCSession}
        roomId={selectedRoomId || ""}
        hasActiveTrades={hasActiveTrades}
      />
    </div>
  )
}