"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { useMatrixClient } from "@/lib/matrix-context"
import { Mic, MicOff, PhoneOff, Volume2, VolumeX, Users, Copy, Check } from "lucide-react"

interface MeetingRoomProps {
  roomId: string
  meetingId: string
  isHost: boolean
  onEndMeeting: () => void
}

export default function MeetingRoom({ roomId, meetingId, isHost, onEndMeeting }: MeetingRoomProps) {
  const [participants, setParticipants] = useState<{ id: string; name: string; avatar?: string; stream?: MediaStream }[]>([])
  const [isMuted, setIsMuted] = useState(false)
  const [isSpeakerOn, setIsSpeakerOn] = useState(true)
  const [meetingDuration, setMeetingDuration] = useState(0)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [copied, setCopied] = useState(false)

  const localAudioRef = useRef<HTMLAudioElement>(null)
  const meetingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map())

  const { client } = useMatrixClient()
  const { toast } = useToast()

  // Helper: update participants list from Matrix room members
  const updateParticipants = () => {
    if (!client) return
    const room = client.getRoom(roomId)
    if (!room) return
    const members = room.getJoinedMembers()
    const currentUserId = client.getUserId()
    setParticipants(
      members.map((member: any) => ({
        id: member.userId,
        name: member.name || member.userId,
        avatar: member.avatarUrl || undefined,
        isSelf: member.userId === currentUserId,
      }))
    )
  }

  // Listen for Matrix room membership changes
  useEffect(() => {
    if (!client) return
    updateParticipants()
    const handleMembership = () => updateParticipants()
    client.on("RoomState.members", handleMembership)
    return () => client.removeListener("RoomState.members", handleMembership)
  }, [client, roomId])

  // Listen for Matrix signaling events (structure only)
  useEffect(() => {
    if (!client) return
    const handleSignal = (event: any, room: any) => {
      if (room.roomId !== roomId) return
      if (event.getType() !== "m.call.webrtc") return
      // TODO: handle offer/answer/ICE here
      // const { from, type, sdp, candidate } = event.getContent()
    }
    client.on("Room.timeline", handleSignal)
    return () => client.removeListener("Room.timeline", handleSignal)
  }, [client, roomId])

  // Initialize meeting (get local media, announce join)
  useEffect(() => {
    const initializeMeeting = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        setLocalStream(stream)
        if (localAudioRef.current) {
          localAudioRef.current.srcObject = stream
        }
        // Announce join
        if (client && roomId) {
          await client.sendEvent(roomId, "m.room.message", {
            msgtype: "m.notice",
            body: `📞 ${isHost ? "Started" : "Joined"} meeting: ${meetingId}`,
          })
        }
        startMeetingTimer()
      } catch (error) {
        console.error("Error initializing meeting:", error)
        toast({
          title: "Meeting failed",
          description: "Could not access microphone or establish connection",
          variant: "destructive",
        })
        handleEndMeeting()
      }
    }
    initializeMeeting()
    return () => {
      cleanupMeeting()
    }
  }, [isHost, roomId, meetingId, client, toast])

  const startMeetingTimer = () => {
    meetingTimerRef.current = setInterval(() => {
      setMeetingDuration((prev) => prev + 1)
    }, 1000)
  }

  const handleEndMeeting = () => {
    // Send meeting end event to the room
    if (client && roomId) {
      client
        .sendEvent(roomId, "m.room.message", {
          msgtype: "m.notice",
          body: `📞 ${isHost ? "Ended" : "Left"} meeting: ${meetingId}`,
        })
        .catch((error) => {
          console.error("Error sending meeting end event:", error)
        })
    }

    cleanupMeeting()
    onEndMeeting()
  }

  const cleanupMeeting = () => {
    // Stop meeting timer
    if (meetingTimerRef.current) {
      clearInterval(meetingTimerRef.current)
      meetingTimerRef.current = null
    }

    // Stop and release local media stream
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop())
      setLocalStream(null)
    }
  }

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = isMuted
      })
      setIsMuted(!isMuted)
    }
  }

  // Toggle speaker for remote audio (local audio remains muted to avoid echo)
  const toggleSpeaker = () => {
    // In the current implementation, we don't yet have separate remote audio elements.
    // However, to eliminate the echo (hearing yourself), we must NEVER un-mute the
    // local microphone playback. Therefore, we simply flip the UI state here and
    // will later apply it to remote audio elements once they exist.

    setIsSpeakerOn((prev) => !prev)
  }

  const copyMeetingId = () => {
    navigator.clipboard.writeText(meetingId)
    setCopied(true)
    toast({
      title: "Meeting ID copied",
      description: "Share this ID with others to join the meeting",
    })

    setTimeout(() => setCopied(false), 2000)
  }

  // Format meeting duration as MM:SS
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      {/* Hidden audio element */}
      <audio ref={localAudioRef} muted autoPlay />

      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="flex flex-col items-center space-y-4">
            {/* Meeting info */}
            <div className="text-center">
              <h3 className="text-xl font-semibold">Group Meeting</h3>
              <p className="text-muted-foreground">{formatDuration(meetingDuration)}</p>

              <div className="flex items-center justify-center mt-2 space-x-2">
                <span className="text-sm text-muted-foreground">ID: {meetingId.substring(0, 8)}...</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyMeetingId}>
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
            </div>

            {/* Participants */}
            <div className="w-full">
              <div className="flex items-center mb-2">
                <Users className="h-4 w-4 mr-2" />
                <span className="text-sm font-medium">Participants ({participants.length})</span>
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                {participants.map((participant) => (
                  <div key={participant.id} className="flex items-center p-2 rounded-md bg-muted/50">
                    <Avatar className="h-8 w-8 mr-2">
                      <AvatarImage src={participant.avatar || ""} alt={participant.name} />
                      <AvatarFallback>{getInitials(participant.name)}</AvatarFallback>
                    </Avatar>
                    <div className="truncate">
                      <div className="text-sm font-medium truncate">{participant.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {participant.id === client?.getUserId() ? "(You)" : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Call controls */}
            <div className="flex justify-center space-x-4 mt-6">
              <Button
                variant={isMuted ? "default" : "outline"}
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={toggleMute}
              >
                {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              </Button>

              <Button variant="destructive" size="icon" className="h-12 w-12 rounded-full" onClick={handleEndMeeting}>
                <PhoneOff className="h-6 w-6" />
              </Button>

              <Button
                variant={isSpeakerOn ? "outline" : "default"}
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={toggleSpeaker}
              >
                {isSpeakerOn ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
