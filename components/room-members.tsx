"use client"

import { useState, useEffect } from "react"
import { useMatrixClient } from "@/lib/matrix-context"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"

interface RoomMembersProps {
  roomId: string
  onClose: () => void
}

interface Member {
  userId: string
  displayName: string | null
  avatarUrl: string | null
  membership: string
  powerLevel: number
}

export default function RoomMembers({ roomId, onClose }: RoomMembersProps) {
  const { client } = useMatrixClient()
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    if (!client || !roomId) return

    const fetchMembers = async () => {
      setIsLoading(true)
      try {
        const room = client.getRoom(roomId)
        if (!room) return

        // Get room state for members
        const memberEvents = room.currentState.getStateEvents("m.room.member")
        const powerLevels = room.currentState.getStateEvents("m.room.power_levels", "")

        // Default power levels
        const defaultUserLevel = powerLevels?.getContent()?.users_default || 0
        // User specific power levels
        const userLevels = powerLevels?.getContent()?.users || {}

        const roomMembers: Member[] = []

        // Process member events
        memberEvents.forEach((event: any) => {
          const userId = event.getStateKey()
          const content = event.getContent()
          const membership = content.membership

          // Only include joined members
          if (membership === "join") {
            roomMembers.push({
              userId,
              displayName: content.displayname || userId,
              avatarUrl: content.avatar_url || null,
              membership,
              powerLevel: userLevels[userId] !== undefined ? userLevels[userId] : defaultUserLevel,
            })
          }
        })

        // Sort by power level (descending) and then by display name
        roomMembers.sort((a, b) => {
          if (b.powerLevel !== a.powerLevel) {
            return b.powerLevel - a.powerLevel
          }
          return (a.displayName || "").localeCompare(b.displayName || "")
        })

        setMembers(roomMembers)
      } catch (error) {
        console.error("Error fetching room members:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMembers()
  }, [client, roomId])

  const filteredMembers = members.filter(
    (member) =>
      member.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.userId.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // Get initials from display name or user ID
  const getInitials = (member: Member) => {
    if (member.displayName) {
      return member.displayName
        .split(" ")
        .map((name) => name[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)
    }

    // If no display name, use first character of user ID (without @)
    return member.userId.replace("@", "")[0].toUpperCase()
  }

  // Get role label based on power level
  const getRoleLabel = (powerLevel: number) => {
    if (powerLevel >= 100) return "Admin"
    if (powerLevel >= 50) return "Moderator"
    return null
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with close button */}
      <div className="p-3 border-b border-border flex items-center justify-between bg-muted/30">
        <h3 className="font-medium text-sm">Room Members</h3>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-6 w-6 p-0">
          <X className="h-3 w-3" />
        </Button>
      </div>
      <div className="p-2">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {filteredMembers.length > 0 ? (
            filteredMembers.map((member) => (
              <div key={member.userId} className="flex items-center p-2 rounded-md hover:bg-muted">
                <Avatar className="h-8 w-8 mr-2">
                  <AvatarImage src={member.avatarUrl || ""} alt={member.displayName || member.userId} />
                  <AvatarFallback>{getInitials(member)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{member.displayName || member.userId}</div>
                  <div className="text-xs text-muted-foreground truncate">{member.userId}</div>
                </div>
                {getRoleLabel(member.powerLevel) && (
                  <Badge variant="outline" className="ml-2">
                    {getRoleLabel(member.powerLevel)}
                  </Badge>
                )}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground p-2">
              {searchQuery ? "No members found" : "No members in this room"}
            </p>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
