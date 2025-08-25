"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useMatrixClient } from "@/lib/matrix-context"
import { get, post } from "@/lib/service"
import { ArrowLeftRight, RefreshCw, CreditCard, Wallet, History, Trash2 } from "lucide-react"
import { CustomDropdown } from "@/components/ui/custom-dropdown"

interface TradePanelProps {
  roomId: string
}

const bonds = [
  { id: "us10y", name: "US 10 Year Treasury", yield: 4.25, price: 98.5 },
  { id: "us30y", name: "US 30 Year Treasury", yield: 4.75, price: 95.2 },
  { id: "uk10y", name: "UK 10 Year Gilt", yield: 3.75, price: 99.1 },
  { id: "de10y", name: "German 10 Year Bund", yield: 2.25, price: 101.3 },
]

const currencies = [
  { id: "usd", name: "US Dollar", symbol: "USD" },
  { id: "eur", name: "Euro", symbol: "EUR" },
  { id: "gbp", name: "British Pound", symbol: "GBP" },
  { id: "jpy", name: "Japanese Yen", symbol: "JPY" },
]

// Exchange rates relative to USD
const exchangeRates = {
  usd: 1,
  eur: 0.92,
  gbp: 0.78,
  jpy: 150.25,
}

// Add the Token interface
interface Token {
  id: number
  token_name: string
  code: string
  asset_type: string
  img_url: string
  issuer_public: string
}

// Add the direction type
type Direction = "buy" | "sell"

// Add the Order interface
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

// Add the Transaction interface
interface Transaction {
  id: string
  type: "buy" | "sell" | "deposit" | "withdraw"
  asset: string
  amount: number
  currency: string
  value: number
  timestamp: number
  status: "completed" | "pending" | "failed"
}

