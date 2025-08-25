"use client"

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import UserSearch from "./user-search"

interface UserSearchDialogProps {
  isOpen: boolean
  onClose: () => void
  onStartChat: (roomId: string) => void
}

export default function UserSearchDialog({ isOpen, onClose, onStartChat }: UserSearchDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogTitle className="sr-only">Search for users</DialogTitle>
        <UserSearch
          onStartChat={(roomId) => {
            console.log("Dialog passing roomId to parent:", roomId)
            console.log("onStartChat function:", typeof onStartChat, onStartChat)
            if (typeof onStartChat === 'function') {
              onStartChat(roomId)
            } else {
              console.error("onStartChat is not a function:", onStartChat)
            }
          }}
          onClose={onClose}
        />
      </DialogContent>
    </Dialog>
  )
}
