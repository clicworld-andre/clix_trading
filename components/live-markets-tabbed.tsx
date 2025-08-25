"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  ArrowUp, 
  ArrowDown, 
  TrendingUp,
  BarChart3,
  Coins,
  DollarSign,
  Activity,
  Globe,
  Coffee,
  Wheat,
  Gem,
  Shield,
  Bitcoin
} from "lucide-react"

// Mock data for Securities - by region
const securitiesDataUganda = [
  { 
    code: "UGB-10", 
    name: "Uganda Government Bond 10Y", 
    price: "102.50", 
    change: 0.25, 
    changeValue: "+0.25%",
    volume: "150M UGX",
    status: "active"
  },
  { 
    code: "BAT-UG", 
    name: "British American Tobacco Uganda", 
    price: "8,500", 
    change: -2.1, 
    changeValue: "-2.1%",
    volume: "45K shares", 
    status: "active"
  },
  { 
    code: "UMEME", 
    name: "Umeme Limited", 
    price: "450", 
    change: 1.5, 
    changeValue: "+1.5%",
    volume: "120K shares", 
    status: "active"
  },
  { 
    code: "NIC-UG", 
    name: "NIC Bank Uganda", 
    price: "35", 
    change: 0.8, 
    changeValue: "+0.8%",
    volume: "200K shares", 
    status: "active"
  }
]

const securitiesDataKenya = [
  { 
    code: "KCB", 
    name: "KCB Group", 
    price: "42.50", 
    change: 1.2, 
    changeValue: "+1.2%",
    volume: "2.4M shares",
    status: "active"
  },
  { 
    code: "EQTY", 
    name: "Equity Group Holdings", 
    price: "55.75", 
    change: -0.8, 
    changeValue: "-0.8%",
    volume: "1.8M shares",
    status: "active"
  },
  { 
    code: "SCOM", 
    name: "Safaricom PLC", 
    price: "28.25", 
    change: 2.1, 
    changeValue: "+2.1%",
    volume: "5.2M shares",
    status: "active"
  },
  { 
    code: "EABL", 
    name: "East African Breweries", 
    price: "145.00", 
    change: 0.5, 
    changeValue: "+0.5%",
    volume: "450K shares",
    status: "active"
  }
]

const securitiesDataTanzania = [
  { 
    code: "CRDB", 
    name: "CRDB Bank", 
    price: "175", 
    change: 0.9, 
    changeValue: "+0.9%",
    volume: "800K shares",
    status: "active"
  },
  { 
    code: "NMB", 
    name: "NMB Bank", 
    price: "2,850", 
    change: -1.2, 
    changeValue: "-1.2%",
    volume: "650K shares",
    status: "active"
  },
  { 
    code: "TBL", 
    name: "Tanzania Breweries", 
    price: "6,200", 
    change: 1.8, 
    changeValue: "+1.8%",
    volume: "120K shares",
    status: "active"
  },
  { 
    code: "TCCL", 
    name: "Tanzania Cigarette Company", 
    price: "3,100", 
    change: -0.5, 
    changeValue: "-0.5%",
    volume: "95K shares",
    status: "active"
  }
]

const securitiesDataGlobal = [
  { 
    code: "US10Y", 
    name: "US 10Y Treasury", 
    price: "98.50", 
    change: 0.15, 
    changeValue: "+0.15%",
    volume: "2.4B",
    status: "active"
  },
  { 
    code: "US30Y", 
    name: "US 30Y Treasury", 
    price: "95.20", 
    change: -0.23, 
    changeValue: "-0.23%",
    volume: "1.8B",
    status: "active"
  },
  { 
    code: "UK10Y", 
    name: "UK 10Y Gilt", 
    price: "99.10", 
    change: 0.08, 
    changeValue: "+0.08%",
    volume: "850M",
    status: "active"
  },
  { 
    code: "DE10Y", 
    name: "German 10Y Bund", 
    price: "101.30", 
    change: 0.12, 
    changeValue: "+0.12%",
    volume: "1.2B",
    status: "active"
  },
  { 
    code: "JP10Y", 
    name: "Japan 10Y Bond", 
    price: "100.80", 
    change: -0.05, 
    changeValue: "-0.05%",
    volume: "680M",
    status: "active"
  },
  { 
    code: "FR10Y", 
    name: "France 10Y OAT", 
    price: "102.45", 
    change: 0.18, 
    changeValue: "+0.18%",
    volume: "920M",
    status: "active"
  }
]

