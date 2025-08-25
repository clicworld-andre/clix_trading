"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { AlertTriangle, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface OTCSessionCloseDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  roomId: string
  hasActiveTrades?: boolean
}

export default function OTCSessionCloseDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  roomId,
  hasActiveTrades = false 
}: OTCSessionCloseDialogProps) {
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)

  const handleConfirm = async () => {
    setIsProcessing(true)
    
    try {
      await onConfirm()
      
      toast({
        title: "OTC Session Closed",
        description: "The trading session has been closed successfully.",
      })
      
      onClose()
    } catch (error) {
      console.error("Error closing OTC session:", error)
      
      toast({
        title: "Failed to Close Session",
        description: error instanceof Error ? error.message : "Could not close the trading session",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {hasActiveTrades ? (
              <>
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Close Active Trading Session
              </>
            ) : (
              <>
                <X className="h-5 w-5 text-red-500" />
                Close Trading Session
              </>
            )}
          </DialogTitle>
          <DialogDescription className="text-left">
            {hasActiveTrades ? (
              "⚠️ Warning: You have active trades in this session. Closing will permanently end all trading activities and remove both participants from the room. This action cannot be undone."
            ) : (
              "Are you sure you want to close this OTC trading session? This will remove both participants and permanently close the room. This action cannot be undone."
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Additional content outside DialogDescription to avoid nesting issues */}
        {hasActiveTrades && (
          <div className="space-y-2 text-sm px-6">
            <div className="font-medium text-amber-600 dark:text-amber-400">
              Active trades will be affected:
            </div>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>Remove both participants from the trading room</li>
              <li>Close the Matrix room permanently</li>
              <li>End all active trading activities</li>
              <li>Make the chat history inaccessible</li>
            </ul>
          </div>
        )}
        
        {!hasActiveTrades && (
          <div className="space-y-2 text-sm px-6">
            <div className="text-muted-foreground">
              This action will:
            </div>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
              <li>Remove both participants from the room</li>
              <li>Close the Matrix room permanently</li>
              <li>End the trading session</li>
            </ul>
          </div>
        )}

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isProcessing}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button 
            variant={hasActiveTrades ? "destructive" : "destructive"}
            onClick={handleConfirm}
            disabled={isProcessing}
            className="w-full sm:w-auto"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                Closing Session...
              </>
            ) : hasActiveTrades ? (
              "Close Session (Active Trades)"
            ) : (
              "Close Session"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
