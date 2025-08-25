"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { useMobile } from "@/hooks/use-mobile"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Search,
  Filter,
  RefreshCw,
  Calendar,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  MoreVertical,
  Eye,
  Download,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  DollarSign,
  Activity,
  History as HistoryIcon,
  ChevronDown,
  ChevronUp
} from "lucide-react"

import {
  TradeRecord,
  TradeHistoryFilters,
  TradeHistoryQueryOptions,
  TradeHistoryQueryResult,
  TradeStatus,
  TradeDirection,
  TradeType
} from "@/lib/trade-history-types"

interface TradeHistoryListProps {
  userId: string
  onTradeSelect?: (trade: TradeRecord) => void
  onTradeDelete?: (tradeId: string) => void
  onRefresh?: () => void
  className?: string
  filterStatus?: TradeStatus[]
  filterType?: TradeType[]
}

// Mock data for development - replace with actual data loading
const mockTrades: TradeRecord[] = [
  {
    id: "trade_1",
    orderId: "ORD_001",
    roomId: "!room1:matrix.org",
    createdAt: Date.now() - 86400000, // 1 day ago
    completedAt: Date.now() - 86400000 + 3600000, // 1 hour later
    status: "completed",
    type: "otc",
    direction: "buy",
    initiator: {
      matrixUserId: "@user1:matrix.org",
      username: "alice_trader",
      role: "initiator"
    },
    counterparty: {
      matrixUserId: "@user2:matrix.org", 
      username: "bob_finance",
      role: "counterparty"
    },
    baseAsset: {
      code: "US10Y",
      name: "US 10Y Treasury",
      type: "credit_alphanum4"
    },
    counterAsset: {
      code: "USD",
      name: "US Dollar",
      type: "native"
    },
    amount: "1000",
    price: "98.50",
    totalValue: "98500.00",
    stellarTransaction: {
      transactionHash: "abc123def456ghi789",
      sourceAccount: "GABCD...",
      success: true,
      operationType: "manageSellOffer"
    },
    isArchived: false
  },
  {
    id: "trade_2", 
    orderId: "ORD_002",
    roomId: "!room2:matrix.org",
    createdAt: Date.now() - 172800000, // 2 days ago
    status: "pending",
    type: "otc",
    direction: "sell",
    initiator: {
      matrixUserId: "@user1:matrix.org",
      username: "alice_trader", 
      role: "initiator"
    },
    counterparty: {
      matrixUserId: "@user3:matrix.org",
      username: "charlie_invest",
      role: "counterparty"
    },
    baseAsset: {
      code: "UK10Y",
      name: "UK 10Y Gilt",
      type: "credit_alphanum4"
    },
    counterAsset: {
      code: "GBP",
      name: "British Pound",
      type: "credit_alphanum4"
    },
    amount: "500",
    price: "99.10",
    totalValue: "49550.00",
    isArchived: false
  }
]