// Mock data for Commodities - by category
const commoditiesDataCoffee = [
  { 
    code: "COFFEE-AR", 
    name: "Arabica Coffee Beans", 
    price: "4,850", 
    change: 12.50, 
    changeValue: "+$12.50",
    volume: "2.5K bags", 
    unit: "$",
    status: "active"
  },
  { 
    code: "COFFEE-RB", 
    name: "Robusta Coffee Beans", 
    price: "2,950", 
    change: -8.25, 
    changeValue: "-$8.25",
    volume: "1.8K bags", 
    unit: "$",
    status: "active"
  },
  { 
    code: "COFFEE-UG", 
    name: "Uganda Coffee (Arabica)", 
    price: "4,200", 
    change: 25.00, 
    changeValue: "+$25.00",
    volume: "950 bags", 
    unit: "$",
    status: "active"
  },
  { 
    code: "COFFEE-KE", 
    name: "Kenya Coffee (AA Grade)", 
    price: "5,650", 
    change: 15.75, 
    changeValue: "+$15.75",
    volume: "680 bags", 
    unit: "$",
    status: "active"
  }
]

const commoditiesDataCassava = [
  { 
    code: "CASSAVA-DRY", 
    name: "Dried Cassava Chips", 
    price: "285", 
    change: 5.50, 
    changeValue: "+$5.50",
    volume: "12.5K tons", 
    unit: "$",
    status: "active"
  },
  { 
    code: "CASSAVA-FL", 
    name: "Cassava Flour", 
    price: "420", 
    change: -2.25, 
    changeValue: "-$2.25",
    volume: "8.2K tons", 
    unit: "$",
    status: "active"
  },
  { 
    code: "CASSAVA-ST", 
    name: "Cassava Starch", 
    price: "650", 
    change: 8.75, 
    changeValue: "+$8.75",
    volume: "4.8K tons", 
    unit: "$",
    status: "active"
  },
  { 
    code: "TAPIOCA", 
    name: "Tapioca Pearls", 
    price: "890", 
    change: 12.25, 
    changeValue: "+$12.25",
    volume: "2.1K tons", 
    unit: "$",
    status: "active"
  }
]

const commoditiesDataPreciousMetals = [
  { 
    code: "XAU", 
    name: "Gold", 
    price: "2,046.50", 
    change: -12.30, 
    changeValue: "-$12.30",
    volume: "45.2K oz", 
    unit: "$",
    status: "active"
  },
  { 
    code: "XAG", 
    name: "Silver", 
    price: "24.85", 
    change: 0.45, 
    changeValue: "+$0.45",
    volume: "892K oz", 
    unit: "$",
    status: "active"
  },
  { 
    code: "XPT", 
    name: "Platinum", 
    price: "985.25", 
    change: 8.50, 
    changeValue: "+$8.50",
    volume: "15.2K oz", 
    unit: "$",
    status: "active"
  },
  { 
    code: "XPD", 
    name: "Palladium", 
    price: "1,125.75", 
    change: -15.25, 
    changeValue: "-$15.25",
    volume: "8.5K oz", 
    unit: "$",
    status: "active"
  }
]

// Mock data for FX Rates
const fxRatesData = [
  { 
    pair: "EUR/USD", 
    rate: "1.0875", 
    change: 0.0012, 
    changeValue: "+0.0012",
    volume: "€1.8B",
    status: "active",
    spread: "0.0001"
  },
  { 
    pair: "GBP/USD", 
    rate: "1.2735", 
    change: -0.0023, 
    changeValue: "-0.0023",
    volume: "£950M",
    status: "active",
    spread: "0.0002"
  },
  { 
    pair: "USD/JPY", 
    rate: "150.25", 
    change: 0.45, 
    changeValue: "+0.45",
    volume: "¥2.1T",
    status: "active",
    spread: "0.02"
  },
  { 
    pair: "USD/CHF", 
    rate: "0.8945", 
    change: -0.0008, 
    changeValue: "-0.0008",
    volume: "₣450M",
    status: "active",
    spread: "0.0001"
  },
  { 
    pair: "AUD/USD", 
    rate: "0.6525", 
    change: 0.0035, 
    changeValue: "+0.0035",
    volume: "A$720M",
    status: "active",
    spread: "0.0001"
  },
  { 
    pair: "USD/CAD", 
    rate: "1.3580", 
    change: -0.0015, 
    changeValue: "-0.0015",
    volume: "C$580M",
    status: "active",
    spread: "0.0001"
  }
]

