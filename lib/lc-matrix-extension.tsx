"use client"

// Letter of Credit Panel - Extension for Matrix Chat Platform
// Based on existing trade-panel.tsx structure

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { useMatrixClient } from "@/lib/matrix-context"
import { 
  FileText, 
  Ship, 
  DollarSign, 
  Calendar, 
  MapPin, 
  Package, 
  Scale,
  Gavel,
  Shield,
  Upload,
  Hash
} from "lucide-react"

interface LCPanelProps {
  roomId: string
}

// LC-specific data structures
const commodities = [
  { id: "gold", name: "Gold (XAU)", token: "XAU", unit: "troy oz" },
  { id: "coffee", name: "Coffee (XCOF)", token: "XCOF", unit: "metric tons" },
  { id: "wheat", name: "Wheat", token: "WHT", unit: "bushels" },
  { id: "oil", name: "Crude Oil", token: "OIL", unit: "barrels" },
  { id: "copper", name: "Copper", token: "COP", unit: "metric tons" },
]

const currencies = [
  { id: "usdc", name: "USD Coin", symbol: "USDC", icon: "💰" },
  { id: "eurc", name: "Euro Coin", symbol: "EURC", icon: "💶" },
  { id: "xlm", name: "Stellar Lumens", symbol: "XLM", icon: "⭐" },
  { id: "clix", name: "Clic Token", symbol: "CLIX", icon: "🎯" },
  { id: "usd1", name: "Kinesis USD", symbol: "USD1", icon: "💵" },
]

const deliveryTerms = [
  { id: "fob", name: "FOB (Free on Board)", description: "Seller delivers when goods pass the ship's rail" },
  { id: "cif", name: "CIF (Cost, Insurance & Freight)", description: "Seller pays for shipping and insurance" },
  { id: "dap", name: "DAP (Delivered at Place)", description: "Seller delivers to named destination" },
  { id: "exw", name: "EXW (Ex Works)", description: "Buyer collects from seller's premises" },
]

const documentTypes = [
  { id: "bill_of_lading", name: "Bill of Lading", required: true },
  { id: "commercial_invoice", name: "Commercial Invoice", required: true },
  { id: "packing_list", name: "Packing List", required: true },
  { id: "certificate_of_origin", name: "Certificate of Origin", required: false },
  { id: "inspection_certificate", name: "Inspection Certificate", required: false },
  { id: "insurance_certificate", name: "Insurance Certificate", required: false },
]

interface LCTerms {
  // Parties
  buyer: string
  seller: string
  applicant: string
  beneficiary: string
  
  // Commodity Details
  commodity: string
  commodityToken: string
  quantity: string
  unitOfMeasure: string
  qualitySpecs: string
  
  // Financial Terms
  lcAmount: string
  currency: string
  tolerance: string // +/- percentage
  
  // Delivery Terms
  deliveryTerms: string
  portOfLoading: string
  portOfDischarge: string
  deliveryDate: string
  latestShipmentDate: string
  
  // Documentation
  requiredDocuments: string[]
  documentDeadline: string
  
  // Special Conditions
  specialConditions: string
  arbitrationClause: string
  governingLaw: string
}

