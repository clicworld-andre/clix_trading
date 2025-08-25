"use client"
import { Button } from "@/components/ui/button"

import { Badge } from "@/components/ui/badge"
import { useState, useEffect } from "react"
import { useMatrixClient } from "@/lib/matrix-context"
import { useMobile } from "@/hooks/use-mobile"
// Add the Trash2 icon import at the top of the file
import { Trash2, MessageSquarePlus, Users, UserPlus, Check, X, DollarSign } from "lucide-react"

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

// Update the RoomListProps interface to include onDeleteRoom
interface RoomListProps {
  rooms: Room[]
  selectedRoomId: string | null
  onSelectRoom: (roomId: string) => void
  onNewChat: () => void
  onDeleteRoom: (roomId: string) => void
  onAcceptInvite: (roomId: string) => void
  onDeclineInvite: (roomId: string) => void
  isOTCRoom?: (roomId: string) => boolean
}

// Update the component parameters to include onDeleteRoom and isOTCRoom
export default function RoomList({ rooms, selectedRoomId, onSelectRoom, onNewChat, onDeleteRoom, onAcceptInvite, onDeclineInvite, isOTCRoom }: RoomListProps) {
  const { client } = useMatrixClient()
  const [enhancedRooms, setEnhancedRooms] = useState<Room[]>([])
  const isMobile = useMobile()

  useEffect(() => {
    if (!client) return

    // Enhance rooms with last message and proper room names
    const enhanced = rooms.map((room) => {
      const matrixRoom = client.getRoom(room.roomId)
      let lastMessage = undefined
      let cleanName = room.name || room.roomId

      if (matrixRoom) {
        // Fix room name for direct messages to show the other user's name
        const currentUserId = client.getUserId()
        const isDM = matrixRoom.getDMInviter() !== undefined

        if (isDM) {
          // For DMs, find the other user in the room
          const members = matrixRoom.getJoinedMembers()
          const otherMember = members.find((member: any) => member.userId !== currentUserId)

          if (otherMember) {
            // Use the other member's display name, fallback to cleaned user ID
            if (otherMember.name && otherMember.name !== otherMember.userId) {
              cleanName = otherMember.name
            } else {
              // If no display name, extract username from Matrix ID
              const userId = otherMember.userId
              if (userId.startsWith("@") && userId.includes(":")) {
                cleanName = userId.split(":")[0].substring(1)
              } else {
                cleanName = userId
              }
            }
          }
        } else if (cleanName && (cleanName.startsWith("Chat with @") || cleanName.startsWith("Chat with "))) {
          // Clean up room name if it has "Chat with" prefix
          let userId = cleanName
          if (cleanName.startsWith("Chat with @")) {
            userId = cleanName.substring(10) // Remove "Chat with @" prefix
          } else if (cleanName.startsWith("Chat with ")) {
            userId = cleanName.substring(10) // Remove "Chat with " prefix
          }
          
          // Try to get the actual member's display name
          const members = matrixRoom.getJoinedMembers()
          const otherMember = members.find((member: any) => 
            member.userId !== currentUserId && 
            (member.userId === userId || member.userId === `@${userId}` || member.userId.includes(userId))
          )
          
          if (otherMember && otherMember.name && otherMember.name !== otherMember.userId) {
            cleanName = otherMember.name
          } else {
            // Fallback to cleaning the user ID
            if (userId.includes(":")) {
              cleanName = userId.split(":")[0]
              if (cleanName.startsWith("@")) {
                cleanName = cleanName.substring(1)
              }
            } else {
              cleanName = userId
            }
          }
        }

        // Get the most recent timeline events
        const events = matrixRoom.timeline || []

        // Find the most recent text message
        const messageEvent = events
          .filter((event: any) => {
            const type = event.getType()
            if (type !== "m.room.message") return false

            const content = event.getContent()
            // Skip signalling messages
            if (typeof content.body === "string" && content.body.startsWith("SIGNAL:")) return false
            return content.msgtype === "m.text" || content.msgtype === "m.notice"
          })
          .pop()

        if (messageEvent) {
          const content = messageEvent.getContent()
          const sender = messageEvent.getSender()
          let senderDisplayName = sender

          try {
            const memberInfo = matrixRoom.getMember(sender)
            if (memberInfo && memberInfo.name) {
              senderDisplayName = memberInfo.name
              // If it's a Matrix ID, extract just the username part
              if (senderDisplayName.startsWith("@") && senderDisplayName.includes(":")) {
                senderDisplayName = senderDisplayName.split(":")[0].substring(1)
              }
            } else if (sender.startsWith("@") && sender.includes(":")) {
              // If no member info, extract username from Matrix ID
              senderDisplayName = sender.split(":")[0].substring(1)
            }
          } catch (error) {
            console.error("Error getting member info:", error)
            // Fallback to extracting from Matrix ID
            if (sender.startsWith("@") && sender.includes(":")) {
              senderDisplayName = sender.split(":")[0].substring(1)
            }
          }

          lastMessage = {
            content: content.body,
            sender: senderDisplayName,
            timestamp: messageEvent.getTs(),
          }
        }
      }

      return {
        ...room,
        name: cleanName,
        lastMessage,
      }
    })

    setEnhancedRooms(enhanced)
  }, [rooms, client])

  // Use the rooms passed from parent (already filtered by ModernChatView)
  const filteredRooms = enhancedRooms

  // Format timestamp to relative time (e.g., "2h ago", "Yesterday")
  const formatTimestamp = (timestamp: number) => {
    const now = new Date()
    const date = new Date(timestamp)
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return "now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return "Yesterday"

    // If more than a day, show the date
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
  }

  const getRoomAvatar = (room: Room) => {
    if (!client || !room.roomId) return "/placeholder.svg?height=40&width=40"

    const matrixRoom = client.getRoom(room.roomId)
    if (!matrixRoom) return "/placeholder.svg?height=40&width=40"

    // For DMs, try to get the other user's avatar
    if (matrixRoom.getDMInviter()) {
      const members = matrixRoom.getJoinedMembers()
      const otherMember = members.find((member: any) => member.userId !== client.getUserId())
      if (otherMember?.getAvatarUrl()) {
        try {
          const avatarMxcUrl = otherMember.getAvatarUrl()
          if (avatarMxcUrl && avatarMxcUrl.startsWith('mxc://') && client.mxcUrlToHttp) {
            // Check if client has proper baseUrl configured
            const baseUrl = (client as any).baseUrl || (client as any).getHomeserverUrl?.()
            if (baseUrl && baseUrl !== 'undefined') {
              return client.mxcUrlToHttp(avatarMxcUrl, 40, 40, "scale", true) || "/placeholder.svg?height=40&width=40"
            }
          }
        } catch (error) {
          console.warn('RoomList: Failed to generate DM member avatar URL:', error)
        }
      }
    }
    // For other rooms or if DM avatar not found, use room avatar
    const roomAvatar = matrixRoom.getAvatarUrl()
    if (roomAvatar) {
      try {
        if (roomAvatar.startsWith('mxc://') && client.mxcUrlToHttp) {
          // Check if client has proper baseUrl configured
          const baseUrl = (client as any).baseUrl || (client as any).getHomeserverUrl?.()
          if (baseUrl && baseUrl !== 'undefined') {
            return client.mxcUrlToHttp(roomAvatar, 40, 40, "scale", true) || "/placeholder.svg?height=40&width=40"
          }
        }
      } catch (error) {
        console.warn('RoomList: Failed to generate room avatar URL:', error)
      }
    }

    return "/placeholder.svg?height=40&width=40"
  }

  return (
    <div className="flex flex-col h-full">

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-2 space-y-1">
          {filteredRooms.length > 0 ? (
            filteredRooms.map((room) => {
              const isSelected = selectedRoomId === room.roomId
              return (
                <div key={room.roomId} className="relative group">
                  <button
                    onClick={() => !room.isInvite && onSelectRoom(room.roomId)}
                    className={`w-full text-left p-2 pr-8 hover:bg-muted/50 transition-colors rounded-md flex flex-col justify-between items-start ${selectedRoomId === room.roomId && !room.isInvite ? "bg-muted" : ""} ${room.isInvite ? "border-l-4 border-altx-500 pl-2" : ""}`}
                    disabled={room.isInvite}
                  >
                    <div className="flex items-center w-full">
                      {room.isInvite && <UserPlus className="h-4 w-4 mr-2 text-altx-500 flex-shrink-0" />} 
                      {!room.isInvite && isOTCRoom?.(room.roomId) && (
                        <DollarSign className="h-4 w-4 mr-2 text-green-500 flex-shrink-0" />
                      )}
                      <span className={`truncate text-sm font-medium ${room.isInvite ? "text-altx-500" : ""}`}>{room.name || "Unnamed Chat"}</span>
                      {!room.isInvite && isOTCRoom?.(room.roomId) && (
                        <Badge variant="outline" className="ml-2 text-xs bg-green-50 text-green-700 border-green-200 px-1 py-0">
                          OTC
                        </Badge>
                      )}
                    </div>
                    {room.lastMessage && !room.isInvite && (
                      <div className="text-xs text-muted-foreground mt-1 truncate w-full">
                        {room.lastMessage.content}
                      </div>
                    )}
                    {room.isInvite && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Click to accept or decline this chat invitation.
                      </div>
                    )}
                  </button>
                  {!room.isInvite && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteRoom(room.roomId)
                      }}
                      className="absolute top-1/2 right-2 transform -translate-y-1/2 h-7 w-7 opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="Delete Chat"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  {room.isInvite && (
                    <div className="absolute top-1/2 right-2 transform -translate-y-1/2 flex space-x-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          onAcceptInvite(room.roomId)
                        }}
                        className="h-7 w-7 bg-green-500/20 hover:bg-green-500/30 text-green-600"
                        title="Accept Invite"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeclineInvite(room.roomId)
                        }}
                        className="h-7 w-7 bg-red-500/20 hover:bg-red-500/30 text-red-600"
                        title="Decline Invite"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground mb-4">No chats yet</p>
              <Button variant="outline" size="sm" onClick={onNewChat}>
                Start a new chat
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
