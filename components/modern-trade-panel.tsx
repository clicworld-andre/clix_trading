"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useMatrixClient } from "@/lib/matrix-context"
import { 
  ArrowLeftRight, 
  RefreshCw, 
  CreditCard, 
  Wallet, 
  History, 
  Trash2, 
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Activity,
  Target,
  Zap,
  Clock,
  CheckCircle,
  AlertTriangle,
  Plus,
  Calculator
} from "lucide-react"

interface ModernTradePanelProps {
  // No longer requires roomId - this is general trading
}

const modernBonds = [
  { 
    id: "us10y", 
    name: "US 10Y Treasury", 
    symbol: "US10Y",
    yield: 4.25, 
    price: 98.50,
    change: 0.15,
    changePercent: 0.15,
    volume: "2.4B",
    maturity: "2034-05-15",
    rating: "AAA"
  },
  { 
    id: "us30y", 
    name: "US 30Y Treasury", 
    symbol: "US30Y",
    yield: 4.75, 
    price: 95.20,
    change: -0.25,
    changePercent: -0.26,
    volume: "1.8B",
    maturity: "2054-05-15",
    rating: "AAA"
  },
  { 
    id: "uk10y", 
    name: "UK 10Y Gilt", 
    symbol: "UK10Y",
    yield: 3.75, 
    price: 99.10,
    change: 0.08,
    changePercent: 0.08,
    volume: "850M",
    maturity: "2034-03-20",
    rating: "AA"
  },
  { 
    id: "de10y", 
    name: "German 10Y Bund", 
    symbol: "DE10Y",
    yield: 2.25, 
    price: 101.30,
    change: -0.05,
    changePercent: -0.05,
    volume: "1.2B",
    maturity: "2034-07-04",
    rating: "AAA"
  },
]

const currencies = [
  { id: "usd", name: "US Dollar", symbol: "USD", rate: 1.0000, change: 0.00 },
  { id: "eur", name: "Euro", symbol: "EUR", rate: 0.9200, change: -0.0025 },
  { id: "gbp", name: "British Pound", symbol: "GBP", rate: 0.7800, change: 0.0015 },
  { id: "jpy", name: "Japanese Yen", symbol: "JPY", rate: 150.25, change: -0.85 },
]

interface Order {
  id: string
  type: "buy" | "sell"
  instrument: string
  quantity: number
  price: number
  status: "pending" | "filled" | "cancelled"
  timestamp: number
  value: number
}

interface Position {
  instrument: string
  quantity: number
  avgPrice: number
  currentPrice: number
  pnl: number
  pnlPercent: number
}

