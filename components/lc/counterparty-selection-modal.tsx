"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { 
  SystemUser, 
  UserDirectoryResponse, 
  SendInvitationRequest,
  SendInvitationResponse,
  UserRole
} from "@/lib/lc/invitation-types"
import {
  Search,
  Users,
  Building2,
  MapPin,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
  Loader2,
  Send,
  UserCheck,
  Globe,
  Coins
} from "lucide-react"

interface CounterpartySelectionModalProps {
  open: boolean
  onClose: () => void
  onInvitationSent: (invitationId: string) => void
}

export function CounterpartySelectionModal({ 
  open, 
  onClose, 
  onInvitationSent 
}: CounterpartySelectionModalProps) {
  const [users, setUsers] = useState<SystemUser[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [businessTypeFilter, setBusinessTypeFilter] = useState("all")
  const [regionFilter, setRegionFilter] = useState("all")
  const [verifiedOnly, setVerifiedOnly] = useState(true)
  const [showInviteForm, setShowInviteForm] = useState(false)
  
  // Invitation form state
  const [lcTitle, setLcTitle] = useState("")
  const [inviteMessage, setInviteMessage] = useState("")
  const [initiatorRole, setInitiatorRole] = useState<UserRole>("buyer")
  const [inviteeRole, setInviteeRole] = useState<UserRole>("seller")
  const [preliminaryInfo, setPreliminaryInfo] = useState({
    commodity: "",
    estimatedAmount: "",
    currency: "USDC",
    timeline: ""
  })
  const [sendingInvitation, setSendingInvitation] = useState(false)

  const { toast } = useToast()

  // Load users on open
  useEffect(() => {
    if (open) {
      loadUsers()
    }
  }, [open, searchTerm, businessTypeFilter, regionFilter, verifiedOnly])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: '1',
        limit: '20',
        verified: verifiedOnly.toString()
      })

      if (searchTerm) params.append('search', searchTerm)
      if (businessTypeFilter && businessTypeFilter !== "all") params.append('businessType', businessTypeFilter)
      if (regionFilter && regionFilter !== "all") params.append('region', regionFilter)

      const response = await fetch(`/api/users?${params}`)
      const data: UserDirectoryResponse = await response.json()

      if (data.success) {
        setUsers(data.users)
      } else {
        toast({
          title: "Error",
          description: "Failed to load user directory",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error loading users:", error)
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUserSelect = (user: SystemUser) => {
    setSelectedUser(user)
    setShowInviteForm(true)
    
    // Set default roles based on business type
    if (user.businessType === 'Exporter' || user.businessType === 'Producer') {
      setInitiatorRole("buyer")
      setInviteeRole("seller")
    } else if (user.businessType === 'Importer') {
      setInitiatorRole("seller")
      setInviteeRole("buyer")
    }
  }

  const handleSendInvitation = async () => {
    if (!selectedUser || !lcTitle.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide an LC title",
        variant: "destructive"
      })
      return
    }

    setSendingInvitation(true)
    try {
      const invitationRequest: SendInvitationRequest = {
        inviteeUserId: selectedUser.id,
        lcTitle: lcTitle.trim(),
        message: inviteMessage.trim() || undefined,
        initiatorRole,
        inviteeRole,
        preliminaryInfo: preliminaryInfo.commodity || preliminaryInfo.estimatedAmount ? {
          commodity: preliminaryInfo.commodity || undefined,
          estimatedAmount: preliminaryInfo.estimatedAmount || undefined,
          currency: preliminaryInfo.currency || undefined,
          timeline: preliminaryInfo.timeline || undefined
        } : undefined
      }

      const response = await fetch('/api/lc/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invitationRequest)
      })

      const result: SendInvitationResponse = await response.json()

      if (result.success) {
        toast({
          title: "Invitation Sent! 🎉",
          description: `Invitation sent to ${selectedUser.displayName}. They have 5 days to respond.`
        })
        
        onInvitationSent(result.invitationId)
        handleClose()
      } else {
        toast({
          title: "Failed to Send",
          description: result.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error sending invitation:", error)
      toast({
        title: "Error",
        description: "Failed to send invitation",
        variant: "destructive"
      })
    } finally {
      setSendingInvitation(false)
    }
  }

  const handleClose = () => {
    setSelectedUser(null)
    setShowInviteForm(false)
    setSearchTerm("")
    setBusinessTypeFilter("all")
    setRegionFilter("all")
    setLcTitle("")
    setInviteMessage("")
    setPreliminaryInfo({
      commodity: "",
      estimatedAmount: "",
      currency: "USDC",
      timeline: ""
    })
    onClose()
  }

  const getLastActiveText = (lastActive: string) => {
    const now = new Date()
    const lastActiveDate = new Date(lastActive)
    const diffHours = Math.floor((now.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60))
    
    if (diffHours < 1) return "Active now"
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}d ago`
    return lastActiveDate.toLocaleDateString()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {showInviteForm ? "Send LC Collaboration Invite" : "Select Trading Counterparty"}
          </DialogTitle>
          <DialogDescription>
            {showInviteForm 
              ? `Invite ${selectedUser?.displayName} to collaborate on a Letter of Credit`
              : "Choose a verified trading partner from the CLIX network to collaborate with"
            }
          </DialogDescription>
        </DialogHeader>

        {!showInviteForm ? (
          <>
            {/* Search and Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 py-4">
              <div className="md:col-span-2">
                <Label htmlFor="search">Search Users</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by name, company, or Matrix ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="businessType">Business Type</Label>
                <Select value={businessTypeFilter} onValueChange={setBusinessTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="Importer">Importer</SelectItem>
                    <SelectItem value="Exporter">Exporter</SelectItem>
                    <SelectItem value="Producer">Producer</SelectItem>
                    <SelectItem value="Trader">Trader</SelectItem>
                    <SelectItem value="Manufacturer">Manufacturer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="region">Region</Label>
                <Select value={regionFilter} onValueChange={setRegionFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All regions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All regions</SelectItem>
                    <SelectItem value="North America">North America</SelectItem>
                    <SelectItem value="South America">South America</SelectItem>
                    <SelectItem value="Europe">Europe</SelectItem>
                    <SelectItem value="Asia Pacific">Asia Pacific</SelectItem>
                    <SelectItem value="Middle East">Middle East</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="verified"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="verified">Show verified users only</Label>
            </div>

            <Separator />

            {/* User List */}
            <ScrollArea className="h-[400px]">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="ml-2">Loading users...</span>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No users found matching your criteria</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {users.map((user) => (
                    <Card key={user.id} className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleUserSelect(user)}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold">{user.displayName}</h4>
                              {user.verified && (
                                <Badge variant="secondary" className="text-xs">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Verified
                                </Badge>
                              )}
                            </div>
                            
                            <div className="space-y-1 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Building2 className="w-3 h-3" />
                                <span>{user.company}</span>
                              </div>
                              
                              {user.businessType && (
                                <Badge variant="outline" className="text-xs mr-2">
                                  {user.businessType}
                                </Badge>
                              )}

                              {user.tradingRegions && user.tradingRegions.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <Globe className="w-3 h-3" />
                                  <span>{user.tradingRegions.join(", ")}</span>
                                </div>
                              )}

                              {user.preferredCurrencies && user.preferredCurrencies.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <Coins className="w-3 h-3" />
                                  <span>{user.preferredCurrencies.slice(0, 3).join(", ")}</span>
                                  {user.preferredCurrencies.length > 3 && <span>+{user.preferredCurrencies.length - 3}</span>}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-right text-sm text-muted-foreground">
                            <div className="flex items-center gap-1 mb-1">
                              <Clock className="w-3 h-3" />
                              <span>{getLastActiveText(user.lastActive)}</span>
                            </div>
                            <p className="text-xs">{user.matrixId}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </>
        ) : (
          <>
            {/* Invitation Form */}
            <div className="space-y-4">
              {/* Selected User Summary */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-clix-orange to-clix-yellow rounded-full flex items-center justify-center text-white font-semibold">
                      {selectedUser?.displayName.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-semibold">{selectedUser?.displayName}</h4>
                      <p className="text-sm text-muted-foreground">{selectedUser?.company}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="lcTitle">LC Title *</Label>
                  <Input
                    id="lcTitle"
                    placeholder="e.g., Coffee Import Q1 2025"
                    value={lcTitle}
                    onChange={(e) => setLcTitle(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={preliminaryInfo.currency} onValueChange={(value) => 
                    setPreliminaryInfo(prev => ({ ...prev, currency: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USDC">USDC</SelectItem>
                      <SelectItem value="EURC">EURC</SelectItem>
                      <SelectItem value="XLM">XLM</SelectItem>
                      <SelectItem value="CLIX">CLIX</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Roles */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="initiatorRole">Your Role</Label>
                  <Select value={initiatorRole} onValueChange={(value: UserRole) => setInitiatorRole(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="buyer">Buyer (Importer)</SelectItem>
                      <SelectItem value="seller">Seller (Exporter)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="inviteeRole">{selectedUser?.displayName}'s Role</Label>
                  <Select value={inviteeRole} onValueChange={(value: UserRole) => setInviteeRole(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="seller">Seller (Exporter)</SelectItem>
                      <SelectItem value="buyer">Buyer (Importer)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Optional Preliminary Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="commodity">Commodity (Optional)</Label>
                  <Input
                    id="commodity"
                    placeholder="e.g., Premium Arabica Coffee"
                    value={preliminaryInfo.commodity}
                    onChange={(e) => setPreliminaryInfo(prev => ({ ...prev, commodity: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="estimatedAmount">Estimated Amount (Optional)</Label>
                  <Input
                    id="estimatedAmount"
                    placeholder="e.g., 250,000"
                    value={preliminaryInfo.estimatedAmount}
                    onChange={(e) => setPreliminaryInfo(prev => ({ ...prev, estimatedAmount: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="timeline">Timeline (Optional)</Label>
                <Input
                  id="timeline"
                  placeholder="e.g., Q1 2025 delivery"
                  value={preliminaryInfo.timeline}
                  onChange={(e) => setPreliminaryInfo(prev => ({ ...prev, timeline: e.target.value }))}
                />
              </div>

              {/* Invitation Message */}
              <div>
                <Label htmlFor="message">Personal Message (Optional)</Label>
                <Textarea
                  id="message"
                  placeholder="Add a personal message to accompany your invitation..."
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </>
        )}

        <DialogFooter>
          {!showInviteForm ? (
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setShowInviteForm(false)}>
                Back to Selection
              </Button>
              <Button 
                onClick={handleSendInvitation} 
                disabled={sendingInvitation || !lcTitle.trim()}
              >
                {sendingInvitation ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Invitation
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}