export default function TradeHistoryList({
  userId,
  onTradeSelect,
  onTradeDelete,
  onRefresh,
  className = "",
  filterStatus,
  filterType
}: TradeHistoryListProps) {
  const [trades, setTrades] = useState<TradeRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filters, setFilters] = useState<TradeHistoryFilters>({})
  const [sortBy, setSortBy] = useState<'createdAt' | 'completedAt' | 'amount' | 'status'>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [showFilters, setShowFilters] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  const { toast } = useToast()
  const isMobile = useMobile()

  // Load trades on component mount and when filters change
  useEffect(() => {
    loadTrades()
  }, [filters, sortBy, sortOrder, currentPage, searchTerm])

  const loadTrades = async () => {
    setLoading(true)
    try {
      // For development, use mock data
      // In production, use the TradeHistoryStorageService
      let filteredTrades = [...mockTrades]

      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        filteredTrades = filteredTrades.filter(trade => 
          trade.baseAsset.code.toLowerCase().includes(searchLower) ||
          trade.counterAsset.code.toLowerCase().includes(searchLower) ||
          trade.counterparty?.username.toLowerCase().includes(searchLower) ||
          trade.orderId?.toLowerCase().includes(searchLower)
        )
      }

      // Apply prop-based status filter (takes precedence)
      if (filterStatus && filterStatus.length > 0) {
        filteredTrades = filteredTrades.filter(trade => 
          filterStatus.includes(trade.status)
        )
      } else if (filters.status && filters.status.length > 0) {
        filteredTrades = filteredTrades.filter(trade => 
          filters.status!.includes(trade.status)
        )
      }

      // Apply prop-based type filter (takes precedence)
      if (filterType && filterType.length > 0) {
        filteredTrades = filteredTrades.filter(trade => 
          filterType.includes(trade.type)
        )
      }

      // Apply direction filter
      if (filters.direction && filters.direction.length > 0) {
        filteredTrades = filteredTrades.filter(trade =>
          filters.direction!.includes(trade.direction)
        )
      }

      // Apply date range filter
      if (filters.dateRange) {
        filteredTrades = filteredTrades.filter(trade =>
          trade.createdAt >= filters.dateRange!.from &&
          trade.createdAt <= filters.dateRange!.to
        )
      }

      // Apply sorting
      filteredTrades.sort((a, b) => {
        let aValue: any = a[sortBy]
        let bValue: any = b[sortBy]

        if (sortBy === 'amount') {
          aValue = parseFloat(aValue)
          bValue = parseFloat(bValue)
        }

        if (sortOrder === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
        }
      })

      setTrades(filteredTrades)
      setTotalCount(filteredTrades.length)
      setHasMore(false) // For mock data, no pagination
    } catch (error) {
      console.error('Error loading trades:', error)
      toast({
        title: "Error loading trades",
        description: "Failed to load trade history",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTradeClick = (trade: TradeRecord) => {
    onTradeSelect?.(trade)
  }

  const handleTradeDelete = async (tradeId: string) => {
    try {
      onTradeDelete?.(tradeId)
      await loadTrades() // Refresh the list
      toast({
        title: "Trade deleted",
        description: "Trade record has been removed from history"
      })
    } catch (error) {
      toast({
        title: "Delete failed",
        description: "Could not delete trade record",
        variant: "destructive"
      })
    }
  }

  const getStatusIcon = (status: TradeStatus) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-gray-500" />
      case 'expired':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
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
    
    return (
      <Badge variant={variants[status]} className="text-xs">
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const getDirectionIcon = (direction: TradeDirection) => {
    return direction === 'buy' ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-500" />
    )
  }

  const formatAmount = (amount: string, code: string) => {
    const num = parseFloat(amount)
    return `${num.toLocaleString()} ${code}`
  }

  const formatPrice = (price: string, code: string) => {
    const num = parseFloat(price)
    return `${num.toFixed(2)} ${code}`
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const clearFilters = () => {
    setFilters({})
    setSearchTerm("")
    setSortBy('createdAt')
    setSortOrder('desc')
  }

  return (
    <div className={`flex flex-col h-full space-y-4 p-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Trade History</h2>
          <p className="text-muted-foreground">
            {totalCount} trade{totalCount !== 1 ? 's' : ''} found
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
            {showFilters ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onRefresh?.()
              loadTrades()
            }}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by asset, counterparty, or order ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Status Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <Select
                    value={filters.status?.[0] || 'all'}
                    onValueChange={(value) => {
                      if (value === 'all') {
                        setFilters(prev => ({ ...prev, status: undefined }))
                      } else {
                        setFilters(prev => ({ ...prev, status: [value as TradeStatus] }))
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Direction Filter */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Direction</label>
                  <Select
                    value={filters.direction?.[0] || 'all'}
                    onValueChange={(value) => {
                      if (value === 'all') {
                        setFilters(prev => ({ ...prev, direction: undefined }))
                      } else {
                        setFilters(prev => ({ ...prev, direction: [value as TradeDirection] }))
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Directions</SelectItem>
                      <SelectItem value="buy">Buy Only</SelectItem>
                      <SelectItem value="sell">Sell Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort By */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Sort By</label>
                  <Select
                    value={sortBy}
                    onValueChange={(value) => setSortBy(value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="createdAt">Date Created</SelectItem>
                      <SelectItem value="completedAt">Date Completed</SelectItem>
                      <SelectItem value="amount">Amount</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort Order */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Order</label>
                  <Select
                    value={sortOrder}
                    onValueChange={(value) => setSortOrder(value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">Newest First</SelectItem>
                      <SelectItem value="asc">Oldest First</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-between items-center mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                >
                  Clear Filters
                </Button>
                <div className="text-sm text-muted-foreground">
                  {Object.keys(filters).length > 0 && "Active filters applied"}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Trade List */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading trades...</span>
          </div>
        ) : trades.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <HistoryIcon className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No trades found</p>
            {searchTerm || Object.keys(filters).length > 0 ? (
              <Button variant="link" size="sm" onClick={clearFilters} className="mt-2">
                Clear filters to see all trades
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">
                Your trade history will appear here
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3 overflow-y-auto">
            {trades.map((trade) => (
              <Card
                key={trade.id}
                className="cursor-pointer hover:shadow-md transition-all duration-200 border-l-4 border-l-transparent hover:border-l-blue-500"
                onClick={() => handleTradeClick(trade)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    {/* Left Side - Trade Info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Direction & Status Icons */}
                      <div className="flex items-center gap-1">
                        {getDirectionIcon(trade.direction)}
                        {getStatusIcon(trade.status)}
                      </div>

                      {/* Trade Details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm">
                            {trade.direction.toUpperCase()} {trade.baseAsset.code}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {trade.type.toUpperCase()}
                          </Badge>
                          {getStatusBadge(trade.status)}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>
                            {formatAmount(trade.amount, trade.baseAsset.code)}
                          </span>
                          <span>@</span>
                          <span>
                            {formatPrice(trade.price, trade.counterAsset.code)}
                          </span>
                          {trade.counterparty && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-24">
                                {trade.counterparty.username}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Side - Date & Actions */}
                    <div className="flex items-center gap-3 ml-4">
                      <div className="text-right">
                        <div className="font-semibold text-sm">
                          ${parseFloat(trade.totalValue).toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(trade.completedAt || trade.createdAt)}
                        </div>
                      </div>

                      {/* Actions Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation()
                            handleTradeClick(trade)
                          }}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation()
                            // TODO: Implement export functionality
                          }}>
                            <Download className="h-4 w-4 mr-2" />
                            Export
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleTradeDelete(trade.id)
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Pagination - if needed */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(prev => prev + 1)}
            disabled={loading}
          >
            Load More
          </Button>
        </div>
      )}
    </div>
  )
}