// Mock data for Virtual Assets - Stable Coins
const virtualAssetsStableCoins = [
  { 
    pair: "USDT/USD", 
    rate: "1.0001", 
    change: 0.0001, 
    changeValue: "+0.0001",
    volume: "$2.8B",
    status: "active",
    spread: "0.0001",
    marketCap: "$95.2B"
  },
  { 
    pair: "USDC/USD", 
    rate: "0.9999", 
    change: -0.0001, 
    changeValue: "-0.0001",
    volume: "$1.5B",
    status: "active",
    spread: "0.0001",
    marketCap: "$32.1B"
  },
  { 
    pair: "BUSD/USD", 
    rate: "1.0000", 
    change: 0.0000, 
    changeValue: "0.0000",
    volume: "$680M",
    status: "active",
    spread: "0.0001",
    marketCap: "$8.9B"
  },
  { 
    pair: "DAI/USD", 
    rate: "0.9998", 
    change: -0.0002, 
    changeValue: "-0.0002",
    volume: "$425M",
    status: "active",
    spread: "0.0002",
    marketCap: "$5.2B"
  }
]

const virtualAssetsCrypto = [
  { 
    pair: "BTC/USD", 
    rate: "43,285.50", 
    change: 1250.75, 
    changeValue: "+$1,250.75",
    volume: "$12.5B",
    status: "active",
    spread: "0.50",
    marketCap: "$845.2B"
  },
  { 
    pair: "ETH/USD", 
    rate: "2,645.25", 
    change: -85.50, 
    changeValue: "-$85.50",
    volume: "$8.2B",
    status: "active",
    spread: "0.25",
    marketCap: "$318.5B"
  },
  { 
    pair: "BNB/USD", 
    rate: "315.80", 
    change: 12.45, 
    changeValue: "+$12.45",
    volume: "$1.8B",
    status: "active",
    spread: "0.10",
    marketCap: "$48.2B"
  },
  { 
    pair: "ADA/USD", 
    rate: "0.4850", 
    change: 0.0125, 
    changeValue: "+$0.0125",
    volume: "$850M",
    status: "active",
    spread: "0.0001",
    marketCap: "$17.1B"
  },
  { 
    pair: "SOL/USD", 
    rate: "98.75", 
    change: -2.25, 
    changeValue: "-$2.25",
    volume: "$2.1B",
    status: "active",
    spread: "0.05",
    marketCap: "$42.8B"
  },
  { 
    pair: "DOT/USD", 
    rate: "7.25", 
    change: 0.35, 
    changeValue: "+$0.35",
    volume: "$450M",
    status: "active",
    spread: "0.01",
    marketCap: "$9.2B"
  }
]

