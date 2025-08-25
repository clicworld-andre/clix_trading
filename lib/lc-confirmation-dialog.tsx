"use client"

// LC Confirmation Dialog - Extension based on trade-confirmation-dialog.tsx
// Handles LC agreement, funding, and settlement

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
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { useMatrixClient } from "@/lib/matrix-context"
import { 
  Check, 
  DollarSign, 
  RefreshCw, 
  FileText, 
  Ship, 
  Calendar, 
  Package,
  AlertTriangle,
  Shield,
  ExternalLink,
  Wallet
} from "lucide-react"

interface LCConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  lcDetails: {
    messageId: string
    sender: string
    terms: {
      commodity?: string
      commodityToken?: string
      quantity?: string
      unitOfMeasure?: string
      lcAmount?: string
      currency?: string
      tolerance?: string
      deliveryTerms?: string
      portOfLoading?: string
      portOfDischarge?: string
      latestShipmentDate?: string
      requiredDocuments?: string[]
      documentDeadline?: string
      specialConditions?: string
      governingLaw?: string
      arbitrationClause?: string
    }
    hash: string
    timestamp: number
  } | null
  roomId: string
}

type LCStatus = "proposal" | "negotiating" | "agreed" | "funded" | "shipped" | "documents_submitted" | "completed" | "disputed"

interface LCAction {
  action: "agree" | "counter" | "fund" | "confirm_shipment" | "submit_documents" | "confirm_delivery" | "dispute"
  status: LCStatus
  buttonText: string
  buttonColor: "default" | "destructive" | "outline"
  icon: React.ReactNode
  description: string
}

