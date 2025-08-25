"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  ArrowUp, 
  ArrowDown, 
  TrendingUp,
  Shield,
  BarChart3,
  Coins,
  DollarSign
} from "lucide-react"

// Mock data for different market categories
const securitiesData = [
  { code: "US10Y", name: "US 10Y Treasury", price: 98.5, change: 0.15, volume: "2.4B" },
  { code: "US30Y", name: "US 30Y Treasury", price: 95.2, change: -0.23, volume: "1.8B" },
  { code: "UK10Y", name: "UK 10Y Gilt", price: 99.1, change: 0.08, volume: "850M" },
  { code: "DE10Y", name: "German 10Y Bund", price: 101.3, change: 0.12, volume: "1.2B" },
  { code: "JP10Y", name: "Japan 10Y Bond", price: 100.8, change: -0.05, volume: "680M" },
]

const commoditiesData = [
  { code: "XAU", name: "Gold", price: 2045.50, change: -12.30, volume: "45.2K oz", unit: "$" },
  { code: "XAG", name: "Silver", price: 24.85, change: 0.45, volume: "892K oz", unit: "$" },
  { code: "WTI", name: "Crude Oil", price: 78.95, change: 2.15, volume: "1.2M bbl", unit: "$" },
  { code: "HG", name: "Copper", price: 3.89, change: -0.08, volume: "125K lbs", unit: "$" },
  { code: "ZW", name: "Wheat", price: 645.25, change: 8.50, volume: "89K bu", unit: "¢" },
]

const fxRatesData = [
  { pair: "EUR/USD", rate: 1.0875, change: 0.0012, volume: "€1.8B" },
  { pair: "GBP/USD", rate: 1.2735, change: -0.0023, volume: "£950M" },
  { pair: "USD/JPY", rate: 150.25, change: 0.45, volume: "¥2.1T" },
  { pair: "USD/CHF", rate: 0.8945, change: -0.0008, volume: "₣450M" },
  { pair: "AUD/USD", rate: 0.6525, change: 0.0035, volume: "A$720M" },
]

interface LiveMarketsProps {
  compact?: boolean
}

export function LiveMarkets({ compact = false }: LiveMarketsProps) {
  const [activeTab, setActiveTab] = useState("securities")

  if (compact) {
    // Compact version for header
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted/50 cursor-pointer transition-colors">
          <span className="text-xs font-medium text-green-600">Securities</span>
          <div className="text-xs text-muted-foreground">
            US10Y: 98.5 {securitiesData[0].change >= 0 ? '↑' : '↓'}
          </div>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted/50 cursor-pointer transition-colors">
          <span className="text-xs font-medium text-blue-600">Commodities</span>
          <div className="text-xs text-muted-foreground">
            Gold: ${commoditiesData[0].price.toFixed(0)} {commoditiesData[0].change >= 0 ? '↑' : '↓'}
          </div>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted/50 cursor-pointer transition-colors">
          <span className="text-xs font-medium text-purple-600">FX Rates</span>
          <div className="text-xs text-muted-foreground">
            EUR/USD: {fxRatesData[0].rate.toFixed(4)} {fxRatesData[0].change >= 0 ? '↑' : '↓'}
          </div>
        </div>
      </div>
    )
  }

  // Full version for expanded view
  return (
    <div className="w-full max-w-4xl">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <h2 className="text-lg font-semibold">Live Markets</h2>
            <Badge variant="outline" className="text-xs">
              Real-time
            </Badge>
          </div>
          
          <TabsList className="grid w-auto grid-cols-3">
            <TabsTrigger value="securities" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Securities
            </TabsTrigger>
            <TabsTrigger value="commodities" className="flex items-center gap-2">
              <Coins className="h-4 w-4" />
              Commodities
            </TabsTrigger>
            <TabsTrigger value="fx" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              FX Rates
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="securities" className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {securitiesData.map((security) => (
              <Card key={security.code} className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-semibold text-sm">{security.code}</div>
                    <div className="text-xs text-muted-foreground">{security.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{security.price}</div>
                    <div className={`text-xs flex items-center gap-1 ${security.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {security.change >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                      {Math.abs(security.change)}%
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Volume: {security.volume}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="commodities" className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {commoditiesData.map((commodity) => (
              <Card key={commodity.code} className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-semibold text-sm">{commodity.code}</div>
                    <div className="text-xs text-muted-foreground">{commodity.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">
                      {commodity.unit}{commodity.price.toFixed(2)}
                    </div>
                    <div className={`text-xs flex items-center gap-1 ${commodity.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {commodity.change >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                      {commodity.unit}{Math.abs(commodity.change).toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Volume: {commodity.volume}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="fx" className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {fxRatesData.map((fx) => (
              <Card key={fx.pair} className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-semibold text-sm">{fx.pair}</div>
                    <div className="text-xs text-muted-foreground">Foreign Exchange</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{fx.rate.toFixed(4)}</div>
                    <div className={`text-xs flex items-center gap-1 ${fx.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {fx.change >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                      {Math.abs(fx.change).toFixed(4)}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Volume: {fx.volume}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default LiveMarkets