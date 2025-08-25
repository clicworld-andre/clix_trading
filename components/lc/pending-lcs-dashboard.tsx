"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { 
  LCInvitation, 
  PendingInvitationsResponse,
  InvitationResponse,
  InvitationResponseResult
} from "@/lib/lc/invitation-types"
import {
  Clock,
  Send,
  Inbox,
  CheckCircle,
  XCircle,
  Calendar,
  User,
  Building2,
  MessageSquare,
  RefreshCw,
  AlertCircle,
  Loader2,
  Eye,
  Trash2,
  Mail
} from "lucide-react"

interface PendingLCsDashboardProps {
  onInvitationAccepted: (lcId: string) => void
  className?: string
}

export function PendingLCsDashboard({ onInvitationAccepted, className }: PendingLCsDashboardProps) {
  const [invitations, setInvitations] = useState<{
    sent: LCInvitation[]
    received: LCInvitation[]
  }>({ sent: [], received: [] })
  
  const [counts, setCounts] = useState({
    sentPending: 0,
    receivedPending: 0,
    totalPending: 0
  })
  
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedInvitation, setSelectedInvitation] = useState<LCInvitation | null>(null)
  const [showResponseDialog, setShowResponseDialog] = useState(false)
  const [responseMessage, setResponseMessage] = useState("")
  const [responding, setResponding] = useState(false)
  
  const { toast } = useToast()

  useEffect(() => {
    loadInvitations()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadInvitations, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadInvitations = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true)
    else setLoading(true)
    
    try {
      const response = await fetch('/api/lc/invitations')
      const data: PendingInvitationsResponse = await response.json()
      
      if (data.success) {
        setInvitations(data.invitations)
        setCounts(data.counts)
      } else {
        toast({
          title: "Error",
          description: "Failed to load invitations",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error loading invitations:", error)
      toast({
        title: "Error",
        description: "Failed to load invitations",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleAcceptInvitation = (invitation: LCInvitation) => {
    setSelectedInvitation(invitation)
    setShowResponseDialog(true)
    setResponseMessage("")
  }

  const handleRejectInvitation = (invitation: LCInvitation) => {
    setSelectedInvitation(invitation)
    setShowResponseDialog(true)
    setResponseMessage("")
  }

  const submitResponse = async (accepted: boolean) => {
    if (!selectedInvitation) return
    
    setResponding(true)
    try {
      const invitationResponse: InvitationResponse = {
        invitationId: selectedInvitation.id,
        accepted,
        message: responseMessage.trim() || undefined
      }

      const response = await fetch(`/api/lc/invitations/${selectedInvitation.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invitationResponse)
      })

      const result: InvitationResponseResult = await response.json()

      if (result.success) {
        toast({
          title: accepted ? "Invitation Accepted! 🎉" : "Invitation Declined",
          description: result.message
        })

        // If accepted and LC created, notify parent
        if (accepted && result.lcId) {
          onInvitationAccepted(result.lcId)
        }

        // Reload invitations to reflect the change
        loadInvitations()
        setShowResponseDialog(false)
        setSelectedInvitation(null)
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error responding to invitation:", error)
      toast({
        title: "Error",
        description: "Failed to respond to invitation",
        variant: "destructive"
      })
    } finally {
      setResponding(false)
    }
  }

  const handleCancelInvitation = async (invitation: LCInvitation) => {
    if (!confirm(`Cancel invitation to ${invitation.invitee.displayName}?`)) return
    
    try {
      const response = await fetch(`/api/lc/invitations/${invitation.id}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Invitation Cancelled",
          description: "The invitation has been cancelled successfully"
        })
        loadInvitations()
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error cancelling invitation:", error)
      toast({
        title: "Error",
        description: "Failed to cancel invitation",
        variant: "destructive"
      })
    }
  }

  const getStatusColor = (status: string): "default" | "destructive" | "outline" | "secondary" | "success" | "warning" => {
    switch (status) {
      case 'pending': return 'warning'
      case 'accepted': return 'success'
      case 'rejected': return 'destructive'
      case 'expired': return 'secondary'
      case 'cancelled': return 'secondary'
      default: return 'secondary'
    }
  }

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date()
    const expiry = new Date(expiresAt)
    const diffMs = expiry.getTime() - now.getTime()
    
    if (diffMs <= 0) return "Expired"
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffDays > 0) return `${diffDays}d remaining`
    if (diffHours > 0) return `${diffHours}h remaining`
    return "Expires soon"
  }

  const InvitationCard = ({ invitation, type }: { invitation: LCInvitation, type: 'sent' | 'received' }) => {
    const isReceived = type === 'received'
    const otherParty = isReceived ? invitation.initiator : invitation.invitee
    const isPending = invitation.status === 'pending'
    
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{invitation.lcTitle}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <User className="w-4 h-4" />
                {isReceived ? 'From' : 'To'}: {otherParty.displayName}
              </CardDescription>
            </div>
            <Badge variant={getStatusColor(invitation.status)} className="capitalize">
              {invitation.status}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {/* Company & Role Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="text-xs text-muted-foreground">
                {isReceived ? 'From Company' : 'To Company'}
              </Label>
              <div className="flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                <span>{otherParty.displayName}</span>
              </div>
            </div>
            
            <div>
              <Label className="text-xs text-muted-foreground">Your Role</Label>
              <div className="capitalize font-medium">
                {isReceived ? invitation.invitee.role : invitation.initiator.role}
              </div>
            </div>
          </div>

          {/* Preliminary Info */}
          {invitation.preliminaryInfo && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="grid grid-cols-2 gap-2 text-sm">
                {invitation.preliminaryInfo.commodity && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Commodity</Label>
                    <p>{invitation.preliminaryInfo.commodity}</p>
                  </div>
                )}
                {invitation.preliminaryInfo.estimatedAmount && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Amount</Label>
                    <p>{invitation.preliminaryInfo.estimatedAmount} {invitation.preliminaryInfo.currency}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Message */}
          {invitation.message && (
            <div className="p-3 bg-muted/30 rounded-lg">
              <Label className="text-xs text-muted-foreground">Message</Label>
              <p className="text-sm mt-1">"{invitation.message}"</p>
            </div>
          )}

          {/* Timestamps */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Created: {new Date(invitation.createdAt).toLocaleDateString()}
            </div>
            
            {isPending && (
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {getTimeRemaining(invitation.expiresAt)}
              </div>
            )}
          </div>

          {/* Response Info */}
          {invitation.response && (
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                {invitation.response.accepted ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
                <span className="text-sm font-medium">
                  {invitation.response.accepted ? 'Accepted' : 'Rejected'} on{' '}
                  {new Date(invitation.response.respondedAt).toLocaleDateString()}
                </span>
              </div>
              {invitation.response.message && (
                <p className="text-sm text-muted-foreground">"{invitation.response.message}"</p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {isReceived && isPending && (
              <>
                <Button 
                  size="sm" 
                  onClick={() => handleAcceptInvitation(invitation)}
                  className="flex-1"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Accept
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => handleRejectInvitation(invitation)}
                  className="flex-1"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Decline
                </Button>
              </>
            )}
            
            {!isReceived && isPending && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => handleCancelInvitation(invitation)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            )}
            
            {invitation.status === 'accepted' && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => toast({
                  title: "LC Ready",
                  description: "You can now proceed to create the LC together!"
                })}
              >
                <Eye className="w-4 h-4 mr-2" />
                View LC
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-12 ${className}`}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-clix-orange" />
          <p className="text-sm text-muted-foreground">Loading invitations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Pending LCs</h2>
          <p className="text-muted-foreground">Manage your Letter of Credit collaboration invitations</p>
        </div>
        
        <Button variant="outline" onClick={() => loadInvitations(true)} disabled={refreshing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <Inbox className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Received Pending</p>
                <p className="text-2xl font-bold">{counts.receivedPending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Send className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sent Pending</p>
                <p className="text-2xl font-bold">{counts.sentPending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Pending</p>
                <p className="text-2xl font-bold">{counts.totalPending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invitations Tabs */}
      <Tabs defaultValue="received" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="received">
            Received ({invitations.received.length})
          </TabsTrigger>
          <TabsTrigger value="sent">
            Sent ({invitations.sent.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="received" className="mt-6">
          {invitations.received.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Inbox className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Invitations Received</h3>
                <p className="text-muted-foreground text-center">
                  When trading partners invite you to collaborate on LCs, they'll appear here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {invitations.received.map((invitation) => (
                <InvitationCard key={invitation.id} invitation={invitation} type="received" />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sent" className="mt-6">
          {invitations.sent.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Send className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Invitations Sent</h3>
                <p className="text-muted-foreground text-center">
                  Invitations you send to trading partners will be tracked here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {invitations.sent.map((invitation) => (
                <InvitationCard key={invitation.id} invitation={invitation} type="sent" />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Response Dialog */}
      <Dialog open={showResponseDialog} onOpenChange={setShowResponseDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {selectedInvitation && `Respond to ${selectedInvitation.initiator.displayName}'s Invitation`}
            </DialogTitle>
            <DialogDescription>
              LC: {selectedInvitation?.lcTitle}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="responseMessage">Response Message (Optional)</Label>
              <Textarea
                id="responseMessage"
                placeholder="Add a message with your response..."
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResponseDialog(false)} disabled={responding}>
              Cancel
            </Button>
            <Button 
              variant="outline"
              onClick={() => submitResponse(false)}
              disabled={responding}
            >
              {responding ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              Decline
            </Button>
            <Button onClick={() => submitResponse(true)} disabled={responding}>
              {responding ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Accept
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}