"use client"

import { useState, useEffect } from "react"
import { useMatrixClient } from "@/lib/matrix-context"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { 
  Shield, 
  ShieldCheck, 
  ShieldX, 
  Users, 
  Calendar, 
  Hash, 
  Globe, 
  Lock,
  Eye,
  Clock,
  MessageSquare,
  Phone,
  Settings,
  Copy,
  Crown,
  User
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface RoomInfoDialogProps {
  isOpen: boolean
  onClose: () => void
  roomId: string
}

interface RoomMember {
  userId: string
  displayName: string
  avatarUrl?: string
  powerLevel: number
  membership: string
  lastSeen?: number
}

interface RoomInfo {
  name: string
  topic?: string
  avatar?: string
  roomId: string
  isEncrypted: boolean
  isPublic: boolean
  joinRule: string
  historyVisibility: string
  guestAccess: string
  creationTime?: number
  memberCount: number
  version: string
  predecessor?: string
  isOTCRoom: boolean
  lastActivity?: number
}

export default function RoomInfoDialog({ isOpen, onClose, roomId }: RoomInfoDialogProps) {
  const { client } = useMatrixClient()
  const { toast } = useToast()
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null)
  const [members, setMembers] = useState<RoomMember[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isOpen || !client || !roomId) return

    const loadRoomInfo = async () => {
      setIsLoading(true)
      
      try {
        const room = client.getRoom(roomId)
        if (!room) return

        // Get basic room info
        const name = room.name || "Unnamed Room"
        const topic = room.currentState.getStateEvents("m.room.topic", "")?.getContent()?.topic
        const avatar = room.getAvatarUrl((client as any).baseUrl || "", 50, 50, "crop") || undefined
        const creationEvent = room.currentState.getStateEvents("m.room.create", "")
        const creationTime = creationEvent?.getTs()
        const version = creationEvent?.getContent()?.room_version || "1"
        const predecessor = creationEvent?.getContent()?.predecessor?.room_id

        // Check encryption
        const encryptionEvent = room.currentState.getStateEvents("m.room.encryption", "")
        const isEncrypted = !!encryptionEvent

        // Get room settings
        const joinRulesEvent = room.currentState.getStateEvents("m.room.join_rules", "")
        const joinRule = joinRulesEvent?.getContent()?.join_rule || "invite"
        const isPublic = joinRule === "public"

        const historyVisibilityEvent = room.currentState.getStateEvents("m.room.history_visibility", "")
        const historyVisibility = historyVisibilityEvent?.getContent()?.history_visibility || "shared"

        const guestAccessEvent = room.currentState.getStateEvents("m.room.guest_access", "")
        const guestAccess = guestAccessEvent?.getContent()?.guest_access || "forbidden"

        // Check if it's an OTC room
        const matrixUserId = client.getUserId() || ""
        const cleanMatrixId = matrixUserId.replace(/^@/, "").split(":")[0]
        const otcRoomsKey = `otc_rooms_${cleanMatrixId}`
        const otcRooms = JSON.parse(localStorage.getItem(otcRoomsKey) || "[]")
        const isOTCRoom = otcRooms.includes(roomId)

        // Get last activity
        const timeline = room.timeline
        const lastActivity = timeline && timeline.length > 0 
          ? timeline[timeline.length - 1]?.getTs() 
          : undefined

        const roomInfoData: RoomInfo = {
          name,
          topic,
          avatar,
          roomId,
          isEncrypted,
          isPublic,
          joinRule,
          historyVisibility,
          guestAccess,
          creationTime,
          memberCount: room.getJoinedMemberCount() || 0,
          version,
          predecessor,
          isOTCRoom,
          lastActivity
        }

        setRoomInfo(roomInfoData)

        // Get room members
        const joinedMembers = room.getJoinedMembers() || {}
        const memberList: RoomMember[] = Object.entries(joinedMembers).map(([userId, member]: [string, any]) => {
          const powerLevelEvent = room.currentState.getStateEvents("m.room.power_levels", "")
          const powerLevels = powerLevelEvent?.getContent()?.users || {}
          const powerLevel = powerLevels[userId] || 0

          return {
            userId,
            displayName: member.name || userId.split(':')[0].substring(1),
            avatarUrl: member.getAvatarUrl?.((client as any).baseUrl || "", 40, 40, "crop"),
            powerLevel,
            membership: member.membership || "join",
            lastSeen: member.events?.member?.getTs()
          }
        }).sort((a, b) => b.powerLevel - a.powerLevel) // Sort by power level

        setMembers(memberList)

      } catch (error) {
        console.error("Error loading room info:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadRoomInfo()
  }, [isOpen, client, roomId])

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`,
    })
  }

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return "Unknown"
    return new Date(timestamp).toLocaleString()
  }

  const getPowerLevelLabel = (level: number) => {
    if (level >= 100) return "Admin"
    if (level >= 50) return "Moderator"
    if (level > 0) return "Elevated"
    return "Member"
  }

  const getEncryptionIcon = (encrypted: boolean) => {
    return encrypted ? (
      <ShieldCheck className="h-4 w-4 text-green-500" />
    ) : (
      <ShieldX className="h-4 w-4 text-red-500" />
    )
  }

  if (!roomInfo) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Room Information</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-8">
            {isLoading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            ) : (
              <p className="text-muted-foreground">Failed to load room information</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Room Information
          </DialogTitle>
          <DialogDescription>
            Detailed information about this room
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Room Header */}
          <div className="flex items-start gap-3">
            {roomInfo.avatar ? (
              <Avatar className="h-12 w-12">
                <AvatarImage src={roomInfo.avatar} />
                <AvatarFallback>{roomInfo.name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
            ) : (
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 space-y-1">
              <h3 className="font-semibold text-lg">{roomInfo.name}</h3>
              {roomInfo.topic && (
                <p className="text-sm text-muted-foreground">{roomInfo.topic}</p>
              )}
              <div className="flex items-center gap-2">
                {roomInfo.isOTCRoom && (
                  <Badge variant="secondary" className="text-xs">
                    OTC Trading Room
                  </Badge>
                )}
                {roomInfo.isPublic && (
                  <Badge variant="outline" className="text-xs">
                    <Globe className="h-3 w-3 mr-1" />
                    Public
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Security & Privacy */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security & Privacy
            </h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                {getEncryptionIcon(roomInfo.isEncrypted)}
                <span>{roomInfo.isEncrypted ? "Encrypted" : "Not Encrypted"}</span>
              </div>
              <div className="flex items-center gap-2">
                {roomInfo.isPublic ? (
                  <Globe className="h-4 w-4 text-blue-500" />
                ) : (
                  <Lock className="h-4 w-4 text-orange-500" />
                )}
                <span>{roomInfo.isPublic ? "Public Room" : "Private Room"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span className="capitalize">{roomInfo.historyVisibility} History</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="capitalize">{roomInfo.guestAccess} Guests</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Room Details */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Room Details
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Room ID:</span>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">
                    {roomInfo.roomId.substring(0, 20)}...
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => copyToClipboard(roomInfo.roomId, "Room ID")}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Room Version:</span>
                <span>{roomInfo.version}</span>
              </div>
              {roomInfo.creationTime && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Created:</span>
                  <span>{formatTimestamp(roomInfo.creationTime)}</span>
                </div>
              )}
              {roomInfo.lastActivity && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Last Activity:</span>
                  <span>{formatTimestamp(roomInfo.lastActivity)}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Members */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Members ({roomInfo.memberCount})
            </h4>
            <div className="space-y-2">
              {members.map((member) => (
                <div key={member.userId} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                  {member.avatarUrl ? (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={member.avatarUrl} />
                      <AvatarFallback>
                        {member.displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{member.displayName}</span>
                      {member.powerLevel >= 100 && (
                        <Crown className="h-3 w-3 text-yellow-500" />
                      )}
                      <Badge 
                        variant={member.powerLevel >= 50 ? "default" : "secondary"} 
                        className="text-xs"
                      >
                        {getPowerLevelLabel(member.powerLevel)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {member.userId}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
