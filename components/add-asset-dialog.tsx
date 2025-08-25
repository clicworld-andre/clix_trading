"use client"

import { useState, useEffect } from "react"
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
import { RefreshCw, Plus, Search, CreditCard } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { BASE_URL } from "@/lib/utils"
import { get, post } from "@/lib/service"

interface AddAssetDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  userId: string
}

interface AvailableAsset {
  id: number
  asset_type: string
  chain: string
  code: string
  country: string
  date: string
  duration: string | null
  img_url: string
  isBankLinked: number
  isClicIssued: string
  is_clicpay_enabled: string
  is_tether_enabled: string
  issuer: string
  issuer_public: string
  maturity: string | null
  returns: string | null
  shares: number
  sis_number: string | null
  status: string
  tether_currency: string
  token_name: string
}

export default function AddAssetDialog({ isOpen, onClose, onSuccess, userId }: AddAssetDialogProps) {
  const [assetCode, setAssetCode] = useState("")
  const [assetIssuer, setAssetIssuer] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [availableAssets, setAvailableAssets] = useState<AvailableAsset[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const { toast } = useToast()

  // Load available assets when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadAvailableAssets()
    }
  }, [isOpen])

  const loadAvailableAssets = async () => {
    setIsLoading(true)
    try {
      // In a real app, you would fetch this from an API
      // For now, we'll use mock data
      const mockAssets = await get ("getTokens?type=security") as any
       console.log(mockAssets) 
       const data = mockAssets.data
      setAvailableAssets(data)
    } catch (error) {
      console.error("Error loading available assets:", error)
      toast({
        title: "Failed to load assets",
        description: "Could not load the list of available assets",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Update handleAddAsset to ensure API URL is correct
  // Replace the existing handleAddAsset function with this one

  const handleAddAsset = async (code: string, issuer: string) => {
    if (!code || !issuer) {
      toast({
        title: "Missing information",
        description: "Please select an asset or enter both asset code and issuer",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await post(`trustline`, {
        assetCode: code,
        assetIssuer: issuer,
        userId: userId,
      }) as any
      console.log(response)


      if (response.status === 200) {
        toast({
          title: "Asset added",
          description: response.message || "Asset has been added successfully",
        })

        // Reset form and close dialog
        setAssetCode("")
        setAssetIssuer("")
        onSuccess()
        onClose()
      } else {
        // Show error message from API response
        toast({
          title: "Failed to add asset",
          description: response.message || `Error: ${response.status}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error adding asset:", error)
      toast({
        title: "Failed to add asset",
        description: error instanceof Error ? error.message : "Could not add the asset",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddSelectedAsset = (asset: AvailableAsset) => {
    setAssetCode(asset.code)
    setAssetIssuer(asset.issuer)
    handleAddAsset(asset.code, asset.issuer)
  }

  const filteredAssets = availableAssets.filter(
    (asset) =>
      asset.token_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.asset_type.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Asset</DialogTitle>
          <DialogDescription>Select from available assets or enter custom asset details</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search assets..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : (
            <ScrollArea className="h-[300px] rounded-md border p-2">
              <div className="space-y-2">
                {filteredAssets.length > 0 ? (
                  filteredAssets.map((asset) => (
                    <div key={asset.id} className="p-3 border rounded-md hover:bg-muted">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{asset.token_name}</h4>
                          <p className="text-sm text-muted-foreground">{asset.code}</p>
                          {asset.returns && (
                            <p className="text-xs text-muted-foreground">Returns: {asset.returns}</p>
                          )}
                          {asset.duration && (
                            <p className="text-xs text-muted-foreground">Duration: {asset.duration}</p>
                          )}
                          <p className="text-xs text-muted-foreground">Type: {asset.asset_type}</p>
                          <p className="text-xs text-muted-foreground">Status: {asset.status}</p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                          {asset.img_url ? (
                            <img
                              src={asset.img_url}
                              alt={asset.token_name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                ;(e.target as HTMLImageElement).src = "/placeholder.svg?height=48&width=48"
                              }}
                            />
                          ) : (
                            <CreditCard className="h-6 w-6" />
                          )}
                        </div>
                      </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => handleAddAsset(asset.code, asset.issuer_public)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Asset
                    </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No assets found matching your search</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

        
        </div> 
      </DialogContent>
    </Dialog>
  )
}
