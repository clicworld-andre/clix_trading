"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { 
  LetterOfCredit, 
  LCDocument, 
  getLCStatusColor, 
  calculateLCProgress,
  lcService 
} from "@/lib/lc"
import {
  FileText,
  Users,
  DollarSign,
  Package,
  Calendar,
  MapPin,
  Ship,
  Building2,
  CreditCard,
  Clock,
  CheckCircle,
  AlertCircle,
  Download,
  Upload,
  Eye,
  MessageCircle,
  Edit,
  RefreshCw,
  Truck,
  Plane,
  ExternalLink,
  Copy,
  Shield
} from "lucide-react"

interface LCDetailsViewProps {
  lcId: string
  onEdit?: (lcId: string) => void
  onChat?: (roomId: string) => void
  className?: string
}

export function LCDetailsView({ lcId, onEdit, onChat, className }: LCDetailsViewProps) {
  const [lc, setLC] = useState<LetterOfCredit | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (lcId) {
      loadLCDetails()
    }
  }, [lcId])

  const loadLCDetails = async () => {
    setLoading(true)
    try {
      const response = await lcService.getLCById(lcId)
      if (response.success && response.letterOfCredit) {
        setLC(response.letterOfCredit)
      } else {
        toast({
          title: "Error",
          description: "Failed to load LC details",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error loading LC details:", error)
      toast({
        title: "Error",
        description: "Failed to load LC details",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadLCDetails()
    setRefreshing(false)
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied",
      description: `${label} copied to clipboard`
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-clix-orange border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">Loading LC details...</p>
        </div>
      </div>
    )
  }

  if (!lc) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">LC Not Found</h3>
        <p className="text-muted-foreground">
          The requested Letter of Credit could not be found.
        </p>
      </div>
    )
  }

  const progress = calculateLCProgress(lc.status)

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">{lc.lcNumber}</h2>
            <Badge variant={getLCStatusColor(lc.status)} className="capitalize">
              {lc.status.replace('_', ' ')}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {lc.terms.commodity} • {lc.terms.quantity} • {lc.terms.amount} {lc.terms.currency}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {lc.matrixRoomId && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onChat?.(lc.matrixRoomId!)}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Chat
            </Button>
          )}
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onEdit?.(lc.id)}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">LC Progress</span>
              <span className="text-sm text-muted-foreground">{progress}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
            <div className="text-xs text-muted-foreground">
              Status: {lc.status.replace('_', ' ').toUpperCase()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="parties">Parties</TabsTrigger>
          <TabsTrigger value="terms">Terms</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Financial Summary */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Value</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{lc.terms.amount} {lc.terms.currency}</div>
                <p className="text-xs text-muted-foreground">
                  Unit Price: {lc.terms.unitPrice}
                </p>
              </CardContent>
            </Card>

            {/* Commodity Info */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Commodity</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{lc.terms.quantity}</div>
                <p className="text-xs text-muted-foreground">
                  {lc.terms.commodity}
                </p>
              </CardContent>
            </Card>

            {/* Timeline Info */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Expiry Date</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {new Date(lc.terms.expiryDate).toLocaleDateString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Shipment: {new Date(lc.terms.latestShipmentDate).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Smart Contract Information */}
          {lc.contractAddress && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Smart Contract Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Contract Address:</span>
                  <div className="flex items-center gap-2">
                    <code className="px-2 py-1 bg-muted rounded text-sm">
                      {lc.contractAddress.slice(0, 8)}...{lc.contractAddress.slice(-8)}
                    </code>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => copyToClipboard(lc.contractAddress!, "Contract address")}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                
                {lc.deploymentTx && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Deployment Tx:</span>
                    <div className="flex items-center gap-2">
                      <code className="px-2 py-1 bg-muted rounded text-sm">
                        {lc.deploymentTx.slice(0, 8)}...{lc.deploymentTx.slice(-8)}
                      </code>
                      <Button size="sm" variant="ghost">
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Shipping Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ship className="w-5 h-5" />
                Shipping Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{lc.terms.portOfLoading}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 border-t border-dashed"></div>
                  <Truck className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1 border-t border-dashed"></div>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{lc.terms.portOfDestination}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <label className="text-xs text-muted-foreground">Incoterms</label>
                  <p className="text-sm font-medium">{lc.terms.incoterms}</p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Partial Shipments</label>
                  <p className="text-sm font-medium">
                    {lc.terms.partialShipments ? 'Allowed' : 'Not Allowed'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Parties Tab */}
        <TabsContent value="parties" className="space-y-4">
          <div className="grid gap-4">
            {/* Buyer */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Buyer (Applicant)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Company Name</label>
                    <p className="text-sm font-medium">{lc.terms.buyer.name}</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Address</label>
                    <p className="text-sm">{lc.terms.buyer.address}</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Matrix ID</label>
                    <p className="text-sm font-mono">{lc.terms.buyer.matrixId}</p>
                  </div>
                  {lc.terms.buyer.walletAddress && (
                    <div>
                      <label className="text-xs text-muted-foreground">Wallet Address</label>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-mono">{lc.terms.buyer.walletAddress}</p>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => copyToClipboard(lc.terms.buyer.walletAddress!, "Buyer wallet address")}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Seller */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Seller (Beneficiary)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground">Company Name</label>
                    <p className="text-sm font-medium">{lc.terms.seller.name}</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Address</label>
                    <p className="text-sm">{lc.terms.seller.address}</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Matrix ID</label>
                    <p className="text-sm font-mono">{lc.terms.seller.matrixId}</p>
                  </div>
                  {lc.terms.seller.walletAddress && (
                    <div>
                      <label className="text-xs text-muted-foreground">Wallet Address</label>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-mono">{lc.terms.seller.walletAddress}</p>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => copyToClipboard(lc.terms.seller.walletAddress!, "Seller wallet address")}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Banking Details */}
            {(lc.terms.issuingBank || lc.terms.confirmingBank) && (
              <div className="grid md:grid-cols-2 gap-4">
                {lc.terms.issuingBank && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5" />
                        Issuing Bank
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div>
                          <label className="text-xs text-muted-foreground">Bank Name</label>
                          <p className="text-sm font-medium">{lc.terms.issuingBank.name}</p>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Address</label>
                          <p className="text-sm">{lc.terms.issuingBank.address}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {lc.terms.confirmingBank && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5" />
                        Confirming Bank
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div>
                          <label className="text-xs text-muted-foreground">Bank Name</label>
                          <p className="text-sm font-medium">{lc.terms.confirmingBank.name}</p>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Address</label>
                          <p className="text-sm">{lc.terms.confirmingBank.address}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* Terms Tab */}
        <TabsContent value="terms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Letter of Credit Terms & Conditions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Financial Terms */}
              <div>
                <h4 className="font-medium mb-3">Financial Terms</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground">LC Type</label>
                    <p className="text-sm capitalize">{lc.terms.lcType}</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Currency</label>
                    <p className="text-sm">{lc.terms.currency}</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Amount</label>
                    <p className="text-sm font-medium">{lc.terms.amount}</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Unit Price</label>
                    <p className="text-sm">{lc.terms.unitPrice}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Commodity Details */}
              <div>
                <h4 className="font-medium mb-3">Commodity Details</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground">Description</label>
                    <p className="text-sm">{lc.terms.commodity}</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Quantity</label>
                    <p className="text-sm">{lc.terms.quantity}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Required Documents */}
              <div>
                <h4 className="font-medium mb-3">Required Documents</h4>
                <ul className="space-y-1">
                  {lc.terms.requiredDocuments.map((doc, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <FileText className="w-3 h-3 text-muted-foreground" />
                      {doc}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Additional Terms */}
              {lc.terms.additionalTerms && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-3">Additional Terms</h4>
                    <p className="text-sm whitespace-pre-wrap">{lc.terms.additionalTerms}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Document Management
              </CardTitle>
              <CardDescription>
                Track and manage all LC-related documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Document management system will be available here</p>
                <Badge variant="outline" className="mt-2">Coming Soon</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                LC Timeline
              </CardTitle>
              <CardDescription>
                Track the progress and key milestones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">LC Created</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(lc.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {lc.fundedAt && (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">LC Funded</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(lc.fundedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}

                {lc.shippedAt && (
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Goods Shipped</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(lc.shippedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground">Expected Delivery</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(lc.terms.expiryDate).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}