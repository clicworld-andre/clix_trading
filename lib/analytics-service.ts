"use client"

import { StellarAsset } from './stellar-trading'

// Analytics interfaces
export interface PortfolioSnapshot {
  timestamp: string
  totalValue: number
  totalValueUSD: number
  assets: AssetHolding[]
  platforms: PlatformBreakdown[]
}

export interface AssetHolding {
  assetCode: string
  assetIssuer?: string
  balance: number
  valueUSD: number
  percentage: number
  platform: 'stellar' | 'otc' | 'lc' | 'wallet'
}

export interface PlatformBreakdown {
  platform: 'stellar' | 'otc' | 'lc' | 'wallet'
  value: number
  valueUSD: number
  percentage: number
}

export interface TradeAnalysis {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  winRate: number
  totalPnL: number
  totalPnLUSD: number
  avgProfitPerTrade: number
  avgLossPerTrade: number
  largestWin: number
  largestLoss: number
  profitFactor: number
  sharpeRatio?: number
}

export interface AssetPerformance {
  assetCode: string
  trades: number
  volume: number
  pnl: number
  pnlUSD: number
  winRate: number
  avgHoldTime: number
}

export interface MarketMetrics {
  assetCode: string
  currentPrice: number
  priceChange24h: number
  priceChangePercent24h: number
  volume24h: number
  high24h: number
  low24h: number
  volatility: number
  marketCap?: number
}

export interface CorrelationMatrix {
  assets: string[]
  correlations: number[][]
  timeframe: '7d' | '30d' | '90d'
}

export interface RegionalAnalysis {
  region: 'uganda' | 'kenya' | 'tanzania' | 'global'
  volume: number
  trades: number
  pnl: number
  topAssets: AssetPerformance[]
}

export interface PredictiveInsight {
  type: 'trend' | 'momentum' | 'volatility' | 'support_resistance'
  assetCode: string
  signal: 'bullish' | 'bearish' | 'neutral'
  confidence: number
  description: string
  timeframe: string
}

// Mock exchange rates for USD conversion
const MOCK_EXCHANGE_RATES: Record<string, number> = {
  'XLM': 0.12,
  'USDC': 1.00,
  'AQUA': 0.05,
  'UGX': 0.00027,
  'KES': 0.0067,
  'TZS': 0.00037,
  'EUR': 1.08,
  'GBP': 1.26,
  'JPY': 0.0067
}

