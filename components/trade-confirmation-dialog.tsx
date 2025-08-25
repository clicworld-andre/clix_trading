"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useMatrixClient } from "@/lib/matrix-context"
import { Check, DollarSign, RefreshCw } from "lucide-react"

interface TradeConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  tradeDetails: {
    messageId: string
    content: string
    sender: string
    isBuy: boolean
    asset: string
    amount: string
    currency: string
    value: string
  } | null
  roomId: string
}

export default function TradeConfirmationDialog({
  isOpen,
  onClose,
  tradeDetails,
  roomId,
}: TradeConfirmationDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const { toast } = useToast()
  const { client } = useMatrixClient()

  if (!tradeDetails) return null

  // Let's update the TradeConfirmationDialog component to ensure it works correctly

  // Update the handleConfirmTrade function to properly handle trade confirmation
  const handleConfirmTrade = async () => {
    if (!client || !roomId || !tradeDetails) return

    setIsProcessing(true)

    try {
      // Send a message to the room indicating the trade was accepted
      await client.sendEvent(roomId, "m.room.message", {
        msgtype: "m.notice",
        body: `✅ Trade Accepted: ${tradeDetails.content.replace("🏦 Bond Trade:", "").trim()}`,
      })

      // In a real app, you would also update your wallet balances here
      // For demo purposes, we'll just show a success message

      toast({
        title: "Trade accepted",
        description: "The trade has been successfully executed",
      })

      // Close the dialog
      onClose()
    } catch (error) {
      console.error("Error accepting trade:", error)
      toast({
        title: "Failed to accept trade",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Trade</DialogTitle>
          <DialogDescription>Review and confirm the trade details below</DialogDescription>
        </DialogHeader>

        <div className="p-4 border rounded-md bg-muted/30 my-4">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-2">
              <DollarSign className="h-4 w-4" />
            </div>
            <div className="font-medium">
              {tradeDetails.isBuy ? "Buy Offer" : "Sell Offer"} from {tradeDetails.sender}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Asset:</span>
              <span className="font-medium">{tradeDetails.asset}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-medium">{tradeDetails.amount} units</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Price:</span>
              <span className="font-medium">
                {tradeDetails.value} {tradeDetails.currency}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row sm:justify-between">
          <Button variant="outline" onClick={onClose} className="mb-2 sm:mb-0">
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmTrade} 
            disabled={isProcessing} 
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Accept Trade
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
