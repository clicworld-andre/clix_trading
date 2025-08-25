"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { useMobile } from "@/hooks/use-mobile"
import ChatArchiveViewer from "./chat-archive-viewer"
import {
  X,
  ExternalLink,
  Copy,
  Download,
  Calendar,
  User,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  Hash,
  Shield,
  MessageCircle,
  FileText,
  Activity,
  ArrowRight,
  Info
} from "lucide-react"

import {
  TradeRecord,
  ChatArchive,
  TradeStatus,
  TradeDirection,
  StellarTransactionDetails
} from "@/lib/trade-history-types"

interface TradeDetailsModalProps {
  trade: TradeRecord | null
  isOpen: boolean
  onClose: () => void
  onChatArchiveLoad?: (roomId: string) => Promise<ChatArchive | null>
}

export default function TradeDetailsModal({
  trade,
  isOpen,
  onClose,
  onChatArchiveLoad
}: TradeDetailsModalProps) {
  const [activeTab, setActiveTab] = useState("details")
  const [chatArchive, setChatArchive] = useState<ChatArchive | null>(null)
  const [loadingArchive, setLoadingArchive] = useState(false)
  const { toast } = useToast()
  const isMobile = useMobile()

  // Load chat archive when trade changes or chat tab is selected
  useEffect(() => {
    if (trade && activeTab === "chat" && !chatArchive && onChatArchiveLoad) {
      loadChatArchive()
    }
  }, [trade, activeTab])

  const loadChatArchive = async () => {
    if (!trade || !onChatArchiveLoad) return

    setLoadingArchive(true)
    try {
      const archive = await onChatArchiveLoad(trade.roomId)
      setChatArchive(archive)
    } catch (error) {
      console.error('Failed to load chat archive:', error)
      toast({
        title: "Failed to load chat archive",
        description: "Could not retrieve the archived chat messages",
        variant: "destructive"
      })
    } finally {
      setLoadingArchive(false)
    }
  }

  // Reset state when modal closes or trade changes
  useEffect(() => {
    if (!isOpen) {
      setActiveTab("details")
      setChatArchive(null)
    }
  }, [isOpen, trade?.id])

  if (!trade) return null

  const getStatusIcon = (status: TradeStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-gray-500" />
      case 'expired':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusBadge = (status: TradeStatus) => {
    const variants: Record<TradeStatus, "default" | "secondary" | "destructive" | "outline"> = {
      completed: "default",
      pending: "secondary",
      failed: "destructive", 
      cancelled: "outline",
      expired: "destructive"
    }

    const colors: Record<TradeStatus, string> = {
      completed: "bg-green-500 hover:bg-green-600",
      pending: "bg-yellow-500 hover:bg-yellow-600",
      failed: "bg-red-500 hover:bg-red-600",
      cancelled: "bg-gray-500 hover:bg-gray-600",
      expired: "bg-orange-500 hover:bg-orange-600"
    }
    
    return (
      <Badge variant={variants[status]} className={`${colors[status]} text-white`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const getDirectionIcon = (direction: TradeDirection) => {
    return direction === 'buy' ? (
      <TrendingUp className="h-5 w-5 text-green-500" />
    ) : (
      <TrendingDown className="h-5 w-5 text-red-500" />
    )
  }

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    })
  }

  const formatAmount = (amount: string, code: string) => {
    const num = parseFloat(amount)
    return `${num.toLocaleString()} ${code}`
  }

  const formatPrice = (price: string, code: string) => {
    const num = parseFloat(price)
    return `${num.toFixed(4)} ${code}`
  }

  const copyToClipboard = async (text: string, description: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "Copied to clipboard",
        description: description
      })
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Could not copy to clipboard",
        variant: "destructive"
      })
    }
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase()
  }

  const exportTradeData = () => {
    const exportData = {
      trade: {
        id: trade.id,
        orderId: trade.orderId,
        status: trade.status,
        type: trade.type,
        direction: trade.direction,
        createdAt: formatTimestamp(trade.createdAt),
        completedAt: trade.completedAt ? formatTimestamp(trade.completedAt) : null,
        baseAsset: trade.baseAsset,
        counterAsset: trade.counterAsset,
        amount: trade.amount,
        price: trade.price,
        totalValue: trade.totalValue,
        initiator: trade.initiator,
        counterparty: trade.counterparty,
        stellarTransaction: trade.stellarTransaction
      },
      chatArchive: chatArchive ? {
        messageCount: chatArchive.messageCount,
        participants: chatArchive.participants,
        archiveHash: chatArchive.archiveHash,
        timeRange: {
          start: formatTimestamp(chatArchive.startTimestamp),
          end: formatTimestamp(chatArchive.endTimestamp)
        }
      } : null,
      exportDate: new Date().toISOString()
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trade-${trade.id}-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Trade exported",
      description: "Trade data has been downloaded as JSON"
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-4xl h-[90vh] flex flex-col ${isMobile ? 'max-w-[95vw]' : ''}`}>
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {getDirectionIcon(trade.direction)}
                {getStatusIcon(trade.status)}
              </div>
              <div>
                <DialogTitle className="text-xl">
                  {trade.direction.toUpperCase()} {trade.baseAsset.code}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2 mt-1">
                  <span>Trade ID: {trade.id}</span>
                  {trade.orderId && (
                    <>
                      <span>•</span>
                      <span>Order: {trade.orderId}</span>
                    </>
                  )}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(trade.status)}
              <Button variant="outline" size="sm" onClick={exportTradeData}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              Trade Details
            </TabsTrigger>
            <TabsTrigger value="transaction" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Transaction
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Chat Archive
              {trade.chatArchive && (
                <Badge variant="outline" className="ml-1 text-xs">
                  {trade.chatArchive.messageCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Trade Details Tab */}
          <TabsContent value="details" className="flex-1 overflow-auto mt-4">
            <div className="space-y-6">
              {/* Trade Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Trade Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Direction</label>
                        <div className="flex items-center gap-2 mt-1">
                          {getDirectionIcon(trade.direction)}
                          <span className="font-semibold capitalize">{trade.direction}</span>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Amount</label>
                        <div className="text-lg font-bold mt-1">
                          {formatAmount(trade.amount, trade.baseAsset.code)}
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Price</label>
                        <div className="text-lg font-bold mt-1">
                          {formatPrice(trade.price, trade.counterAsset.code)}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Total Value</label>
                        <div className="text-xl font-bold text-primary mt-1">
                          ${parseFloat(trade.totalValue).toLocaleString()}
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Type</label>
                        <div className="mt-1">
                          <Badge variant="outline" className="uppercase">
                            {trade.type}
                          </Badge>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Status</label>
                        <div className="mt-1">
                          {getStatusBadge(trade.status)}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Assets */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Assets</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Base Asset</label>
                      <div className="p-3 border rounded-lg">
                        <div className="font-semibold">{trade.baseAsset.code}</div>
                        <div className="text-sm text-muted-foreground">{trade.baseAsset.name}</div>
                        {trade.baseAsset.issuer && (
                          <div className="text-xs text-muted-foreground font-mono mt-1 truncate">
                            {trade.baseAsset.issuer}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Counter Asset</label>
                      <div className="p-3 border rounded-lg">
                        <div className="font-semibold">{trade.counterAsset.code}</div>
                        <div className="text-sm text-muted-foreground">{trade.counterAsset.name}</div>
                        {trade.counterAsset.issuer && (
                          <div className="text-xs text-muted-foreground font-mono mt-1 truncate">
                            {trade.counterAsset.issuer}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Participants */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Participants</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground">Initiator</label>
                      <div className="flex items-center gap-3 p-3 border rounded-lg">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {getInitials(trade.initiator.username)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold">{trade.initiator.username}</div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {trade.initiator.matrixUserId}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {trade.counterparty && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-muted-foreground">Counterparty</label>
                        <div className="flex items-center gap-3 p-3 border rounded-lg">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>
                              {getInitials(trade.counterparty.username)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold">{trade.counterparty.username}</div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {trade.counterparty.matrixUserId}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Timestamps */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">Created</div>
                        <div className="text-sm text-muted-foreground">
                          {formatTimestamp(trade.createdAt)}
                        </div>
                      </div>
                    </div>
                    
                    {trade.completedAt && (
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <div>
                          <div className="text-sm font-medium">Completed</div>
                          <div className="text-sm text-muted-foreground">
                            {formatTimestamp(trade.completedAt)}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {trade.expiresAt && (
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-orange-500" />
                        <div>
                          <div className="text-sm font-medium">Expires</div>
                          <div className="text-sm text-muted-foreground">
                            {formatTimestamp(trade.expiresAt)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Notes and Tags */}
              {(trade.notes || (trade.tags && trade.tags.length > 0)) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Additional Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {trade.notes && (
                      <div className="mb-4">
                        <label className="text-sm font-medium text-muted-foreground">Notes</label>
                        <div className="mt-1 p-3 border rounded-lg bg-muted/30">
                          {trade.notes}
                        </div>
                      </div>
                    )}
                    
                    {trade.tags && trade.tags.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Tags</label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {trade.tags.map((tag, index) => (
                            <Badge key={index} variant="outline">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Transaction Tab */}
          <TabsContent value="transaction" className="flex-1 overflow-auto mt-4">
            {trade.stellarTransaction ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Stellar Transaction
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Transaction Hash</label>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="font-mono text-sm bg-muted p-2 rounded flex-1 truncate">
                            {trade.stellarTransaction.transactionHash}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(
                              trade.stellarTransaction?.transactionHash || '',
                              'Transaction hash copied'
                            )}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Source Account</label>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="font-mono text-sm bg-muted p-2 rounded flex-1 truncate">
                            {trade.stellarTransaction.sourceAccount}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(
                              trade.stellarTransaction?.sourceAccount || '',
                              'Account address copied'
                            )}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Operation Type</label>
                        <div className="mt-1">
                          <Badge variant="outline">
                            {trade.stellarTransaction.operationType}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Status</label>
                        <div className="flex items-center gap-2 mt-1">
                          {trade.stellarTransaction.success ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              <span className="text-green-600">Success</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4 text-red-500" />
                              <span className="text-red-600">Failed</span>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {trade.stellarTransaction.ledger && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Ledger</label>
                          <div className="text-lg font-mono mt-1">
                            {trade.stellarTransaction.ledger}
                          </div>
                        </div>
                      )}
                      
                      {trade.stellarTransaction.fee && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Fee</label>
                          <div className="text-lg font-mono mt-1">
                            {trade.stellarTransaction.fee} stroops
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {trade.stellarTransaction.memo && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Memo</label>
                      <div className="mt-1 p-3 border rounded-lg bg-muted/30 font-mono text-sm">
                        {trade.stellarTransaction.memo}
                      </div>
                    </div>
                  )}

                  {trade.stellarTransaction.timestamp && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Transaction Time</label>
                      <div className="text-sm mt-1">
                        {formatTimestamp(new Date(trade.stellarTransaction.timestamp).getTime())}
                      </div>
                    </div>
                  )}

                  {!trade.stellarTransaction.success && trade.stellarTransaction.errorMessage && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Error Message</label>
                      <div className="mt-1 p-3 border rounded-lg bg-red-50 text-red-800 text-sm">
                        {trade.stellarTransaction.errorMessage}
                      </div>
                    </div>
                  )}

                  {trade.stellarTransaction.transactionHash && (
                    <div className="flex justify-center pt-4">
                      <Button
                        variant="outline"
                        onClick={() => {
                          // Open Stellar expert or horizon explorer
                          const url = `https://stellar.expert/explorer/testnet/tx/${trade.stellarTransaction?.transactionHash}`
                          window.open(url, '_blank')
                        }}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View on Stellar Explorer
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                <Activity className="h-8 w-8 mr-2" />
                No transaction data available
              </div>
            )}
          </TabsContent>

          {/* Chat Archive Tab */}
          <TabsContent value="chat" className="flex-1 overflow-hidden mt-4">
            {loadingArchive ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
                <span className="ml-3 text-muted-foreground">Loading chat archive...</span>
              </div>
            ) : chatArchive ? (
              <ChatArchiveViewer
                archive={chatArchive}
                trade={trade}
                className="h-full"
              />
            ) : trade.chatArchive ? (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <MessageCircle className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Chat archive available</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={loadChatArchive}
                >
                  Load Archive
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-center">
                <MessageCircle className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No chat archive available</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Chat messages were not archived for this trade
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
