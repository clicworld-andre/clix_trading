"use client"

import React, { useEffect, useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, LineChart, Line, CartesianGrid, PieChart, Pie, Cell, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar, AreaChart, Area } from "recharts"
import { analyticsService, AssetPerformance, CorrelationMatrix, MarketMetrics, PortfolioSnapshot, PredictiveInsight, TradeAnalysis } from "@/lib/analytics-service"
import { DollarSign, TrendingUp, BarChart3, Layers3, Crosshair, RefreshCw, ArrowUpRight, ArrowDownRight } from "lucide-react"

const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#ef4444", "#06b6d4", "#a855f7", "#84cc16", "#f97316"]

interface AnalyticsDashboardProps {
  username?: string
}

export default function AnalyticsDashboard({ username }: AnalyticsDashboardProps) {
  const [loading, setLoading] = useState(false)

  // Data states
  const [portfolio, setPortfolio] = useState<PortfolioSnapshot | null>(null)
  const [portfolioHistory, setPortfolioHistory] = useState<PortfolioSnapshot[]>([])
  const [tradePerf, setTradePerf] = useState<TradeAnalysis | null>(null)
  const [assetPerf, setAssetPerf] = useState<AssetPerformance[]>([])
  const [markets, setMarkets] = useState<MarketMetrics[]>([])
  const [crossPlatform, setCrossPlatform] = useState<any | null>(null)
  const [correlations, setCorrelations] = useState<CorrelationMatrix | null>(null)
  const [insights, setInsights] = useState<PredictiveInsight[]>([])

  const currentUser = username || (typeof window !== 'undefined' ? localStorage.getItem('otc_chat_' + (localStorage.getItem('matrix_user_clean') || '')) || '' : '')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [snap, hist, perf, aPerf, mkt, cross, corr, ins] = await Promise.all([
          analyticsService.getPortfolioSnapshot(currentUser),
          analyticsService.getPortfolioHistory(30),
          analyticsService.getTradingPerformance(currentUser),
          analyticsService.getAssetPerformance(currentUser),
          analyticsService.getAllMarketMetrics(),
          analyticsService.getCrossPlatformAnalysis(currentUser),
          analyticsService.getCorrelationMatrix(['XLM','USDC','AQUA','UGX','KES','TZS']),
          analyticsService.getPredictiveInsights('XLM'),
        ])
        setPortfolio(snap)
        setPortfolioHistory(hist)
        setTradePerf(perf)
        setAssetPerf(aPerf)
        setMarkets(mkt)
        setCrossPlatform(cross)
        setCorrelations(corr)
        setInsights(ins)
      } finally {
        setLoading(false)
      }
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser])

  const allocationData = useMemo(() => {
    if (!portfolio) return []
    return portfolio.assets.map(a => ({ name: a.assetCode, value: Number(a.valueUSD.toFixed(2)) }))
  }, [portfolio])

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          <h2 className="text-base font-semibold">Analytics</h2>
          <Badge variant="secondary">Beta</Badge>
        </div>
        <Button size="sm" variant="outline" onClick={() => location.reload()} disabled={loading}>
          <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="portfolio" className="flex-1 flex flex-col min-h-0">
        <div className="border-b bg-muted/20 flex-shrink-0">
          <TabsList className="w-full flex flex-wrap">
            <TabsTrigger value="portfolio" className="flex-1">Portfolio</TabsTrigger>
            <TabsTrigger value="trading" className="flex-1">Trading Performance</TabsTrigger>
            <TabsTrigger value="markets" className="flex-1">Markets</TabsTrigger>
            <TabsTrigger value="cross" className="flex-1">Cross-Platform</TabsTrigger>
            <TabsTrigger value="advanced" className="flex-1">Advanced</TabsTrigger>
          </TabsList>
        </div>

        {/* Portfolio */}
        <TabsContent value="portfolio" className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">Total Value (USD)</div>
              <div className="text-2xl font-bold flex items-center gap-2">
                {portfolio ? portfolio.totalValueUSD.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">Assets Held</div>
              <div className="text-2xl font-bold">{portfolio?.assets.length ?? 0}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">Platforms</div>
              <div className="text-2xl font-bold">{portfolio?.platforms.length ?? 0}</div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">Snapshots (30d)</div>
              <div className="text-2xl font-bold">{portfolioHistory.length}</div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-4">
              <div className="font-medium mb-2">Asset Allocation</div>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={allocationData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                    {allocationData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-4">
              <div className="font-medium mb-2">Portfolio Value History (USD)</div>
              <ChartContainer config={{ value: { label: 'Value', color: 'hsl(217.2 91.2% 59.8%)' } }}>
                <AreaChart data={portfolioHistory.map(h => ({ time: new Date(h.timestamp).toLocaleDateString(), value: Number(h.totalValueUSD.toFixed(2)) }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" hide={false} />
                  <YAxis hide={false} />
                  <Area type="monotone" dataKey="value" stroke="var(--color-value)" fill="var(--color-value)" fillOpacity={0.2} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                </AreaChart>
              </ChartContainer>
            </Card>
          </div>
        </TabsContent>

        {/* Trading Performance */}
        <TabsContent value="trading" className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <Card className="p-4"><div className="text-xs text-muted-foreground">Total Trades</div><div className="text-2xl font-bold">{tradePerf?.totalTrades ?? 0}</div></Card>
            <Card className="p-4"><div className="text-xs text-muted-foreground">Win Rate</div><div className="text-2xl font-bold">{tradePerf ? tradePerf.winRate.toFixed(1) : '0.0'}%</div></Card>
            <Card className="p-4"><div className="text-xs text-muted-foreground">Total PnL (USD)</div><div className={`text-2xl font-bold flex items-center gap-1 ${((tradePerf?.totalPnLUSD||0) >= 0) ? 'text-green-600' : 'text-red-600'}`}>{tradePerf ? tradePerf.totalPnLUSD.toFixed(2) : '0.00'} {tradePerf && (tradePerf.totalPnLUSD>=0 ? <ArrowUpRight className="h-4 w-4"/> : <ArrowDownRight className="h-4 w-4"/>)}</div></Card>
            <Card className="p-4"><div className="text-xs text-muted-foreground">Profit Factor</div><div className="text-2xl font-bold">{tradePerf ? tradePerf.profitFactor.toFixed(2) : '0.00'}</div></Card>
            <Card className="p-4"><div className="text-xs text-muted-foreground">Sharpe Ratio</div><div className="text-2xl font-bold">{tradePerf ? (tradePerf.sharpeRatio || 0).toFixed(2) : '0.00'}</div></Card>
          </div>

          <Card className="p-4">
            <div className="font-medium mb-2">Performance by Asset (PnL USD)</div>
            <ChartContainer config={{ pnl: { label: 'PnL USD', color: 'hsl(142.1 70.6% 45.3%)' } }}>
              <BarChart data={assetPerf.map(a => ({ asset: a.assetCode, pnl: Number(a.pnlUSD.toFixed(2)) }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="asset" />
                <YAxis />
                <Bar dataKey="pnl" fill="var(--color-pnl)" />
                <ChartTooltip content={<ChartTooltipContent />} />
              </BarChart>
            </ChartContainer>
          </Card>
        </TabsContent>

        {/* Markets */}
        <TabsContent value="markets" className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {markets.map((m, idx) => (
              <Card key={idx} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{m.assetCode}</div>
                  <Badge variant="outline">24h {m.priceChangePercent24h.toFixed(2)}%</Badge>
                </div>
                <div className="mt-2 text-2xl font-bold">{m.currentPrice.toLocaleString(undefined,{maximumFractionDigits: m.currentPrice>100?0:4})}</div>
                <div className="text-xs text-muted-foreground">Volatility: {m.volatility.toFixed(1)}%</div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Cross-Platform */}
        <TabsContent value="cross" className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card className="p-4">
              <div className="font-medium mb-2">Stellar</div>
              <div className="text-xs text-muted-foreground">Win Rate</div>
              <div className="text-2xl font-bold">{crossPlatform ? crossPlatform.stellar.winRate.toFixed(1) : '0.0'}%</div>
            </Card>
            <Card className="p-4">
              <div className="font-medium mb-2">OTC</div>
              <div className="text-xs text-muted-foreground">Win Rate</div>
              <div className="text-2xl font-bold">{crossPlatform ? crossPlatform.otc.winRate.toFixed(1) : '0.0'}%</div>
            </Card>
            <Card className="p-4">
              <div className="font-medium mb-2">LC</div>
              <div className="text-xs text-muted-foreground">Win Rate</div>
              <div className="text-2xl font-bold">{crossPlatform ? crossPlatform.lc.winRate.toFixed(1) : '0.0'}%</div>
            </Card>
          </div>

          <Card className="p-4">
            <div className="font-medium mb-2">Platform Volume Comparison</div>
            <ChartContainer config={{ volume: { label: 'Volume', color: 'hsl(221.2 83.2% 53.3%)' } }}>
              <BarChart data={[{platform:'Stellar', volume: crossPlatform?.comparison.totalVolume.stellar || 0}, {platform:'OTC', volume: crossPlatform?.comparison.totalVolume.otc || 0}, {platform:'LC', volume: crossPlatform?.comparison.totalVolume.lc || 0}] }>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="platform" />
                <YAxis />
                <Bar dataKey="volume" fill="var(--color-volume)" />
                <ChartTooltip content={<ChartTooltipContent />} />
              </BarChart>
            </ChartContainer>
          </Card>
        </TabsContent>

        {/* Advanced */}
        <TabsContent value="advanced" className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          <Card className="p-4">
            <div className="font-medium mb-2">Asset Correlations</div>
            <div className="text-xs text-muted-foreground mb-2">-1 = inverse, 0 = none, 1 = direct</div>
            <div className="grid grid-cols-7 gap-1 text-xs">
              <div></div>
              {correlations?.assets.map((a, i) => (<div key={`header-${i}`} className="text-center font-medium">{a}</div>))}
              {correlations?.assets.map((row, i) => (
                <React.Fragment key={`row-${i}`}>
                  <div className="font-medium text-right pr-2">{row}</div>
                  {correlations?.correlations[i].map((v, j) => (
                    <div key={`cell-${i}-${j}`} className="h-7 flex items-center justify-center rounded" style={{ backgroundColor: `hsl(${(v+1)*120},70%,80%)`}}>
                      {v.toFixed(2)}
                    </div>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4">
              <div className="font-medium mb-2">Predictive Insights (XLM)</div>
              <div className="space-y-2">
                {insights.map((ins, idx) => (
                  <div key={idx} className="p-2 rounded border flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium capitalize">{ins.type} · {ins.assetCode}</div>
                      <div className="text-xs text-muted-foreground">{ins.description}</div>
                    </div>
                    <Badge variant={ins.signal === 'bullish' ? 'default' : ins.signal === 'bearish' ? 'destructive' : 'secondary'}>
                      {ins.signal} · {ins.confidence.toFixed(0)}%
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <div className="font-medium mb-2">Top Assets by Win Rate</div>
              <ChartContainer config={{ win: { label: 'Win %', color: 'hsl(142.1 70.6% 45.3%)' } }}>
                <BarChart data={assetPerf.slice(0,6).map(a => ({ asset: a.assetCode, win: Number(a.winRate.toFixed(1)) }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="asset" />
                  <YAxis />
                  <Bar dataKey="win" fill="var(--color-win)" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                </BarChart>
              </ChartContainer>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

