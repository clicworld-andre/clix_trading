"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { useToast } from "@/hooks/use-toast"
import { 
  LetterOfCredit, 
  LCStatus, 
  LCSearchFilters,
  LC_CURRENCIES,
  calculateLCProgress,
  getLCStatusColor,
  lcService
} from "@/lib/lc"
import { 
  Search,
  Filter,
  Plus,
  FileText,
  Users,
  DollarSign,
  Package,
  Calendar,
  MapPin,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Eye,
  Edit,
  MoreHorizontal,
  Ship,
  Shield,
  RefreshCw
} from "lucide-react"

interface LCDashboardProps {
  onCreateNew?: () => void
  onViewLC?: (lcId: string) => void
  onViewPending?: () => void
  className?: string
}

export function LCDashboard({ onCreateNew, onViewLC, onViewPending, className }: LCDashboardProps) {
  const [lcs, setLCs] = useState<LetterOfCredit[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<LCStatus | "all">("all")
  const [currencyFilter, setCurrencyFilter] = useState<string>("all")
  const { toast } = useToast()

  // Stats data
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    totalValue: 0,
    avgProcessingTime: 0
  })

  useEffect(() => {
    loadLCs()
  }, [statusFilter, currencyFilter])

  const loadLCs = async () => {
    setLoading(true)
    try {
      const filters: LCSearchFilters = {}
      
      if (statusFilter !== "all") {
        filters.status = [statusFilter as LCStatus]
      }
      
      if (currencyFilter !== "all") {
        filters.currency = [currencyFilter as any]
      }

      const response = await lcService.listLCs(filters)
      
      if (response.success) {
        setLCs(response.letterOfCredits)
        
        // Calculate stats
        const stats = calculateStats(response.letterOfCredits)
        setStats(stats)
      } else {
        toast({
          title: "Error Loading LCs",
          description: "Failed to load Letters of Credit",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error loading LCs:", error)
      toast({
        title: "Error Loading LCs", 
        description: "Failed to load Letters of Credit",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (lcs: LetterOfCredit[]) => {
    const total = lcs.length
    const active = lcs.filter(lc => !['completed', 'cancelled'].includes(lc.status)).length
    const completed = lcs.filter(lc => lc.status === 'completed').length
    const totalValue = lcs.reduce((sum, lc) => sum + (lc.terms.totalValue || 0), 0)
    
    // Calculate average processing time for completed LCs
    const completedWithDates = lcs.filter(lc => 
      lc.status === 'completed' && lc.completedAt && lc.createdAt
    )
    const avgProcessingTime = completedWithDates.length > 0 
      ? completedWithDates.reduce((sum, lc) => {
          const created = new Date(lc.createdAt).getTime()
          const completed = new Date(lc.completedAt!).getTime()
          return sum + (completed - created) / (1000 * 60 * 60 * 24) // Days
        }, 0) / completedWithDates.length
      : 0

    return {
      total,
      active,
      completed,
      totalValue,
      avgProcessingTime: Math.round(avgProcessingTime)
    }
  }

  const filteredLCs = lcs.filter(lc => 
    searchTerm === "" || 
    lc.lcNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lc.terms.commodity.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lc.terms.buyer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lc.terms.seller.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusIcon = (status: LCStatus) => {
    switch (status) {
      case 'draft': return <Edit className="w-4 h-4" />
      case 'negotiating': return <Users className="w-4 h-4" />
      case 'signed': return <FileText className="w-4 h-4" />
      case 'funded': return <DollarSign className="w-4 h-4" />
      case 'shipped': return <Ship className="w-4 h-4" />
      case 'documents_submitted': return <FileText className="w-4 h-4" />
      case 'delivered': return <Package className="w-4 h-4" />
      case 'completed': return <CheckCircle className="w-4 h-4" />
      case 'disputed': return <AlertCircle className="w-4 h-4" />
      case 'cancelled': return <AlertCircle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    const currencyInfo = LC_CURRENCIES.find(c => c.code === currency)
    return `${currencyInfo?.symbol || currency} ${amount.toLocaleString()}`
  }

  const getStatusBadgeVariant = (status: LCStatus) => {
    switch (status) {
      case 'completed': return 'default'
      case 'disputed':
      case 'cancelled': return 'destructive'
      case 'funded':
      case 'delivered': return 'default'
      default: return 'secondary'
    }
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <RefreshCw className="w-6 h-6 animate-spin text-clix-orange" />
      </div>
    )
  }

  return (
    <div className={`w-full max-w-7xl mx-auto p-6 space-y-6 ${className}`}>
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-clix-orange to-clix-yellow bg-clip-text text-transparent">
            Letters of Credit
          </h1>
          <p className="text-muted-foreground">
            Manage your trade finance operations
          </p>
        </div>
        <div className="flex gap-3">
          {onViewPending && (
            <Button 
              variant="outline" 
              onClick={onViewPending}
              className="border-clix-orange text-clix-orange hover:bg-clix-orange/10"
            >
              <Clock className="w-4 h-4 mr-2" />
              Pending LCs
            </Button>
          )}
          <Button onClick={onCreateNew} className="bg-gradient-to-r from-clix-orange to-clix-yellow text-white">
            <Plus className="w-4 h-4 mr-2" />
            Create New LC
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total LCs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.active} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Across all currencies
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Processing</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgProcessingTime}</div>
            <p className="text-xs text-muted-foreground">
              Days to completion
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search LCs by number, commodity, or party..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="negotiating">Negotiating</SelectItem>
              <SelectItem value="signed">Signed</SelectItem>
              <SelectItem value="funded">Funded</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="disputed">Disputed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by currency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Currencies</SelectItem>
              {LC_CURRENCIES.map(currency => (
                <SelectItem key={currency.code} value={currency.code}>
                  {currency.name} ({currency.symbol})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* LC List */}
      <div className="space-y-4">
        {filteredLCs.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Letters of Credit Found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || statusFilter !== "all" || currencyFilter !== "all" 
                ? "Try adjusting your filters or search terms"
                : "Create your first Letter of Credit to get started"
              }
            </p>
            {(!searchTerm && statusFilter === "all" && currencyFilter === "all") && (
              <Button onClick={onCreateNew} className="bg-gradient-to-r from-clix-orange to-clix-yellow text-white">
                <Plus className="w-4 h-4 mr-2" />
                Create New LC
              </Button>
            )}
          </Card>
        ) : (
          filteredLCs.map((lc) => (
            <Card key={lc.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  
                  {/* Left side - LC Info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-semibold">{lc.lcNumber}</h3>
                          <Badge 
                            variant={getStatusBadgeVariant(lc.status)}
                            className="flex items-center gap-1"
                          >
                            {getStatusIcon(lc.status)}
                            {lc.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {lc.terms.commodity}
                        </p>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-lg font-bold">
                          {formatCurrency(Number(lc.terms.amount), lc.terms.currency)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {lc.terms.quantity}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Buyer:</span>
                        <span className="font-medium">{lc.terms.buyer.name}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Seller:</span>
                        <span className="font-medium">{lc.terms.seller.name}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Expires:</span>
                        <span className="font-medium">
                          {new Date(lc.terms.expiryDate).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Progress</span>
                          <span>{calculateLCProgress(lc.status)}%</span>
                        </div>
                        <Progress value={calculateLCProgress(lc.status)} className="h-2" />
                      </div>
                    </div>
                  </div>

                  {/* Right side - Actions */}
                  <div className="flex items-center gap-2 lg:flex-col lg:items-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewLC?.(lc.id)}
                      className="flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </Button>
                    
                    {lc.matrixRoomId && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        <Users className="w-4 h-4" />
                        Chat
                      </Button>
                    )}

                    <div className="text-xs text-muted-foreground lg:text-right lg:mt-2">
                      Created: {new Date(lc.createdAt).toLocaleDateString()}
                      {lc.updatedAt !== lc.createdAt && (
                        <div>Updated: {new Date(lc.updatedAt).toLocaleDateString()}</div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}