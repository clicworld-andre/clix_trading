"use client"
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
import { Link2, Wallet } from "lucide-react"

interface WalletConnectionPromptProps {
  isOpen: boolean
  onClose: () => void
  onConnect: () => void
}

export default function WalletConnectionPrompt({ isOpen, onClose, onConnect }: WalletConnectionPromptProps) {
  const { toast } = useToast()

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Wallet Required</DialogTitle>
          <DialogDescription>You need to connect your PELOTON Plus wallet to take this order</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-4">
          <Wallet className="h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-center mb-6 text-muted-foreground">
            Connect your PELOTON Plus wallet to access your financial information and trade directly from the chat
          </p>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row sm:justify-between">
          <Button variant="outline" onClick={onClose} className="mb-2 sm:mb-0">
            Cancel
          </Button>
          <Button 
            onClick={onConnect} 
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Link2 className="h-4 w-4 mr-2" />
            LINK WALLET
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
