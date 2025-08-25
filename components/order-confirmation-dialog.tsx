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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { useMatrixClient } from "@/lib/matrix-context"
import { Check, DollarSign, RefreshCw } from "lucide-react"
import { otcApi } from "@/lib/service"
import type { OrderDetails, TakeOfferRequest } from "@/lib/api-types"

interface OrderConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  orderDetails: OrderDetails | null
  roomId: string
}

export default function OrderConfirmationDialog({
  isOpen,
  onClose,
  orderDetails,
  roomId,
}: OrderConfirmationDialogProps) {
  const [pin, setPin] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const { toast } = useToast()
  const { client } = useMatrixClient()

  if (!orderDetails) return null

  // Update handleConfirmOrder to ensure API URL is correct
  // Replace the existing handleConfirmOrder function with this one

  const handleConfirmOrder = async () => {
    if (!client || !roomId || !orderDetails || !pin.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter your PIN to confirm",
        variant: "destructive",
      })
      return
    }

    if (pin.length < 4) {
      toast({
        title: "Invalid PIN",
        description: "Please enter a valid PIN (at least 4 digits)",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)

    try {
      // Get the connected username from localStorage
      const matrixUserId = client?.getUserId() || ""
      const cleanMatrixId = matrixUserId.replace(/^@/, "").split(":")[0]
      const connectedUsername = localStorage.getItem(`otc_chat_${cleanMatrixId}`)

      if (!connectedUsername) {
        throw new Error("Wallet not connected")
      }

      // Call the API to take the offer using the new service layer
      const takeOfferData: TakeOfferRequest = {
        order_id: orderDetails.orderId,
        userId: connectedUsername,
        password: pin,
        chatroom_id: roomId,
      }

      const response = await otcApi.takeOffer(takeOfferData)

      if (response.success) {
        // Send a confirmation message to the chat
        await client.sendEvent(roomId, "m.room.message", {
          msgtype: "m.notice",
          body: `✅ Order Accepted: ${orderDetails.direction === "buy" ? "Buy" : "Sell"} ${orderDetails.amount} ${orderDetails.baseAsset} at ${orderDetails.price} ${orderDetails.counterAsset} (Total: ${orderDetails.total} ${orderDetails.counterAsset}) #${orderDetails.orderId}`,
        })

        toast({
          title: "Order accepted",
          description: "You have successfully taken this order",
        })

        // Close the dialog
        onClose()
      } else {
        // Show error message from API response
        toast({
          title: "Failed to take order",
          description: response.error || `Error: ${response.status}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error taking order:", error)
      toast({
        title: "Failed to take order",
        description: error instanceof Error ? error.message : "Could not take this order",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
      setPin("")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Order</DialogTitle>
          <DialogDescription>Review and confirm the order details below</DialogDescription>
        </DialogHeader>

        <div className="p-4 border rounded-md bg-muted/30 my-4">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-2">
              <DollarSign className="h-4 w-4" />
            </div>
            <div className="font-medium">
              {orderDetails.direction === "buy" ? "Buy Offer" : "Sell Offer"} from {orderDetails.seller}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Direction:</span>
              <span className="font-medium">{orderDetails.direction === "buy" ? "Buy" : "Sell"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Asset:</span>
              <span className="font-medium">{orderDetails.baseAsset}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-medium">{orderDetails.amount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Price:</span>
              <span className="font-medium">
                {orderDetails.price} {orderDetails.counterAsset} per unit
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-medium">
                {orderDetails.total} {orderDetails.counterAsset}
              </span>
            </div>
          </div>
        </div>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="pin">Enter your PIN to confirm</Label>
            <Input
              id="pin"
              type="password"
              placeholder="Enter your PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              autoComplete="off"
              maxLength={6}
            />
            <p className="text-xs text-muted-foreground">Your PIN is used to secure your wallet access</p>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row sm:justify-between">
          <Button variant="outline" onClick={onClose} className="mb-2 sm:mb-0" disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmOrder}
            disabled={isProcessing || !pin.trim()}
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
                Confirm Order
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
