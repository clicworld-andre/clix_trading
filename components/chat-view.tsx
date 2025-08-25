"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { useMatrixClient } from "@/lib/matrix-context"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useMobile } from "@/hooks/use-mobile"
import RoomList from "./room-list"
import ChatRoom from "./chat-room"
import TradePanel from "./trade-panel"
import RoomMembers from "./room-members"
import UserSearchDialog from "./user-search-dialog"
import CallDialog from "./call-dialog"
import MeetingDialog from "./meeting-dialog"
import AccountPanel from "./account-panel"
import {
  LogOut,
  AlertCircle,
  MessageSquarePlus,
  Users,
  DollarSign,
  ArrowLeft,
  Menu,
  Video,
  Wallet,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { leaveAndForgetRoom } from "@/lib/matrix-helpers"

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

export default function ChatView() {
  const { client, isInitialized, syncState } = useMatrixClient()
  const [rooms, setRooms] = useState<Room[]>([])
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [showTradePanel, setShowTradePanel] = useState(false)
  const [showMembersPanel, setShowMembersPanel] = useState(false)
  const [showWalletPanel, setShowWalletPanel] = useState(false)
  const [isUserSearchOpen, setIsUserSearchOpen] = useState(false)
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false)
  const [isMeetingDialogOpen, setIsMeetingDialogOpen] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)
  const [incomingCall, setIncomingCall] = useState<{
    roomId: string
    callerId: string
    callerName?: string
  } | null>(null)
  const { toast } = useToast()
  const isMobile = useMobile()

  // Add a new state for the delete confirmation dialog
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [roomToDelete, setRoomToDelete] = useState<string | null>(null)

  // Handlers for accepting and declining invites
  const handleAcceptInvite = async (roomId: string) => {
    if (!client) return
    try {
      await client.joinRoom(roomId)
      toast({
        title: "Chat joined",
        description: "You have accepted the invitation.",
      })
      updateRoomList() // Refresh the room list
      setSelectedRoomId(roomId) // Optionally, select the room immediately
      if (isMobile) {
        setShowSidebar(false)
      }
    } catch (error) {
      console.error("Error accepting invite:", error)
      toast({
        title: "Failed to join chat",
        description: "Could not accept the invitation. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeclineInvite = async (roomId: string) => {
    if (!client || !client.leave) return
    try {
      await client.leave(roomId) // Just leave, don't need to forget typically for invites
      toast({
        title: "Chat declined",
        description: "You have declined the invitation.",
      })
      updateRoomList() // Refresh the room list
    } catch (error) {
      console.error("Error declining invite:", error)
      toast({
        title: "Failed to decline chat",
        description: "Could not decline the invitation. Please try again.",
        variant: "destructive",
      })
    }
  }

  // On mobile, when a room is selected, hide the sidebar
  useEffect(() => {
    if (isMobile && selectedRoomId) {
      setShowSidebar(false)
    }
  }, [selectedRoomId, isMobile])

  // On desktop, always show the sidebar
  useEffect(() => {
    if (!isMobile) {
      setShowSidebar(true)
    }
  }, [isMobile])

  // Improved room list update function
  const updateRoomList = () => {
    if (!client) return

    console.log("Updating room list...")

    try {
      const allRooms = client.getRooms()
      console.log(`Found ${allRooms.length} rooms`)

      const userRooms = allRooms.map((room: any) => {
        // Get room data
        let roomName = room.name
        const roomId = room.roomId
        const myMembership = room.getMyMembership()
        const isInvite = myMembership === "invite"

        // For direct messages, try to get the other user's name
        // For invites, the inviter's name is usually part of the room name or can be found from the inviter member
        let inviterName = ""
        if (isInvite) {
          const inviterMember = room.getMember(room.getDMInviter() || room.getMember(room.getCreator())?.userId)
          if (inviterMember) {
            inviterName = inviterMember.name || inviterMember.userId
            if (inviterName.startsWith("@") && inviterName.includes(":")) {
              inviterName = inviterName.split(":")[0].substring(1)
            }
          }
        }

        const isDM = room.getDMInviter() !== undefined

        if (isDM && !isInvite) {
          const currentUserId = client.getUserId()
          const members = room.getJoinedMembers()
          const otherMember = members.find((member: any) => member.userId !== currentUserId)

          if (otherMember) {
            roomName = otherMember.name || otherMember.userId
            if (roomName.startsWith("@") && roomName.includes(":")) {
              roomName = roomName.split(":")[0].substring(1)
            }
          }
        } else if (isInvite) {
          // For invites, the room name might be empty or the inviter's ID.
          // Let's try to construct a more friendly name.
          if (inviterName) {
            roomName = `Invitation from ${inviterName}`
          } else if (room.name && room.name.includes("invited you to a room")) {
            roomName = room.name // Use the default invite name if available
          } else {
            // Fallback if inviter name is not found
            const creator = room.getMember(room.getCreator())
            const creatorName = creator?.name || room.getCreator()
            roomName = `Invitation from ${creatorName.split(":")[0].substring(1)}`
          }
        } else if (roomName && roomName.startsWith("Chat with @")) {
          // Clean up room name if it's a "Chat with @user:domain" format
          const userId = roomName.substring(10) // Remove "Chat with @" prefix
          // Extract username without domain if possible
          if (userId.includes(":")) {
            roomName = `Chat with ${userId.split(":")[0]}`
          }
        }

        return {
          roomId,
          name: roomName,
          unreadCount: room.getUnreadNotificationCount(),
          isInvite,
        }
      })

      // Sort rooms: invitations first, then by most recent activity
      userRooms.sort((a: any, b: any) => {
        if (a.isInvite && !b.isInvite) return -1
        if (!a.isInvite && b.isInvite) return 1

        const roomA = client.getRoom(a.roomId)
        const roomB = client.getRoom(b.roomId)

        const timelineA = roomA?.getLiveTimeline()?.getEvents()
        const timelineB = roomB?.getLiveTimeline()?.getEvents()

        const timestampA = timelineA?.length ? timelineA[timelineA.length - 1].getTs() : (roomA?.getLastActiveTimestamp() || 0)
        const timestampB = timelineB?.length ? timelineB[timelineB.length - 1].getTs() : (roomB?.getLastActiveTimestamp() || 0)
        
        // For invites without messages, use creation time if available, or sort them towards the top
        const creationTsA = a.isInvite ? (roomA?.getEvent(roomA.roomId, "m.room.create")?.getTs() || 0) : timestampA;
        const creationTsB = b.isInvite ? (roomB?.getEvent(roomB.roomId, "m.room.create")?.getTs() || 0) : timestampB;

        return (b.isInvite ? creationTsB : timestampB) - (a.isInvite ? creationTsA : timestampA)
      })

      console.log("Processed rooms:", userRooms)
      setRooms(userRooms)
    } catch (error) {
      console.error("Error updating room list:", error)
    }
  }

  useEffect(() => {
    if (isInitialized && client) {
      client.startClient()

      if (syncState === "PREPARED" || syncState === "SYNCING") {
        updateRoomList()
      }

      const handleRoomUpdate = () => {
        updateRoomList()
      }

      const handleRoomStateEvents = (event: any, state: any, prevEvent: any) => {
        // Only handle room state events for rooms we know about
        if (event && event.getRoomId && client.getRoom(event.getRoomId())) {
          updateRoomList()
        } else if (event && event.getRoomId) {
          console.warn("Got room state event for unknown room:", event.getRoomId())
        }
      }

      client.on("Room", handleRoomUpdate)
      client.on("Room.timeline", handleRoomUpdate)
      client.on("Room.name", handleRoomUpdate)
      client.on("RoomState.events", handleRoomStateEvents)
      client.on("Room.accountData", handleRoomUpdate)

      const handleCallMessage = (event: any, room: any) => {
        if (event.getType() !== "m.room.message") return

        const content = event.getContent()
        const sender = event.getSender()

        if (sender === client.getUserId()) return

        if (content.msgtype === "m.notice" && content.body === "📞 Incoming call") {
          const roomState = room.currentState
          const memberEvent = roomState.getStateEvents("m.room.member", sender)
          const displayName = memberEvent?.getContent()?.displayname || sender

          setIncomingCall({
            roomId: room.roomId,
            callerId: sender,
            callerName: displayName,
          })

          toast({
            title: "Incoming Call",
            description: `${displayName} is calling you`,
          })
        }
      }

      client.on("Room.timeline", handleCallMessage)

      return () => {
        if (client) {
          client.removeListener("Room", handleRoomUpdate)
          client.removeListener("Room.timeline", handleRoomUpdate)
          client.removeListener("Room.name", handleRoomUpdate)
          client.removeListener("RoomState.events", handleRoomStateEvents)
          client.removeListener("Room.accountData", handleRoomUpdate)
          client.removeListener("Room.timeline", handleCallMessage)
        }
      }
    }
  }, [client, isInitialized, syncState, toast])

  const handleLogout = async () => {
    if (client) {
      try {
        await client.logout()
        client.stopClient()
        localStorage.removeItem("matrix_access_token")
        localStorage.removeItem("matrix_user_id")
        localStorage.removeItem("matrix_home_server")
        localStorage.removeItem("matrix_device_id")
        window.location.reload()
      } catch (error) {
        console.error("Logout error:", error)
        toast({
          title: "Logout failed",
          description: "An error occurred during logout",
          variant: "destructive",
        })
      }
    }
  }

  const handleStartCall = async () => {
    if (!selectedRoomId || !client) return

    try {
      await client.sendEvent(selectedRoomId, "m.room.message", {
        msgtype: "m.notice",
        body: "📞 Incoming call",
      })

      setIsCallDialogOpen(true)

      const room = rooms.find((r) => r.roomId === selectedRoomId)
      const roomName = room?.name || selectedRoomId

      toast({
        title: "Call started",
        description: `You've started a call in ${roomName}`,
      })
    } catch (error) {
      console.error("Error starting call:", error)
      toast({
        title: "Failed to start call",
        description: "Please try again",
        variant: "destructive",
      })
    }
  }

  const handleStartMeeting = () => {
    if (!selectedRoomId) {
      toast({
        title: "No room selected",
        description: "Please select a room first",
        variant: "destructive",
      })
      return
    }

    setIsMeetingDialogOpen(true)
  }

  const handleEndCall = () => {
    setIsCallDialogOpen(false)
    setIncomingCall(null)
  }

  const handleEndMeeting = () => {
    setIsMeetingDialogOpen(false)
  }

  // Improved handleStartChat function to better handle room creation and selection
  const handleStartChat = (roomId: string) => {
    console.log("handleStartChat called with room ID:", roomId)
    console.log("handleStartChat function is properly defined")

    setSelectedRoomId(roomId)
    setIsUserSearchOpen(false)

    if (isMobile) {
      setShowSidebar(false)
    }

    // Force refresh the room list to include the new room
    if (client) {
      // Immediate update
      updateRoomList()

      // Also schedule a delayed update to ensure the room is fully synced
      setTimeout(() => {
        updateRoomList()
      }, 1000)
    }
  }

  const toggleTradePanel = () => {
    setShowTradePanel(!showTradePanel)
    if (!showTradePanel) {
      setShowMembersPanel(false)
      setShowWalletPanel(false)
    }
  }

  const toggleMembersPanel = () => {
    setShowMembersPanel(!showMembersPanel)
    if (!showMembersPanel) {
      setShowTradePanel(false)
      setShowWalletPanel(false)
    }
  }

  const toggleWalletPanel = () => {
    setShowWalletPanel(!showWalletPanel)
    if (!showWalletPanel) {
      setShowTradePanel(false)
      setShowMembersPanel(false)
    }
  }

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar)
  }

  const backToRoomList = () => {
    setShowSidebar(true)
  }

  // Add a function to handle room deletion
  const handleDeleteRoom = (roomId: string) => {
    setRoomToDelete(roomId)
    setIsDeleteDialogOpen(true)
  }

  // Add a function to confirm and execute room deletion
  const confirmDeleteRoom = async () => {
    if (!client || !roomToDelete) return

    try {
      // Use the helper function to properly leave and forget the room
      await leaveAndForgetRoom(client, roomToDelete)

      // Remove the room from the local state
      setRooms(rooms.filter((room) => room.roomId !== roomToDelete))

      // If the deleted room was selected, clear the selection
      if (selectedRoomId === roomToDelete) {
        setSelectedRoomId(null)
      }

      toast({
        title: "Chat deleted",
        description: "The chat has been removed from your list",
      })
    } catch (error) {
      console.error("Error deleting room:", error)
      toast({
        title: "Failed to delete chat",
        description: "An error occurred while trying to delete the chat",
        variant: "destructive",
      })
    } finally {
      setIsDeleteDialogOpen(false)
      setRoomToDelete(null)
    }
  }

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-altx-500"></div>
      </div>
    )
  }

  if (syncState === "ERROR") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-4 max-w-md">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Sync Error</h2>
          <p className="text-muted-foreground mb-4">
            There was an error syncing with the Matrix server. Please try again.
          </p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    )
  }

  if (syncState === "PREPARED" || syncState === "") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-altx-500 mx-auto mb-4"></div>
          <p>Syncing with Matrix server...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {incomingCall && !isCallDialogOpen && (
        <CallDialog
          isOpen={true}
          roomId={incomingCall.roomId}
          peerId={incomingCall.callerId}
          peerName={incomingCall.callerName}
          isIncoming={true}
          onClose={() => setIncomingCall(null)}
        />
      )}
      {isCallDialogOpen && selectedRoomId && (
        <CallDialog
          isOpen={true}
          roomId={selectedRoomId}
          peerName={rooms.find((r) => r.roomId === selectedRoomId)?.name || "Room Call"}
          isIncoming={false}
          onClose={handleEndCall}
        />
      )}
      {isMeetingDialogOpen && selectedRoomId && (
        <MeetingDialog isOpen={true} roomId={selectedRoomId} onClose={handleEndMeeting} />
      )}
      <UserSearchDialog
        isOpen={isUserSearchOpen}
        onClose={() => setIsUserSearchOpen(false)}
        onStartChat={handleStartChat}
      />
      {/* Sidebar - conditionally shown on mobile */}
      {(showSidebar || !isMobile) && (
        <div
          className={`${isMobile ? "w-full" : "w-64"} border-r border-border bg-card flex flex-col h-screen ${isMobile && !showSidebar ? "hidden" : "block"}`}
        >
          {/* Static header */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 relative mr-2">
                <Image
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Altx-map-1-EgXAppZERXApyZu1tnjQfCNBmDDx1N.png"
                  alt="ALTX Logo"
                  fill
                  style={{ objectFit: "contain" }}
                />
              </div>
              <span className="font-bold text-altx-500">
                <span className="text-xl">PELOTON</span>
                <span className="text-xs ml-1">enterprise</span>
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>

          {/* Static sub-header */}
          <div className="p-2 flex justify-between items-center border-b border-border/50">
            <h3 className="text-sm font-medium">Chats</h3>
            <Button variant="ghost" size="sm" onClick={() => setIsUserSearchOpen(true)} className="h-8 w-8 p-0">
              <MessageSquarePlus className="h-4 w-4" />
            </Button>
          </div>

          {/* Scrollable room list */}
          <div className="flex-1 overflow-hidden">
            <RoomList
              rooms={rooms}
              selectedRoomId={selectedRoomId}
              onSelectRoom={handleStartChat}
              onNewChat={() => setIsUserSearchOpen(true)}
              onDeleteRoom={handleDeleteRoom}
              onAcceptInvite={handleAcceptInvite}
              onDeclineInvite={handleDeclineInvite}
            />
          </div>

          {/* Static footer */}
          <div className="p-2 border-t border-border">
            <div className="text-xs text-muted-foreground truncate mb-2">{client?.getUserId()}</div>
            <Button variant="outline" size="sm" onClick={() => setIsUserSearchOpen(true)} className="w-full">
              <MessageSquarePlus className="h-4 w-4 mr-2" />
              New Chat
            </Button>
          </div>
        </div>
      )}
      {/* Main chat area - conditionally shown on mobile */}
      {(!showSidebar || !isMobile) && (
        <div
          className={`flex-1 flex flex-col h-screen overflow-hidden ${isMobile && showSidebar ? "hidden" : "block"}`}
        >
          {selectedRoomId ? (
            <>
              {/* Static header */}
              <div className="border-b border-border p-4 flex justify-between items-center">
                <div className="flex items-center">
                  {isMobile && (
                    <Button variant="ghost" size="icon" onClick={backToRoomList} className="mr-2">
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                  )}
                  <h3 className="font-medium">
                    {rooms.find((r) => r.roomId === selectedRoomId)?.name || selectedRoomId}
                  </h3>
                </div>
                <div className="flex space-x-2">
                  {!isMobile && (
                    <Button variant="outline" size="sm" onClick={handleStartMeeting}>
                      <Video className="h-4 w-4 mr-2" />
                      Meet
                    </Button>
                  )}

                  {/* On mobile, use a menu button to show/hide panels */}
                  {isMobile ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (showTradePanel || showMembersPanel || showWalletPanel) {
                          setShowTradePanel(false)
                          setShowMembersPanel(false)
                          setShowWalletPanel(false)
                        } else {
                          // Show a simple menu or toggle between panels
                          setShowTradePanel(true)
                        }
                      }}
                    >
                      <Menu className="h-4 w-4" />
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleWalletPanel}
                        className={`border-2 ${showWalletPanel ? "bg-primary text-primary-foreground" : ""}`}
                      >
                        <Wallet className="h-4 w-4 mr-2" />
                        <span className="text-foreground">{showWalletPanel ? "Hide Wallet" : "Wallet"}</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleTradePanel}
                        className={`border-2 ${showTradePanel ? "bg-primary text-primary-foreground" : ""}`}
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        <span className="text-foreground">{showTradePanel ? "Hide Trade" : "Trade"}</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleMembersPanel}
                        className={`border-2 ${showMembersPanel ? "bg-primary text-primary-foreground" : ""}`}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        <span className="text-foreground">{showMembersPanel ? "Hide Members" : "Members"}</span>
                      </Button>
                    </>
                  )}

                  {/* Call and Meet buttons for mobile */}
                  {isMobile && (
                    <Button variant="outline" size="icon" onClick={handleStartMeeting}>
                      <Video className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Scrollable content area */}
              <div className="flex-1 flex overflow-hidden">
                <div
                  className={`flex-1 flex flex-col overflow-hidden ${!isMobile && showMembersPanel ? "w-2/3" : "w-full"}`}
                >
                  <ChatRoom roomId={selectedRoomId} />
                </div>

                {/* On mobile, panels take full width */}
                {isMobile && showMembersPanel && (
                  <div className="absolute inset-0 z-10 bg-background">
                    <div className="flex flex-col h-full">
                      <div className="p-4 border-b border-border flex justify-between items-center">
                        <h3 className="font-medium">Room Members</h3>
                        <Button variant="ghost" size="icon" onClick={() => setShowMembersPanel(false)}>
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex-1 overflow-y-auto">
                        <RoomMembers roomId={selectedRoomId} onClose={() => setShowMembersPanel(false)} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Desktop panels */}
                {!isMobile && showMembersPanel && (
                  <div className="w-1/3 border-l border-border overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-border">
                      <h3 className="font-medium">Room Members</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      <RoomMembers roomId={selectedRoomId} onClose={() => setShowMembersPanel(false)} />
                    </div>
                  </div>
                )}

                {/* Trade Panel */}
                {showTradePanel && (
                  <div className={`${isMobile ? 'absolute inset-0 z-10 bg-background' : 'w-1/3 border-l border-border'} overflow-hidden flex flex-col`}>
                    <div className="p-4 border-b border-border flex justify-between items-center">
                      <h3 className="font-medium">Trade</h3>
                      {isMobile && (
                        <Button variant="ghost" size="icon" onClick={() => setShowTradePanel(false)}>
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      <TradePanel roomId={selectedRoomId} />
                    </div>
                  </div>
                )}

                {/* Wallet Panel */}
                {showWalletPanel && (
                  <div className={`${isMobile ? 'absolute inset-0 z-10 bg-background' : 'w-1/3 border-l border-border'} overflow-hidden flex flex-col`}>
                    <div className="p-4 border-b border-border flex justify-between items-center">
                      <h3 className="font-medium">Wallet</h3>
                      {isMobile && (
                        <Button variant="ghost" size="icon" onClick={() => setShowWalletPanel(false)}>
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      <AccountPanel 
                        roomId={selectedRoomId} 
                        onRequestClose={() => setShowWalletPanel(false)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-32 h-32 relative mx-auto mb-6">
                  <Image
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Altx-map-1-EgXAppZERXApyZu1tnjQfCNBmDDx1N.png"
                    alt="ALTX Logo"
                    fill
                    style={{ objectFit: "contain" }}
                    className="opacity-50"
                  />
                </div>
                <h3 className="font-medium text-lg mb-2">
                  <span className="text-xl">PELOTON</span>
                  <span className="text-xs ml-1">enterprise</span>
                </h3>
                <p className="text-muted-foreground mb-6">Start a new chat to begin trading</p>
                <Button className="bg-altx-500 hover:bg-altx-600" onClick={() => setIsUserSearchOpen(true)}>
                  <MessageSquarePlus className="h-4 w-4 mr-2" />
                  Start New Chat
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Chat</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this chat? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} className="mb-2 sm:mb-0">
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteRoom}>
              Delete Chat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