export default function LCPanel({ roomId }: LCPanelProps) {
  const [activeTab, setActiveTab] = useState("create")
  const [lcTerms, setLcTerms] = useState<Partial<LCTerms>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lcHistory, setLcHistory] = useState<any[]>([])
  
  const { toast } = useToast()
  const { client } = useMatrixClient()

  // Auto-populate user info from Matrix client
  useEffect(() => {
    if (client?.getUserId()) {
      setLcTerms(prev => ({
        ...prev,
        applicant: client.getUserId() || undefined
      }))
    }
  }, [client])

  const handleTermsChange = (field: keyof LCTerms, value: string | string[]) => {
    setLcTerms(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const generateLCHash = (terms: Partial<LCTerms>) => {
    // Create deterministic hash of LC terms for blockchain storage
    const termsString = JSON.stringify(terms, Object.keys(terms).sort())
    return btoa(termsString).substring(0, 16) // Simplified hash for demo
  }

  const sendLCProposal = async () => {
    if (!client || !roomId) return

    setIsSubmitting(true)
    try {
      // Generate LC hash for verification
      const lcHash = generateLCHash(lcTerms)
      
      // Create LC proposal message
      const proposalMessage = {
        msgtype: "m.room.message",
        body: `📋 Letter of Credit Proposal\n\n` +
              `🏦 LC Amount: ${lcTerms.lcAmount} ${lcTerms.currency}\n` +
              `📦 Commodity: ${lcTerms.commodity} (${lcTerms.quantity} ${lcTerms.unitOfMeasure})\n` +
              `🚢 Delivery: ${lcTerms.deliveryTerms}\n` +
              `📅 Latest Shipment: ${lcTerms.latestShipmentDate}\n` +
              `🔐 LC Hash: ${lcHash}`,
        format: "org.matrix.custom.html",
        formatted_body: `
          <h3>📋 Letter of Credit Proposal</h3>
          <p><strong>🏦 LC Amount:</strong> ${lcTerms.lcAmount} ${lcTerms.currency}</p>
          <p><strong>📦 Commodity:</strong> ${lcTerms.commodity} (${lcTerms.quantity} ${lcTerms.unitOfMeasure})</p>
          <p><strong>🚢 Delivery Terms:</strong> ${lcTerms.deliveryTerms}</p>
          <p><strong>📅 Latest Shipment:</strong> ${lcTerms.latestShipmentDate}</p>
          <p><strong>🔐 LC Hash:</strong> <code>${lcHash}</code></p>
        `,
        // Custom LC data for programmatic processing
        "m.clic.lc": {
          type: "proposal",
          version: "1.0",
          terms: lcTerms,
          hash: lcHash,
          timestamp: Date.now().toString()
        }
      }

      await client.sendEvent(roomId, "m.room.message", proposalMessage)

      toast({
        title: "LC Proposal Sent",
        description: `Letter of Credit proposal sent to room. Hash: ${lcHash}`,
      })

      // Reset form
      setLcTerms({})
      setActiveTab("history")
      
    } catch (error) {
      console.error("Error sending LC proposal:", error)
      toast({
        title: "Failed to send proposal",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Letter of Credit Manager
          </CardTitle>
          <CardDescription>
            Create and manage Letters of Credit for international commodity trading
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="create">Create LC</TabsTrigger>
              <TabsTrigger value="negotiate">Negotiate</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>

            {/* LC Creation Tab */}
            <TabsContent value="create" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Commodity Details */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Commodity Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label>Commodity</Label>
                      <Select
                        value={lcTerms.commodity}
                        onValueChange={(value) => {
                          const commodity = commodities.find(c => c.id === value)
                          handleTermsChange("commodity", commodity?.name || value)
                          handleTermsChange("commodityToken", commodity?.token || "")
                          handleTermsChange("unitOfMeasure", commodity?.unit || "")
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select commodity" />
                        </SelectTrigger>
                        <SelectContent>
                          {commodities.map((commodity) => (
                            <SelectItem key={commodity.id} value={commodity.id}>
                              {commodity.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        placeholder="Enter quantity"
                        value={lcTerms.quantity || ""}
                        onChange={(e) => handleTermsChange("quantity", e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <Label>Quality Specifications</Label>
                      <Textarea
                        placeholder="Describe quality requirements..."
                        value={lcTerms.qualitySpecs || ""}
                        onChange={(e) => handleTermsChange("qualitySpecs", e.target.value)}
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Financial Terms */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Financial Terms
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label>LC Amount</Label>
                      <Input
                        type="number"
                        placeholder="Enter amount"
                        value={lcTerms.lcAmount || ""}
                        onChange={(e) => handleTermsChange("lcAmount", e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <Label>Currency</Label>
                      <Select
                        value={lcTerms.currency}
                        onValueChange={(value) => handleTermsChange("currency", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                        <SelectContent>
                          {currencies.map((currency) => (
                            <SelectItem key={currency.id} value={currency.symbol}>
                              {currency.icon} {currency.name} ({currency.symbol})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Tolerance (+/-%)</Label>
                      <Select
                        value={lcTerms.tolerance}
                        onValueChange={(value) => handleTermsChange("tolerance", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select tolerance" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0% - Exact amount</SelectItem>
                          <SelectItem value="5">±5%</SelectItem>
                          <SelectItem value="10">±10%</SelectItem>
                          <SelectItem value="15">±15%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Delivery Terms */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Ship className="h-4 w-4" />
                      Delivery Terms
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label>Delivery Terms</Label>
                      <Select
                        value={lcTerms.deliveryTerms}
                        onValueChange={(value) => handleTermsChange("deliveryTerms", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select delivery terms" />
                        </SelectTrigger>
                        <SelectContent>
                          {deliveryTerms.map((term) => (
                            <SelectItem key={term.id} value={term.name}>
                              {term.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Port of Loading</Label>
                      <Input
                        placeholder="e.g., Port of Hamburg"
                        value={lcTerms.portOfLoading || ""}
                        onChange={(e) => handleTermsChange("portOfLoading", e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <Label>Port of Discharge</Label>
                      <Input
                        placeholder="e.g., Port of New York"
                        value={lcTerms.portOfDischarge || ""}
                        onChange={(e) => handleTermsChange("portOfDischarge", e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <Label>Latest Shipment Date</Label>
                      <Input
                        type="date"
                        value={lcTerms.latestShipmentDate || ""}
                        onChange={(e) => handleTermsChange("latestShipmentDate", e.target.value)}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Documentation Requirements */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Required Documents
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      {documentTypes.map((doc) => (
                        <div key={doc.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={doc.id}
                            checked={lcTerms.requiredDocuments?.includes(doc.id) || doc.required}
                            disabled={doc.required}
                            onChange={(e) => {
                              const current = lcTerms.requiredDocuments || []
                              if (e.target.checked) {
                                handleTermsChange("requiredDocuments", [...current, doc.id])
                              } else {
                                handleTermsChange("requiredDocuments", current.filter(d => d !== doc.id))
                              }
                            }}
                            className="rounded border-gray-300"
                          />
                          <Label htmlFor={doc.id} className="text-sm">
                            {doc.name} {doc.required && <span className="text-red-500">*</span>}
                          </Label>
                        </div>
                      ))}
                    </div>
                    
                    <div>
                      <Label>Document Presentation Deadline (days after shipment)</Label>
                      <Select
                        value={lcTerms.documentDeadline}
                        onValueChange={(value) => handleTermsChange("documentDeadline", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select deadline" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7">7 days</SelectItem>
                          <SelectItem value="14">14 days</SelectItem>
                          <SelectItem value="21">21 days</SelectItem>
                          <SelectItem value="30">30 days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Special Conditions */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Special Conditions & Legal Terms
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Special Conditions</Label>
                    <Textarea
                      placeholder="Any special requirements or conditions..."
                      value={lcTerms.specialConditions || ""}
                      onChange={(e) => handleTermsChange("specialConditions", e.target.value)}
                      rows={3}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Governing Law</Label>
                      <Select
                        value={lcTerms.governingLaw}
                        onValueChange={(value) => handleTermsChange("governingLaw", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select governing law" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="english">English Law</SelectItem>
                          <SelectItem value="new-york">New York State Law</SelectItem>
                          <SelectItem value="singapore">Singapore Law</SelectItem>
                          <SelectItem value="swiss">Swiss Law</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Arbitration</Label>
                      <Select
                        value={lcTerms.arbitrationClause}
                        onValueChange={(value) => handleTermsChange("arbitrationClause", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select arbitration" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="icc-paris">ICC Paris</SelectItem>
                          <SelectItem value="lcia-london">LCIA London</SelectItem>
                          <SelectItem value="siac-singapore">SIAC Singapore</SelectItem>
                          <SelectItem value="custom">Custom Arbitration</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Submit Button */}
              <div className="flex justify-end">
                <Button 
                  onClick={sendLCProposal}
                  disabled={isSubmitting || !lcTerms.commodity || !lcTerms.lcAmount}
                  className="min-w-40"
                >
                  {isSubmitting ? "Sending..." : "Send LC Proposal"}
                </Button>
              </div>
            </TabsContent>

            {/* Other tabs - placeholder for now */}
            <TabsContent value="negotiate">
              <Card>
                <CardContent className="py-8">
                  <div className="text-center">
                    <Gavel className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Negotiation Panel</h3>
                    <p className="text-muted-foreground mb-4">
                      Review and negotiate LC terms with counterparties
                    </p>
                    <p className="text-sm text-muted-foreground">
                      This panel will show active negotiations and allow term modifications
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents">
              <Card>
                <CardContent className="py-8">
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Document Management</h3>
                    <p className="text-muted-foreground mb-4">
                      Upload and verify trade documents
                    </p>
                    <p className="text-sm text-muted-foreground">
                      This panel will handle document uploads to IPFS and verification
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <Card>
                <CardContent className="py-8">
                  <div className="text-center">
                    <Hash className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">LC History</h3>
                    <p className="text-muted-foreground mb-4">
                      View past and active Letters of Credit
                    </p>
                    <p className="text-sm text-muted-foreground">
                      This panel will show LC status, blockchain hashes, and transaction history
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}