// Update the component to include the create order form
export default function TradePanel({ roomId }: TradePanelProps) {
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy")
  const [selectedBond, setSelectedBond] = useState("us10y")
  const [currency, setCurrency] = useState("usd")
  const [amount, setAmount] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const { client } = useMatrixClient()

  // Add state for tokens and create order form
  const [tokens, setTokens] = useState<Token[]>([])
  const [isLoadingTokens, setIsLoadingTokens] = useState(false)
  const [connectedUsername, setConnectedUsername] = useState<string | null>(null)

  // Add state for orders and history
  const [orders, setOrders] = useState<Order[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoadingOrders, setIsLoadingOrders] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [isDeletingOrder, setIsDeletingOrder] = useState<string | null>(null)

  // Add state for create order form
  const [direction, setDirection] = useState<Direction>("sell")
  const [baseAsset, setBaseAsset] = useState("")
  const [counterAsset, setCounterAsset] = useState("")
  const [orderAmount, setOrderAmount] = useState("")
  const [price, setPrice] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [filteredBaseTokens, setFilteredBaseTokens] = useState<Token[]>([])
  const [filteredCounterTokens, setFilteredCounterTokens] = useState<Token[]>([])

  // Add useEffect to check for connected wallet and load tokens
  useEffect(() => {
    const matrixUserId = client?.getUserId() || ""
    const cleanMatrixId = matrixUserId.replace(/^@/, "").split(":")[0]

    if (cleanMatrixId) {
      const savedUsername = localStorage.getItem(`otc_chat_${cleanMatrixId}`)
      if (savedUsername) {
        setConnectedUsername(savedUsername)
        loadTokens()
      }
    }
  }, [client])

  // Add useEffect to filter tokens based on direction
  useEffect(() => {
    if (tokens.length > 0) {
      if (direction === "sell") {
        // When selling, base can be crypto or security, counter is fiat
        setFilteredBaseTokens(
          tokens.filter((token) =>token.asset_type === "security"),
        )
        setFilteredCounterTokens(tokens.filter((token) => token.asset_type === "fiat"))
      } else {
        // When buying, base is fiat, counter can be crypto or security
        setFilteredBaseTokens(tokens.filter((token) => token.asset_type === "fiat"))
        setFilteredCounterTokens(
          tokens.filter((token) =>  token.asset_type === "security"),
        )
      }

      // Reset selections when direction changes
      setBaseAsset("")
      setCounterAsset("")
    }
  }, [direction, tokens])

  // Add useEffect to load orders and transaction history when connected
  useEffect(() => {
    if (connectedUsername) {
      loadOrders()
      loadTransactionHistory()
    }
  }, [connectedUsername])

  // Add loadTokens function
  const loadTokens = async () => {
    setIsLoadingTokens(true)

    try {
      // Load all token types
      const data = await get('getTokens') as any

      if (data.status === 200 && data.data) {
        setTokens(data.data)
      } else {
        toast({
          title: "Failed to load tokens",
          description: data.message || `Error: ${data.status}`,
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
    } finally {
      setIsLoadingTokens(false)
    }
  }

  // Add the loadOrders function
  const loadOrders = async () => {
    if (!connectedUsername) return

    setIsLoadingOrders(true)

    try {
      // Call the API to get open orders
      const data = await get(`orders/${connectedUsername}?status=open&chatroom_id=${roomId}`) as any

      if ((data.status === 200 || data.status === 100) && data.data) {
        setOrders(data.data)
      } else {
        toast({
          title: "Failed to load orders",
          description: data.message || `Error: ${data.status}`,
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
    } finally {
      setIsLoadingOrders(false)
    }
  }

  // Add the loadTransactionHistory function
  const loadTransactionHistory = async () => {
    if (!connectedUsername) return

    setIsLoadingHistory(true)

    try {
      // Call the API to get transaction history
      const data = await get(`getHistory/${connectedUsername}`) as any

      if ((data.status === 200 || data.status === 100) && data.data) {
        // Map the API response to our transaction format
        const formattedTransactions: Transaction[] = data.data.map((item: any) => {
          return {
            id: item.order_id,
            type: item.direction === "buy" ? "buy" : "sell",
            asset: item.base_asset,
            amount: Number.parseFloat(item.amount),
            currency: item.counter_asset,
            value: Number.parseFloat(item.quantity),
            timestamp: new Date(item.created_at).getTime(),
            status: item.status === "cancelled" ? "failed" : item.status === "completed" ? "completed" : "pending",
          }
        })

        setTransactions(formattedTransactions)
      } else {
        throw new Error(data.message || `Failed to load transaction history: Status ${data.status}`)
      }
    } catch (error) {
      console.error("Error loading transaction history:", error)
      toast({
        title: "Failed to load transaction history",
        description: error instanceof Error ? error.message : "Could not load your transaction history",
        variant: "destructive",
      })
    } finally {
      setIsLoadingHistory(false)
    }
  }

  // Add the handleDeleteOrder function
  const handleDeleteOrder = async (orderId: string) => {
    setIsDeletingOrder(orderId)

    try {
      const data = await post('deleteOrder', {
        order_id: orderId,
      }) as any

      if (data.status === 200) {
        // Remove the order from the list
        setOrders(orders.filter((order) => order.order_id !== orderId))

        // Send a cancellation message to the chat
        if (client && roomId) {
          const cancelledOrder = orders.find((order) => order.order_id === orderId)
          if (cancelledOrder) {
            const cancelMessage = `❌ Order Cancelled: ${cancelledOrder.direction === "buy" ? "Buy" : "Sell"} ${cancelledOrder.amount} ${cancelledOrder.base_asset} for ${cancelledOrder.price} ${cancelledOrder.counter_asset} each #${orderId}`

            await client.sendEvent(roomId, "m.room.message", {
              msgtype: "m.notice",
              body: cancelMessage,
            })
          }
        }

        toast({
          title: "Order deleted",
          description: data.message || "Your order has been deleted successfully",
        })
      } else {
        // Show error message from API response
        toast({
          title: "Failed to delete order",
          description: data.message || `Error: ${data.status}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting order:", error)
      toast({
        title: "Failed to delete order",
        description: error instanceof Error ? error.message : "Could not delete your order",
        variant: "destructive",
      })
    } finally {
      setIsDeletingOrder(null)
    }
  }

  // Add the formatCurrency function
  const formatCurrency = (value: number, currency = "USD") => {
    // Handle common currencies
    const currencyMap: Record<string, string> = {
      UGX: "UGX",
      KES: "KES",
      USD: "USD",
      EUR: "EUR",
      GBP: "GBP",
      JPY: "JPY",
      CLIX: "CLIX",
      XLM: "XLM",
    }

    // Use USD as fallback for unknown currencies
    const currencyCode = currencyMap[currency] || "USD"

    // For crypto currencies that aren't standard ISO codes, use a custom formatter
    if (["CLIX", "XLM"].includes(currencyCode)) {
      return `${value.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} ${currencyCode}`
    }

    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currencyCode,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value)
    } catch (error) {
      // Fallback for unsupported currency codes
      return `${value.toLocaleString()} ${currencyCode}`
    }
  }

  // Add handleCreateOrder function
  const handleCreateOrder = async () => {
    if (!baseAsset || !counterAsset || !orderAmount || !price || !connectedUsername) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields to create a trade",
        variant: "destructive",
      })
      return
    }

    setIsCreating(true)

    try {
      const data = await post('placeOrder', {
        userId: connectedUsername,
        seller_wallet_id: connectedUsername,
        counter_user_id: connectedUsername,
        base_asset: baseAsset,
        counter_asset: counterAsset,
        amount: Number.parseFloat(orderAmount),
        price: Number.parseFloat(price),
        chatroom_id: roomId,
        direction: direction,
      }) as any

      if (data.status === 200) {
        toast({
          title: "Trade created",
          description: data.message || "Your trade has been created successfully",
        })

        // Post the order to the chat with the order ID included
        if (client && roomId && data.data && data.data.order_id) {
          const total = Number.parseFloat(orderAmount) * Number.parseFloat(price)
          const orderMessage = `🏦 Order Created: ${direction === "buy" ? "Buy" : "Sell"} ${orderAmount} ${baseAsset} for ${price} ${counterAsset} each (Total: ${total.toFixed(2)} ${counterAsset}) #${data.data.order_id}`

          await client.sendEvent(roomId, "m.room.message", {
            msgtype: "m.text",
            body: orderMessage,
          })
        }

        // Refresh orders
        loadOrders()

        // Reset form
        setOrderAmount("")
        setPrice("")
      } else {
        // Show error message when status is not 200
        toast({
          title: "Failed to create trade",
          description: data.message || `Error: ${data.status}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating trade:", error)
      toast({
        title: "Failed to create trade",
        description: error instanceof Error ? error.message : "Could not create your trade",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  // Add calculateTotal function
  const calculateTotal = () => {
    if (orderAmount && price) {
      const total = Number.parseFloat(orderAmount) * Number.parseFloat(price)
      return total.toFixed(2)
    }
    return "0.00"
  }

  const selectedBondData = bonds.find((b) => b.id === selectedBond)
  const selectedCurrency = currencies.find((c) => c.id === currency)
  const exchangeRate = exchangeRates[currency as keyof typeof exchangeRates]

  const calculateTotalPrice = () => {
    if (!amount || !selectedBondData) return "0.00"
    const bondAmount = Number.parseFloat(amount)
    const priceInUSD = selectedBondData.price * bondAmount
    return (priceInUSD * exchangeRate).toFixed(2)
  }

  const calculateBondAmount = () => {
    if (!amount || !selectedBondData) return "0.00"
    const currencyAmount = Number.parseFloat(amount)
    const priceInCurrency = selectedBondData.price * exchangeRate
    return (currencyAmount / priceInCurrency).toFixed(3)
  }

  const handleTrade = async () => {
    if (!amount || !selectedBondData || !selectedCurrency || !client || !roomId) return

    setIsLoading(true)

    try {
      const amountNum = Number.parseFloat(amount)
      let tradeMessage = ""

      if (tradeType === "buy") {
        const bondAmount = calculateBondAmount()
        tradeMessage = `🏦 Bond Trade: Buy ${bondAmount} units of ${selectedBondData.name} for ${amountNum.toFixed(2)} ${selectedCurrency.symbol}`
      } else {
        const totalPrice = calculateTotalPrice()
        tradeMessage = `🏦 Bond Trade: Sell ${amount} units of ${selectedBondData.name} for ${totalPrice} ${selectedCurrency.symbol}`
      }

      // Send trade message to the room
      await client.sendEvent(roomId, "m.room.message", {
        msgtype: "m.text",
        body: tradeMessage,
      })

      toast({
        title: "Trade offer sent",
        description: "Your bond trade offer has been shared in the chat",
      })

      setAmount("")
    } catch (error) {
      console.error("Error sending trade:", error)
      toast({
        title: "Failed to send trade offer",
        description: "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Update the return statement to include the create order form in the market tab
  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 p-4 overflow-y-auto">
        <Tabs defaultValue="trade" className="w-full" onValueChange={(value) => {
          // Load data when tab changes
          if (connectedUsername) {
            if (value === "market") {
              loadTokens()
            } else if (value === "orders") {
              loadOrders()
            } else if (value === "history") {
              loadTransactionHistory()
            }
          }
        }}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="trade">Trade</TabsTrigger>
            <TabsTrigger value="market">Market</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="trade" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Create Trade</CardTitle>
                <CardDescription>Create a new buy or sell trade for tokens</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label>Direction</Label>
                  <div className="flex space-x-2">
                    <Button
                      type="button"
                      variant={direction === "sell" ? "default" : "outline"}
                      className="w-full border-2"
                      onClick={() => setDirection("sell")}
                    >
                      <span className="text-foreground">Sell</span>
                    </Button>
                    <Button
                      type="button"
                      variant={direction === "buy" ? "default" : "outline"}
                      className="w-full border-2"
                      onClick={() => setDirection("buy")}
                    >
                      <span className="text-foreground">Buy</span>
                    </Button>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="baseAsset">{direction === "sell" ? "Token to Sell" : "Pay with"}</Label>
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
                    placeholder="Select token"
                  />
                </div>

                <div className="flex justify-center">
                  <ArrowLeftRight className="text-muted-foreground" />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="counterAsset">{direction === "sell" ? "Receive" : "Token to Buy"}</Label>
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
                    placeholder="Select token"
                  />
                </div>

                {/* Rest of the form remains the same */}
                <div className="grid gap-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={orderAmount}
                    onChange={(e) => setOrderAmount(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Amount of {baseAsset || "base token"} to {direction}
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="price">Price per unit</Label>
                  <Input
                    id="price"
                    type="number"
                    placeholder="0.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Price in {counterAsset || "counter token"} per {baseAsset || "base token"}
                  </p>
                </div>

                <div className="bg-muted p-3 rounded-md">
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <span className="font-bold">
                      {calculateTotal()} {counterAsset || "tokens"}
                    </span>
                  </div>
                </div>
              </CardContent>

              <CardFooter>
                <Button
                  onClick={handleCreateOrder}
                  disabled={isCreating || !baseAsset || !counterAsset || !orderAmount || !price}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isCreating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Trade"
                  )}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Rest of the tabs content remains the same */}
          <TabsContent value="market" className="mt-4 space-y-4">
            {/* First card for token market */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Token Market</CardTitle>
                  <Button variant="ghost" size="icon" onClick={loadTokens}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription>Available tokens and market information</CardDescription>
              </CardHeader>

              <CardContent>
                {isLoadingTokens ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tokens
                      .filter((token) => token.asset_type === "fiat")
                      .map((token) => (
                        <div
                          key={token.id}
                          className="flex justify-between items-center p-2 rounded-md border border-border"
                        >
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-2 overflow-hidden">
                              <img
                                src={token.img_url || "/placeholder.svg?height=32&width=32"}
                                alt={token.code}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  ;(e.target as HTMLImageElement).src = "/placeholder.svg?height=32&width=32"
                                }}
                              />
                            </div>
                            <div>
                              <div className="font-medium">{token.token_name}</div>
                              <div className="text-xs text-muted-foreground">{token.code}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">{token.asset_type}</div>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Open Orders</CardTitle>
                  <Button variant="ghost" size="icon" onClick={loadOrders}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription>Your active buy and sell orders</CardDescription>
              </CardHeader>

              <CardContent>
                {isLoadingOrders ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : orders.length > 0 ? (
                  <div className="space-y-3">
                    {orders.map((order) => (
                      <div
                        key={order.order_id}
                        className="flex justify-between items-center p-3 rounded-md border border-border"
                      >
                        <div className="flex items-center">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${
                              order.direction === "buy" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                            }`}
                          >
                            <CreditCard className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium">
                              {order.direction === "buy" ? "Buy" : "Sell"} {order.base_asset}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {Number.parseFloat(order.amount).toLocaleString()} {order.base_asset} @{" "}
                              {Number.parseFloat(order.price).toLocaleString()} {order.counter_asset}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString()} • {order.status}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="font-medium">
                            {Number.parseFloat(order.quantity).toLocaleString()} {order.counter_asset}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 h-8 px-2 mt-1"
                            onClick={() => handleDeleteOrder(order.order_id)}
                            disabled={isDeletingOrder === order.order_id}
                          >
                            {isDeletingOrder === order.order_id ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3 mr-1" />
                            )}
                            <span className="text-xs">Cancel</span>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No open orders</p>
                  </div>
                )}
              </CardContent>

              <CardFooter>
                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90" onClick={loadOrders}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Orders
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Transaction History</CardTitle>
                <CardDescription>Recent trades and transactions</CardDescription>
              </CardHeader>

              <CardContent>
                {isLoadingHistory ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                  </div>
                ) : transactions.length > 0 ? (
                  <div className="space-y-3">
                    {transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="flex justify-between items-center p-3 rounded-md border border-border"
                      >
                        <div className="flex items-center">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${
                              tx.type === "buy" || tx.type === "deposit"
                                ? "bg-green-100 text-green-600"
                                : "bg-red-100 text-red-600"
                            }`}
                          >
                            {tx.type === "buy" || tx.type === "sell" ? (
                              <CreditCard className="h-4 w-4" />
                            ) : (
                              <Wallet className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium">
                              {tx.type === "buy"
                                ? "Bought"
                                : tx.type === "sell"
                                  ? "Sold"
                                  : tx.type === "deposit"
                                    ? "Deposited"
                                    : "Withdrew"}{" "}
                              {tx.asset}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(tx.timestamp).toLocaleDateString()} • {tx.status}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            {tx.type === "buy" || tx.type === "withdraw" ? "-" : "+"}
                            {formatCurrency(tx.value, tx.currency)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {tx.amount} {tx.type === "buy" || tx.type === "sell" ? "units" : tx.currency}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No transaction history found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