export class AnalyticsService {
  private static instance: AnalyticsService
  private portfolioHistory: PortfolioSnapshot[] = []
  private tradeHistory: any[] = []
  private marketData: Map<string, MarketMetrics> = new Map()

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService()
    }
    return AnalyticsService.instance
  }

  // Portfolio Analytics
  async getPortfolioSnapshot(username: string): Promise<PortfolioSnapshot> {
    try {
      // Aggregate balances from all sources
      const [stellarBalances, otcBalances, lcBalances, walletBalances] = await Promise.all([
        this.getStellarBalances(username),
        this.getOTCBalances(username),
        this.getLCBalances(username),
        this.getWalletBalances(username)
      ])

      const allAssets: AssetHolding[] = [
        ...stellarBalances,
        ...otcBalances,
        ...lcBalances,
        ...walletBalances
      ]

      // Calculate totals
      const totalValueUSD = allAssets.reduce((sum, asset) => sum + asset.valueUSD, 0)
      
      // Calculate percentages
      allAssets.forEach(asset => {
        asset.percentage = totalValueUSD > 0 ? (asset.valueUSD / totalValueUSD) * 100 : 0
      })

      // Platform breakdown
      const platforms: PlatformBreakdown[] = ['stellar', 'otc', 'lc', 'wallet'].map(platform => {
        const platformAssets = allAssets.filter(a => a.platform === platform)
        const value = platformAssets.reduce((sum, a) => sum + a.valueUSD, 0)
        return {
          platform: platform as any,
          value,
          valueUSD: value,
          percentage: totalValueUSD > 0 ? (value / totalValueUSD) * 100 : 0
        }
      })

      const snapshot: PortfolioSnapshot = {
        timestamp: new Date().toISOString(),
        totalValue: totalValueUSD,
        totalValueUSD,
        assets: allAssets,
        platforms: platforms.filter(p => p.value > 0)
      }

      // Store in history
      this.portfolioHistory.push(snapshot)
      // Keep only last 100 snapshots
      if (this.portfolioHistory.length > 100) {
        this.portfolioHistory = this.portfolioHistory.slice(-100)
      }

      return snapshot
    } catch (error) {
      console.error('Error getting portfolio snapshot:', error)
      throw error
    }
  }

  async getPortfolioHistory(days: number = 30): Promise<PortfolioSnapshot[]> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)
    
    return this.portfolioHistory.filter(snapshot => 
      new Date(snapshot.timestamp) >= cutoffDate
    )
  }

  // Trading Performance Analytics
  async getTradingPerformance(username: string): Promise<TradeAnalysis> {
    try {
      const trades = await this.getAllTrades(username)
      
      if (trades.length === 0) {
        return {
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
          winRate: 0,
          totalPnL: 0,
          totalPnLUSD: 0,
          avgProfitPerTrade: 0,
          avgLossPerTrade: 0,
          largestWin: 0,
          largestLoss: 0,
          profitFactor: 0
        }
      }

      const winningTrades = trades.filter(t => t.pnl > 0)
      const losingTrades = trades.filter(t => t.pnl < 0)
      const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0)
      const totalPnLUSD = trades.reduce((sum, t) => sum + (t.pnlUSD || 0), 0)

      const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0)
      const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0))

      return {
        totalTrades: trades.length,
        winningTrades: winningTrades.length,
        losingTrades: losingTrades.length,
        winRate: trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0,
        totalPnL,
        totalPnLUSD,
        avgProfitPerTrade: winningTrades.length > 0 ? grossProfit / winningTrades.length : 0,
        avgLossPerTrade: losingTrades.length > 0 ? grossLoss / losingTrades.length : 0,
        largestWin: winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.pnl)) : 0,
        largestLoss: losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.pnl)) : 0,
        profitFactor: grossLoss > 0 ? grossProfit / grossLoss : 0,
        sharpeRatio: this.calculateSharpeRatio(trades)
      }
    } catch (error) {
      console.error('Error calculating trading performance:', error)
      throw error
    }
  }

  async getAssetPerformance(username: string): Promise<AssetPerformance[]> {
    try {
      const trades = await this.getAllTrades(username)
      const assetGroups = new Map<string, any[]>()

      trades.forEach(trade => {
        const assetCode = trade.baseAsset || trade.assetCode || 'Unknown'
        if (!assetGroups.has(assetCode)) {
          assetGroups.set(assetCode, [])
        }
        assetGroups.get(assetCode)!.push(trade)
      })

      const performance: AssetPerformance[] = []

      assetGroups.forEach((assetTrades, assetCode) => {
        const winningTrades = assetTrades.filter(t => t.pnl > 0)
        const totalPnL = assetTrades.reduce((sum, t) => sum + t.pnl, 0)
        const totalPnLUSD = assetTrades.reduce((sum, t) => sum + (t.pnlUSD || 0), 0)
        const totalVolume = assetTrades.reduce((sum, t) => sum + (t.volume || t.quantity || 0), 0)
        const totalHoldTime = assetTrades.reduce((sum, t) => sum + (t.holdTime || 0), 0)

        performance.push({
          assetCode,
          trades: assetTrades.length,
          volume: totalVolume,
          pnl: totalPnL,
          pnlUSD: totalPnLUSD,
          winRate: (winningTrades.length / assetTrades.length) * 100,
          avgHoldTime: assetTrades.length > 0 ? totalHoldTime / assetTrades.length : 0
        })
      })

      return performance.sort((a, b) => b.pnlUSD - a.pnlUSD)
    } catch (error) {
      console.error('Error calculating asset performance:', error)
      return []
    }
  }

  // Market Analytics
  async getMarketMetrics(assetCode: string): Promise<MarketMetrics | null> {
    try {
      // This would typically fetch from external APIs like CoinGecko, CoinMarketCap, etc.
      // For now, we'll return mock data with some realistic values
      
      const basePrice = this.getBasePrice(assetCode)
      const priceChange = (Math.random() - 0.5) * 0.2 * basePrice // ±10% daily change
      
      const metrics: MarketMetrics = {
        assetCode,
        currentPrice: basePrice + priceChange,
        priceChange24h: priceChange,
        priceChangePercent24h: (priceChange / basePrice) * 100,
        volume24h: Math.random() * 1000000,
        high24h: basePrice + Math.abs(priceChange) + (Math.random() * 0.1 * basePrice),
        low24h: basePrice - Math.abs(priceChange) - (Math.random() * 0.1 * basePrice),
        volatility: Math.random() * 50 + 10, // 10-60% volatility
        marketCap: assetCode === 'XLM' ? Math.random() * 1000000000 + 2000000000 : undefined
      }

      this.marketData.set(assetCode, metrics)
      return metrics
    } catch (error) {
      console.error('Error fetching market metrics:', error)
      return null
    }
  }

  async getAllMarketMetrics(): Promise<MarketMetrics[]> {
    const assets = ['XLM', 'USDC', 'AQUA', 'BTC', 'ETH', 'UGX', 'KES', 'TZS']
    const metrics: MarketMetrics[] = []

    for (const asset of assets) {
      const metric = await this.getMarketMetrics(asset)
      if (metric) metrics.push(metric)
    }

    return metrics
  }

  // Cross-Platform Analytics
  async getCrossPlatformAnalysis(username: string): Promise<{
    stellar: TradeAnalysis,
    otc: TradeAnalysis,
    lc: TradeAnalysis,
    comparison: any
  }> {
    try {
      const [stellarTrades, otcTrades, lcTrades] = await Promise.all([
        this.getStellarTrades(username),
        this.getOTCTrades(username),
        this.getLCTrades(username)
      ])

      const stellarAnalysis = await this.analyzeTrades(stellarTrades)
      const otcAnalysis = await this.analyzeTrades(otcTrades)
      const lcAnalysis = await this.analyzeTrades(lcTrades)

      const comparison = {
        totalVolume: {
          stellar: stellarTrades.reduce((sum, t) => sum + (t.volume || 0), 0),
          otc: otcTrades.reduce((sum, t) => sum + (t.volume || 0), 0),
          lc: lcTrades.reduce((sum, t) => sum + (t.volume || 0), 0)
        },
        bestPerforming: [stellarAnalysis, otcAnalysis, lcAnalysis]
          .sort((a, b) => b.totalPnLUSD - a.totalPnLUSD)[0]
      }

      return {
        stellar: stellarAnalysis,
        otc: otcAnalysis,
        lc: lcAnalysis,
        comparison
      }
    } catch (error) {
      console.error('Error in cross-platform analysis:', error)
      throw error
    }
  }

  async getRegionalAnalysis(): Promise<RegionalAnalysis[]> {
    // Mock regional data based on the live markets we have
    const regions: RegionalAnalysis[] = [
      {
        region: 'uganda',
        volume: Math.random() * 10000000 + 5000000,
        trades: Math.floor(Math.random() * 1000) + 500,
        pnl: (Math.random() - 0.5) * 100000,
        topAssets: [
          { assetCode: 'UGX', trades: 150, volume: 5000000, pnl: 15000, pnlUSD: 40.5, winRate: 65, avgHoldTime: 2.5 },
          { assetCode: 'UMEME', trades: 80, volume: 2000000, pnl: 8000, pnlUSD: 21.6, winRate: 72, avgHoldTime: 5.2 }
        ]
      },
      {
        region: 'kenya',
        volume: Math.random() * 15000000 + 8000000,
        trades: Math.floor(Math.random() * 1200) + 600,
        pnl: (Math.random() - 0.5) * 150000,
        topAssets: [
          { assetCode: 'KES', trades: 200, volume: 8000000, pnl: 25000, pnlUSD: 167.5, winRate: 68, avgHoldTime: 3.1 },
          { assetCode: 'SCOM', trades: 120, volume: 4000000, pnl: 12000, pnlUSD: 80.4, winRate: 75, avgHoldTime: 4.8 }
        ]
      },
      {
        region: 'tanzania',
        volume: Math.random() * 8000000 + 4000000,
        trades: Math.floor(Math.random() * 800) + 400,
        pnl: (Math.random() - 0.5) * 80000,
        topAssets: [
          { assetCode: 'TZS', trades: 100, volume: 3000000, pnl: 10000, pnlUSD: 3.7, winRate: 60, avgHoldTime: 4.2 },
          { assetCode: 'CRDB', trades: 60, volume: 1500000, pnl: 5000, pnlUSD: 1.85, winRate: 70, avgHoldTime: 6.1 }
        ]
      },
      {
        region: 'global',
        volume: Math.random() * 50000000 + 25000000,
        trades: Math.floor(Math.random() * 2000) + 1000,
        pnl: (Math.random() - 0.5) * 500000,
        topAssets: [
          { assetCode: 'XLM', trades: 500, volume: 20000000, pnl: 50000, pnlUSD: 6000, winRate: 65, avgHoldTime: 1.8 },
          { assetCode: 'USDC', trades: 300, volume: 15000000, pnl: 30000, pnlUSD: 30000, winRate: 70, avgHoldTime: 2.2 }
        ]
      }
    ]

    return regions
  }

  // Advanced Analytics
  async getCorrelationMatrix(assets: string[], timeframe: '7d' | '30d' | '90d' = '30d'): Promise<CorrelationMatrix> {
    // Mock correlation data - in real implementation, this would calculate actual correlations
    const correlations: number[][] = assets.map(() => 
      assets.map(() => Math.random() * 2 - 1) // Random correlation between -1 and 1
    )

    // Ensure diagonal is 1 (asset correlates perfectly with itself)
    for (let i = 0; i < assets.length; i++) {
      correlations[i][i] = 1
    }

    // Make matrix symmetric
    for (let i = 0; i < assets.length; i++) {
      for (let j = i + 1; j < assets.length; j++) {
        correlations[j][i] = correlations[i][j]
      }
    }

    return {
      assets,
      correlations,
      timeframe
    }
  }

  async getPredictiveInsights(assetCode: string): Promise<PredictiveInsight[]> {
    // Mock predictive insights - in real implementation, this would use ML/AI models
    const insights: PredictiveInsight[] = [
      {
        type: 'trend',
        assetCode,
        signal: Math.random() > 0.5 ? 'bullish' : 'bearish',
        confidence: Math.random() * 40 + 60, // 60-100% confidence
        description: `${assetCode} shows strong ${Math.random() > 0.5 ? 'upward' : 'downward'} momentum based on recent price action`,
        timeframe: '7d'
      },
      {
        type: 'volatility',
        assetCode,
        signal: 'neutral',
        confidence: Math.random() * 30 + 70,
        description: `Volatility expected to ${Math.random() > 0.5 ? 'increase' : 'decrease'} in the next trading session`,
        timeframe: '1d'
      }
    ]

    return insights
  }

  // Private helper methods
  private async getStellarBalances(username: string): Promise<AssetHolding[]> {
    try {
      const response = await fetch(`/api/stellar/balances/${username}`)
      if (!response.ok) return []
      
      const data = await response.json()
      const balances = data.balances || []
      
      return balances.map((balance: any) => ({
        assetCode: balance.asset_code || 'XLM',
        assetIssuer: balance.asset_issuer,
        balance: parseFloat(balance.balance || '0'),
        valueUSD: this.convertToUSD(parseFloat(balance.balance || '0'), balance.asset_code || 'XLM'),
        percentage: 0, // Will be calculated later
        platform: 'stellar' as const
      }))
    } catch (error) {
      console.error('Error fetching Stellar balances:', error)
      return []
    }
  }

  private async getOTCBalances(username: string): Promise<AssetHolding[]> {
    // Mock OTC balances - integrate with your OTC system
    return [
      {
        assetCode: 'UGX',
        balance: Math.random() * 10000000,
        valueUSD: Math.random() * 2700,
        percentage: 0,
        platform: 'otc' as const
      }
    ]
  }

  private async getLCBalances(username: string): Promise<AssetHolding[]> {
    // Mock LC balances - integrate with your LC system
    return [
      {
        assetCode: 'USD',
        balance: Math.random() * 50000,
        valueUSD: Math.random() * 50000,
        percentage: 0,
        platform: 'lc' as const
      }
    ]
  }

  private async getWalletBalances(username: string): Promise<AssetHolding[]> {
    // This would integrate with Clic wallet or other wallet systems
    return []
  }

  private async getAllTrades(username: string): Promise<any[]> {
    const [stellarTrades, otcTrades, lcTrades] = await Promise.all([
      this.getStellarTrades(username),
      this.getOTCTrades(username),
      this.getLCTrades(username)
    ])

    return [...stellarTrades, ...otcTrades, ...lcTrades]
  }

  private async getStellarTrades(username: string): Promise<any[]> {
    // Mock Stellar trade history
    return Array.from({ length: 10 }, (_, i) => ({
      id: `stellar_${i}`,
      platform: 'stellar',
      baseAsset: 'XLM',
      counterAsset: 'USDC',
      quantity: Math.random() * 1000,
      price: Math.random() * 0.5,
      pnl: (Math.random() - 0.5) * 100,
      pnlUSD: (Math.random() - 0.5) * 100,
      timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      volume: Math.random() * 1000
    }))
  }

  private async getOTCTrades(username: string): Promise<any[]> {
    // Mock OTC trade history
    return Array.from({ length: 5 }, (_, i) => ({
      id: `otc_${i}`,
      platform: 'otc',
      assetCode: 'UGX',
      quantity: Math.random() * 1000000,
      pnl: (Math.random() - 0.5) * 50000,
      pnlUSD: (Math.random() - 0.5) * 135,
      timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      volume: Math.random() * 1000000
    }))
  }

  private async getLCTrades(username: string): Promise<any[]> {
    // Mock LC trade history
    return Array.from({ length: 3 }, (_, i) => ({
      id: `lc_${i}`,
      platform: 'lc',
      assetCode: 'USD',
      quantity: Math.random() * 100000,
      pnl: (Math.random() - 0.5) * 10000,
      pnlUSD: (Math.random() - 0.5) * 10000,
      timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      volume: Math.random() * 100000
    }))
  }

  private async analyzeTrades(trades: any[]): Promise<TradeAnalysis> {
    if (trades.length === 0) {
      return {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        totalPnL: 0,
        totalPnLUSD: 0,
        avgProfitPerTrade: 0,
        avgLossPerTrade: 0,
        largestWin: 0,
        largestLoss: 0,
        profitFactor: 0
      }
    }

    const winningTrades = trades.filter(t => t.pnl > 0)
    const losingTrades = trades.filter(t => t.pnl < 0)
    const totalPnL = trades.reduce((sum, t) => sum + t.pnl, 0)
    const totalPnLUSD = trades.reduce((sum, t) => sum + (t.pnlUSD || 0), 0)

    const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0)
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0))

    return {
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: (winningTrades.length / trades.length) * 100,
      totalPnL,
      totalPnLUSD,
      avgProfitPerTrade: winningTrades.length > 0 ? grossProfit / winningTrades.length : 0,
      avgLossPerTrade: losingTrades.length > 0 ? grossLoss / losingTrades.length : 0,
      largestWin: winningTrades.length > 0 ? Math.max(...winningTrades.map(t => t.pnl)) : 0,
      largestLoss: losingTrades.length > 0 ? Math.min(...losingTrades.map(t => t.pnl)) : 0,
      profitFactor: grossLoss > 0 ? grossProfit / grossLoss : 0
    }
  }

  private convertToUSD(amount: number, assetCode: string): number {
    const rate = MOCK_EXCHANGE_RATES[assetCode] || 1
    return amount * rate
  }

  private getBasePrice(assetCode: string): number {
    const basePrices: Record<string, number> = {
      'XLM': 0.12,
      'USDC': 1.00,
      'AQUA': 0.05,
      'BTC': 43000,
      'ETH': 2600,
      'UGX': 0.00027,
      'KES': 0.0067,
      'TZS': 0.00037
    }
    return basePrices[assetCode] || 1
  }

  private calculateSharpeRatio(trades: any[]): number {
    if (trades.length < 2) return 0
    
    const returns = trades.map(t => t.pnl || 0)
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (returns.length - 1)
    const stdDev = Math.sqrt(variance)
    
    return stdDev > 0 ? avgReturn / stdDev : 0
  }
}

export const analyticsService = AnalyticsService.getInstance()