export function LiveMarketsTabbed() {
  const [activeTab, setActiveTab] = useState("securities")
  const [activeSecuritiesTab, setActiveSecuritiesTab] = useState("uganda")
  const [activeCommoditiesTab, setActiveCommoditiesTab] = useState("coffee")
  const [activeVirtualAssetsTab, setActiveVirtualAssetsTab] = useState("stablecoins")
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date())
    }, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [])

  // Render function for cards - moved inside component to fix the error
  const renderCards = (data: any[], type: string) => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((item) => (
          <Card key={item.code || item.pair} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  {item.code || item.pair}
                </CardTitle>
                <Badge 
                  variant={item.change >= 0 ? "default" : "destructive"}
                  className="text-xs"
                >
                  {item.change >= 0 ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />}
                  {item.changeValue}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {item.name || (type === 'fx' ? 'Foreign Exchange' : type === 'virtual' ? 'Virtual Asset' : 'Security')}
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-lg font-semibold">
                    {type === 'commodity' && item.unit ? `${item.unit}${item.price}` : 
                     type === 'fx' || type === 'virtual' ? item.rate : item.price}
                  </div>
                  {type === 'fx' && (
                    <div className="text-xs text-muted-foreground">Spread: {item.spread}</div>
                  )}
                  {type === 'virtual' && item.marketCap && (
                    <div className="text-xs text-muted-foreground">Cap: {item.marketCap}</div>
                  )}
                  {type !== 'fx' && type !== 'virtual' && (
                    <div className="text-xs text-muted-foreground">Volume: {item.volume}</div>
                  )}
                </div>
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              </div>
              {(type === 'fx' || type === 'virtual') && (
                <div className="text-xs text-muted-foreground">
                  Volume: {item.volume}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <h2 className="text-lg font-semibold">Live Markets</h2>
          </div>
          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
            <Activity className="h-3 w-3 mr-1" />
            Real-time
          </Badge>
          <span className="text-xs text-muted-foreground">
            Last update: {lastUpdate.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <div className="px-4 pt-4">
            <TabsList className="grid w-full max-w-2xl grid-cols-4">
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
              <TabsTrigger value="virtual" className="flex items-center gap-2">
                <Bitcoin className="h-4 w-4" />
                Virtual Assets
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {/* Securities Tab with Sub-tabs */}
            <TabsContent value="securities" className="mt-0 h-full">
              <div className="space-y-4">
                <Tabs value={activeSecuritiesTab} onValueChange={setActiveSecuritiesTab}>
                  <TabsList className="grid w-full max-w-lg grid-cols-4">
                    <TabsTrigger value="uganda" className="flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      Uganda
                    </TabsTrigger>
                    <TabsTrigger value="kenya" className="flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      Kenya
                    </TabsTrigger>
                    <TabsTrigger value="tanzania" className="flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      Tanzania
                    </TabsTrigger>
                    <TabsTrigger value="global" className="flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      Global
                    </TabsTrigger>
                  </TabsList>
                  
                  <div className="mt-4">
                    <TabsContent value="uganda" className="mt-0">
                      {renderCards(securitiesDataUganda, 'security')}
                    </TabsContent>
                    <TabsContent value="kenya" className="mt-0">
                      {renderCards(securitiesDataKenya, 'security')}
                    </TabsContent>
                    <TabsContent value="tanzania" className="mt-0">
                      {renderCards(securitiesDataTanzania, 'security')}
                    </TabsContent>
                    <TabsContent value="global" className="mt-0">
                      {renderCards(securitiesDataGlobal, 'security')}
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </TabsContent>

            {/* Commodities Tab with Sub-tabs */}
            <TabsContent value="commodities" className="mt-0 h-full">
              <div className="space-y-4">
                <Tabs value={activeCommoditiesTab} onValueChange={setActiveCommoditiesTab}>
                  <TabsList className="grid w-full max-w-md grid-cols-3">
                    <TabsTrigger value="coffee" className="flex items-center gap-1">
                      <Coffee className="h-3 w-3" />
                      Coffee
                    </TabsTrigger>
                    <TabsTrigger value="cassava" className="flex items-center gap-1">
                      <Wheat className="h-3 w-3" />
                      Cassava
                    </TabsTrigger>
                    <TabsTrigger value="precious" className="flex items-center gap-1">
                      <Gem className="h-3 w-3" />
                      Precious Metals
                    </TabsTrigger>
                  </TabsList>
                  
                  <div className="mt-4">
                    <TabsContent value="coffee" className="mt-0">
                      {renderCards(commoditiesDataCoffee, 'commodity')}
                    </TabsContent>
                    <TabsContent value="cassava" className="mt-0">
                      {renderCards(commoditiesDataCassava, 'commodity')}
                    </TabsContent>
                    <TabsContent value="precious" className="mt-0">
                      {renderCards(commoditiesDataPreciousMetals, 'commodity')}
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </TabsContent>

            {/* FX Rates Tab */}
            <TabsContent value="fx" className="mt-0 h-full">
              {renderCards(fxRatesData, 'fx')}
            </TabsContent>

            {/* Virtual Assets Tab with Sub-tabs */}
            <TabsContent value="virtual" className="mt-0 h-full">
              <div className="space-y-4">
                <Tabs value={activeVirtualAssetsTab} onValueChange={setActiveVirtualAssetsTab}>
                  <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="stablecoins" className="flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      Stable Coins
                    </TabsTrigger>
                    <TabsTrigger value="crypto" className="flex items-center gap-1">
                      <Bitcoin className="h-3 w-3" />
                      Crypto
                    </TabsTrigger>
                  </TabsList>
                  
                  <div className="mt-4">
                    <TabsContent value="stablecoins" className="mt-0">
                      {renderCards(virtualAssetsStableCoins, 'virtual')}
                    </TabsContent>
                    <TabsContent value="crypto" className="mt-0">
                      {renderCards(virtualAssetsCrypto, 'virtual')}
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  )
}

export default LiveMarketsTabbed
