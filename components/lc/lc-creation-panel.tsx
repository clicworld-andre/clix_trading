"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { useMatrixClient } from "@/lib/matrix-context"
import { 
  FileText, 
  Users, 
  DollarSign, 
  Calendar,
  MapPin,
  Package,
  CreditCard,
  Shield,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
  Plus,
  X
} from "lucide-react"

// LC Form Schema
const lcFormSchema = z.object({
  // Basic Information
  lcType: z.enum(["sight", "usance", "revolving"], {
    required_error: "Please select an LC type"
  }),
  amount: z.string().min(1, "Amount is required").refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Amount must be a positive number"
  }),
  currency: z.enum(["USD", "EUR", "GBP", "JPY", "XLM", "USDC", "EURC", "CLIX", "USD1", "XAU", "XCOF"], {
    required_error: "Please select a currency"
  }),
  
  // Parties
  buyerName: z.string().min(2, "Buyer name is required"),
  buyerAddress: z.string().min(5, "Buyer address is required"),
  buyerMatrixId: z.string().min(1, "Buyer Matrix ID is required"),
  sellerName: z.string().min(2, "Seller name is required"),
  sellerAddress: z.string().min(5, "Seller address is required"),
  sellerMatrixId: z.string().min(1, "Seller Matrix ID is required"),
  
  // Commodity Details
  commodity: z.string().min(2, "Commodity description is required"),
  quantity: z.string().min(1, "Quantity is required"),
  unitPrice: z.string().min(1, "Unit price is required").refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: "Unit price must be a positive number"
  }),
  
  // Terms & Conditions
  incoterms: z.enum(["FOB", "CIF", "CFR", "EXW", "FCA", "CPT", "CIP", "DAT", "DAP", "DDP"], {
    required_error: "Please select Incoterms"
  }),
  portOfLoading: z.string().min(2, "Port of loading is required"),
  portOfDestination: z.string().min(2, "Port of destination is required"),
  
  // Timeline
  expiryDate: z.string().min(1, "Expiry date is required"),
  latestShipmentDate: z.string().min(1, "Latest shipment date is required"),
  
  // Documents
  requiredDocuments: z.array(z.string()).min(1, "At least one document type is required"),
  
  // Banking
  issuingBank: z.string().optional(),
  confirmingBank: z.string().optional(),
  
  // Additional Terms
  additionalTerms: z.string().optional(),
  partialShipments: z.boolean().default(false),
  transhipment: z.boolean().default(false),
})

type LCFormData = z.infer<typeof lcFormSchema>

interface LCCreationPanelProps {
  onLCCreated?: (lcData: LCFormData) => void
  className?: string
}

const CURRENCIES = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥" },
  { code: "XLM", name: "Stellar Lumens", symbol: "XLM" },
  { code: "USDC", name: "USD Coin", symbol: "USDC" },
  { code: "EURC", name: "Euro Coin", symbol: "EURC" },
  { code: "CLIX", name: "CLIX Token", symbol: "CLIX" },
  { code: "USD1", name: "USD1", symbol: "USD1" },
  { code: "XAU", name: "Gold Token", symbol: "XAU" },
  { code: "XCOF", name: "CFA Franc", symbol: "XCOF" }
]

const DOCUMENT_TYPES = [
  "Commercial Invoice",
  "Packing List", 
  "Bill of Lading",
  "Certificate of Origin",
  "Insurance Policy",
  "Inspection Certificate",
  "Weight Certificate",
  "Quality Certificate",
  "Health Certificate",
  "Phytosanitary Certificate"
]

const INCOTERMS = [
  { code: "FOB", name: "Free On Board" },
  { code: "CIF", name: "Cost, Insurance & Freight" },
  { code: "CFR", name: "Cost & Freight" },
  { code: "EXW", name: "Ex Works" },
  { code: "FCA", name: "Free Carrier" },
  { code: "CPT", name: "Carriage Paid To" },
  { code: "CIP", name: "Carriage & Insurance Paid To" },
  { code: "DAT", name: "Delivered At Terminal" },
  { code: "DAP", name: "Delivered At Place" },
  { code: "DDP", name: "Delivered Duty Paid" }
]

