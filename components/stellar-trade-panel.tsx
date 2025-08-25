"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useMatrixClient } from "@/lib/matrix-context"
import { 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  ArrowUpDown,
  Activity,
  BarChart3,
  Clock,
  CheckCircle2,
  XCircle,
  DollarSign,
  Calculator,
  Eye,
  ArrowUp,
  ArrowDown,
  Zap,
  Wallet,
  Key
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import LiveMarketsTabbed from "@/components/live-markets-tabbed"

import { 
  StellarAsset, 
  stellarTradingService,
  OrderBook,
  Trade,
  OrderBookEntry
} from "@/lib/stellar-trading"

interface StellarTradePanelProps {}

export default function StellarTradePanel({}: StellarTradePanelProps = {}) {
  // Trading state
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy")
  const [baseAsset, setBaseAsset] = useState<string>("")
  const [counterAsset, setCounterAsset] = useState<string>("")
  const [quantity, setQuantity] = useState("")
  const [price, setPrice] = useState("")
  const [orderType, setOrderType] = useState<"market" | "limit">("limit")
  const [isLoading, setIsLoading] = useState(false)
  
  // Market data state
  const [orderBook, setOrderBook] = useState<OrderBook | null>(null)
  const [recentTrades, setRecentTrades] = useState<Trade[]>([])
  const [openOffers, setOpenOffers] = useState<any[]>([])
  const [isLoadingData, setIsLoadingData] = useState(false)
  
  // Clic Wallet Integration (same as OTC system)
  const [connectedUsername, setConnectedUsername] = useState<string | null>(null)
  const [balances, setBalances] = useState<any[]>([])
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false)
  const [pin, setPin] = useState("")
  const [pendingOrder, setPendingOrder] = useState<any>(null)
  
  const { toast } = useToast()
  const { client } = useMatrixClient()

  // Initialize Clic wallet connection (same as OTC system)
  useEffect(() => {
    const matrixUserId = client?.getUserId() || ""
    const cleanMatrixId = matrixUserId.replace(/^@/, "").split(":")[0]

    if (cleanMatrixId) {
      const savedUsername = localStorage.getItem(`otc_chat_${cleanMatrixId}`)
      if (savedUsername) {
        setConnectedUsername(savedUsername)
        loadAccountData()
      }
    }
  }, [client])

  // Load data when wallet connects
  useEffect(() => {
    if (connectedUsername) {
      loadMarketData()
      loadAccountData()
    }
  }, [connectedUsername])

  // Get available assets from wallet balances
  const getWalletAssets = (): StellarAsset[] => {
    if (!connectedUsername || !balances.length) return []
    
    return balances.map(balance => ({
      code: balance.asset_code || 'XLM',
      issuer: balance.asset_issuer,
      name: balance.asset_code || 'Stellar Lumens',
      type: balance.asset_code ? 'credit_alphanum4' : 'native'
    }))
  }
  
  // Get asset object by code from wallet assets
  const getAssetByCode = (code: string): StellarAsset | null => {
    const walletAssets = getWalletAssets()
    return walletAssets.find(a => a.code === code) || null
  }
  
  const getBaseAsset = (): StellarAsset | null => {
    return getAssetByCode(baseAsset)
  }
  
  const getCounterAsset = (): StellarAsset | null => {
    return getAssetByCode(counterAsset)
  }

  // Load market data
  const loadMarketData = async () => {
    if (!baseAsset || !counterAsset) return
    
    setIsLoadingData(true)
    try {
      const base = getBaseAsset()
      const counter = getCounterAsset()
      
      if (!base || !counter) {
        console.warn('Missing asset information for market data loading')
        return
      }
      
      const [orderBookData, tradesData] = await Promise.all([
        stellarTradingService.getOrderBook(base, counter),
        stellarTradingService.getRecentTrades(base, counter)
      ])
      
      setOrderBook(orderBookData)
      setRecentTrades(tradesData)
    } catch (error) {
      console.error('Error loading market data:', error)
      toast({
        title: "Market Data Error",
        description: "Failed to load market data",
        variant: "destructive",
      })
    } finally {
      setIsLoadingData(false)
    }
  }

  // Load account data from Clic wallet API (same as wallet panel)
  const loadAccountData = async () => {
    if (!connectedUsername || !client) return
    
    console.log('🔍 Loading account data for:', connectedUsername)
    
    try {
      const matrixUserId = client.getUserId() || ""
      const cleanMatrixId = matrixUserId.replace(/^@/, "").split(":")[0]
      const jwt = localStorage.getItem(`jwt_${cleanMatrixId}`)

      // Load balances using the local Stellar API route
      const response = await fetch(`/api/stellar/balances/${connectedUsername}`, {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Failed to load balances: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      console.log('📊 Balance API response:', data)

      if (data.success && data.balances) {
        console.log('✅ Setting balances:', data.balances?.length || 0, 'balances')
        setBalances(data.balances || [])
      } else {
        console.log('❌ No balances found in response:', data.error || 'No balances')
        setBalances([])
      }
    } catch (error) {
      console.error('Error loading account data:', error)
      setBalances([])
    }
  }

  // Load data on component mount and when assets change
  useEffect(() => {
    loadMarketData()
  }, [baseAsset, counterAsset])

  // Handle trade submission with balance validation
  const handleTrade = async () => {
    if (!connectedUsername) {
      toast({
        title: "Wallet Required",
        description: "Please connect your Clic wallet to trade",
        variant: "destructive",
      })
      return
    }

    if (!quantity || (orderType === "limit" && !price)) {
      toast({
        title: "Missing Information",
        description: "Please enter all required fields",
        variant: "destructive",
      })
      return
    }

    // Validate sufficient balance
    const requiredAsset = tradeType === "buy" ? counterAsset : baseAsset
    const requiredAmount = tradeType === "buy" ? 
      (parseFloat(quantity) * parseFloat(price || "1")) : 
      parseFloat(quantity)
    
    const balance = balances.find(b => (b.asset_code || 'XLM') === requiredAsset)
    const availableBalance = balance ? parseFloat(balance.available_balance || balance.balance || '0') : 0
    
    if (availableBalance < requiredAmount) {
      toast({
        title: "Insufficient Balance",
        description: `You need ${requiredAmount.toFixed(6)} ${requiredAsset} but only have ${availableBalance.toFixed(6)} available`,
        variant: "destructive",
      })
      return
    }

    // Store pending order and open PIN dialog (same as OTC system)
    setPendingOrder({
      type: tradeType,
      baseAsset,
      counterAsset,
      quantity: parseFloat(quantity),
      price: orderType === "limit" ? parseFloat(price) : null,
      orderType
    })
    setIsPinDialogOpen(true)
  }

  // Execute the order after PIN confirmation (placeholder - not implemented yet)
  const executeOrder = async () => {
    if (!pendingOrder || !pin || !connectedUsername) return

    setIsLoading(true)
    try {
      // TODO: Implement Stellar order execution
      // This would call the Stellar placeOrder API with the pending order details
      
      // For now, just show a placeholder message
      toast({
        title: "Order Execution Not Implemented",
        description: "Stellar order execution will be implemented in the next phase",
        variant: "destructive",
      })
      
      // Clear form
      setQuantity("")
      setPrice("")
      setPin("")
      setPendingOrder(null)
      setIsPinDialogOpen(false)
      
    } catch (error) {
      console.error("Error placing order:", error)
      toast({
        title: "Order Failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setPin("")
      setPendingOrder(null)
      setIsPinDialogOpen(false)
    }
  }

  // Cancel order function (placeholder - not implemented yet)
  const cancelOrder = async (offerId: string, sellingAsset: any, buyingAsset: any) => {
    if (!connectedUsername) return

    // TODO: Implement Stellar order cancellation
    toast({
      title: "Cancel Order Not Implemented",
      description: "Stellar order cancellation will be implemented in the next phase",
      variant: "destructive",
    })
  }

  // Calculate total value
  const totalValue = quantity && price ? (parseFloat(quantity) * parseFloat(price)).toFixed(6) : "0.000000"

  return (
    <div className="h-full flex flex-col bg-background">
      <Tabs defaultValue="trade" className="flex-1 flex flex-col">
        {/* Tab Navigation */}
        <div className="border-b border-border bg-muted/30">
          <TabsList className="w-full h-12 bg-transparent rounded-none border-0 p-0">
            <TabsTrigger value="trade" className="flex-1 h-full">
              <DollarSign className="h-4 w-4 mr-2" />
              Trade
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex-1 h-full">
              <Activity className="h-4 w-4 mr-2" />
              My Orders
            </TabsTrigger>
            <TabsTrigger value="markets" className="flex-1 h-full">
              <Activity className="h-4 w-4 mr-2" />
              Live Markets
            </TabsTrigger>
            <TabsTrigger value="orderbook" className="flex-1 h-full">
              <BarChart3 className="h-4 w-4 mr-2" />
              Order Book
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1 h-full">
              <Clock className="h-4 w-4 mr-2" />
              History
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          <TabsContent value="trade" className="h-full m-0 p-4 space-y-4 overflow-y-auto">
            {/* Clic Wallet Connection Status */}
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  <div className={`w-2 h-2 rounded-full ${connectedUsername ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="text-sm font-medium">
                    {connectedUsername ? `Clic Wallet: ${connectedUsername}` : 'Clic Wallet Disconnected'}
                  </span>
                </div>
                {!connectedUsername && (
                  <Button 
                    size="sm" 
                    onClick={() => {
                      toast({
                        title: "Connect Clic Wallet",
                        description: "Use the account connection in the sidebar to connect your Clic wallet",
                      })
                    }}
                    variant="default"
                  >
                    <Wallet className="h-3 w-3 mr-1" />
                    Connect Clic Wallet
                  </Button>
                )}
              </div>
            </Card>

            {/* Asset Selection */}
            <Card className="p-4 space-y-4">
              <h3 className="font-semibold">Trading Pair</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-2 block">Base Asset</Label>
                  <Select value={baseAsset} onValueChange={setBaseAsset}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getWalletAssets().map((asset) => {
                        const balance = balances.find(b => (b.asset_code || 'XLM') === asset.code)
                        const balanceAmount = balance ? parseFloat(balance.available_balance || balance.balance || '0') : 0
                        return (
                          <SelectItem key={asset.code} value={asset.code}>
                            <div className="flex justify-between items-center w-full">
                              <span>{asset.code}{asset.issuer && ` (${asset.issuer.slice(0, 8)}...)`}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                {balanceAmount > 0 ? balanceAmount.toFixed(balanceAmount < 1 ? 6 : 2) : '0.00'}
                              </span>
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-2 block">Counter Asset</Label>
                  <Select value={counterAsset} onValueChange={setCounterAsset}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getWalletAssets().map((asset) => {
                        const balance = balances.find(b => (b.asset_code || 'XLM') === asset.code)
                        const balanceAmount = balance ? parseFloat(balance.available_balance || balance.balance || '0') : 0
                        return (
                          <SelectItem key={asset.code} value={asset.code}>
                            <div className="flex justify-between items-center w-full">
                              <span>{asset.code}{asset.issuer && ` (${asset.issuer.slice(0, 8)}...)`}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                {balanceAmount > 0 ? balanceAmount.toFixed(balanceAmount < 1 ? 6 : 2) : '0.00'}
                              </span>
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            {/* Order Type Selection */}
            <div className="flex gap-1 p-1 bg-muted/50 rounded-md">
              <Button
                variant={tradeType === "buy" ? "default" : "ghost"}
                size="sm"
                className={`flex-1 ${tradeType === "buy" ? "bg-green-500 hover:bg-green-600 text-white shadow-sm" : ""}`}
                onClick={() => setTradeType("buy")}
              >
                <ArrowUp className="h-3 w-3 mr-1" />
                Buy {baseAsset}
              </Button>
              <Button
                variant={tradeType === "sell" ? "default" : "ghost"}
                size="sm"
                className={`flex-1 ${tradeType === "sell" ? "bg-red-500 hover:bg-red-600 text-white shadow-sm" : ""}`}
                onClick={() => setTradeType("sell")}
              >
                <ArrowDown className="h-3 w-3 mr-1" />
                Sell {baseAsset}
              </Button>
            </div>

            {/* Order Form */}
            <Card className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Order Details</h3>
                <Select value={orderType} onValueChange={(value: "market" | "limit") => setOrderType(value)}>
                  <SelectTrigger className="w-24 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="limit">Limit</SelectItem>
                    <SelectItem value="market">Market</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-2 block">
                    Quantity ({baseAsset})
                  </Label>
                  <Input
                    type="number"
                    placeholder="0.000000"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="h-10"
                    step="0.000001"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-2 block">
                    {orderType === "limit" ? `Price (${counterAsset})` : "Market Price"}
                  </Label>
                  <Input
                    type="number"
                    placeholder="0.000000"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    disabled={orderType === "market"}
                    className="h-10"
                    step="0.000001"
                  />
                </div>
              </div>

              {/* Order Summary */}
              <div className="border rounded-md p-3 bg-muted/30 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="font-semibold">{totalValue} {counterAsset}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Order Type</span>
                  <span className="text-sm">{orderType.charAt(0).toUpperCase() + orderType.slice(1)}</span>
                </div>
              </div>

              <Button 
                onClick={handleTrade}
                disabled={isLoading || !quantity || (orderType === "limit" && !price) || !connectedUsername}
                className="w-full h-10"
                variant={tradeType === "buy" ? "default" : "destructive"}
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                {isLoading ? "Placing Order..." : 
                 !connectedUsername ? "Connect Clic Wallet" :
                 `${tradeType === "buy" ? "Buy" : "Sell"} ${baseAsset}`}
              </Button>
            </Card>
          </TabsContent>

          <TabsContent value="markets" className="h-full m-0 overflow-hidden">
            <LiveMarketsTabbed />
          </TabsContent>

          <TabsContent value="orderbook" className="h-full m-0 p-4 space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Order Book - {baseAsset}/{counterAsset}</h3>
              <Button variant="outline" size="sm" onClick={loadMarketData} disabled={isLoadingData}>
                <RefreshCw className={`h-3 w-3 mr-1 ${isLoadingData ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {orderBook ? (
              <div className="grid grid-cols-2 gap-4">
                {/* Asks (Sell Orders) */}
                <Card className="p-4">
                  <h4 className="font-medium text-red-600 mb-3 flex items-center">
                    <TrendingDown className="h-4 w-4 mr-1" />
                    Asks (Sell)
                  </h4>
                  <div className="space-y-1">
                    {orderBook.asks.slice(0, 10).reverse().map((ask, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-red-600">{parseFloat(ask.price).toFixed(6)}</span>
                        <span className="text-muted-foreground">{parseFloat(ask.amount).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Bids (Buy Orders) */}
                <Card className="p-4">
                  <h4 className="font-medium text-green-600 mb-3 flex items-center">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    Bids (Buy)
                  </h4>
                  <div className="space-y-1">
                    {orderBook.bids.slice(0, 10).map((bid, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-green-600">{parseFloat(bid.price).toFixed(6)}</span>
                        <span className="text-muted-foreground">{parseFloat(bid.amount).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <BarChart3 className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">Loading order book...</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="orders" className="h-full m-0 p-4 space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Open Orders</h3>
              <Button variant="outline" size="sm" onClick={loadAccountData}>
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
            </div>
            
            {openOffers.length > 0 ? (
              <div className="space-y-2">
                {openOffers.map((offer, index) => (
                  <Card key={index} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={offer.buying ? "default" : "destructive"} className="text-xs">
                          {offer.buying ? "BUY" : "SELL"}
                        </Badge>
                        <span className="font-medium text-sm">
                          {offer.amount} {offer.selling.asset_code || 'XLM'}
                        </span>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => cancelOrder(offer.id, offer.selling, offer.buying)}
                        disabled={isLoading}
                      >
                        Cancel
                      </Button>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Price: {offer.price} | ID: {offer.id}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Activity className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No open orders</p>
                <p className="text-xs text-muted-foreground mt-1">Create an order to see it here</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="h-full m-0 p-4 space-y-4 overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Recent Trades - {baseAsset}/{counterAsset}</h3>
              <Button variant="outline" size="sm" onClick={loadMarketData}>
                <RefreshCw className="h-3 w-3 mr-1" />
                Refresh
              </Button>
            </div>
            
            {recentTrades.length > 0 ? (
              <div className="space-y-2">
                {recentTrades.slice(0, 20).map((trade) => (
                  <Card key={trade.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={trade.side === "buy" ? "default" : "destructive"} className="text-xs">
                          {trade.side.toUpperCase()}
                        </Badge>
                        <span className="text-sm">
                          {parseFloat(trade.base_amount).toFixed(2)} {baseAsset}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {parseFloat(trade.price).toFixed(6)} {counterAsset}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(trade.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Clock className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No recent trades</p>
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>

      {/* PIN Confirmation Dialog (same as OTC system) */}
      <Dialog open={isPinDialogOpen} onOpenChange={setIsPinDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Confirm Stellar Order
            </DialogTitle>
            <DialogDescription>
              Enter your Clic wallet PIN to place this order on Stellar SDEX.
            </DialogDescription>
          </DialogHeader>
          
          {pendingOrder && (
            <div className="space-y-4">
              {/* Order Summary */}
              <div className="border rounded-md p-3 bg-muted/30 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Action</span>
                  <span className="text-sm font-medium">
                    {pendingOrder.type?.toUpperCase()} {pendingOrder.baseAsset}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Quantity</span>
                  <span className="text-sm font-medium">{pendingOrder.quantity}</span>
                </div>
                {pendingOrder.price && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Price</span>
                    <span className="text-sm font-medium">{pendingOrder.price} {pendingOrder.counterAsset}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Order Type</span>
                  <span className="text-sm font-medium">{pendingOrder.orderType?.toUpperCase()}</span>
                </div>
                {pendingOrder.price && (
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-sm font-semibold">Total</span>
                    <span className="text-sm font-semibold">
                      {(pendingOrder.quantity * pendingOrder.price).toFixed(6)} {pendingOrder.counterAsset}
                    </span>
                  </div>
                )}
              </div>

              {/* PIN Input */}
              <div>
                <Label htmlFor="pin" className="text-sm font-medium">
                  Enter PIN
                </Label>
                <Input
                  id="pin"
                  type="password"
                  placeholder="Enter your PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="mt-1"
                  maxLength={6}
                  disabled={isLoading}
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsPinDialogOpen(false)
                setPin("")
                setPendingOrder(null)
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={executeOrder}
              disabled={!pin || isLoading}
              variant={pendingOrder?.type === "buy" ? "default" : "destructive"}
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              {isLoading ? "Processing..." : "Confirm Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}