export default function ModernTradePanel({}: ModernTradePanelProps = {}) {
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy")
  const [selectedBond, setSelectedBond] = useState("us10y")
  const [currency, setCurrency] = useState("usd")
  const [quantity, setQuantity] = useState("")
  const [price, setPrice] = useState("")
  const [orderType, setOrderType] = useState("market")
  const [isLoading, setIsLoading] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  
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

  // Mock data for demo
  useEffect(() => {
    setOrders([
      {
        id: "ord_001",
        type: "buy",
        instrument: "US10Y",
        quantity: 1000000,
        price: 98.50,
        status: "filled",
        timestamp: Date.now() - 3600000,
        value: 985000
      },
      {
        id: "ord_002", 
        type: "sell",
        instrument: "UK10Y",
        quantity: 500000,
        price: 99.10,
        status: "pending",
        timestamp: Date.now() - 1800000,
        value: 495500
      }
    ])

    setPositions([
      {
        instrument: "US10Y",
        quantity: 2500000,
        avgPrice: 98.25,
        currentPrice: 98.50,
        pnl: 6250,
        pnlPercent: 0.25
      },
      {
        instrument: "DE10Y",
        quantity: -1000000,
        avgPrice: 101.50,
        currentPrice: 101.30,
        pnl: 2000,
        pnlPercent: 0.20
      }
    ])
  }, [])

  const selectedBondData = modernBonds.find(b => b.id === selectedBond)

  const handleTrade = async () => {
    if (!client || !selectedBondData || !quantity) return

    setIsLoading(true)
    try {
      const tradeValue = parseFloat(quantity) * selectedBondData.price
      
      // For general trading (not OTC), we just simulate the trade locally
      const newOrder: Order = {
        id: `ord_${Date.now()}`,
        type: tradeType,
        instrument: selectedBondData.symbol,
        quantity: parseInt(quantity),
        price: selectedBondData.price,
        status: "filled",
        timestamp: Date.now(),
        value: tradeValue
      }

      // Add to orders list
      setOrders(prev => [newOrder, ...prev])

      toast({
        title: "Trade executed",
        description: `${tradeType.toUpperCase()} order for ${parseInt(quantity).toLocaleString()} ${selectedBondData.symbol}`,
      })

      // Reset form
      setQuantity("")
      setPrice("")
      
    } catch (error) {
      console.error("Error executing trade:", error)
      toast({
        title: "Failed to execute trade",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (value: number, symbol: string = "USD") => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: symbol,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value)
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

  const formatCalcCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`
  }

  useEffect(() => {
    calculateBondPrice()
  }, [calcInputs])

  return (
    <div className="h-full flex flex-col bg-gradient-subtle dark:bg-gradient-subtle-dark">
      <div className="flex-1 overflow-auto p-6 space-y-6">
        
        {/* Market Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {modernBonds.slice(0, 4).map((bond) => (
            <Card key={bond.id} className="card-luxury hover:shadow-glow transition-all duration-200">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-sm">{bond.symbol}</div>
                  <Badge variant={bond.change >= 0 ? "default" : "destructive"} className="text-xs">
                    {bond.change >= 0 ? "+" : ""}{bond.change}%
                  </Badge>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold">{bond.price}</div>
                  <div className="text-sm text-muted-foreground">
                    Yield: {bond.yield}%
                  </div>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Activity className="h-3 w-3 mr-1" />
                    Vol: {bond.volume}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Trading Interface */}
          <div className="lg:col-span-2">
            <Card className="card-luxury">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-altx-500" />
                  Bond Trading
                </CardTitle>
                <CardDescription>
                  Execute trades in government and corporate bonds
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value="trade" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="trade">New Trade</TabsTrigger>
                    <TabsTrigger value="orders">Open Orders</TabsTrigger>
                    <TabsTrigger value="positions">Positions</TabsTrigger>
                    <TabsTrigger value="calculator">Calculator</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="trade" className="space-y-6 mt-6">
                    {/* Trade Type Selector */}
                    <div className="flex rounded-lg p-1 bg-muted/50">
                      <Button
                        variant={tradeType === "buy" ? "default" : "ghost"}
                        className={`flex-1 ${tradeType === "buy" ? "bg-green-500 hover:bg-green-600 text-white" : ""}`}
                        onClick={() => setTradeType("buy")}
                      >
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Buy
                      </Button>
                      <Button
                        variant={tradeType === "sell" ? "default" : "ghost"}
                        className={`flex-1 ${tradeType === "sell" ? "bg-red-500 hover:bg-red-600 text-white" : ""}`}
                        onClick={() => setTradeType("sell")}
                      >
                        <TrendingDown className="h-4 w-4 mr-2" />
                        Sell
                      </Button>
                    </div>

                    {/* Instrument Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Instrument</Label>
                        <Select value={selectedBond} onValueChange={setSelectedBond}>
                          <SelectTrigger className="input-modern">
                            <SelectValue placeholder="Select bond" />
                          </SelectTrigger>
                          <SelectContent className="card-luxury">
                            {modernBonds.map((bond) => (
                              <SelectItem key={bond.id} value={bond.id}>
                                <div className="flex items-center justify-between w-full">
                                  <span className="font-medium">{bond.name}</span>
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    {bond.yield}%
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Currency</Label>
                        <Select value={currency} onValueChange={setCurrency}>
                          <SelectTrigger className="input-modern">
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                          <SelectContent className="card-luxury">
                            {currencies.map((curr) => (
                              <SelectItem key={curr.id} value={curr.id}>
                                <div className="flex items-center gap-2">
                                  <DollarSign className="h-4 w-4" />
                                  {curr.name} ({curr.symbol})
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Order Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Order Type</Label>
                        <Select value={orderType} onValueChange={setOrderType}>
                          <SelectTrigger className="input-modern">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="card-luxury">
                            <SelectItem value="market">
                              <div className="flex items-center gap-2">
                                <Zap className="h-4 w-4 text-green-500" />
                                Market Order
                              </div>
                            </SelectItem>
                            <SelectItem value="limit">
                              <div className="flex items-center gap-2">
                                <Target className="h-4 w-4 text-blue-500" />
                                Limit Order
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Quantity (Face Value)</Label>
                        <Input
                          type="number"
                          placeholder="1,000,000"
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          className="input-modern"
                        />
                      </div>
                    </div>

                    {/* Price and Value Calculation */}
                    {selectedBondData && quantity && (
                      <div className="p-4 rounded-lg bg-muted/30 space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Current Price:</span>
                            <div className="font-semibold">{selectedBondData.price}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Current Yield:</span>
                            <div className="font-semibold">{selectedBondData.yield}%</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Quantity:</span>
                            <div className="font-semibold">{formatNumber(parseInt(quantity) || 0)}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Total Value:</span>
                            <div className="font-bold text-altx-500">
                              {formatCurrency((parseInt(quantity) || 0) * selectedBondData.price / 100)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Submit Button */}
                    <Button 
                      onClick={handleTrade}
                      disabled={isLoading || !quantity || !selectedBondData}
                      className={`w-full h-12 text-lg font-semibold ${
                        tradeType === "buy" 
                          ? "bg-green-500 hover:bg-green-600 text-white" 
                          : "bg-red-500 hover:bg-red-600 text-white"
                      }`}
                    >
                      {isLoading ? (
                        <>
                          <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          {tradeType === "buy" ? <TrendingUp className="mr-2 h-5 w-5" /> : <TrendingDown className="mr-2 h-5 w-5" />}
                          {tradeType === "buy" ? "Place Buy Order" : "Place Sell Order"}
                        </>
                      )}
                    </Button>
                  </TabsContent>

                  <TabsContent value="orders" className="mt-6">
                    <div className="space-y-4">
                      {orders.length === 0 ? (
                        <div className="text-center py-8">
                          <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                          <p className="text-muted-foreground">No open orders</p>
                        </div>
                      ) : (
                        orders.map((order) => (
                          <Card key={order.id} className="card-luxury">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <Badge 
                                    variant={order.type === "buy" ? "default" : "destructive"}
                                    className="px-3"
                                  >
                                    {order.type.toUpperCase()}
                                  </Badge>
                                  <div>
                                    <div className="font-semibold">{order.instrument}</div>
                                    <div className="text-sm text-muted-foreground">
                                      {formatNumber(order.quantity)} @ {order.price}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-semibold">
                                    {formatCurrency(order.value)}
                                  </div>
                                  <Badge 
                                    variant={
                                      order.status === "filled" ? "default" :
                                      order.status === "pending" ? "secondary" : "destructive"
                                    }
                                    className="text-xs"
                                  >
                                    {order.status === "filled" && <CheckCircle className="h-3 w-3 mr-1" />}
                                    {order.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                                    {order.status}
                                  </Badge>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="positions" className="mt-6">
                    <div className="space-y-4">
                      {positions.length === 0 ? (
                        <div className="text-center py-8">
                          <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                          <p className="text-muted-foreground">No open positions</p>
                        </div>
                      ) : (
                        positions.map((position, index) => (
                          <Card key={index} className="card-luxury">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-semibold">{position.instrument}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {position.quantity > 0 ? "Long" : "Short"} {Math.abs(position.quantity).toLocaleString()}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Avg: {position.avgPrice} | Current: {position.currentPrice}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className={`font-bold ${position.pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                                    {position.pnl >= 0 ? "+" : ""}{formatCurrency(position.pnl)}
                                  </div>
                                  <div className={`text-sm ${position.pnlPercent >= 0 ? "text-green-500" : "text-red-500"}`}>
                                    {position.pnlPercent >= 0 ? "+" : ""}{position.pnlPercent.toFixed(2)}%
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="calculator" className="mt-6">
                    <div className="space-y-6">
                      <div className="text-center">
                        <h3 className="text-lg font-semibold mb-2">Bond Price Calculator</h3>
                        <p className="text-sm text-muted-foreground">Calculate fair value pricing for bonds</p>
                      </div>

                      {/* Input Section */}
                      <Card className="card-luxury">
                        <CardHeader>
                          <CardTitle className="text-base">Bond Parameters</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium text-muted-foreground mb-2 block">Face Value ($)</Label>
                              <Input
                                type="number"
                                value={calcInputs.faceValue}
                                onChange={(e) => handleCalcInputChange('faceValue', e.target.value)}
                                className="h-10"
                              />
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-muted-foreground mb-2 block">Coupon Rate (%)</Label>
                              <Input
                                type="number"
                                step="0.25"
                                value={calcInputs.couponRate}
                                onChange={(e) => handleCalcInputChange('couponRate', e.target.value)}
                                className="h-10"
                              />
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-muted-foreground mb-2 block">Years to Maturity</Label>
                              <Input
                                type="number"
                                step="0.25"
                                value={calcInputs.yearsToMaturity}
                                onChange={(e) => handleCalcInputChange('yearsToMaturity', e.target.value)}
                                className="h-10"
                              />
                            </div>
                            <div>
                              <Label className="text-sm font-medium text-muted-foreground mb-2 block">Market Yield (%)</Label>
                              <Input
                                type="number"
                                step="0.25"
                                value={calcInputs.marketYield}
                                onChange={(e) => handleCalcInputChange('marketYield', e.target.value)}
                                className="h-10"
                              />
                            </div>
                          </div>
                          
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground mb-2 block">Payment Frequency</Label>
                            <Select 
                              value={calcInputs.paymentFrequency.toString()}
                              onValueChange={(value) => handleCalcInputChange('paymentFrequency', value)}
                            >
                              <SelectTrigger className="h-10">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">Annual</SelectItem>
                                <SelectItem value="2">Semi-Annual</SelectItem>
                                <SelectItem value="4">Quarterly</SelectItem>
                                <SelectItem value="12">Monthly</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Results Section */}
                      <Card className="card-luxury">
                        <CardHeader>
                          <CardTitle className="text-base">Calculation Results</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="flex justify-between items-center py-2 border-b">
                              <span className="text-sm text-muted-foreground">Coupon Payment</span>
                              <span className="font-medium">{formatCalcCurrency(calcResults.couponPayment)}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b">
                              <span className="text-sm text-muted-foreground">PV of Coupons</span>
                              <span className="font-medium">{formatCalcCurrency(calcResults.pvCoupons)}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b">
                              <span className="text-sm text-muted-foreground">PV of Principal</span>
                              <span className="font-medium">{formatCalcCurrency(calcResults.pvPrincipal)}</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b">
                              <span className="text-sm text-muted-foreground">Total Coupons</span>
                              <span className="font-medium">{formatCalcCurrency(calcResults.totalCoupons)}</span>
                            </div>
                          </div>

                          <div className="border-t pt-4">
                            <div className="flex justify-between items-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                              <span className="font-semibold text-lg">Fair Value Price</span>
                              <span className="text-2xl font-bold text-blue-600">{formatCalcCurrency(calcResults.bondPrice)}</span>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-3">
                            <Button
                              variant="default"
                              className="flex-1"
                              onClick={() => {
                                setPrice((calcResults.bondPrice / 100).toFixed(2))
                                toast({
                                  title: "Price updated",
                                  description: "Calculator result applied to trade form"
                                })
                              }}
                            >
                              <Calculator className="h-4 w-4 mr-2" />
                              Use Price in Trade
                            </Button>
                            <Button
                              variant="outline"
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

                          {/* Formula Reference */}
                          <Card className="bg-muted/30">
                            <CardContent className="p-4">
                              <div className="text-sm text-muted-foreground space-y-2">
                                <div className="font-medium">Bond Pricing Formula:</div>
                                <div className="font-mono text-xs">Price = PV(Coupons) + PV(Principal)</div>
                                <div className="font-mono text-xs">PV(Coupons) = Σ [C / (1 + r)^t] for t = 1 to n</div>
                                <div className="font-mono text-xs">PV(Principal) = FV / (1 + r)^n</div>
                              </div>
                            </CardContent>
                          </Card>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Market Data Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card className="card-luxury">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Market Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Portfolio Value</div>
                    <div className="text-lg font-bold text-altx-500">$2.4M</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Today's P&L</div>
                    <div className="text-lg font-bold text-green-500">+$12.5K</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Open Orders</div>
                    <div className="text-lg font-bold">{orders.filter(o => o.status === "pending").length}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Positions</div>
                    <div className="text-lg font-bold">{positions.length}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Currency Rates */}
            <Card className="card-luxury">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">FX Rates</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {currencies.slice(0, 3).map((curr) => (
                    <div key={curr.id} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{curr.symbol}</span>
                      <div className="text-right">
                        <div className="font-semibold">{curr.rate.toFixed(4)}</div>
                        <div className={`text-xs ${curr.change >= 0 ? "text-green-500" : "text-red-500"}`}>
                          {curr.change >= 0 ? "+" : ""}{curr.change.toFixed(4)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="card-luxury">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="flex-1">
                      <div className="font-medium">US10Y Buy Filled</div>
                      <div className="text-muted-foreground text-xs">2 minutes ago</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <div className="font-medium">Order Placed</div>
                      <div className="text-muted-foreground text-xs">15 minutes ago</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                    <div className="flex-1">
                      <div className="font-medium">Market Alert</div>
                      <div className="text-muted-foreground text-xs">1 hour ago</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}