export function LCCreationPanel({ onLCCreated, className }: LCCreationPanelProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState("basic")
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([])
  const { toast } = useToast()
  const { createRoom, sendMessage } = useMatrixClient()

  const form = useForm<LCFormData>({
    resolver: zodResolver(lcFormSchema),
    defaultValues: {
      lcType: "sight",
      currency: "USD",
      requiredDocuments: [],
      partialShipments: false,
      transhipment: false,
    }
  })

  const handleDocumentToggle = (doc: string) => {
    setSelectedDocuments(prev => {
      const newSelection = prev.includes(doc) 
        ? prev.filter(d => d !== doc)
        : [...prev, doc]
      form.setValue("requiredDocuments", newSelection)
      return newSelection
    })
  }

  const calculateTotalValue = () => {
    const quantity = Number(form.watch("quantity")) || 0
    const unitPrice = Number(form.watch("unitPrice")) || 0
    return quantity * unitPrice
  }

  const onSubmit = async (data: LCFormData) => {
    setIsLoading(true)
    
    try {
      // Create LC negotiation room in Matrix
      const roomName = `LC: ${data.commodity} - ${data.amount} ${data.currency}`
      const roomTopic = `Letter of Credit negotiation for ${data.commodity} between ${data.buyerName} and ${data.sellerName}`
      
      const roomId = await createRoom({
        name: roomName,
        topic: roomTopic,
        preset: "private_chat",
        invite: [data.buyerMatrixId, data.sellerMatrixId]
      })

      // Send initial LC proposal message
      await sendMessage(roomId, {
        msgtype: "m.clic.lc.proposal",
        body: `LC Proposal: ${data.commodity}`,
        lc_data: {
          ...data,
          totalValue: calculateTotalValue().toString(),
          status: "draft",
          created_at: new Date().toISOString(),
          room_id: roomId
        }
      })

      toast({
        title: "LC Created Successfully",
        description: `Letter of Credit for ${data.commodity} has been created and negotiation room opened.`,
      })

      onLCCreated?.(data)
      form.reset()
      setCurrentStep("basic")
      setSelectedDocuments([])

    } catch (error) {
      console.error("Error creating LC:", error)
      toast({
        title: "Error Creating LC",
        description: "There was an error creating the Letter of Credit. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getStepStatus = (step: string) => {
    switch(step) {
      case "basic":
        return form.formState.errors.lcType || form.formState.errors.amount || form.formState.errors.currency ? "error" : "pending"
      case "parties":
        return form.formState.errors.buyerName || form.formState.errors.sellerName ? "error" : "pending"
      case "commodity":
        return form.formState.errors.commodity || form.formState.errors.quantity ? "error" : "pending"
      case "terms":
        return form.formState.errors.incoterms || form.formState.errors.expiryDate ? "error" : "pending"
      default:
        return "pending"
    }
  }

  return (
    <div className={`w-full max-w-4xl mx-auto p-6 ${className}`}>
      <Card className="border-0 bg-card/50 backdrop-blur-sm">
        <CardHeader className="text-center pb-6">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-clix-orange to-clix-yellow bg-clip-text text-transparent">
            Create Letter of Credit
          </CardTitle>
          <CardDescription className="text-base">
            Create a new Letter of Credit and start the negotiation process with your trading partner
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs value={currentStep} onValueChange={setCurrentStep} className="w-full">
            <TabsList className="grid grid-cols-5 w-full mb-8">
              <TabsTrigger value="basic" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                <span className="hidden sm:inline">Basic Info</span>
              </TabsTrigger>
              <TabsTrigger value="parties" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Parties</span>
              </TabsTrigger>
              <TabsTrigger value="commodity" className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                <span className="hidden sm:inline">Commodity</span>
              </TabsTrigger>
              <TabsTrigger value="terms" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Terms</span>
              </TabsTrigger>
              <TabsTrigger value="review" className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span className="hidden sm:inline">Review</span>
              </TabsTrigger>
            </TabsList>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Basic Information Tab */}
              <TabsContent value="basic" className="space-y-6 mt-0">
                <Card className="border border-border/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-clix-orange" />
                      Basic LC Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="lcType">LC Type</Label>
                        <Select 
                          value={form.watch("lcType")} 
                          onValueChange={(value) => form.setValue("lcType", value as any)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select LC type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sight">Sight LC</SelectItem>
                            <SelectItem value="usance">Usance LC</SelectItem>
                            <SelectItem value="revolving">Revolving LC</SelectItem>
                          </SelectContent>
                        </Select>
                        {form.formState.errors.lcType && (
                          <p className="text-sm text-destructive mt-1">{form.formState.errors.lcType.message}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="amount">Amount</Label>
                        <Input
                          {...form.register("amount")}
                          placeholder="1000000"
                          type="number"
                          step="0.01"
                        />
                        {form.formState.errors.amount && (
                          <p className="text-sm text-destructive mt-1">{form.formState.errors.amount.message}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="currency">Currency</Label>
                        <Select 
                          value={form.watch("currency")} 
                          onValueChange={(value) => form.setValue("currency", value as any)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                          <SelectContent>
                            {CURRENCIES.map((currency) => (
                              <SelectItem key={currency.code} value={currency.code}>
                                <div className="flex items-center gap-2">
                                  <span>{currency.symbol}</span>
                                  <span>{currency.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {form.formState.errors.currency && (
                          <p className="text-sm text-destructive mt-1">{form.formState.errors.currency.message}</p>
                        )}
                      </div>
                    </div>

                    {form.watch("amount") && form.watch("currency") && (
                      <div className="p-4 bg-muted/50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">LC Amount:</span>
                          <Badge variant="secondary" className="text-base font-bold">
                            {CURRENCIES.find(c => c.code === form.watch("currency"))?.symbol} {Number(form.watch("amount")).toLocaleString()}
                          </Badge>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="flex justify-end">
                  <Button 
                    type="button"
                    onClick={() => setCurrentStep("parties")}
                    disabled={!form.watch("lcType") || !form.watch("amount") || !form.watch("currency")}
                  >
                    Next: Parties
                  </Button>
                </div>
              </TabsContent>

              {/* Parties Tab */}
              <TabsContent value="parties" className="space-y-6 mt-0">
                <Card className="border border-border/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-clix-orange" />
                      Trading Parties
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Buyer Information */}
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <CreditCard className="w-4 h-4" />
                        Buyer (Applicant)
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="buyerName">Company Name</Label>
                          <Input {...form.register("buyerName")} placeholder="ABC Trading Corp" />
                          {form.formState.errors.buyerName && (
                            <p className="text-sm text-destructive mt-1">{form.formState.errors.buyerName.message}</p>
                          )}
                        </div>
                        <div className="md:col-span-2">
                          <Label htmlFor="buyerAddress">Address</Label>
                          <Input {...form.register("buyerAddress")} placeholder="123 Business St, City, Country" />
                          {form.formState.errors.buyerAddress && (
                            <p className="text-sm text-destructive mt-1">{form.formState.errors.buyerAddress.message}</p>
                          )}
                        </div>
                        <div className="md:col-span-3">
                          <Label htmlFor="buyerMatrixId">Matrix ID</Label>
                          <Input {...form.register("buyerMatrixId")} placeholder="@buyer:matrix.org" />
                          {form.formState.errors.buyerMatrixId && (
                            <p className="text-sm text-destructive mt-1">{form.formState.errors.buyerMatrixId.message}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Seller Information */}
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Seller (Beneficiary)
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="sellerName">Company Name</Label>
                          <Input {...form.register("sellerName")} placeholder="XYZ Export Ltd" />
                          {form.formState.errors.sellerName && (
                            <p className="text-sm text-destructive mt-1">{form.formState.errors.sellerName.message}</p>
                          )}
                        </div>
                        <div className="md:col-span-2">
                          <Label htmlFor="sellerAddress">Address</Label>
                          <Input {...form.register("sellerAddress")} placeholder="456 Export Ave, Port City, Country" />
                          {form.formState.errors.sellerAddress && (
                            <p className="text-sm text-destructive mt-1">{form.formState.errors.sellerAddress.message}</p>
                          )}
                        </div>
                        <div className="md:col-span-3">
                          <Label htmlFor="sellerMatrixId">Matrix ID</Label>
                          <Input {...form.register("sellerMatrixId")} placeholder="@seller:matrix.org" />
                          {form.formState.errors.sellerMatrixId && (
                            <p className="text-sm text-destructive mt-1">{form.formState.errors.sellerMatrixId.message}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={() => setCurrentStep("basic")}>
                    Previous
                  </Button>
                  <Button 
                    type="button"
                    onClick={() => setCurrentStep("commodity")}
                    disabled={!form.watch("buyerName") || !form.watch("sellerName") || !form.watch("buyerMatrixId") || !form.watch("sellerMatrixId")}
                  >
                    Next: Commodity
                  </Button>
                </div>
              </TabsContent>

              {/* Commodity Tab */}
              <TabsContent value="commodity" className="space-y-6 mt-0">
                <Card className="border border-border/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="w-5 h-5 text-clix-orange" />
                      Commodity Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="commodity">Commodity Description</Label>
                      <Textarea 
                        {...form.register("commodity")} 
                        placeholder="Premium Quality Coffee Beans, Grade A, Arabica variety..."
                        rows={3}
                      />
                      {form.formState.errors.commodity && (
                        <p className="text-sm text-destructive mt-1">{form.formState.errors.commodity.message}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input {...form.register("quantity")} placeholder="1000 MT" />
                        {form.formState.errors.quantity && (
                          <p className="text-sm text-destructive mt-1">{form.formState.errors.quantity.message}</p>
                        )}
                      </div>
                      <div>
                        <Label htmlFor="unitPrice">Unit Price</Label>
                        <Input 
                          {...form.register("unitPrice")} 
                          placeholder="1000"
                          type="number"
                          step="0.01"
                        />
                        {form.formState.errors.unitPrice && (
                          <p className="text-sm text-destructive mt-1">{form.formState.errors.unitPrice.message}</p>
                        )}
                      </div>
                      <div>
                        <Label>Total Value</Label>
                        <div className="p-3 bg-muted/50 rounded-md border">
                          <Badge variant="secondary" className="text-base font-bold">
                            {CURRENCIES.find(c => c.code === form.watch("currency"))?.symbol} {calculateTotalValue().toLocaleString()}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={() => setCurrentStep("parties")}>
                    Previous
                  </Button>
                  <Button 
                    type="button"
                    onClick={() => setCurrentStep("terms")}
                    disabled={!form.watch("commodity") || !form.watch("quantity") || !form.watch("unitPrice")}
                  >
                    Next: Terms
                  </Button>
                </div>
              </TabsContent>

              {/* Terms Tab */}
              <TabsContent value="terms" className="space-y-6 mt-0">
                <Card className="border border-border/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-clix-orange" />
                      Terms & Conditions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Trade Terms */}
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Trade Terms
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="incoterms">Incoterms</Label>
                          <Select 
                            value={form.watch("incoterms")} 
                            onValueChange={(value) => form.setValue("incoterms", value as any)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select Incoterms" />
                            </SelectTrigger>
                            <SelectContent>
                              {INCOTERMS.map((term) => (
                                <SelectItem key={term.code} value={term.code}>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{term.code}</span>
                                    <span className="text-xs text-muted-foreground">{term.name}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {form.formState.errors.incoterms && (
                            <p className="text-sm text-destructive mt-1">{form.formState.errors.incoterms.message}</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="portOfLoading">Port of Loading</Label>
                          <Input {...form.register("portOfLoading")} placeholder="Port of Santos, Brazil" />
                          {form.formState.errors.portOfLoading && (
                            <p className="text-sm text-destructive mt-1">{form.formState.errors.portOfLoading.message}</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="portOfDestination">Port of Destination</Label>
                          <Input {...form.register("portOfDestination")} placeholder="Port of Hamburg, Germany" />
                          {form.formState.errors.portOfDestination && (
                            <p className="text-sm text-destructive mt-1">{form.formState.errors.portOfDestination.message}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Timeline */}
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Timeline
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="latestShipmentDate">Latest Shipment Date</Label>
                          <Input 
                            {...form.register("latestShipmentDate")} 
                            type="date"
                            min={new Date().toISOString().split('T')[0]}
                          />
                          {form.formState.errors.latestShipmentDate && (
                            <p className="text-sm text-destructive mt-1">{form.formState.errors.latestShipmentDate.message}</p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="expiryDate">LC Expiry Date</Label>
                          <Input 
                            {...form.register("expiryDate")} 
                            type="date"
                            min={new Date().toISOString().split('T')[0]}
                          />
                          {form.formState.errors.expiryDate && (
                            <p className="text-sm text-destructive mt-1">{form.formState.errors.expiryDate.message}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Required Documents */}
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Shield className="w-4 h-4" />
                        Required Documents
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {DOCUMENT_TYPES.map((doc) => (
                          <div key={doc} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={doc}
                              checked={selectedDocuments.includes(doc)}
                              onChange={() => handleDocumentToggle(doc)}
                              className="rounded border-border"
                            />
                            <label htmlFor={doc} className="text-sm font-medium leading-none">
                              {doc}
                            </label>
                          </div>
                        ))}
                      </div>
                      {form.formState.errors.requiredDocuments && (
                        <p className="text-sm text-destructive mt-1">{form.formState.errors.requiredDocuments.message}</p>
                      )}
                    </div>

                    <Separator />

                    {/* Additional Terms */}
                    <div>
                      <Label htmlFor="additionalTerms">Additional Terms & Conditions</Label>
                      <Textarea 
                        {...form.register("additionalTerms")} 
                        placeholder="Any additional terms, special instructions, or conditions..."
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={() => setCurrentStep("commodity")}>
                    Previous
                  </Button>
                  <Button 
                    type="button"
                    onClick={() => setCurrentStep("review")}
                    disabled={!form.watch("incoterms") || !form.watch("expiryDate") || selectedDocuments.length === 0}
                  >
                    Review LC
                  </Button>
                </div>
              </TabsContent>

              {/* Review Tab */}
              <TabsContent value="review" className="space-y-6 mt-0">
                <Card className="border border-border/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-clix-orange" />
                      Review Letter of Credit
                    </CardTitle>
                    <CardDescription>
                      Please review all details before creating the LC and starting negotiations
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* LC Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card className="p-4 bg-muted/30">
                        <h4 className="font-semibold mb-2">LC Details</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Type:</span>
                            <Badge variant="outline">{form.watch("lcType")?.toUpperCase()}</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span>Amount:</span>
                            <span className="font-bold">{CURRENCIES.find(c => c.code === form.watch("currency"))?.symbol} {Number(form.watch("amount")).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Commodity:</span>
                            <span>{form.watch("commodity")?.substring(0, 30)}...</span>
                          </div>
                        </div>
                      </Card>

                      <Card className="p-4 bg-muted/30">
                        <h4 className="font-semibold mb-2">Timeline</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Latest Shipment:</span>
                            <span>{form.watch("latestShipmentDate")}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>LC Expiry:</span>
                            <span>{form.watch("expiryDate")}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Documents Required:</span>
                            <Badge>{selectedDocuments.length} types</Badge>
                          </div>
                        </div>
                      </Card>
                    </div>

                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-950/20 dark:border-amber-800/30">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-amber-800 dark:text-amber-200">Ready to Create LC</h4>
                          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                            Creating this LC will:
                          </p>
                          <ul className="text-sm text-amber-700 dark:text-amber-300 mt-2 list-disc list-inside space-y-1">
                            <li>Create a secure Matrix negotiation room</li>
                            <li>Invite both buyer and seller to the room</li>
                            <li>Send the initial LC proposal for review</li>
                            <li>Begin the negotiation and approval process</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={() => setCurrentStep("terms")}>
                    Previous
                  </Button>
                  <Button type="submit" disabled={isLoading} className="bg-gradient-to-r from-clix-orange to-clix-yellow text-white">
                    {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Create Letter of Credit
                  </Button>
                </div>
              </TabsContent>

            </form>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}