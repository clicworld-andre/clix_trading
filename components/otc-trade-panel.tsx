"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useMatrixClient } from "@/lib/matrix-context"
import { otcApi } from "@/lib/service"
import { createChatArchiveService } from "@/lib/chat-archive-service"
import { createTradeHistoryStorage } from "@/lib/trade-history-storage"
import { TradeRecord, TradeDirection, TradeStatus, TradeType } from "@/lib/trade-history-types"
import { 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  ArrowUpDown,
  History,
  BarChart3,
  Clock,
  CheckCircle2,
  DollarSign,
  Eye,
  Activity,
  ArrowUp,
  ArrowDown,
  Calculator
} from "lucide-react"
import { CustomDropdown } from "@/components/ui/custom-dropdown"

interface OTCTradePanelProps {
  roomId: string
  activeTab?: string
  onTabChange?: (tab: string) => void
}

// Bond market data
const bonds = [
  { 
    code: "US10Y", 
    name: "US 10Y Treasury",
    price: 98.5, 
    yield: 4.25,
    volume: "2.4B",
    change: 0.15,
    color: "bg-orange-500"
  },
  { 
    code: "US30Y", 
    name: "US 30Y Treasury",
    price: 95.2, 
    yield: 4.75,
    volume: "1.8B",
    change: -0.23,
    color: "bg-orange-500"
  },
  { 
    code: "UK10Y", 
    name: "UK 10Y Gilt",
    price: 99.1, 
    yield: 3.75,
    volume: "850M",
    change: 0.08,
    color: "bg-red-500"
  },
  { 
    code: "DE10Y", 
    name: "German 10Y Bund",
    price: 101.3, 
    yield: 2.25,
    volume: "1.2B",
    change: 0.12,
    color: "bg-yellow-500"
  }
]

interface Token {
  id: number
  token_name: string
  code: string
  asset_type: string
  img_url: string
  issuer_public: string
}

interface Order {
  auto_id: number
  order_id: string
  direction: "buy" | "sell"
  base_asset: string
  counter_asset: string
  amount: string
  price: string
  quantity: string
  status: string
  created_at: string
}

