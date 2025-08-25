"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import AdminLayout from "@/components/admin/admin-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Download, Edit, Eye, MoreHorizontal, Plus, RefreshCw, Search, Trash2 } from "lucide-react"
import { getTokens, deleteToken } from "@/lib/admin-api"
import { useToast } from "@/hooks/use-toast"

interface Token {
  id: string
  token_name: string
  code: string
  asset_type: string
  sis_number: string
  maturity: string
  duration: string
  returns: string
  status: string
  img_url: string
  created_at: string
}

export default function AssetsPage() {
  const [tokens, setTokens] = useState<Token[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    fetchTokens()
  }, [])

  const fetchTokens = async () => {
    setIsLoading(true)
    try {
      const response = await getTokens()
      setTokens(response.data || [])
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch tokens. Please try again.",
        variant: "destructive",
      })
      console.error("Error fetching tokens:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteToken = async (id: string) => {
    try {
      await deleteToken(id)
      toast({
        title: "Success",
        description: "Token deleted successfully",
      })
      fetchTokens()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete token. Please try again.",
        variant: "destructive",
      })
      console.error("Error deleting token:", error)
    }
  }

  const filteredTokens = tokens.filter((token) => {
    const matchesSearch =
      token.token_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      token.code.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || token.status === statusFilter
    const matchesType = typeFilter === "all" || token.asset_type === typeFilter

    return matchesSearch && matchesStatus && matchesType
  })

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return <Badge variant="success">Active</Badge>
      case "pending":
        return <Badge variant="outline">Pending</Badge>
      case "matured":
        return <Badge variant="secondary">Matured</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  // Function to navigate to token details with token data
  const navigateToTokenDetails = (token: Token) => {
    const encodedToken = encodeURIComponent(JSON.stringify(token))
    router.push(`/admin/bonds/${token.id}?tokenData=${encodedToken}`)
  }

  // Function to navigate to token edit with token data
  const navigateToTokenEdit = (token: Token) => {
    const encodedToken = encodeURIComponent(JSON.stringify(token))
    router.push(`/admin/bonds/${token.id}/edit?tokenData=${encodedToken}`)
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Assets</h1>
          <Button onClick={() => router.push("/admin/bonds/create")}>
            <Plus className="h-4 w-4 mr-2" />
            Create New Asset
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter and search assets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search assets..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="matured">Matured</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Asset Type</label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by asset type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="bond">Bond</SelectItem>
                    <SelectItem value="crypto">Crypto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Assets</CardTitle>
              <CardDescription>Manage your assets and tokens</CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={fetchTokens} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""} mr-2`} />
                Refresh
              </Button>
              <Button variant="outline" size="sm" disabled={isLoading}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Icon</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>SIS Number</TableHead>
                      <TableHead>Maturity</TableHead>
                      <TableHead>Returns</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTokens.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          No assets found. Try adjusting your filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTokens.map((token) => (
                        <TableRow key={token.id}>
                          <TableCell>
                            <div className="h-8 w-8 rounded-full bg-muted overflow-hidden">
                              <img
                                src={token.img_url || "/placeholder.svg?height=40&width=40"}
                                alt={token.token_name}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{token.token_name}</TableCell>
                          <TableCell>{token.code}</TableCell>
                          <TableCell>{token.asset_type}</TableCell>
                          <TableCell>{token.sis_number}</TableCell>
                          <TableCell>{token.maturity}</TableCell>
                          <TableCell>{token.returns}</TableCell>
                          <TableCell>{getStatusBadge(token.status)}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">Actions</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => navigateToTokenDetails(token)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigateToTokenEdit(token)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleDeleteToken(token.id)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
