"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import MeetingRoom from "./meeting-room"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

interface MeetingDialogProps {
  isOpen: boolean
  roomId: string
  onClose: () => void
}

export default function MeetingDialog({ isOpen, roomId, onClose }: MeetingDialogProps) {
  const [meetingId, setMeetingId] = useState("")
  const [isJoining, setIsJoining] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null)
  const [isHost, setIsHost] = useState(false)
  const { toast } = useToast()

  const handleCreateMeeting = () => {
    // Generate a random meeting ID
    const newMeetingId = `meeting_${Math.random().toString(36).substring(2, 11)}`
    setActiveMeetingId(newMeetingId)
    setIsHost(true)

    toast({
      title: "Meeting created",
      description: "Share the meeting ID with others to join",
    })
  }

  const handleJoinMeeting = () => {
    if (!meetingId.trim()) {
      toast({
        title: "Meeting ID required",
        description: "Please enter a valid meeting ID",
        variant: "destructive",
      })
      return
    }

    setActiveMeetingId(meetingId)
    setIsHost(false)

    toast({
      title: "Joining meeting",
      description: "Connecting to the meeting...",
    })
  }

  const handleEndMeeting = () => {
    setActiveMeetingId(null)
    setIsHost(false)
    setMeetingId("")
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md" hideClose>
        <DialogTitle className="sr-only">Group Meeting</DialogTitle>
        {activeMeetingId ? (
          <MeetingRoom roomId={roomId} meetingId={activeMeetingId} isHost={isHost} onEndMeeting={handleEndMeeting} />
        ) : (
          <div className="flex flex-col space-y-4 p-2">
            <h2 className="text-xl font-semibold text-center">Group Meeting</h2>

            <div className="flex flex-col space-y-4 mt-4">
              <Button
                onClick={handleCreateMeeting}
                className="w-full bg-skyblue-400 hover:bg-skyblue-500"
                disabled={isJoining}
              >
                Create New Meeting
              </Button>

              <div className="relative flex items-center">
                <div className="flex-grow border-t border-gray-300"></div>
                <span className="mx-4 text-sm text-muted-foreground">or</span>
                <div className="flex-grow border-t border-gray-300"></div>
              </div>

              <div className="space-y-2">
                <div className="flex space-x-2">
                  <Input
                    placeholder="Enter meeting ID"
                    value={meetingId}
                    onChange={(e) => setMeetingId(e.target.value)}
                    disabled={isCreating}
                  />
                  <Button onClick={handleJoinMeeting} disabled={!meetingId.trim() || isCreating}>
                    Join
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