export default function OTCTradePanel({ roomId, activeTab = "trade", onTabChange }: OTCTradePanelProps) {
  const [selectedBond, setSelectedBond] = useState<string>("US10Y")
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy")
  const [amount, setAmount] = useState("")
  const [price, setPrice] = useState("")
  const [tokens, setTokens] = useState<Token[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [connectedUsername, setConnectedUsername] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  // Token-based trading states (like production)
  const [direction, setDirection] = useState<"buy" | "sell">("sell")
  const [baseAsset, setBaseAsset] = useState("")
  const [counterAsset, setCounterAsset] = useState("")
  const [orderAmount, setOrderAmount] = useState("")
  const [orderPrice, setOrderPrice] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [filteredBaseTokens, setFilteredBaseTokens] = useState<Token[]>([])
  const [filteredCounterTokens, setFilteredCounterTokens] = useState<Token[]>([])
  
  // Bond Calculator State
  const [calcInputs, setCalcInputs] = useState({
    faceValue: 1000,
    couponRate: 4.25,
    yearsToMaturity: 10,
    marketYield: 4.5,
    paymentFrequency: 2
  })
  const [calcResults, setCalcResults] = useState({
    couponPayment: 0,
    totalCoupons: 0,
    pvCoupons: 0,
    pvPrincipal: 0,
    bondPrice: 0
  })
  
  const { toast } = useToast()
  const { client } = useMatrixClient()
  
  // Trade completion tracking
  const [tradeStartTime, setTradeStartTime] = useState<number | null>(null)

  useEffect(() => {
    const matrixUserId = client?.getUserId() || ""
    const cleanMatrixId = matrixUserId.replace(/^@/, "").split(":")[0]

    if (cleanMatrixId) {
      const savedUsername = localStorage.getItem(`otc_chat_${cleanMatrixId}`)
      if (savedUsername) {
        setConnectedUsername(savedUsername)
        loadTokens()
        loadOrders()
      }
    }
  }, [client])
  
  // Filter tokens based on direction (like production)
  useEffect(() => {
    if (tokens.length > 0) {
      if (direction === "sell") {
        // When selling, base can be security, counter is fiat
        setFilteredBaseTokens(
          tokens.filter((token) => token.asset_type === "security"),
        )
        setFilteredCounterTokens(tokens.filter((token) => token.asset_type === "fiat"))
      } else {
        // When buying, base is fiat, counter can be security
        setFilteredBaseTokens(tokens.filter((token) => token.asset_type === "fiat"))
        setFilteredCounterTokens(
          tokens.filter((token) => token.asset_type === "security"),
        )
      }
      
      // Reset selections when direction changes
      setBaseAsset("")
      setCounterAsset("")
    }
  }, [direction, tokens])

  const loadTokens = async () => {
    try {
      const response = await otcApi.getTokens()
      
      if (response.success && response.data) {
        setTokens(response.data)
      } else {
        toast({
          title: "Failed to load tokens",
          description: response.error || "Could not load available tokens",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error loading tokens:", error)
      toast({
        title: "Failed to load tokens",
        description: error instanceof Error ? error.message : "Could not load available tokens",
        variant: "destructive",
      })
    }
  }

  const loadOrders = async () => {
    if (!connectedUsername) return

    try {
      const response = await otcApi.getOrders(connectedUsername, roomId)
      
      if (response.success && response.data) {
        setOrders(response.data)
      } else {
        toast({
          title: "Failed to load orders",
          description: response.error || "Could not load your orders",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error loading orders:", error)
      toast({
        title: "Failed to load orders",
        description: error instanceof Error ? error.message : "Could not load your orders",
        variant: "destructive",
      })
    }
  }

  const handleCreateOrder = async () => {
    if (!baseAsset || !counterAsset || !orderAmount || !orderPrice || !connectedUsername) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields to create a trade",
        variant: "destructive",
      })
      return
    }

    setIsCreating(true)

    try {
      const orderData = {
        userId: connectedUsername,
        seller_wallet_id: connectedUsername,
        counter_user_id: connectedUsername,
        base_asset: baseAsset,
        counter_asset: counterAsset,
        amount: parseFloat(orderAmount),
        price: parseFloat(orderPrice),
        chatroom_id: roomId,
        direction: direction,
      }
      
      const response = await otcApi.placeOrder(orderData)

      if (response.success && response.data) {
        toast({
          title: "Order created",
          description: "Your OTC order has been created successfully",
        })

        // Post the order to the chat with the order ID included
        if (client && roomId && response.data && response.data.order_id) {
          const total = parseFloat(orderAmount) * parseFloat(orderPrice)
          const orderMessage = `🏦 Order Created: ${direction === "buy" ? "Buy" : "Sell"} ${orderAmount} ${baseAsset} for ${orderPrice} ${counterAsset} each (Total: ${total.toFixed(2)} ${counterAsset}) #${response.data.order_id}`

          await client.sendEvent(roomId, "m.room.message", {
            msgtype: "m.text",
            body: orderMessage,
          })
          
          // Set trade start time for potential archiving
          setTradeStartTime(Date.now())
        }

        // Refresh orders
        loadOrders()
        
        // Reset form
        setOrderAmount("")
        setOrderPrice("")
      } else {
        toast({
          title: "Failed to create order",
          description: response.error || `Error: ${response.status}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating order:", error)
      toast({
        title: "Failed to create order",
        description: "Could not create your order",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }
  
  // Calculate total for token-based trading
  const calculateTotal = () => {
    if (orderAmount && orderPrice) {
      const total = parseFloat(orderAmount) * parseFloat(orderPrice)
      return total.toFixed(2)
    }
    return "0.00"
  }
  
  // Trade completion handling
  const handleTradeCompleted = async (orderId: string, transactionHash: string) => {
    try {
      if (!client || !roomId || !connectedUsername || !tradeStartTime) {
        console.log('Missing required data for trade completion archiving')
        return
      }
      
      const matrixUserId = client.getUserId() || ''
      const cleanMatrixId = matrixUserId.replace(/^@/, "").split(":")[0]
      
      // Initialize services
      const chatArchiveService = createChatArchiveService(client)
      const tradeHistoryStorage = createTradeHistoryStorage(matrixUserId)
      
      // Archive the trade conversation
      const archiveResult = await chatArchiveService.archiveTradeConversation(
        roomId,
        tradeStartTime,
        Date.now()
      )
      
      if (archiveResult.success && archiveResult.data) {
        // Save chat archive
        await tradeHistoryStorage.saveChatArchive(archiveResult.data)
        
        // Create trade record
        const tradeRecord: TradeRecord = {
          id: `trade_${Date.now()}_${orderId}`,
          orderId,
          roomId: roomId,
          direction: direction as TradeDirection,
          type: 'otc' as TradeType,
          status: 'completed' as TradeStatus,
          baseAsset: {
            code: baseAsset,
            name: baseAsset,
            issuer: '', // Would be populated from token data
            type: 'credit_alphanum4' // Assuming custom asset type
          },
          counterAsset: {
            code: counterAsset,
            name: counterAsset,
            issuer: '', // Would be populated from token data
            type: 'credit_alphanum4' // Assuming custom asset type
          },
          amount: orderAmount,
          price: orderPrice,
          totalValue: calculateTotal(),
          initiator: {
            matrixUserId: matrixUserId,
            username: connectedUsername,
            role: 'initiator'
          },
          counterparty: {
            matrixUserId: '', // Would need to get the other party's Matrix ID
            username: '', // Would need to get the other party's username
            role: 'counterparty'
          },
          createdAt: tradeStartTime,
          completedAt: Date.now(),
          stellarTransaction: {
            transactionHash,
            sourceAccount: connectedUsername,
            operationType: 'payment',
            success: true,
            memo: archiveResult.data.archiveHash
          },
          chatArchive: archiveResult.data,
          notes: `OTC trade completed via Matrix chat room ${roomId}`,
          tags: ['otc', 'matrix-chat'],
          isArchived: true
        }
        
        // Save trade record
        const saveResult = await tradeHistoryStorage.saveTradeRecord(tradeRecord)
        
        if (saveResult.success) {
          // Notify chat that trade has been completed and archived
          await client.sendEvent(roomId, "m.room.message", {
            msgtype: "m.notice",
            body: `✅ Trade Completed! Order #${orderId} has been executed and archived. Transaction: ${transactionHash.substring(0, 8)}...`
          })
          
          toast({
            title: "Trade Completed & Archived",
            description: `Trade #${orderId} completed successfully and chat history archived.`,
          })
          
          // TODO: Implement room exit flow
          await handleRoomExitFlow(roomId, orderId)
        }
      }
    } catch (error) {
      console.error('Error in trade completion flow:', error)
      toast({
        title: "Archiving Error",
        description: "Trade completed but archiving failed. Check console for details.",
        variant: "destructive",
      })
    }
  }
  
  // Room exit flow after trade completion
  const handleRoomExitFlow = async (roomId: string, orderId: string) => {
    try {
      if (!client) return
      
      // Send final message before room closure
      await client.sendEvent(roomId, "m.room.message", {
        msgtype: "m.notice",
        body: `🏁 OTC Trading Session Ending - Trade #${orderId} completed. This room will be archived.`
      })
      
      // TODO: In a full implementation, you would:
      // 1. Leave the room gracefully
      // 2. Mark the room as archived in local storage
      // 3. Optionally prompt users to start a new normal chat
      // 4. Clean up any OTC room indicators
      
      // For now, just mark room as no longer OTC
      localStorage.removeItem(`otc_room_${roomId}`)
      
      toast({
        title: "OTC Session Completed",
        description: "Trading session archived. You can view trade details in Trade History.",
      })
    } catch (error) {
      console.error('Error in room exit flow:', error)
    }
  }

  // Bond Calculator Functions
  const calculateBondPrice = () => {
    const { faceValue, couponRate, yearsToMaturity, marketYield, paymentFrequency } = calcInputs

    // Calculate periodic values
    const periodsPerYear = paymentFrequency
    const totalPeriods = yearsToMaturity * periodsPerYear
    const periodicCouponRate = couponRate / 100 / periodsPerYear
    const periodicMarketYield = marketYield / 100 / periodsPerYear
    const couponPayment = faceValue * periodicCouponRate

    // Calculate present value of coupon payments
    let pvCoupons = 0
    for (let t = 1; t <= totalPeriods; t++) {
      pvCoupons += couponPayment / Math.pow(1 + periodicMarketYield, t)
    }

    // Calculate present value of principal
    const pvPrincipal = faceValue / Math.pow(1 + periodicMarketYield, totalPeriods)

    // Calculate bond price
    const bondPrice = pvCoupons + pvPrincipal

    // Calculate total coupon payments
    const totalCoupons = couponPayment * totalPeriods

    setCalcResults({
      couponPayment,
      totalCoupons,
      pvCoupons,
      pvPrincipal,
      bondPrice
    })
  }

  const handleCalcInputChange = (field: string, value: string) => {
    setCalcInputs(prev => ({
      ...prev,
      [field]: parseFloat(value) || 0
    }))
  }

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`
  }

  const formatPercentage = (rate: number) => {
    return `${rate.toFixed(2)}%`
  }

  useEffect(() => {
    calculateBondPrice()
  }, [calcInputs])

  const selectedBondData = bonds.find(b => b.code === selectedBond)
  const total = amount && price ? (parseFloat(amount) * parseFloat(price)).toFixed(2) : "0.00"

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex-1 min-h-0">
        {activeTab === "trade" && (
          <div className="h-full p-3 space-y-3 overflow-y-auto">
            {!connectedUsername ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <ArrowUpDown className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Connect your wallet to start trading</p>
                  <p className="text-xs text-muted-foreground mt-1">Visit Account tab to connect your wallet</p>
                </div>
              ) : (
                <>
                  {/* Direction Toggle */}
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant={direction === "sell" ? "default" : "outline"}
                      className="w-full h-8 text-sm"
                      onClick={() => setDirection("sell")}
                    >
                      Sell
                    </Button>
                    <Button
                      type="button"
                      variant={direction === "buy" ? "default" : "outline"}
                      className="w-full h-8 text-sm"
                      onClick={() => setDirection("buy")}
                    >
                      Buy
                    </Button>
                  </div>

                  {/* Token Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="baseAsset" className="text-sm font-medium">{direction === "sell" ? "Asset to Sell" : "Pay with"}</Label>
                    <CustomDropdown
                      options={filteredBaseTokens.map((token) => ({
                        value: token.code,
                        label: `${token.token_name} (${token.code})`,
                        icon: (
                          <img
                            src={token.img_url || "/placeholder.svg"}
                            alt={token.code}
                            className="w-5 h-5 mr-2 rounded-full"
                            onError={(e) => {
                              ;(e.target as HTMLImageElement).src = "/placeholder.svg?height=20&width=20"
                            }}
                          />
                        ),
                      }))}
                      value={baseAsset}
                      onChange={setBaseAsset}
                      placeholder="Select Asset"
                    />
                  </div>


                  <div className="space-y-2">
                    <Label htmlFor="counterAsset" className="text-sm font-medium">{direction === "sell" ? "Receive" : "Asset to Buy"}</Label>
                    <CustomDropdown
                      options={filteredCounterTokens.map((token) => ({
                        value: token.code,
                        label: `${token.token_name} (${token.code})`,
                        icon: (
                          <img
                            src={token.img_url || "/placeholder.svg"}
                            alt={token.code}
                            className="w-5 h-5 mr-2 rounded-full"
                            onError={(e) => {
                              ;(e.target as HTMLImageElement).src = "/placeholder.svg?height=20&width=20"
                            }}
                          />
                        ),
                      }))}
                      value={counterAsset}
                      onChange={setCounterAsset}
                      placeholder="Select Asset"
                    />
                  </div>

                  {/* Amount and Price */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="amount" className="text-sm font-medium">Amount</Label>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="0.00"
                        value={orderAmount}
                        onChange={(e) => setOrderAmount(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="price" className="text-sm font-medium">Price</Label>
                      <Input
                        id="price"
                        type="number"
                        placeholder="0.00"
                        value={orderPrice}
                        onChange={(e) => setOrderPrice(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>

                  <div className="bg-muted/50 p-2 rounded-md">
                    <div className="flex justify-between text-sm">
                      <span>Total:</span>
                      <span className="font-semibold">
                        {calculateTotal()} {counterAsset || "tokens"}
                      </span>
                    </div>
                  </div>

                  <Button
                    onClick={handleCreateOrder}
                    disabled={isCreating || !baseAsset || !counterAsset || !orderAmount || !orderPrice}
                    className="w-full h-9 bg-primary text-primary-foreground hover:bg-primary/90"
                    size="sm"
                  >
                    {isCreating ? (
                      <>
                        <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Trade"
                    )}
                  </Button>

                  {/* Market Information - Compact */}
                  <div className="space-y-2 pt-2 border-t">
                    <Label className="text-sm font-medium">Market Info</Label>
                    <div className="bg-muted/30 p-2 rounded text-xs space-y-1">
                      <div className="flex justify-between">
                        <span>Volume:</span><span>$2.4M</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Spread:</span><span>0.05%</span>
                      </div>
                    </div>
                  </div>

                  {/* Stats - Compact */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Your Stats</Label>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div className="bg-muted/30 p-2 rounded text-center">
                        <div className="font-semibold">12</div>
                        <div className="text-muted-foreground">Trades</div>
                      </div>
                      <div className="bg-muted/30 p-2 rounded text-center">
                        <div className="font-semibold text-green-600">+2.3%</div>
                        <div className="text-muted-foreground">P&L</div>
                      </div>
                    </div>
                  </div>
                </>
              )}
          </div>
        )}

        {activeTab === "orders" && (
          <div className="h-full p-3 space-y-3 overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm">Active Orders</h3>
              <Button variant="outline" size="sm" onClick={loadOrders} className="h-7 text-xs">
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
            </div>
            
            {orders.length > 0 ? (
              <div className="space-y-2">
                {orders.map((order) => (
                  <Card key={order.order_id} className="p-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={order.direction === "buy" ? "default" : "destructive"} className="text-xs">
                          {order.direction.toUpperCase()}
                        </Badge>
                        <span className="font-medium text-sm">{order.base_asset}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {order.status}
                      </Badge>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-4 text-xs text-muted-foreground">
                      <div>
                        <div>Qty: {order.amount}</div>
                      </div>
                      <div>
                        <div>Price: ${order.price}</div>
                      </div>
                      <div>
                        <div>Total: ${(parseFloat(order.amount) * parseFloat(order.price)).toFixed(2)}</div>
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      ID: {order.order_id}
                    </div>
                    
                    {/* Trade completion action */}
                    <div className="mt-3 pt-2 border-t flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => {
                          // Simulate trade completion with mock transaction hash
                          const mockTxHash = `stellar_tx_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
                          handleTradeCompleted(order.order_id, mockTxHash)
                        }}
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Complete Trade
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground"
                        onClick={() => {
                          // TODO: Implement order cancellation
                          toast({
                            title: "Cancel Order",
                            description: "Order cancellation not implemented yet",
                            variant: "destructive"
                          })
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Activity className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No active orders</p>
                <p className="text-xs text-muted-foreground mt-1">Create an order in the Trade tab</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div className="h-full p-3 space-y-3 overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm">Trade History</h3>
              <Button variant="outline" size="sm" className="h-7 text-xs">
                <Eye className="h-3 w-3 mr-1" />
                View All
              </Button>
            </div>
            
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <History className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No trade history</p>
              <p className="text-xs text-muted-foreground mt-1">Your completed trades will appear here</p>
            </div>
          </div>
        )}

        {activeTab === "calculator" && (
          <div className="h-full p-3 space-y-3 overflow-y-auto">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm">Bond Calculator</h3>
                <div className="text-xs text-muted-foreground">Fair Value</div>
              </div>

              {/* Input Section */}
              <Card className="p-3 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground mb-2 block">Face Value ($)</Label>
                    <Input
                      type="number"
                      value={calcInputs.faceValue}
                      onChange={(e) => handleCalcInputChange('faceValue', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground mb-2 block">Coupon Rate (%)</Label>
                    <Input
                      type="number"
                      step="0.25"
                      value={calcInputs.couponRate}
                      onChange={(e) => handleCalcInputChange('couponRate', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground mb-2 block">Years to Maturity</Label>
                    <Input
                      type="number"
                      step="0.25"
                      value={calcInputs.yearsToMaturity}
                      onChange={(e) => handleCalcInputChange('yearsToMaturity', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground mb-2 block">Market Yield (%)</Label>
                    <Input
                      type="number"
                      step="0.25"
                      value={calcInputs.marketYield}
                      onChange={(e) => handleCalcInputChange('marketYield', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-2 block">Payment Frequency</Label>
                  <CustomDropdown
                    options={[
                      { value: "1", label: "Annual" },
                      { value: "2", label: "Semi-Annual" },
                      { value: "4", label: "Quarterly" },
                      { value: "12", label: "Monthly" }
                    ]}
                    value={calcInputs.paymentFrequency.toString()}
                    onChange={(value) => handleCalcInputChange('paymentFrequency', value)}
                    placeholder="Select frequency"
                  />
                </div>
              </Card>

              {/* Results Section */}
              <Card className="p-3 space-y-2">
                <h4 className="font-medium text-sm">Results</h4>
                
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Coupon Payment</span>
                    <span className="font-medium">{formatCurrency(calcResults.couponPayment)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">PV of Coupons</span>
                    <span className="font-medium">{formatCurrency(calcResults.pvCoupons)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">PV of Principal</span>
                    <span className="font-medium">{formatCurrency(calcResults.pvPrincipal)}</span>
                  </div>
                </div>

                <div className="border-t pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold">Fair Value</span>
                    <span className="text-base font-bold text-blue-600">{formatCurrency(calcResults.bondPrice)}</span>
                  </div>
                </div>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-8 text-xs"
                  onClick={() => {
                    setAmount(Math.round(calcResults.bondPrice / 100).toString())
                    setPrice((calcResults.bondPrice / 100).toFixed(2))
                    onTabChange?.("trade")
                    toast({
                      title: "Values copied to trade form",
                      description: "Calculator results applied to trade tab"
                    })
                  }}
                >
                  Use in Trade
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    setCalcInputs({
                      faceValue: 1000,
                      couponRate: 4.25,
                      yearsToMaturity: 10,
                      marketYield: 4.5,
                      paymentFrequency: 2
                    })
                  }}
                >
                  Reset
                </Button>
              </div>

              {/* Formula Reference - Compact */}
              <Card className="p-2 bg-muted/20">
                <div className="text-xs text-muted-foreground">
                  <div className="font-medium mb-1">Formula:</div>
                  <div className="font-mono text-xs">Price = PV(Coupons) + PV(Principal)</div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}