export default function LCConfirmationDialog({
  isOpen,
  onClose,
  lcDetails,
  roomId,
}: LCConfirmationDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentStatus, setCurrentStatus] = useState<LCStatus>("proposal")
  const [counterTerms, setCounterTerms] = useState<string>("")
  const [showCounterForm, setShowCounterForm] = useState(false)
  const [userBalance, setUserBalance] = useState<number>(0)
  
  const { toast } = useToast()
  const { client } = useMatrixClient()

  if (!lcDetails) return null

  // Determine available actions based on current status and user role
  const getAvailableActions = (): LCAction[] => {
    const isOriginalProposer = lcDetails.sender === client?.getUserId()
    
    switch (currentStatus) {
      case "proposal":
        if (isOriginalProposer) {
          return [
            {
              action: "fund",
              status: "funded",
              buttonText: "Fund LC",
              buttonColor: "default",
              icon: <Wallet className="h-4 w-4" />,
              description: "Transfer funds to LC escrow account"
            }
          ]
        } else {
          return [
            {
              action: "agree",
              status: "agreed",
              buttonText: "Accept LC Terms",
              buttonColor: "default", 
              icon: <Check className="h-4 w-4" />,
              description: "Accept the Letter of Credit as proposed"
            },
            {
              action: "counter",
              status: "negotiating",
              buttonText: "Counter Proposal",
              buttonColor: "outline",
              icon: <FileText className="h-4 w-4" />,
              description: "Propose modified terms"
            }
          ]
        }
      
      case "agreed":
        if (isOriginalProposer) {
          return [
            {
              action: "fund",
              status: "funded",
              buttonText: "Fund LC",
              buttonColor: "default",
              icon: <Wallet className="h-4 w-4" />,
              description: "Transfer funds to LC escrow"
            }
          ]
        }
        return []
      
      case "funded":
        if (!isOriginalProposer) { // Seller actions
          return [
            {
              action: "confirm_shipment",
              status: "shipped",
              buttonText: "Confirm Shipment",
              buttonColor: "default",
              icon: <Ship className="h-4 w-4" />,
              description: "Confirm goods have been shipped"
            }
          ]
        }
        return []
        
      case "shipped":
        if (!isOriginalProposer) { // Seller submits documents
          return [
            {
              action: "submit_documents",
              status: "documents_submitted",
              buttonText: "Submit Documents",
              buttonColor: "default",
              icon: <FileText className="h-4 w-4" />,
              description: "Submit required trade documents"
            }
          ]
        }
        return []
        
      case "documents_submitted":
        if (isOriginalProposer) { // Buyer reviews and confirms
          return [
            {
              action: "confirm_delivery",
              status: "completed",
              buttonText: "Confirm Delivery",
              buttonColor: "default",
              icon: <Check className="h-4 w-4" />,
              description: "Confirm delivery and release payment"
            },
            {
              action: "dispute",
              status: "disputed", 
              buttonText: "Raise Dispute",
              buttonColor: "destructive",
              icon: <AlertTriangle className="h-4 w-4" />,
              description: "Dispute the delivery or documents"
            }
          ]
        }
        return []
        
      default:
        return []
    }
  }

  // Check user's wallet balance for funding validation
  useEffect(() => {
    const checkBalance = async () => {
      if (lcDetails?.terms.currency && lcDetails?.terms.lcAmount) {
        // Mock balance check - replace with actual wallet API call
        setUserBalance(100000) // Demo balance
      }
    }
    checkBalance()
  }, [lcDetails])

  const handleLCAction = async (action: LCAction) => {
    if (!client || !roomId || !lcDetails) return

    setIsProcessing(true)

    try {
      let message: any = {
        msgtype: "m.room.message",
        body: "",
      }

      switch (action.action) {
        case "agree":
          message.body = `✅ LC Terms Accepted\n\nI agree to the Letter of Credit terms as proposed.\nLC Hash: ${lcDetails.hash}`
          message["m.clic.lc"] = {
            type: "agreement",
            original_hash: lcDetails.hash,
            action: "accept",
            timestamp: Date.now().toString()
          }
          break

        case "counter":
          if (!counterTerms.trim()) {
            toast({
              title: "Counter proposal required",
              description: "Please provide your counter proposal terms",
              variant: "destructive",
            })
            setIsProcessing(false)
            return
          }
          message.body = `💬 LC Counter Proposal\n\n${counterTerms}\n\nOriginal LC Hash: ${lcDetails.hash}`
          message["m.clic.lc"] = {
            type: "counter_proposal", 
            original_hash: lcDetails.hash,
            counter_terms: counterTerms,
            timestamp: Date.now().toString()
          }
          break

        case "fund":
          // Validate funding amount
          const lcAmount = parseFloat(lcDetails.terms.lcAmount || "0")
          if (userBalance < lcAmount) {
            toast({
              title: "Insufficient funds",
              description: `You need ${lcAmount} ${lcDetails.terms.currency} but only have ${userBalance}`,
              variant: "destructive",
            })
            setIsProcessing(false)
            return
          }
          
          message.body = `💰 LC Funded\n\n${lcDetails.terms.lcAmount} ${lcDetails.terms.currency} has been transferred to LC escrow.\nLC Hash: ${lcDetails.hash}`
          message["m.clic.lc"] = {
            type: "funding",
            original_hash: lcDetails.hash,
            amount: lcDetails.terms.lcAmount,
            currency: lcDetails.terms.currency,
            escrow_tx_hash: "demo_tx_" + Date.now().toString(), // Would be real blockchain tx hash
            timestamp: Date.now().toString()
          }
          break

        case "confirm_shipment":
          message.body = `🚢 Shipment Confirmed\n\nGoods have been shipped as per LC terms.\nShipment Date: ${new Date().toISOString().split('T')[0]}\nLC Hash: ${lcDetails.hash}`
          message["m.clic.lc"] = {
            type: "shipment", 
            original_hash: lcDetails.hash,
            shipment_date: new Date().toISOString(),
            tracking_number: "DEMO" + Date.now().toString(),
            timestamp: Date.now().toString()
          }
          break

        case "submit_documents":
          message.body = `📄 Documents Submitted\n\nAll required trade documents have been uploaded for verification.\nLC Hash: ${lcDetails.hash}`
          message["m.clic.lc"] = {
            type: "documents",
            original_hash: lcDetails.hash,
            document_hashes: ["doc1_hash", "doc2_hash", "doc3_hash"], // IPFS hashes
            submission_date: new Date().toISOString(),
            timestamp: Date.now().toString()
          }
          break

        case "confirm_delivery":
          message.body = `✅ Delivery Confirmed\n\nGoods delivered as per LC terms. Payment released to seller.\nLC Hash: ${lcDetails.hash}`
          message["m.clic.lc"] = {
            type: "delivery_confirmation",
            original_hash: lcDetails.hash,
            release_tx_hash: "release_tx_" + Date.now().toString(),
            confirmation_date: new Date().toISOString(),
            timestamp: Date.now().toString()
          }
          break

        case "dispute":
          message.body = `⚠️ Dispute Raised\n\nA dispute has been raised regarding this LC. Arbitration may be required.\nLC Hash: ${lcDetails.hash}`
          message["m.clic.lc"] = {
            type: "dispute",
            original_hash: lcDetails.hash,
            dispute_reason: "Documents/delivery issue", // Would allow user input
            timestamp: Date.now().toString()
          }
          break
      }

      // Send the message
      await client.sendEvent(roomId, "m.room.message", message)

      // Update local status
      setCurrentStatus(action.status)

      toast({
        title: `${action.buttonText} successful`,
        description: "LC status updated and notification sent to room",
      })

      // Close dialog after successful action
      if (action.action !== "counter") {
        onClose()
      } else {
        setShowCounterForm(false)
        setCounterTerms("")
      }

    } catch (error) {
      console.error("Error processing LC action:", error)
      toast({
        title: `Failed to ${action.buttonText.toLowerCase()}`,
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const availableActions = getAvailableActions()
  const formatCurrency = (amount: string, currency: string) => 
    `${parseFloat(amount).toLocaleString()} ${currency}`

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Letter of Credit Details
          </DialogTitle>
          <DialogDescription>Review the LC terms and take appropriate action</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* LC Status Badge */}
          <div className="flex items-center justify-between">
            <Badge variant={currentStatus === "completed" ? "default" : "secondary"}>
              {currentStatus.toUpperCase().replace("_", " ")}
            </Badge>
            <div className="text-sm text-muted-foreground">
              From: {lcDetails.sender}
            </div>
          </div>

          {/* Financial Summary */}
          <div className="p-4 border rounded-md bg-muted/30">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">LC Amount</div>
                <div className="text-lg font-bold text-primary">
                  {formatCurrency(lcDetails.terms.lcAmount || "0", lcDetails.terms.currency || "")}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Commodity</div>
                <div className="font-semibold">
                  {lcDetails.terms.commodity} 
                  <span className="text-muted-foreground ml-2">
                    ({lcDetails.terms.quantity} {lcDetails.terms.unitOfMeasure})
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* LC Terms Details */}
          <div className="space-y-4">
            <h4 className="font-semibold">LC Terms</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Delivery Terms:</strong> {lcDetails.terms.deliveryTerms}
              </div>
              <div>
                <strong>Tolerance:</strong> ±{lcDetails.terms.tolerance}%
              </div>
              <div>
                <strong>Port of Loading:</strong> {lcDetails.terms.portOfLoading}
              </div>
              <div>
                <strong>Port of Discharge:</strong> {lcDetails.terms.portOfDischarge}
              </div>
              <div>
                <strong>Latest Shipment:</strong> {lcDetails.terms.latestShipmentDate}
              </div>
              <div>
                <strong>Document Deadline:</strong> {lcDetails.terms.documentDeadline} days
              </div>
            </div>

            {lcDetails.terms.requiredDocuments && (
              <div>
                <strong>Required Documents:</strong>
                <div className="flex flex-wrap gap-1 mt-1">
                  {lcDetails.terms.requiredDocuments.map((doc) => (
                    <Badge key={doc} variant="outline" className="text-xs">
                      {doc.replace("_", " ").toUpperCase()}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {lcDetails.terms.specialConditions && (
              <div>
                <strong>Special Conditions:</strong>
                <p className="text-sm mt-1 p-2 bg-muted/50 rounded">
                  {lcDetails.terms.specialConditions}
                </p>
              </div>
            )}
          </div>

          {/* Legal Terms */}
          <div className="grid grid-cols-2 gap-4 text-sm p-3 bg-muted/20 rounded">
            <div>
              <strong>Governing Law:</strong> {lcDetails.terms.governingLaw}
            </div>
            <div>
              <strong>Arbitration:</strong> {lcDetails.terms.arbitrationClause}
            </div>
          </div>

          {/* LC Hash for Verification */}
          <div className="p-3 bg-muted/20 rounded font-mono text-xs">
            <strong>LC Hash:</strong> {lcDetails.hash}
          </div>

          <Separator />

          {/* Counter Proposal Form */}
          {showCounterForm && (
            <div className="space-y-3">
              <h4 className="font-semibold">Counter Proposal</h4>
              <textarea
                placeholder="Describe your proposed changes to the LC terms..."
                value={counterTerms}
                onChange={(e) => setCounterTerms(e.target.value)}
                className="w-full p-3 border rounded-md min-h-24"
              />
            </div>
          )}

          {/* Funding Validation */}
          {availableActions.some(a => a.action === "fund") && (
            <div className="p-3 border rounded-md bg-blue-50 dark:bg-blue-900/20">
              <div className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4" />
                <span>
                  <strong>Balance Check:</strong> {userBalance.toLocaleString()} {lcDetails.terms.currency}
                  {userBalance >= parseFloat(lcDetails.terms.lcAmount || "0") ? 
                    " ✅ Sufficient funds" : " ❌ Insufficient funds"}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          
          {availableActions.map((action) => (
            <Button
              key={action.action}
              variant={action.buttonColor}
              onClick={() => {
                if (action.action === "counter") {
                  setShowCounterForm(!showCounterForm)
                } else {
                  handleLCAction(action)
                }
              }}
              disabled={isProcessing || (action.action === "fund" && userBalance < parseFloat(lcDetails.terms.lcAmount || "0"))}
              className="flex items-center gap-2"
            >
              {isProcessing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                action.icon
              )}
              {action.buttonText}
            </Button>
          ))}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}