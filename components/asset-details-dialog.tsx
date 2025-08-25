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
import { DollarSign } from "lucide-react"

interface AssetDetailsDialogProps {
  isOpen: boolean
  onClose: () => void
  asset: {
    assetCode: string
    assetName: string
    issuer: string
    isin: string
    duration: string
    returns: string
    maturityDate: string
    description: string
  } | null
}

export default function AssetDetailsDialog({ isOpen, onClose, asset }: AssetDetailsDialogProps) {
  if (!asset) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Asset Details</DialogTitle>
          <DialogDescription>Information about this security</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-lg">{asset.assetName}</h3>
              <p className="text-sm text-muted-foreground">{asset.assetCode}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 border-b pb-2">
              <span className="text-sm font-medium">ISIN Number:</span>
              <span className="text-sm">{asset.isin}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 border-b pb-2">
              <span className="text-sm font-medium">Duration:</span>
              <span className="text-sm">{asset.duration}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 border-b pb-2">
              <span className="text-sm font-medium">Returns:</span>
              <span className="text-sm">{asset.returns}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 border-b pb-2">
              <span className="text-sm font-medium">Maturity Date:</span>
              <span className="text-sm">{asset.maturityDate}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 border-b pb-2">
              <span className="text-sm font-medium">Issuer:</span>
              <span className="text-sm truncate" title={asset.issuer}>
                {asset.issuer.substring(0, 20)}...
              </span>
            </div>
            <div className="border-b pb-2">
              <span className="text-sm font-medium">Description:</span>
              <p className="text-sm mt-1">{asset.description}</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
