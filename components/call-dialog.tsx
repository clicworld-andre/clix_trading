"use client"

import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import VoiceCall from "@/components/voice-call"

interface CallDialogProps {
  isOpen: boolean
  roomId: string
  peerId?: string
  peerName?: string
  peerAvatar?: string
  isIncoming?: boolean
  onClose: () => void
}

export default function CallDialog({
  isOpen,
  roomId,
  peerId,
  peerName,
  peerAvatar,
  isIncoming = false,
  onClose,
}: CallDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md" hideClose>
        <DialogTitle className="sr-only">
          {isIncoming ? "Incoming call" : "Outgoing call"} with {peerName || "User"}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {isIncoming 
            ? `Answer or decline the incoming call from ${peerName || "User"}` 
            : `Voice call in progress with ${peerName || "User"}`
          }
        </DialogDescription>
        <VoiceCall
          roomId={roomId}
          peerId={peerId}
          peerName={peerName}
          peerAvatar={peerAvatar}
          isIncoming={isIncoming}
          onEndCall={onClose}
        />
      </DialogContent>
    </Dialog>
  )
}
